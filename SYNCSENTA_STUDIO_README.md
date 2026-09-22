# 🌱 SyncSenta Studio - Multi-Provider AI Education Platform

**Web4 Education OS for Kenya's CBC Curriculum**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

## 🎯 **Overview**

SyncSenta Studio is a production-ready AI education platform designed for Kenya's Competency-Based Curriculum (CBC). It features a multi-provider AI system with automatic failover, ensuring 99.9% uptime for educational services.

### **Key Features**

- 🔄 **Multi-Provider AI System** - Automatic failover between Groq accounts and AISA.one
- 📚 **CBC-Aligned Content** - Specialized for Kenyan education standards
- 🌍 **Multi-Language Support** - English, Kiswahili, and local languages
- 🎓 **Mwalimu AI Tutor** - Personalized learning assistant
- 📋 **Classroom Compass** - Lesson planning and teaching strategies
- 🔐 **Web4 Integration** - Blockchain credentials and decentralized identity
- 📊 **Real-time Analytics** - Usage tracking and performance monitoring

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+ and npm
- Rust 1.70+ (for backend)
- PostgreSQL 14+
- Redis 6+

### **Installation**

```bash
# Clone the repository
git clone https://github.com/dgithinji331/syncsenta-studio.git
cd syncsenta-studio

# Install frontend dependencies
cd studio
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

Visit `http://localhost:5173` to access the platform.

### **Environment Setup**

Create a `.env` file in the `studio/` directory:

```bash
# Multiple Groq accounts (750 requests/day each)
GROQ_API_KEY_1=your_first_groq_key
GROQ_API_KEY_2=your_second_groq_key
GROQ_API_KEY_3=your_third_groq_key

# AISA.one for 50+ LLM models
AISA_API_KEY=your_aisa_api_key
AISA_BASE_URL=https://api.aisa.one/v1

# Firebase (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## 🏗️ **Architecture**

### **Multi-Provider AI System**

```
┌─────────────────────────────────────────────────────────────┐
│                    SyncSenta Studio                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Mwalimu    │  │  Classroom   │  │   Student    │     │
│  │   AI Tutor   │  │   Compass    │  │  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Multi-Provider AI Client                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Groq #1    │  │   Groq #2    │  │   AISA.one   │     │
│  │ (750/day)    │  │ (750/day)    │  │ (50+ models) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### **Automatic Failover Logic**

1. **Primary**: Try current Groq account
2. **Rate Limited**: Rotate to next Groq account
3. **All Groq Failed**: Fallback to AISA.one (DeepSeek V3)
4. **Complex Tasks**: Route to AISA.one (Claude 3.5 Sonnet)

## 📚 **API Endpoints**

### **Mwalimu AI Tutor**

```typescript
POST /api/mwalimu
{
  "currentMessage": "Explain fractions using Kenyan examples",
  "grade": "Grade 4",
  "subject": "Mathematics",
  "conversationId": "optional"
}
```

### **Classroom Compass**

```typescript
POST /api/classroom-compass
{
  "query": "Create a lesson plan for Grade 3 Science",
  "context": "Grade 3 Science - Plants and Animals"
}
```

### **Provider Testing**

```typescript
GET /api/test-providers    // Test all AI providers
POST /api/test-providers   // Test AI response generation
```

## 🎓 **Educational Features**

### **CBC Curriculum Alignment**

- **Grade 1-6 Support** - Complete CBC coverage
- **Subject Integration** - Mathematics, English, Kiswahili, Science, Social Studies, Creative Arts
- **Competency-Based** - Aligned with KICD standards
- **Cultural Context** - Kenyan examples and references

### **Mwalimu AI Capabilities**

- ✅ **Homework Help** - Step-by-step problem solving
- ✅ **Concept Explanation** - Age-appropriate explanations
- ✅ **Language Support** - English, Kiswahili, local languages
- ✅ **Assessment Prep** - Practice questions and feedback
- ✅ **Parent Guidance** - Tips for supporting learning at home

### **Classroom Compass Features**

