# SyncSenta Studio: Improvements & Enhancements

## Overview
This document outlines the comprehensive improvements made to the SyncSenta studio repository, combining Magic School AI and Synthesis Tutor features with the existing Mwalimu AI platform for the Kenyan education sector.

## 1. Frontend Color Palette Update

### Objective
Enhance the user interface with vibrant, child-friendly colors that align with the Kenyan Competency-Based Curriculum (CBC) visual identity and modern educational design principles.

### Changes Made
- **File Modified:** `src/app/globals.css`
- **Backup Created:** `src/app/globals-original.css`

### Color Scheme
The new palette is designed for maximum engagement and readability for children aged 6-11:

| Element | Light Mode | Dark Mode | Purpose |
|---------|-----------|-----------|---------|
| **Primary Background** | Vibrant Teal (#2BA89F) | Dark Teal (#1A4D4A) | Calming yet energetic |
| **Primary Action** | Bright Orange (#FF9900) | Bright Orange (#FF9900) | Energy and enthusiasm |
| **Secondary** | Vibrant Green (#2ECC71) | Vibrant Green (#2ECC71) | Growth and learning |
| **Accent** | Hot Pink (#FF1493) | Hot Pink (#FF1493) | Playful engagement |
| **Card Background** | Soft Cream (#FFFAF0) | Medium Teal | Warm and inviting |
| **Text** | Dark Teal | White/Light Yellow | High contrast for readability |

### Design Principles Applied
1. **High Contrast:** Black on yellow and green on white for optimal legibility
2. **Psychological Impact:** Colors chosen to promote focus, creativity, and positive emotions
3. **Cultural Relevance:** Colors inspired by Kenyan CBC framework (yellow, green, blue, purple)
4. **Age-Appropriate:** Vibrant but not overwhelming for children

### Additional CSS Utilities
- `.btn-child-friendly`: Rounded, scalable buttons with hover effects
- `.card-child-friendly`: Rounded cards with shadow effects
- `.text-child-friendly`: Larger, more readable text

## 2. Dify Agent Integration

### Objective
Create an advanced AI agent that combines Magic School AI, Synthesis Tutor, and Mwalimu AI features using the Dify MCP server and Hugging Face datasets.

### Files Created

#### `src/ai/flows/dify-agent-config.ts`
Configuration file defining:
- **Integrated Datasets:** 5 Hugging Face datasets for Swahili and educational content
- **Capabilities:** 
  - Magic School AI: Lesson planning, worksheet generation, rubric creation, quiz generation
  - Synthesis Tutor: Step-by-step guidance, adaptive learning, multisensory approach
  - Mwalimu AI: Socratic tutoring, cultural relevance
- **System Prompt:** Comprehensive instructions for the agent
- **RAG Configuration:** Retrieval-Augmented Generation with curriculum grounding

#### `src/ai/flows/dify-agent-flow.ts`
Main flow implementation:
- **Input Schema:** Query, user ID, user type, subject, grade, language
- **Output Schema:** Response, suggestions, resources, metadata
- **Capability Detection:** Automatically determines which feature to use
- **Dataset Selection:** Chooses the most relevant Hugging Face dataset

#### `src/app/api/dify-agent/route.ts`
REST API endpoint:
- **POST:** Submit queries to the Dify agent
- **GET:** API documentation
- **Error Handling:** Comprehensive validation and error responses

### Hugging Face Datasets Integrated

1. **princeton-nlp/fineweb_edu-swahili-translated**
   - High-quality educational content in Swahili
   - 100K-1M examples
   - Purpose: Curriculum grounding

2. **Nadhari/Swahili-Thinking**
   - Chain-of-thought reasoning dataset
   - 166 examples
   - Purpose: Enhanced Socratic reasoning

3. **iamshnoo/alpaca-cleaned-swahili**
   - Instruction-following dataset
   - 10K-100K examples
   - Purpose: Conversational abilities

4. **Rogendo/English-Swahili-Sentence-Pairs**
   - Parallel corpus
   - 100K-1M examples
   - Purpose: Multilingual support

5. **DigitalUmuganda/Afrivoice_Swahili**
   - Multimodal audio-text dataset
   - 100K-1M examples
   - Purpose: Voice-based interactions

## 3. Feature Enhancements

### Magic School AI Integration
- **Lesson Plan Generation:** CBC-aligned lesson plans for all grades
- **Worksheet Creation:** Engaging worksheets with visual elements
- **Rubric Development:** Assessment rubrics for teachers
- **Quiz Generation:** Multiple-choice quizzes with Swahili support

### Synthesis Tutor Integration
- **Step-by-Step Guidance:** Break down complex concepts into manageable steps
- **Adaptive Learning:** Adjust explanations based on student understanding
- **Multisensory Approach:** Engage visual, auditory, and kinesthetic learners

### Mwalimu AI Enhancement
- **Socratic Method:** Refined questioning techniques
- **Cultural Relevance:** Kenyan examples and context
- **Bilingual Support:** English and Swahili

## 4. Technical Improvements

### API Endpoint
- **Route:** `/api/dify-agent`
- **Method:** POST
- **Authentication:** User ID-based
- **Rate Limiting:** Ready for implementation
- **Logging:** Comprehensive error logging

### Configuration Management
- **Centralized Config:** All agent settings in one file
- **Extensible Design:** Easy to add new capabilities
- **Type Safety:** Full TypeScript support

### Data Integration
- **RAG Pipeline:** Semantic similarity-based retrieval
- **Context Management:** 4096 token context window
- **Multi-Source Grounding:** Curriculum + HF datasets + teacher materials

## 5. Kenyan Education Sector Alignment

### CBC Curriculum Alignment
- All features aligned with Kenyan CBC learning outcomes
- Support for all grades (PP1-Grade 12)
- Subject-specific content for all core subjects

### Core Competencies Supported
1. **Communication & Collaboration:** Multilingual support
2. **Self-Efficacy:** Adaptive learning and encouragement
3. **Critical Thinking:** Socratic method and reasoning datasets
4. **Creativity:** Diverse content generation
5. **Citizenship:** Cultural relevance and values
6. **Digital Literacy:** Voice and text interfaces
7. **Learning to Learn:** Step-by-step guidance

### Language Support
- **English:** Full support
- **Swahili:** Full support with specialized datasets
- **Bilingual:** Seamless switching between languages

## 6. Testing & Validation

### Recommended Tests
1. **Unit Tests:** Test each capability independently
2. **Integration Tests:** Test Dify agent with Hugging Face datasets
3. **User Acceptance Tests:** Validate with Kenyan teachers and students
4. **Accessibility Tests:** Ensure color contrast and readability

### Quality Metrics
- **Student Engagement:** Track interaction frequency
- **Learning Outcomes:** Measure progress against CBC outcomes
- **Teacher Satisfaction:** Gather feedback on tools
- **Content Relevance:** Ensure curriculum alignment

## 7. Deployment Considerations

### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
HUGGINGFACE_API_KEY=your_key
DIFY_API_KEY=your_key
GOOGLE_API_KEY=your_key
```

### Database Migrations
- Ensure Firestore collections are set up for learning summaries
- Create indexes for efficient querying

### Scaling Considerations
- Use Redis for caching Hugging Face dataset responses
- Implement rate limiting for API endpoints
- Consider load balancing for high traffic

## 8. Future Enhancements

### Short Term
- [ ] Implement voice-based interactions using Afrivoice dataset
- [ ] Add progress tracking dashboard for teachers
- [ ] Create mobile app version with offline support

### Medium Term
- [ ] Integrate more African languages
- [ ] Add assessment and grading automation
- [ ] Implement peer learning features

### Long Term
- [ ] Expand to secondary and tertiary education
- [ ] Create teacher professional development modules
- [ ] Build district-level analytics dashboard

## 9. Files Modified/Created

### Modified Files
- `src/app/globals.css` - Updated color palette

### New Files
- `src/app/globals-original.css` - Backup of original colors
- `src/app/globals-updated.css` - Updated colors (merged into globals.css)
- `src/ai/flows/dify-agent-config.ts` - Agent configuration
- `src/ai/flows/dify-agent-flow.ts` - Agent flow implementation
- `src/app/api/dify-agent/route.ts` - API endpoint
- `IMPROVEMENTS.md` - This document

## 10. References

### Kenyan Education Resources
- [KICD Basic Education Curriculum Framework](https://kicd.ac.ke)
- [Kenyan CBC Curriculum Documents](https://www.education.go.ke)

### Hugging Face Datasets
- [FineWeb Educational Content](https://huggingface.co/datasets/princeton-nlp/fineweb_edu-swahili-translated)
- [Swahili Thinking Dataset](https://huggingface.co/datasets/Nadhari/Swahili-Thinking)
- [Swahili Instruction Dataset](https://huggingface.co/datasets/iamshnoo/alpaca-cleaned-swahili)

### Design References
- [Child-Friendly Color Palettes](https://www.uxmatters.com/mt/archives/2011/10/effective-use-of-color-and-graphics-in-applications-for-children-part-i-toddlers-and-preschoolers.php)
- [Color Psychology in E-Learning](https://www.shiftelearning.com/blog/bid/348188/6-ways-color-psychology-can-be-used-to-design-effective-elearning)

## 11. Support & Maintenance

### Reporting Issues
- Create issues on GitHub with detailed descriptions
- Include screenshots and reproduction steps
- Tag with relevant labels (bug, enhancement, documentation)

### Contributing
- Follow the existing code style
- Add tests for new features
- Update documentation
- Submit pull requests for review

## 12. License & Attribution

© 2025 SyncSenta. All rights reserved.

This improvement maintains the "© 2025 3D" credit as specified in the original requirements.

---

**Last Updated:** April 28, 2026
**Version:** 2.0.0
**Status:** Ready for PR
# SyncSenta Multi-Agent System Documentation

## Overview

The SyncSenta Multi-Agent System is an advanced orchestration layer that combines three specialized agents to provide comprehensive educational support for the Kenyan education sector. This system leverages Daniel Githinji's existing repositories to create a unified, intelligent platform for students and teachers.

## Architecture

### System Components

The multi-agent system consists of three specialized agents working under a central orchestrator:

**1. Mwalimu AI Expert Agent**
- **Purpose:** Master authority on the Kenyan CBC curriculum
- **Data Source:** Synthesized from `scheme-genie`, `scheme-scribe-ai`, `Syncsenta_local`, and `WisdomEdu` repositories
- **Capabilities:** Curriculum guidance, lesson planning, strand-based instruction, cultural integration
- **Trigger:** General curriculum queries, default fallback

**2. Kikuyu Translation Agent**
- **Purpose:** Specialized bilingual assistant for Kikuyu-English learning
- **Data Source:** LughaBridge (voice translation) and igbo-bilingual-chat (conversational approach)
- **Capabilities:** Accurate translation, idiom explanation, cultural context, CBC Indigenous Language curriculum alignment
- **Trigger:** Kikuyu language preference or indigenous language learning queries

**3. Dify Agent**
- **Purpose:** Advanced content generation and adaptive learning
- **Data Source:** Hugging Face datasets (Swahili, educational content, chain-of-thought reasoning)
- **Capabilities:** Magic School AI features (lesson plans, worksheets, quizzes), Synthesis Tutor (step-by-step guidance)
- **Trigger:** Content generation requests, advanced pedagogical features

### Orchestration Flow

```
User Query
    ↓
Route Analysis
    ↓
Agent Selection (based on query content & language preference)
    ↓
Agent Processing
    ↓
Response Generation
    ↓
User Response
```

## Implementation Details

### Files Created

| File | Purpose |
|------|---------|
| `src/ai/flows/mwalimu-expert-config.ts` | Mwalimu Expert configuration and system prompt |
| `src/ai/flows/kikuyu-agent-config.ts` | Kikuyu Translation Agent configuration |
| `src/ai/flows/multi-agent-orchestrator.ts` | Main orchestration logic and routing |
| `src/app/api/multi-agent/route.ts` | REST API endpoint for the multi-agent system |

### Key Features

**Intelligent Routing**
The orchestrator automatically selects the most appropriate agent based on:
- User's preferred language (English, Swahili, Kikuyu)
- Query content and keywords
- User type (student, teacher, admin)
- Subject and grade level

**Language Support**
- **English (en):** Default language
- **Swahili (sw):** Native support via Dify agent
- **Kikuyu (ki):** Specialized Kikuyu Translation Agent

**CBC Alignment**
All agents are grounded in the Kenyan Competency-Based Curriculum:
- Seven core competencies
- All subject strands and sub-strands
- Cultural values and integration
- Learning outcomes for all grades

## API Usage

### Endpoint

```
POST /api/multi-agent
```

### Request Schema

```json
{
  "query": "How do I teach fractions in Grade 4?",
  "userId": "teacher_12345",
  "userType": "teacher",
  "preferredLanguage": "en",
  "subject": "Mathematics",
  "grade": "Grade 4",
  "context": {}
}
```

### Response Schema

```json
{
  "response": "To teach fractions in Grade 4 aligned with CBC...",
  "agentUsed": "mwalimu_expert",
  "suggestions": [
    "Explore fraction visualization activities",
    "Connect to real-world examples (sharing food, dividing land)"
  ],
  "metadata": {
    "language": "en",
    "confidence": 0.92,
    "processingTime": 234
  }
}
```

### Example Requests

**Request 1: Curriculum Guidance**
```json
{
  "query": "What are the learning outcomes for Grade 5 Mathematics?",
  "userId": "teacher_001",
  "userType": "teacher",
  "subject": "Mathematics",
  "grade": "Grade 5"
}
```
**Expected Agent:** Mwalimu Expert

**Request 2: Kikuyu Learning**
```json
{
  "query": "Teach me how to greet in Kikuyu",
  "userId": "student_042",
  "userType": "student",
  "preferredLanguage": "ki"
}
```
**Expected Agent:** Kikuyu Translator

**Request 3: Lesson Plan Generation**
```json
{
  "query": "Generate a lesson plan for teaching photosynthesis in Grade 6",
  "userId": "teacher_015",
  "userType": "teacher",
  "subject": "Science",
  "grade": "Grade 6"
}
```
**Expected Agent:** Dify Agent

## Integration with Studio Frontend

### For Students

When a student selects "Indigenous Language" as their learning area, they are automatically connected to the Kikuyu Translation Agent:

```typescript
// In Studio frontend
if (selectedLearningArea === 'Indigenous Language') {
  const response = await fetch('/api/multi-agent', {
    method: 'POST',
    body: JSON.stringify({
      query: userInput,
      userId: currentUser.id,
      userType: 'student',
      preferredLanguage: 'ki',
    }),
  });
}
```

### For Teachers

Teachers can access all agents through the main orchestrator:

```typescript
// In Studio frontend (teacher dashboard)
const response = await fetch('/api/multi-agent', {
  method: 'POST',
  body: JSON.stringify({
    query: teacherQuery,
    userId: currentUser.id,
    userType: 'teacher',
    subject: selectedSubject,
    grade: selectedGrade,
  }),
});
```

## Data Sources and Grounding

### CBC Curriculum Data

Extracted from Daniel Githinji's repositories:

| Repository | Data Type | Coverage |
|------------|-----------|----------|
| `scheme-genie` | Schemes of work | All subjects, all grades |
| `scheme-scribe-ai` | Curriculum strands | Detailed strand definitions |
| `Syncsenta_local` | Offline curriculum | KCSE, KCPE, CBC |
| `WisdomEdu` | Educational content | Subject-specific materials |

### Translation Data

| Repository | Data Type | Coverage |
|------------|-----------|----------|
| `LughaBridge` | Kikuyu-English pairs | Common phrases, cultural context |
| `igbo-bilingual-chat` | Bilingual approach | Conversational patterns, fine-tuning methodology |

### Hugging Face Datasets

| Dataset | Purpose |
|---------|---------|
| `princeton-nlp/fineweb_edu-swahili-translated` | Educational content grounding |
| `Nadhari/Swahili-Thinking` | Chain-of-thought reasoning |
| `iamshnoo/alpaca-cleaned-swahili` | Instruction-following |
| `Rogendo/English-Swahili-Sentence-Pairs` | Multilingual support |
| `DigitalUmuganda/Afrivoice_Swahili` | Voice interactions |

## Deployment Considerations

### Environment Setup

```bash
# Install dependencies
npm install

# Set environment variables
export HUGGINGFACE_API_KEY=your_key
export DIFY_API_KEY=your_key
export GOOGLE_API_KEY=your_key
```

### Database

Ensure Firestore collections are configured for:
- User interactions
- Learning summaries
- Agent usage logs
- Performance metrics

### Performance Optimization

1. **Caching:** Cache frequently accessed CBC curriculum data
2. **Rate Limiting:** Implement per-user rate limits for API calls
3. **Load Balancing:** Distribute agent processing across multiple instances
4. **Monitoring:** Track agent performance and user satisfaction

## Future Enhancements

### Short Term
- [ ] Implement Dify MCP integration for advanced features
- [ ] Add voice input/output for Kikuyu agent
- [ ] Create teacher dashboard with agent analytics

### Medium Term
- [ ] Expand to other Kenyan indigenous languages (Luo, Maasai, etc.)
- [ ] Implement assessment automation
- [ ] Add peer learning features

### Long Term
- [ ] Extend to secondary and tertiary education
- [ ] Create district-level analytics
- [ ] Build teacher professional development modules

## Testing

### Unit Tests

Test each agent independently:

```typescript
// Example: Test Mwalimu Expert routing
const input = {
  query: "What is the CBC curriculum?",
  userId: "test_user",
  userType: "teacher",
};
const result = await multiAgentOrchestrator(input);
expect(result.agentUsed).toBe('mwalimu_expert');
```

### Integration Tests

Test agent routing and orchestration:

```typescript
// Test Kikuyu agent routing
const input = {
  query: "Teach me Kikuyu",
  userId: "test_user",
  userType: "student",
  preferredLanguage: "ki",
};
const result = await multiAgentOrchestrator(input);
expect(result.agentUsed).toBe('kikuyu_translator');
```

### User Acceptance Tests

Validate with Kenyan teachers and students:
- Query accuracy
- Cultural relevance
- Language appropriateness
- Response quality

## Support and Maintenance

### Reporting Issues

Create GitHub issues with:
- Query that caused the issue
- Expected vs. actual response
- Agent that was used
- User type and context

### Contributing

To add new agents or enhance existing ones:
1. Create a new agent config file
2. Implement agent logic in the orchestrator
3. Add routing rules
4. Write tests
5. Submit a pull request

## References

### Kenyan Education Standards
- [KICD CBC Framework](https://kicd.ac.ke)
- [Kenyan Ministry of Education](https://www.education.go.ke)

### Technical References
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Dify MCP Integration](https://docs.dify.ai)
- [Hugging Face Datasets](https://huggingface.co/datasets)

### Related Repositories
- [LughaBridge](https://github.com/dgithinjibit/LughaBridge)
- [igbo-bilingual-chat](https://github.com/Nwokike/igbo-bilingual-chat)
- [scheme-genie](https://github.com/dgithinjibit/scheme-genie)
- [scheme-scribe-ai](https://github.com/dgithinjibit/scheme-scribe-ai)

---

**Last Updated:** April 28, 2026
**Version:** 2.0.0
**Status:** Ready for Integration
