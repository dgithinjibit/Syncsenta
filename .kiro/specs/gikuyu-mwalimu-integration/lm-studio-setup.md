# LM Studio Setup Guide for SyncSenta

## Overview

This guide covers setting up LM Studio for offline AI capabilities in SyncSenta, enabling high-speed, low-latency responses for Mwalimu AI and Gikuyu translation services.

## Why LM Studio for SyncSenta?

### Advantages
- **Offline Operation**: Works without internet connectivity
- **Low Latency**: Sub-2-second responses for educational queries
- **Privacy**: Student data stays local
- **Cost Effective**: No API costs for high-volume usage
- **Customization**: Fine-tune models for Kenyan educational context

### Performance Expectations
- **Response Time**: 1-3 seconds (vs 5-15 seconds for API calls)
- **Throughput**: 100+ concurrent students per server
- **Reliability**: 99.9% uptime (no network dependencies)
- **Context**: Maintain conversation context locally

## Recommended Hardware Setup

### Minimum Requirements (Single Classroom - 30 students)
- **CPU**: Intel i5-8400 / AMD Ryzen 5 3600
- **RAM**: 16GB DDR4
- **GPU**: RTX 3060 12GB / RTX 4060 Ti 16GB
- **Storage**: 500GB NVMe SSD
- **Network**: Gigabit Ethernet for local distribution

### Recommended Setup (School-wide - 300+ students)
- **CPU**: Intel i7-12700K / AMD Ryzen 7 5800X
- **RAM**: 32GB DDR4/DDR5
- **GPU**: RTX 4070 Ti / RTX 4080 (16GB+ VRAM)
- **Storage**: 1TB NVMe SSD
- **Network**: 10Gb Ethernet backbone

### Enterprise Setup (District-wide - 1000+ students)
- **CPU**: Intel Xeon / AMD EPYC (16+ cores)
- **RAM**: 64GB+ ECC RAM
- **GPU**: RTX 4090 / A6000 (24GB+ VRAM)
- **Storage**: 2TB NVMe SSD RAID
- **Network**: Dedicated fiber infrastructure

## Model Selection Strategy

### Primary Models for SyncSenta

#### 1. Educational Tutor Model
```yaml
Model: Llama 3.1 8B Instruct
Purpose: Primary Mwalimu AI responses
Size: ~8GB VRAM
Performance: 15-25 tokens/second
Context: 8K tokens (long conversations)
Specialization: CBC curriculum, Kenyan context
```

#### 2. Translation Model
```yaml
Model: Custom Kikuyu-English Transformer
Purpose: Gikuyu Bot translation
Size: ~2GB VRAM
Performance: 50+ tokens/second
Context: 2K tokens (phrase/sentence level)
Specialization: Kikuyu-English bidirectional
```

#### 3. Voice Processing Model
```yaml
Model: Whisper Medium/Large
Purpose: Speech-to-text for voice learning
Size: ~3GB VRAM
Performance: Real-time transcription
Context: Audio processing
Specialization: Kenyan accents, multilingual
```

#### 4. Code Assistant (Optional)
```yaml
Model: CodeLlama 7B
Purpose: Programming education support
Size: ~7GB VRAM
Performance: 20+ tokens/second
Context: 4K tokens
Specialization: Educational coding examples
```

## LM Studio Configuration

### Installation Steps

1. **Download LM Studio**
```bash
# Download from https://lmstudio.ai/
# Install on Windows/macOS/Linux
```

2. **Model Download and Setup**
```bash
# In LM Studio interface:
# 1. Browse models
# 2. Search for "Llama 3.1 8B Instruct"
# 3. Download GGUF format (Q4_K_M recommended)
# 4. Load model with appropriate settings
```

3. **Server Configuration**
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 1234,
    "cors": true,
    "api_key": "your-secure-key"
  },
  "model": {
    "context_length": 8192,
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 512
  },
  "performance": {
    "gpu_layers": 35,
    "threads": 8,
    "batch_size": 512
  }
}
```

### Multi-Model Setup

#### Model Router Configuration
```rust
// backend/syncsenta-backend/src/services/ai_router.rs
pub struct AIRouter {
    mwalimu_client: LMStudioClient,
    translation_client: LMStudioClient,
    voice_client: LMStudioClient,
    fallback_client: OpenAIClient,
}