- 📋 **Lesson Planning** - CBC-aligned lesson templates
- 🎯 **Learning Objectives** - Competency-based goals
- 📊 **Assessment Strategies** - Formative and summative assessments
- 🛠️ **Teaching Resources** - Local materials and activities
- 👥 **Differentiation** - Support for diverse learners

## 🔧 **Development**

### **Project Structure**

```
syncsenta-studio/
├── studio/                 # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/          # Utility libraries
│   │   └── ai/           # AI integration
├── backend/               # Rust backend
│   ├── syncsenta-backend/ # Main API server
│   ├── syncsenta-blockchain/ # Web4 integration
│   └── syncsenta-common/  # Shared utilities
├── ai-training/           # Model training scripts
└── scripts/              # Development tools
```

### **Available Scripts**

```bash
# Frontend development
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # Run ESLint
npm run typecheck       # TypeScript checking

# Backend development
cargo run               # Start Rust server
cargo test             # Run tests
cargo check            # Check compilation

# AI Training
python ai-training/scripts/setup_amd_training.py
python ai-training/scripts/train_cbc_model.py
```

## 📊 **Performance & Scaling**

### **Current Capacity**

- **Groq Free Tier**: 750 requests/day per account
- **Multiple Accounts**: Up to 7,500 requests/day (10 accounts)
- **AISA.one**: 200,000 tokens ($20 credits)
- **Combined Capacity**: 50,000-100,000 requests/month

### **Cost Optimization**

- **$0 Budget Strategy** - Leverage free tiers and credits
- **Smart Routing** - Use cost-effective models for simple tasks
- **Automatic Scaling** - Scale based on demand
- **Usage Monitoring** - Track and optimize token usage

## 🌍 **Deployment**

### **Production Deployment**

```bash
# Build frontend
cd studio
npm run build

# Build backend
cd ../backend/syncsenta-backend
cargo build --release

# Deploy to Azure (with $5,000 credits)
az containerapp create \
  --name syncsenta-studio \
  --resource-group syncsenta-prod \
  --image syncsenta:latest
```

### **Environment Variables (Production)**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/syncsenta
REDIS_URL=redis://host:6379

# AI Services
GROQ_API_KEY_1=prod_groq_key_1
AISA_API_KEY=prod_aisa_key

# Blockchain
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/key
POLYGON_PRIVATE_KEY=0x...

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## 🧪 **Testing**

### **AI Provider Testing**

```bash
# Test all providers
curl http://localhost:5173/api/test-providers

# Test specific functionality
node scripts/test_aisa_simple.js
```

### **Unit Tests**

```bash
# Frontend tests
cd studio
npm test

# Backend tests
cd backend/syncsenta-backend
cargo test
```

## 📈 **Monitoring & Analytics**

### **Built-in Monitoring**

- **Provider Health** - Real-time status of AI services
- **Usage Statistics** - Token consumption and costs
- **Performance Metrics** - Response times and success rates
- **Error Tracking** - Automatic error logging and alerts

### **Analytics Dashboard**

- **User Engagement** - Active users and session duration
- **Content Performance** - Most requested topics and subjects
- **Geographic Distribution** - Usage across Kenyan regions
- **Educational Impact** - Learning outcomes and progress tracking

## 🤝 **Contributing**

### **Development Workflow**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**

- **TypeScript**: Strict mode, no `any` types
- **Rust**: Clippy lints, no `unwrap()` in production
- **Testing**: Minimum 80% code coverage
- **Documentation**: JSDoc for functions, README for modules

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Kenya Institute of Curriculum Development (KICD)** - CBC curriculum standards
- **Groq** - Fast LLM inference
- **AISA.one** - Multi-model API access
- **AMD Developer Cloud** - GPU training resources
- **Microsoft Azure** - Cloud infrastructure credits

## 📞 **Support**

- **Email**: dgithinji331@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/dgithinji331/syncsenta-studio/issues)
- **Documentation**: [Wiki](https://github.com/dgithinji331/syncsenta-studio/wiki)

---

**Built with ❤️ for Kenyan Education**

*Empowering 100,000+ students across Kenya with AI-powered CBC learning*