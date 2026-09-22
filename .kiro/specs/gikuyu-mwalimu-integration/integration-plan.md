# Gikuyu-Mwalimu Integration Implementation Plan

## Overview

This plan integrates the Gikuyu Bot repository into SyncSenta's Mwalimu AI system, creating a comprehensive multilingual educational AI with offline capabilities through LM Studio integration.

## Phase 1: Repository Integration and Setup

### Task 1.1: Repository Structure Integration
- [ ] Copy Gikuyu Bot components to `frontend/src/components/gikuyu/`
- [ ] Port translation interfaces to match SyncSenta's design system
- [ ] Integrate with existing Mwalimu AI chat component
- [ ] Update TypeScript types for multilingual support

### Task 1.2: Translation Service Backend
- [ ] Create `backend/syncsenta-backend/src/services/translation.rs`
- [ ] Port Gikuyu-English dictionary from Python to Rust
- [ ] Implement bidirectional translation API endpoints
- [ ] Add translation caching for performance

### Task 1.3: Database Schema Extensions
```sql
-- Translation cache table
CREATE TABLE translation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_text TEXT NOT NULL,
    target_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    confidence_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_text, source_language, target_language)
);

-- Voice recordings table
CREATE TABLE voice_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    text TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    audio_url TEXT,
    quality_score FLOAT,
    duration_seconds INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User language preferences
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN secondary_languages TEXT[] DEFAULT '{}';
```

## Phase 2: LM Studio Integration

### Task 2.1: LM Studio Client Implementation
```rust
// backend/syncsenta-backend/src/services/lm_studio.rs
pub struct LMStudioService {
    mwalimu_client: LMStudioClient,
    translation_client: LMStudioClient,
    voice_client: LMStudioClient,
    fallback_enabled: bool,
}

impl LMStudioService {
    pub async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse> {
        // Try local model first, fallback to OpenAI if needed
        match self.mwalimu_client.generate(request.clone()).await {
            Ok(response) => Ok(response),
            Err(_) if self.fallback_enabled => {
                self.openai_fallback(request).await
            },
            Err(e) => Err(e)
        }
    }
    
    pub async fn translate(&self, text: &str, from: &str, to: &str) -> Result<String> {
        // Use local translation model for Kikuyu-English
        if (from == "ki" && to == "en") || (from == "en" && to == "ki") {
            self.translation_client.translate(text, from, to).await
        } else {
            // Fallback for other language pairs
            self.openai_translate(text, from, to).await
        }
    }
}
```

### Task 2.2: Model Management System
- [ ] Implement model health checking
- [ ] Add model switching capabilities
- [ ] Create model performance monitoring
- [ ] Implement graceful fallback mechanisms

### Task 2.3: Configuration Management
```rust
#[derive(Debug, Clone)]
pub struct LMStudioConfig {
    pub enabled: bool,
    pub mwalimu_url: String,
    pub translation_url: String,
    pub voice_url: String,
    pub api_key: String,
    pub timeout_seconds: u64,
    pub fallback_to_openai: bool,
}
```

## Phase 3: Enhanced Mwalimu AI

### Task 3.1: Multilingual Chat Interface
```typescript
// frontend/src/components/mwalimu/multilingual-chat.tsx
interface MultilingualChatProps {
  supportedLanguages: ['en', 'sw', 'ki']; // English, Kiswahili, Kikuyu
  defaultLanguage: string;
  translationEnabled: boolean;
  voiceEnabled: boolean;
}

export function MultilingualMwalimuChat(props: MultilingualChatProps) {
  const [currentLanguage, setCurrentLanguage] = useState(props.defaultLanguage);
  const [autoTranslate, setAutoTranslate] = useState(false);
  
  // Enhanced message handling with translation
  const handleMessage = async (content: string, language: string) => {
    // Send to backend with language context
    const response = await mwalimuService.sendMessage({
      content,
      language,
      autoTranslate,
      userId: user.id
    });
    
    // Handle multilingual response
    setMessages(prev => [...prev, {
      ...response,
      originalLanguage: language,
      translations: response.translations
    }]);
  };
}
```

### Task 3.2: Cultural Context Enhancement
- [ ] Integrate Kikuyu cultural references into AI responses
- [ ] Add proverbs and traditional knowledge
- [ ] Implement culturally appropriate examples
- [ ] Maintain CBC curriculum alignment across languages

### Task 3.3: Voice Learning Integration
```typescript
// frontend/src/components/voice/kikuyu-voice-trainer.tsx
export function KikuyuVoiceTrainer() {
  const [isRecording, setIsRecording] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState(0);
  
  const handleVoiceRecording = async (audioBlob: Blob, text: string) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('text', text);
    formData.append('language', 'ki');
    
    const response = await voiceService.analyzePronunciation(formData);
    setPronunciationScore(response.score);
    
    // Provide feedback
    if (response.score > 80) {
      showSuccess("Excellent pronunciation! Hongera!");
    } else {
      showTips(response.improvementTips);
    }
  };
}
```

## Phase 4: API Endpoints

### Translation Endpoints
```rust
// POST /api/v1/translate
#[post("/translate")]
pub async fn translate_text(
    request: web::Json<TranslationRequest>,
    translation_service: web::Data<TranslationService>
) -> Result<impl Responder> {
    let result = translation_service.translate(
        &request.text,
        &request.source_language,
        &request.target_language
    ).await?;
    
    Ok(HttpResponse::Ok().json(TranslationResponse {
        translated_text: result.text,
        confidence: result.confidence,
        cached: result.from_cache
    }))
}

// POST /api/v1/mwalimu/chat/multilingual
#[post("/mwalimu/chat/multilingual")]
pub async fn multilingual_chat(
    request: web::Json<MultilingualChatRequest>,
    mwalimu_service: web::Data<MwalimuService>,
    user: AuthenticatedUser
) -> Result<impl Responder> {
    let response = mwalimu_service.process_multilingual_message(
        &request.message,
        &request.language,
        user.id,
        request.auto_translate.unwrap_or(false)
    ).await?;
    
    Ok(HttpResponse::Ok().json(response))
}
```

