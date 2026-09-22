# Model Deployment Guide

## Overview

The SyncSenta AI Agents system uses edge inference with Ollama servers running on Raspberry Pi nodes. This guide explains how to deploy and configure the language models required for the 7 SyncSenta agents.

## Deployed Models

### 1. Phi-3-mini (3.8B Parameters)
- **Model Name**: `microsoft/phi-3-mini-4k-instruct`
- **Purpose**: Primary reasoning model for general agent tasks
- **Use Cases**:
  - Socratic Tutor Agent
  - Lesson Architect Agent
  - Career Pathways Agent
- **Quantization**: Q4_K_M (GGUF format)
- **Size**: ~2.3GB
- **Priority**: High (Required)

### 2. Gemma-2B (2B Parameters)
- **Model Name**: `google/gemma-2b-it`
- **Purpose**: Efficient processing for assessment tasks
- **Use Cases**:
  - Assessment & Feedback Agent
- **Quantization**: Q4_K_M (GGUF format)
- **Size**: ~1.5GB
- **Priority**: High (Required)

### 3. Qwen-2.5 (3B Parameters)
- **Model Name**: `qwen/qwen2.5-3b-instruct`
- **Purpose**: Efficient model for intelligence and analytics
- **Use Cases**:
  - School Intelligence Agent
- **Quantization**: Q4_K_M (GGUF format)
- **Size**: ~2.0GB
- **Priority**: Medium (Required)

### 4. Custom CBC SLM (2B Parameters)
- **Model Name**: `syncsenta/cbc-curriculum-slm`
- **Purpose**: Custom SLM fine-tuned on KICD curriculum documents
- **Use Cases**:
  - CBC Curriculum Agent
- **Quantization**: Q4_K_M (GGUF format)
- **Size**: ~1.8GB
- **Priority**: High (Required)
- **Note**: This model is fine-tuned specifically on Kenya's CBC curriculum documents from KICD

## Hardware Requirements

### Raspberry Pi Node Specifications
- **Model**: Raspberry Pi 4 or later
- **RAM**: 8GB minimum (recommended for running multiple models)
- **Storage**: 128GB SSD (for model storage and caching)
- **Power**: <50W consumption per node
- **Network**: Ethernet connection recommended for stability

### Cluster Configuration
- **Minimum Nodes**: 3 Pi nodes for production deployment
- **Recommended Nodes**: 5-10 Pi nodes for 1,000+ concurrent users
- **Load Balancing**: Automatic distribution across available nodes

## Installation

### 1. Install Ollama on Raspberry Pi

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama
```

### 2. Configure Ollama Server

Edit `/etc/systemd/system/ollama.service` to configure:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_MODELS=/var/lib/ollama/models"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
Environment="OLLAMA_NUM_PARALLEL=4"
```

Restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 3. Deploy Models

#### Option A: Using the Deployment Script (Recommended)

```bash
# Navigate to ai-agents directory
cd ai-agents

# Activate virtual environment
source venv/bin/activate

# Deploy all models
python scripts/deploy_models.py

# Force redeployment of all models
python scripts/deploy_models.py --force

# Verify deployed models only
python scripts/deploy_models.py --verify-only

# Deploy and test routing
python scripts/deploy_models.py --test-routing
```

#### Option B: Manual Deployment

```bash
# Pull Phi-3-mini
ollama pull microsoft/phi-3-mini-4k-instruct

# Pull Gemma-2B
ollama pull google/gemma-2b-it

# Pull Qwen-2.5
ollama pull qwen/qwen2.5-3b-instruct

# Pull Custom CBC SLM (if available)
ollama pull syncsenta/cbc-curriculum-slm
```

## Model Configuration

### Agent-to-Model Mapping

The system automatically routes agent requests to appropriate models based on the configuration in `src/syncsenta_agents/core/config.py`:

```python
agent_model_mapping = {
    "cbc_curriculum": "cbc_custom",        # CBC Curriculum Agent → Custom CBC SLM
    "socratic_tutor": "phi3_mini",         # Socratic Tutor → Phi-3-mini
    "lesson_architect": "phi3_mini",       # Lesson Architect → Phi-3-mini
    "assessment": "gemma_2b",              # Assessment Agent → Gemma-2B
    "intelligence": "qwen_2_5",            # School Intelligence → Qwen-2.5
    "career_pathways": "phi3_mini"         # Career Pathways → Phi-3-mini
}
```

### Model Router

The `ModelRouter` class handles intelligent routing of requests to models:

- **Basic Routing**: Routes based on agent type
- **Context-Based Routing**: Adjusts routing based on request context
- **Caching**: Caches routing decisions for performance
- **Fallback**: Automatically falls back to available models if preferred model is unavailable

## Verification

### Health Checks

The deployment system includes comprehensive health checks:

```python
from syncsenta_agents.inference.model_deployment import ModelDeploymentManager

# Initialize deployment manager
manager = ModelDeploymentManager()
await manager.initialize()

# Verify all models
health_results = await manager.verify_all_models()

# Get deployment status
status = manager.get_deployment_status()
print(status)
```

### Testing Model Inference

```python
from syncsenta_agents.inference.ollama_client import SyncSentaOllamaServer

# Initialize server
server = SyncSentaOllamaServer()
await server.initialize()

# Test generation
response = await server.generate_response(
    agent_type="socratic_tutor",
    prompt="Explain photosynthesis to a Grade 5 student",
    system_prompt="You are a helpful Kenyan teacher"
)

print(response)
```

## Performance Optimization

### Model Quantization

All models use Q4_K_M quantization (GGUF format) for optimal performance on Raspberry Pi:

- **Memory Efficiency**: 4-bit quantization reduces memory usage by ~75%
- **Speed**: Maintains inference speed while reducing resource requirements
- **Accuracy**: Minimal accuracy loss (<2%) compared to full precision

### Load Balancing Strategies

The system supports multiple load balancing strategies:

1. **Round Robin**: Distributes requests evenly across nodes
2. **Least Connections**: Routes to node with fewest active requests
3. **Fastest Response**: Routes to node with best response time
4. **Weighted Round Robin**: Considers both load and performance

Configure in `src/syncsenta_agents/inference/load_balancer.py`:

```python
balancer = OllamaLoadBalancer(
    nodes=pi_nodes,
    strategy=LoadBalancingStrategy.LEAST_CONNECTIONS
)
```

### Caching and Warm-up

- **Model Caching**: Models remain loaded in memory for fast inference
- **Warm-up**: First request may be slower as model loads
- **Context Caching**: Conversation context is cached for efficiency

## Monitoring

### Deployment Status

```bash
# Check deployment status
python scripts/deploy_models.py --verify-only
```

### Model Health

```python
# Get comprehensive status
status = manager.get_deployment_status()

# Check specific model
is_healthy = manager.client.is_model_healthy("microsoft/phi-3-mini-4k-instruct")
```

### Performance Metrics

Monitor these key metrics:

- **Response Time**: Should be <2 seconds for Phi3_Mini
- **Concurrent Requests**: Up to 1,000 per Pi node
- **Memory Usage**: Monitor RAM usage per model
- **Power Consumption**: Should be <50W per Pi node

## Troubleshooting

### Model Not Found

```bash
# Refresh available models
ollama list

# Pull missing model
ollama pull <model-name>
```

### Slow Inference

1. Check RAM usage: `free -h`
2. Verify only required models are loaded
3. Reduce `OLLAMA_NUM_PARALLEL` if needed
4. Add more Pi nodes to cluster

### Connection Issues

```bash
# Check Ollama service status
sudo systemctl status ollama

# Check network connectivity
curl http://localhost:11434/api/tags

# Restart service
sudo systemctl restart ollama
```

### Model Health Check Failures

```python
# Verify model manually
await manager.verify_model_health("microsoft/phi-3-mini-4k-instruct")

# Check logs
manager.logger.info("Checking model health...")
```

## Custom CBC SLM Fine-tuning

The Custom CBC SLM is fine-tuned on KICD curriculum documents. To update or retrain:

1. **Prepare Training Data**: Collect latest KICD documents
2. **Fine-tune Model**: Use Ollama's fine-tuning capabilities
3. **Deploy Updated Model**: Push to Ollama registry
4. **Update Configuration**: Update model name in config

See `ai-training/` directory for fine-tuning scripts.

## Cost Optimization

### Zero Ongoing API Costs

- All inference runs locally on Pi nodes
- No external LLM API calls
- One-time hardware cost only

### Power Efficiency

- <50W per Pi node
- Solar power compatible
- Sustainable for rural schools

### Shared Infrastructure

- Multiple schools can share Pi node clusters
- Cost-effective scaling
- Centralized maintenance

## Security

### Model Security

- Models run in isolated Ollama containers
- No external network access required for inference
- Local data processing ensures data sovereignty

### Access Control

- Ollama server accessible only within local network
- TLS encryption for inter-node communication
- Role-based access control for model management

## Next Steps

1. **Deploy Models**: Run `python scripts/deploy_models.py`
2. **Verify Health**: Check all models are healthy
3. **Test Inference**: Run sample queries through each agent
4. **Monitor Performance**: Track response times and resource usage
5. **Scale Cluster**: Add more Pi nodes as needed

## References

- [Ollama Documentation](https://ollama.com/docs)
- [Phi-3 Model Card](https://huggingface.co/microsoft/phi-3-mini-4k-instruct)
- [Gemma Model Card](https://huggingface.co/google/gemma-2b-it)
- [Qwen Model Card](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)
- [GGUF Quantization Guide](https://github.com/ggerganov/llama.cpp/blob/master/examples/quantize/README.md)
