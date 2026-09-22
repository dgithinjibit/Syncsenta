#!/bin/bash
# SyncSenta CBC Model Training Launcher
# Coordinates AMD instance setup and training execution

set -e

echo "🚀 SyncSenta CBC Model Training Pipeline"
echo "========================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with required credentials."
    echo "Required variables:"
    echo "  - AMD_API_KEY"
    echo "  - AMD_PROJECT_ID"
    echo "  - HF_TOKEN"
    echo "  - AISA_API_KEY"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
required_vars=("AMD_API_KEY" "AMD_PROJECT_ID" "HF_TOKEN" "AISA_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ Environment variables configured"

# Create necessary directories
mkdir -p ai-training/{datasets,models,logs,config}
mkdir -p studio/src/lib

echo "📁 Created training directories"

# Run setup script
echo "🔧 Running training setup..."
cd ai-training
python scripts/setup_amd_training.py

# Check if AMD instance is ready
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Go to AMD Developer Cloud portal"
echo "2. Launch MI300X instance with the configuration shown above"
echo "3. Update .env with:"
echo "   AMD_INSTANCE_IP=your_instance_ip"
echo "   AMD_SSH_KEY_PATH=/path/to/your/ssh_key.pem"
echo ""
read -p "Press Enter when AMD instance is ready and .env is updated..."

# Test AMD instance connection
if [ -n "$AMD_INSTANCE_IP" ] && [ -n "$AMD_SSH_KEY_PATH" ]; then
    echo "🔗 Testing AMD instance connection..."
    ssh -i "$AMD_SSH_KEY_PATH" -o ConnectTimeout=10 ubuntu@"$AMD_INSTANCE_IP" "echo 'AMD instance connected successfully'"
    
    if [ $? -eq 0 ]; then
        echo "✅ AMD instance connection successful"
        
        # Copy training scripts to AMD instance
        echo "📤 Copying training scripts to AMD instance..."
        scp -i "$AMD_SSH_KEY_PATH" -r ../ai-training ubuntu@"$AMD_INSTANCE_IP":~/
        
        # Start training on AMD instance
        echo "🎯 Starting training on AMD MI300X..."
        ssh -i "$AMD_SSH_KEY_PATH" ubuntu@"$AMD_INSTANCE_IP" "
            cd ~/ai-training
            export HF_TOKEN='$HF_TOKEN'
            export WANDB_API_KEY='$WANDB_API_KEY'
            python scripts/train_cbc_model.py
        "
        
        echo "🎉 Training started on AMD instance!"
        echo "Monitor progress at: https://wandb.ai/your-username/syncsenta-cbc-training"
        
    else
        echo "❌ Failed to connect to AMD instance"
        echo "Please check AMD_INSTANCE_IP and AMD_SSH_KEY_PATH in .env"
        exit 1
    fi
else
    echo "⚠️  AMD instance not configured. Training will run locally (not recommended for large models)"
    echo "To use AMD MI300X, update .env with AMD_INSTANCE_IP and AMD_SSH_KEY_PATH"
    
    read -p "Continue with local training? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🎯 Starting local training..."
        python scripts/train_cbc_model.py
    else
        echo "Training cancelled. Please set up AMD instance first."
        exit 1
    fi
fi

echo ""
echo "🎉 Training pipeline complete!"
echo ""
echo "Next steps:"
echo "1. Monitor training progress in Weights & Biases"
echo "2. Once complete, the model will be uploaded to Hugging Face"
echo "3. Update studio/src/lib/aisa-client.ts to use your trained model"
echo "4. Test the enhanced Mwalimu AI in the studio frontend"