impl AIRouter {
    pub async fn route_request(&self, request: AIRequest) -> Result<AIResponse> {
        match request.request_type {
            AIRequestType::Education => {
                self.mwalimu_client.generate(request).await
                    .or_else(|_| self.fallback_client.generate(request)).await
            },
            AIRequestType::Translation => {
                self.translation_client.translate(request).await
            },
            AIRequestType::Voice => {
                self.voice_client.transcribe(request).await
            }
        }
    }
}
```

## Integration with SyncSenta Backend

### Rust Service Implementation

```rust
// backend/syncsenta-backend/src/services/lm_studio.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct LMStudioRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub stream: bool,
}

#[derive(Debug, Deserialize)]
pub struct LMStudioResponse {
    pub choices: Vec<Choice>,
    pub usage: Usage,
}

pub struct LMStudioClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl LMStudioClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_key,
        }
    }

    pub async fn generate(&self, request: LMStudioRequest) -> Result<LMStudioResponse> {
        let response = self.client
            .post(&format!("{}/v1/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        let result: LMStudioResponse = response.json().await?;
        Ok(result)
    }

    pub async fn health_check(&self) -> Result<bool> {
        let response = self.client
            .get(&format!("{}/v1/models", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}
```

### Environment Configuration

```bash
# .env additions for LM Studio
LM_STUDIO_MWALIMU_URL=http://localhost:1234
LM_STUDIO_TRANSLATION_URL=http://localhost:1235
LM_STUDIO_VOICE_URL=http://localhost:1236
LM_STUDIO_API_KEY=your-secure-key
LM_STUDIO_ENABLED=true
LM_STUDIO_FALLBACK_TO_OPENAI=true
```

## Performance Optimization

### Model Quantization
- **Q4_K_M**: Best balance of quality and speed (recommended)
- **Q5_K_M**: Higher quality, slightly slower
- **Q8_0**: Maximum quality, requires more VRAM

### GPU Optimization
```json
{
  "gpu_layers": 35,  // Adjust based on VRAM
  "rope_freq_base": 10000,
  "rope_freq_scale": 1.0,
  "batch_size": 512,
  "context_batch_size": 512
}
```

### Memory Management
- **Context Caching**: Cache frequent educational topics
- **Model Swapping**: Load models on-demand for different subjects
- **Batch Processing**: Group similar requests for efficiency

## Deployment Architecture

### Single Server Setup
```
┌─────────────────────────────────────────┐
│           School Server                 │
│  ┌─────────────────────────────────────┐ │
│  │        LM Studio                    │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │ │
│  │  │Mwalimu  │ │Gikuyu   │ │Voice    │ │ │
│  │  │Model    │ │Model    │ │Model    │ │ │
│  │  │:1234    │ │:1235    │ │:1236    │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │      SyncSenta Backend              │ │
│  │         (Rust/Axum)                 │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Load Balancer Setup (Multiple Schools)
```
┌─────────────────────────────────────────┐
│         Load Balancer                   │
│    (HAProxy/Nginx)                      │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│School │    │School │    │School │
│Server │    │Server │    │Server │
│   A   │    │   B   │    │   C   │
└───────┘    └───────┘    └───────┘
```

## Monitoring and Maintenance

### Health Monitoring
```rust
// Health check endpoint
#[get("/health/ai")]
pub async fn ai_health_check(ai_router: web::Data<AIRouter>) -> impl Responder {
    let mwalimu_status = ai_router.mwalimu_client.health_check().await;
    let translation_status = ai_router.translation_client.health_check().await;
    
    HttpResponse::Ok().json(json!({
        "mwalimu_ai": mwalimu_status.unwrap_or(false),
        "translation": translation_status.unwrap_or(false),
        "fallback_available": true
    }))
}
```

### Performance Metrics
- **Response Time**: Track average response times
- **Throughput**: Monitor requests per second
- **Error Rate**: Track failed requests and fallbacks
- **Resource Usage**: Monitor CPU, RAM, and GPU utilization

## Cost Analysis

### Hardware Investment (One-time)
- **Classroom Setup**: $2,000 - $3,000
- **School Setup**: $5,000 - $8,000
- **District Setup**: $15,000 - $25,000

### Operational Savings (Annual)
- **API Costs Avoided**: $10,000 - $50,000+ per year
- **Bandwidth Savings**: $2,000 - $5,000 per year
- **Reliability Benefits**: Priceless for education continuity

### ROI Timeline
- **Break-even**: 6-12 months
- **5-year savings**: $200,000 - $500,000+ for large deployments

This setup provides SyncSenta with enterprise-grade AI capabilities while maintaining the performance and reliability needed for Kenya's educational system.