### Voice Processing Endpoints
```rust
// POST /api/v1/voice/analyze
#[post("/voice/analyze")]
pub async fn analyze_pronunciation(
    mut payload: Multipart,
    voice_service: web::Data<VoiceService>
) -> Result<impl Responder> {
    // Extract audio and text from multipart
    let (audio_data, text, language) = extract_voice_data(payload).await?;
    
    let analysis = voice_service.analyze_pronunciation(
        audio_data,
        &text,
        &language
    ).await?;
    
    Ok(HttpResponse::Ok().json(PronunciationAnalysis {
        score: analysis.score,
        feedback: analysis.feedback,
        improvement_tips: analysis.tips
    }))
}
```

## Phase 5: Frontend Integration

### Task 5.1: Component Integration
```typescript
// frontend/src/components/mwalimu/enhanced-mwalimu-chat.tsx
import { GikuyuTranslator } from '../gikuyu/translator';
import { VoiceTrainer } from '../gikuyu/voice-trainer';
import { LanguageSwitcher } from '../gikuyu/language-switcher';

export function EnhancedMwalimuChat() {
  return (
    <div className="enhanced-mwalimu-chat">
      <ChatHeader>
        <LanguageSwitcher 
          languages={['en', 'sw', 'ki']}
          onLanguageChange={handleLanguageChange}
        />
        <VoiceToggle enabled={voiceEnabled} />
      </ChatHeader>
      
      <ChatMessages>
        {messages.map(message => (
          <MessageBubble 
            key={message.id}
            message={message}
            showTranslation={autoTranslate}
            onTranslate={handleTranslate}
          />
        ))}
      </ChatMessages>
      
      <ChatInput>
        <TextInput 
          placeholder={getPlaceholder(currentLanguage)}
          onSubmit={handleSubmit}
        />
        <VoiceInput 
          language={currentLanguage}
          onVoiceMessage={handleVoiceMessage}
        />
        <TranslateButton 
          onClick={handleQuickTranslate}
        />
      </ChatInput>
    </div>
  );
}
```

### Task 5.2: State Management
```typescript
// frontend/src/stores/multilingual-chat-store.ts
interface MultilingualChatState {
  currentLanguage: 'en' | 'sw' | 'ki';
  messages: MultilingualMessage[];
  autoTranslate: boolean;
  voiceEnabled: boolean;
  offlineMode: boolean;
  translationCache: Map<string, string>;
}

export const useMultilingualChat = create<MultilingualChatState>((set, get) => ({
  currentLanguage: 'en',
  messages: [],
  autoTranslate: false,
  voiceEnabled: false,
  offlineMode: false,
  translationCache: new Map(),
  
  setLanguage: (language) => set({ currentLanguage: language }),
  toggleAutoTranslate: () => set(state => ({ 
    autoTranslate: !state.autoTranslate 
  })),
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  }))
}));
```

## Phase 6: Performance Optimization

### Task 6.1: Caching Strategy
- [ ] Implement Redis caching for translations
- [ ] Cache frequent AI responses
- [ ] Optimize database queries with indexes
- [ ] Implement response compression

### Task 6.2: Offline Capabilities
- [ ] Service worker for offline translation
- [ ] Local storage for conversation history
- [ ] Progressive web app features
- [ ] Sync when connection restored

### Task 6.3: Load Testing
- [ ] Test with 100+ concurrent users
- [ ] Measure response times across languages
- [ ] Optimize model switching performance
- [ ] Validate fallback mechanisms

## Phase 7: Deployment and Testing

### Task 7.1: LM Studio Deployment
```bash
# Docker setup for LM Studio
FROM nvidia/cuda:11.8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install LM Studio
RUN curl -L https://releases.lmstudio.ai/linux/latest -o lmstudio.tar.gz \
    && tar -xzf lmstudio.tar.gz \
    && mv lmstudio /opt/

# Copy models
COPY models/ /opt/lmstudio/models/

# Start script
COPY start-lmstudio.sh /opt/
RUN chmod +x /opt/start-lmstudio.sh

EXPOSE 1234 1235 1236
CMD ["/opt/start-lmstudio.sh"]
```

### Task 7.2: Integration Testing
- [ ] Test all language combinations
- [ ] Validate voice processing accuracy
- [ ] Test offline/online transitions
- [ ] Performance benchmarking

### Task 7.3: User Acceptance Testing
- [ ] Test with Kikuyu-speaking students
- [ ] Validate cultural appropriateness
- [ ] Test pronunciation feedback
- [ ] Gather user feedback

## Success Metrics

### Performance Metrics
- **Response Time**: < 2 seconds for local AI
- **Translation Accuracy**: > 85% for common phrases
- **Voice Recognition**: > 80% accuracy for clear speech
- **Uptime**: > 99% availability

### User Experience Metrics
- **Language Switching**: Seamless transitions
- **Cultural Relevance**: Positive feedback from users
- **Learning Outcomes**: Improved engagement in native language
- **Adoption Rate**: > 70% of Kikuyu-speaking students use the feature

### Technical Metrics
- **Memory Usage**: < 16GB for full setup
- **CPU Usage**: < 80% under normal load
- **Storage**: < 50GB for all models and data
- **Network**: Minimal bandwidth usage in offline mode

This integration will create a world-class multilingual AI education system that preserves Kenyan culture while providing cutting-edge educational technology.