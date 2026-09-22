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
