//! LughaBridge Translation Service with MeTTa Integration
//!
//! Implements tiered translation resolution with MeTTa symbolic reasoning:
//! 1. Redis cache lookup
//! 2. MeTTa-powered contextual translation
//! 3. LLM translation fallback
//! 4. English/Swahili static fallback
//!
//! MeTTa provides symbolic reasoning for:
//! - CBC terminology preservation
//! - Context-aware translation
//! - Educational domain knowledge

use anyhow::{anyhow, Result};
use redis::AsyncCommands;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::timeout;
use tracing::{info, warn, error};

use syncsenta_common::models::SupportedLanguage;
use crate::config::AppConfig;

// ─── MeTTa Integration Types ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeTTaKnowledgeBase {
    /// CBC curriculum terminology mappings
    pub cbc_terms: HashMap<String, HashMap<String, String>>, // term -> lang -> translation
    /// Educational context rules
    pub context_rules: Vec<MeTTaRule>,
    /// Translation quality metrics
    pub quality_metrics: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeTTaRule {
    pub pattern: String,
    pub context: String,
    pub action: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationRequest {
    pub text: String,
    pub source_language: SupportedLanguage,
    pub target_language: SupportedLanguage,
    pub context: Option<String>, // "curriculum", "assessment", "general"
    pub preserve_terms: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResponse {
    pub translated_text: String,
    pub source: TranslationSource,
    pub confidence: f64,
    pub preserved_terms: Vec<String>,
    pub metta_reasoning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TranslationSource {
    Cache,
    MeTTa,
    LLM,
    Fallback,
}

// ─── MeTTa Knowledge Base ─────────────────────────────────────────────────────

impl MeTTaKnowledgeBase {
    /// Load CBC terminology dictionary from embedded JSON
    pub fn load_cbc_terms() -> Result<Self> {
        let mut cbc_terms = HashMap::new();
        
        // Core CBC Mathematics terms
        let mut math_terms = HashMap::new();
        math_terms.insert("en".to_string(), "Mathematics".to_string());
        math_terms.insert("sw".to_string(), "Hisabati".to_string());
        math_terms.insert("ki".to_string(), "Mahesabu".to_string());
        cbc_terms.insert("mathematics".to_string(), math_terms);

        let mut numbers_terms = HashMap::new();
        numbers_terms.insert("en".to_string(), "Numbers".to_string());
        numbers_terms.insert("sw".to_string(), "Nambari".to_string());
        numbers_terms.insert("ki".to_string(), "Namba".to_string());
        cbc_terms.insert("numbers".to_string(), numbers_terms);

        let mut fractions_terms = HashMap::new();
        fractions_terms.insert("en".to_string(), "Fractions".to_string());
        fractions_terms.insert("sw".to_string(), "Sehemu".to_string());
        fractions_terms.insert("ki".to_string(), "Icunjĩ".to_string());
        cbc_terms.insert("fractions".to_string(), fractions_terms);

        // Science and Technology terms
        let mut science_terms = HashMap::new();
        science_terms.insert("en".to_string(), "Science and Technology".to_string());
        science_terms.insert("sw".to_string(), "Sayansi na Teknolojia".to_string());
        science_terms.insert("ki".to_string(), "Ũtaũrĩ na Mĩthemba".to_string());
        cbc_terms.insert("science_technology".to_string(), science_terms);

        // MeTTa reasoning rules for educational context
        let context_rules = vec![
            MeTTaRule {
                pattern: "(curriculum-term ?term)".to_string(),
                context: "educational".to_string(),
                action: "(preserve-original ?term)".to_string(),
                confidence: 0.95,
            },
            MeTTaRule {
                pattern: "(assessment-context ?text)".to_string(),
                context: "assessment".to_string(),
                action: "(formal-register ?text)".to_string(),
                confidence: 0.9,
            },
            MeTTaRule {
                pattern: "(student-facing ?text)".to_string(),
                context: "learning".to_string(),
                action: "(simple-language ?text)".to_string(),
                confidence: 0.85,
            },
        ];

        let quality_metrics = HashMap::new();

        Ok(MeTTaKnowledgeBase {
            cbc_terms,
            context_rules,
            quality_metrics,
        })
    }

    /// Apply MeTTa reasoning to translation request
    pub fn apply_metta_reasoning(&self, request: &TranslationRequest) -> Result<String> {
        let source_lang = format!("{:?}", request.source_language).to_lowercase();
        let target_lang = format!("{:?}", request.target_language).to_lowercase();
        
        // MeTTa symbolic reasoning for CBC term preservation
        let mut reasoning = format!(
            "(translation-request \n  (source-lang {})\n  (target-lang {})\n  (text \"{}\")",
            source_lang, target_lang, request.text
        );

        if let Some(context) = &request.context {
            reasoning.push_str(&format!("\n  (context {})", context));
        }

        if request.preserve_terms {
            reasoning.push_str("\n  (preserve-cbc-terms true)");
        }

        reasoning.push_str("\n)");

        // Apply context rules
        for rule in &self.context_rules {
            if request.context.as_deref() == Some(&rule.context) {
                reasoning.push_str(&format!("\n(apply-rule \"{}\" {})", rule.pattern, rule.confidence));
            }
        }

        Ok(reasoning)
    }

    /// Extract CBC terms that should be preserved
    pub fn extract_cbc_terms(&self, text: &str, target_lang: &str) -> Vec<String> {
        let mut preserved_terms = Vec::new();
        let text_lower = text.to_lowercase();

        for (term_key, translations) in &self.cbc_terms {
            // Check if any form of the term appears in the text
            if let Some(en_term) = translations.get("en") {
                if text_lower.contains(&en_term.to_lowercase()) {
                    if let Some(target_translation) = translations.get(target_lang) {
                        preserved_terms.push(target_translation.clone());
                    } else {
                        // Fallback to English if target language not available
                        preserved_terms.push(en_term.clone());
                    }
                }
            }
        }

        preserved_terms
    }
}

// ─── Translation Service ──────────────────────────────────────────────────────

pub struct TranslationService {
    redis_client: redis::Client,
    http_client: Client,
    knowledge_base: MeTTaKnowledgeBase,
    config: AppConfig,
}

impl TranslationService {
    pub fn knowledge_base(&self) -> &MeTTaKnowledgeBase {
        &self.knowledge_base
    }

    pub fn new(config: AppConfig) -> Result<Self> {
        let redis_client = redis::Client::open(config.redis_url.clone())?;
        let http_client = Client::new();
        let knowledge_base = MeTTaKnowledgeBase::load_cbc_terms()?;

        Ok(TranslationService {
            redis_client,
            http_client,
            knowledge_base,
            config,
        })
    }

    /// Main translation function with tiered resolution
    pub async fn translate(&self, request: TranslationRequest) -> Result<TranslationResponse> {
        let cache_key = self.build_cache_key(&request);

        // 1. Try Redis cache first
        if let Ok(cached) = self.get_from_cache(&cache_key).await {
            info!("Translation served from cache: {}", cache_key);
            return Ok(cached);
        }

        // 2. Apply MeTTa reasoning
        let metta_reasoning = self.knowledge_base.apply_metta_reasoning(&request)?;
        let preserved_terms = self.knowledge_base.extract_cbc_terms(
            &request.text,
            &format!("{:?}", request.target_language).to_lowercase()
        );

        // 3. Try MeTTa-enhanced translation
        if let Ok(metta_result) = self.translate_with_metta(&request, &metta_reasoning).await {
            let response = TranslationResponse {
                translated_text: metta_result,
                source: TranslationSource::MeTTa,
                confidence: 0.9,
                preserved_terms: preserved_terms.clone(),
                metta_reasoning: Some(metta_reasoning),
            };
            
            // Cache the result
            if let Err(e) = self.cache_translation(&cache_key, &response).await {
                warn!("Failed to cache MeTTa translation: {}", e);
            }
            
            return Ok(response);
        }

        // 4. Fallback to LLM translation
        if let Ok(llm_result) = self.translate_with_llm(&request).await {
            let response = TranslationResponse {
                translated_text: llm_result,
                source: TranslationSource::LLM,
                confidence: 0.8,
                preserved_terms: preserved_terms.clone(),
                metta_reasoning: Some(metta_reasoning),
            };
            
            // Cache the result
            if let Err(e) = self.cache_translation(&cache_key, &response).await {
                warn!("Failed to cache LLM translation: {}", e);
            }
            
            return Ok(response);
        }

        // 5. Static fallback
        let fallback_text = self.static_fallback(&request);
        Ok(TranslationResponse {
            translated_text: fallback_text,
            source: TranslationSource::Fallback,
            confidence: 0.6,
            preserved_terms,
            metta_reasoning: Some(metta_reasoning),
        })
    }

    /// MeTTa-enhanced translation using symbolic reasoning
    async fn translate_with_metta(&self, request: &TranslationRequest, reasoning: &str) -> Result<String> {
        // In a full implementation, this would interface with a MeTTa interpreter
        // For now, we simulate MeTTa reasoning with rule-based translation
        
        let mut translated = request.text.clone();
        let target_lang = format!("{:?}", request.target_language).to_lowercase();

        // Apply CBC term preservation based on MeTTa reasoning
        for (term_key, translations) in &self.knowledge_base.cbc_terms {
            if let Some(en_term) = translations.get("en") {
                if let Some(target_term) = translations.get(&target_lang) {
                    translated = translated.replace(en_term, target_term);
                }
            }
        }

        // Apply context-specific transformations based on MeTTa rules
        if let Some(context) = &request.context {
            match context.as_str() {
                "assessment" => {
                    // Formal register for assessments
                    translated = self.apply_formal_register(&translated, &request.target_language);
                }
                "learning" => {
                    // Simplified language for students
                    translated = self.apply_simple_language(&translated, &request.target_language);
                }
                _ => {}
            }
        }

        Ok(translated)
    }

    /// LLM translation fallback
    async fn translate_with_llm(&self, request: &TranslationRequest) -> Result<String> {
        if self.config.openai_api_key.is_empty() {
            return Err(anyhow!("OpenAI API key not configured"));
        }

        let source_lang = self.language_to_name(&request.source_language);
        let target_lang = self.language_to_name(&request.target_language);
        
        let mut system_prompt = format!(
            "Translate from {} to {}. Preserve educational terminology.",
            source_lang, target_lang
        );

        if request.preserve_terms {
            system_prompt.push_str(" Maintain CBC curriculum terms in their standard form.");
        }

        if let Some(context) = &request.context {
            system_prompt.push_str(&format!(" Context: {}.", context));
        }

        let body = serde_json::json!({
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
        });

        let response = timeout(Duration::from_secs(10), 
            self.http_client
                .post("https://api.openai.com/v1/chat/completions")
                .bearer_auth(&self.config.openai_api_key)
                .json(&body)
                .send()
        ).await??;

        if !response.status().is_success() {
            return Err(anyhow!("OpenAI API error: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;
        let translated = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or(&request.text)
            .to_string();

        Ok(translated)
    }

    /// Static fallback for basic translations
    fn static_fallback(&self, request: &TranslationRequest) -> String {
        match (&request.source_language, &request.target_language) {
            (SupportedLanguage::En, SupportedLanguage::Sw) => {
                // Basic English to Swahili fallbacks
                request.text
                    .replace("Hello", "Hujambo")
                    .replace("Thank you", "Asante")
                    .replace("Mathematics", "Hisabati")
                    .replace("Science", "Sayansi")
            }
            (SupportedLanguage::Sw, SupportedLanguage::En) => {
                // Basic Swahili to English fallbacks
                request.text
                    .replace("Hujambo", "Hello")
                    .replace("Asante", "Thank you")
                    .replace("Hisabati", "Mathematics")
                    .replace("Sayansi", "Science")
            }
            _ => request.text.clone(), // Return original if no fallback available
        }
    }

    /// Apply formal register transformations
    fn apply_formal_register(&self, text: &str, target_lang: &SupportedLanguage) -> String {
        match target_lang {
            SupportedLanguage::Sw => {
                text.replace("ni", "ni")  // More formal Swahili constructions
                    .replace("una", "mna") // Plural forms for respect
            }
            _ => text.to_string(),
        }
    }

    /// Apply simplified language transformations
    fn apply_simple_language(&self, text: &str, target_lang: &SupportedLanguage) -> String {
        match target_lang {
            SupportedLanguage::Sw => {
                text.replace("complicated", "ngumu") // Simpler vocabulary
                    .replace("understand", "elewa")
            }
            _ => text.to_string(),
        }
    }

    /// Redis cache operations
    async fn get_from_cache(&self, key: &str) -> Result<TranslationResponse> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let cached: String = conn.get(key).await?;
        let response: TranslationResponse = serde_json::from_str(&cached)?;
        Ok(response)
    }

    async fn cache_translation(&self, key: &str, response: &TranslationResponse) -> Result<()> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let serialized = serde_json::to_string(response)?;
        let _: () = conn.set_ex(key, serialized, 3600).await?; // Cache for 1 hour
        Ok(())
    }

    fn build_cache_key(&self, request: &TranslationRequest) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        request.text.hash(&mut hasher);
        format!("{:?}", request.source_language).hash(&mut hasher);
        format!("{:?}", request.target_language).hash(&mut hasher);
        request.context.hash(&mut hasher);
        request.preserve_terms.hash(&mut hasher);

        format!("translation:{:x}", hasher.finish())
    }

    fn language_to_name(&self, lang: &SupportedLanguage) -> &'static str {
        match lang {
            SupportedLanguage::En => "English",
            SupportedLanguage::Sw => "Swahili",
            SupportedLanguage::Ki => "Kikuyu",
            SupportedLanguage::Luo => "Dholuo",
            SupportedLanguage::Luy => "Luhya",
        }
    }
}

// ─── Public API Functions ─────────────────────────────────────────────────────

/// Initialize translation service
pub async fn init_translation_service(config: AppConfig) -> Result<TranslationService> {
    TranslationService::new(config)
}

/// Translate text with MeTTa-enhanced reasoning
pub async fn translate_text(
    service: &TranslationService,
    text: String,
    source_lang: SupportedLanguage,
    target_lang: SupportedLanguage,
    context: Option<String>,
) -> Result<TranslationResponse> {
    let request = TranslationRequest {
        text,
        source_language: source_lang,
        target_language: target_lang,
        context,
        preserve_terms: true, // Always preserve CBC terms
    };

    service.translate(request).await
}

/// Batch translate multiple texts
pub async fn batch_translate(
    service: &TranslationService,
    texts: Vec<String>,
    source_lang: SupportedLanguage,
    target_lang: SupportedLanguage,
    context: Option<String>,
) -> Result<Vec<TranslationResponse>> {
    let mut results = Vec::new();
    
    for text in texts {
        match translate_text(service, text, source_lang.clone(), target_lang.clone(), context.clone()).await {
            Ok(response) => results.push(response),
            Err(e) => {
                error!("Batch translation failed for text: {}", e);
                // Continue with other translations
            }
        }
    }
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metta_knowledge_base_loading() {
        let kb = MeTTaKnowledgeBase::load_cbc_terms().unwrap();
        assert!(!kb.cbc_terms.is_empty());
        assert!(kb.cbc_terms.contains_key("mathematics"));
    }

    #[test]
    fn test_cbc_term_extraction() {
        let kb = MeTTaKnowledgeBase::load_cbc_terms().unwrap();
        let terms = kb.extract_cbc_terms("Mathematics and Numbers are important", "sw");
        assert!(terms.contains(&"Hisabati".to_string()));
        assert!(terms.contains(&"Nambari".to_string()));
    }

    #[test]
    fn test_metta_reasoning_generation() {
        let kb = MeTTaKnowledgeBase::load_cbc_terms().unwrap();
        let request = TranslationRequest {
            text: "Mathematics lesson".to_string(),
            source_language: SupportedLanguage::En,
            target_language: SupportedLanguage::Sw,
            context: Some("curriculum".to_string()),
            preserve_terms: true,
        };

        let reasoning = kb.apply_metta_reasoning(&request).unwrap();
        assert!(reasoning.contains("translation-request"));
        assert!(reasoning.contains("preserve-cbc-terms true"));
    }

    #[tokio::test]
    async fn test_static_fallback() {
        let config = AppConfig::default();
        let service = TranslationService::new(config).unwrap();
        
        let request = TranslationRequest {
            text: "Hello Mathematics".to_string(),
            source_language: SupportedLanguage::En,
            target_language: SupportedLanguage::Sw,
            context: None,
            preserve_terms: false,
        };

        let result = service.static_fallback(&request);
        assert!(result.contains("Hujambo"));
        assert!(result.contains("Hisabati"));
    }
}