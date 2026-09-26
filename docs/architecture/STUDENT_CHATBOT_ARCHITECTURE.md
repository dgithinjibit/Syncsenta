# Student Chatbot Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STUDENT BROWSER                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  MwalimuChat Component (React/TypeScript)                   │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │ Text Input   │  │ Voice Input  │  │ File Upload  │    │   │
│  │  │ (Textarea)   │  │ (Web Speech) │  │ (File API)   │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │         Message Display (ScrollArea)                  │ │   │
│  │  │  • Student messages (right-aligned, blue)            │ │   │
│  │  │  • Agent messages (left-aligned, gray)               │ │   │
│  │  │  • Teacher messages (left-aligned, blue)             │ │   │
│  │  │  • Agent attribution badges                          │ │   │
│  │  │  • Timestamps                                        │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │ TTS Controls │  │ Emotional    │  │ Connection   │    │   │
│  │  │ (Auto-speak) │  │ State Badge  │  │ Status       │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Sidebar (Desktop/Tablet)                                   │   │
│  │  • Emotional Intelligence Dashboard                         │   │
│  │  • Session Statistics                                       │   │
│  │  • AI Agents Info                                           │   │
│  │  • Quick Tips                                               │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /api/v1/mvp/messages
                              │ WebSocket /api/v1/mvp/ws
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Rust/Axum)                               │
│                    Port: 3000                                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  MVP Handler (handlers/mvp.rs)                              │   │
│  │                                                              │   │
│  │  POST /messages                                             │   │
│  │  • Validate student_id                                      │   │
│  │  • Store student message                                    │   │
│  │  • Call AI Agents Service                                   │   │
│  │  • Store agent response                                     │   │
│  │  • Broadcast via WebSocket                                  │   │
│  │                                                              │   │
│  │  GET /students/:id/messages                                 │   │
│  │  • Load chat history from memory                            │   │
│  │                                                              │   │
│  │  WebSocket /ws                                              │   │
│  │  • Subscribe to broadcast channel                           │   │
│  │  • Send events to all connected clients                     │   │
│  │    - student_message                                        │   │
│  │    - agent_response                                         │   │
│  │    - teacher_message                                        │   │
│  │    - agent_activity                                         │   │
│  │    - status_change                                          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  In-Memory State                                            │   │
│  │  • Student roster (2 students: Turkana, Nairobi)           │   │
│  │  • Chat history (HashMap<student_id, Vec<Message>>)        │   │
│  │  • Broadcast channel (tokio::sync::broadcast)              │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /agents/chat
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  AI AGENTS SERVICE (Python/CrewAI)                   │
│                  Port: 8001                                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  FastAPI Server (api/server.py)                             │   │
│  │                                                              │   │
│  │  POST /agents/chat                                          │   │
│  │  • Receive student message                                  │   │
│  │  • Route to Orchestrator                                    │   │
│  │  • Return agent response                                    │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Orchestrator (orchestrator/main.py)                        │   │
│  │                                                              │   │
│  │  • Analyze student message                                  │   │
│  │  • Select appropriate agents                                │   │
│  │  • Coordinate multi-agent workflow                          │   │
│  │  • Synthesize final response                                │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  7 Specialized AI Agents                                    │   │
│  │                                                              │   │
│  │  1. Tutoring Agent (agents/tutoring.py)                     │   │
│  │     • Socratic teaching method                              │   │
│  │     • CBC curriculum grounding                              │   │
│  │     • Adaptive difficulty                                   │   │
│  │                                                              │   │
│  │  2. Emotional Intelligence Agent                            │   │
│  │     • Detect student emotional state                        │   │
│  │     • Adapt teaching approach                               │   │
│  │     • Provide encouragement                                 │   │
│  │                                                              │   │
│  │  3. Assessment Agent                                        │   │
│  │     • Track learning progress                               │   │
│  │     • Identify knowledge gaps                               │   │
│  │     • Recommend next topics                                 │   │
│  │                                                              │   │
│  │  4. Translation Agent                                       │   │
│  │     • English ↔ Kiswahili ↔ Gikuyu                         │   │
│  │     • Cultural context adaptation                           │   │
│  │     • Code-switching support                                │   │
│  │                                                              │   │
│  │  5. Analytics Agent                                         │   │
│  │     • Learning pattern analysis                             │   │
│  │     • Performance insights                                  │   │
│  │     • Personalization recommendations                       │   │
│  │                                                              │   │
│  │  6. Content Agent                                           │   │
│  │     • CBC curriculum retrieval                              │   │
│  │     • Example generation                                    │   │
│  │     • Resource recommendations                              │   │
│  │                                                              │   │
│  │  7. Teacher Orchestrator Agent                              │   │
│  │     • Coordinate all agents                                 │   │
│  │     • Escalate to human teacher                             │   │
│  │     • Generate teacher insights                             │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Student Sends Message

```
Student types "What is a fraction?" and presses Enter
                    ↓
MwalimuChat component creates Message object
                    ↓
POST /api/v1/mvp/messages
{
  student_id: "stu_turkana_001",
  text: "What is a fraction?",
  language: "english"
}
                    ↓
Backend MVP handler receives request
                    ↓
Store student message in memory
                    ↓
Broadcast student_message event via WebSocket
                    ↓
Call AI Agents Service
POST /agents/chat
{
  message: "What is a fraction?",
  user_id: "stu_turkana_001",
  grade: "Grade 5",
  subject: "Mathematics",
  language: "english",
  role: "student"
}
```

### 2. AI Agents Process Message

```
AI Agents Service receives request
                    ↓
Orchestrator analyzes message
• Detects: Math question about fractions
• Selects agents: Tutoring, Emotional Intelligence, Content
                    ↓
Tutoring Agent generates Socratic response
"Great question! Before I explain, can you tell me what you 
 think happens when we divide something into equal parts?"
                    ↓
Emotional Intelligence Agent detects state
• State: engaged (student asking questions)
• Confidence: 0.8
• Indicators: ["Active participation", "Curiosity"]
                    ↓
Content Agent retrieves CBC curriculum
• Grade 5 Mathematics
• Topic: Fractions - Introduction
• Learning outcomes: Understand parts of a whole
                    ↓
Orchestrator synthesizes final response
{
  response: "Great question! Before I explain...",
  primary_agent: "tutoring",
  agents_used: ["tutoring", "emotional_intelligence", "content"],
  response_time_ms: 1250,
  fallback_used: false
}
```

### 3. Backend Returns Response

```
Backend receives AI response
                    ↓
Store agent message in memory
                    ↓
Broadcast agent_response event via WebSocket
                    ↓
Broadcast agent_activity event via WebSocket
{
  type: "agent_activity",
  student_id: "stu_turkana_001",
  agent: "tutoring",
  agents_used: ["tutoring", "emotional_intelligence", "content"],
  response_time_ms: 1250
}
                    ↓
Return HTTP response to frontend
{
  student_message: {...},
  agent_message: {...},
  primary_agent: "tutoring",
  agents_used: ["tutoring", "emotional_intelligence", "content"],
  fallback_used: false
}
```

### 4. Frontend Displays Response

```
MwalimuChat receives HTTP response
                    ↓
Add agent message to messages array
                    ↓
Update emotional state based on agent_activity
                    ↓
Trigger onEmotionalStateChange callback
                    ↓
If auto-speak enabled, call speakText()
                    ↓
Web Speech API reads response aloud
                    ↓
Auto-scroll to bottom of chat
                    ↓
Student sees response and can continue conversation
```

## WebSocket Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend connects to WebSocket                                  │
│  ws://localhost:3000/api/v1/mvp/ws                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend sends "hello" event                                     │
│  { type: "hello", ts: "2026-05-03T10:30:00Z" }                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Student sends message via HTTP                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend broadcasts "student_message" event                      │
│  {                                                               │
│    type: "student_message",                                     │
│    message: {                                                   │
│      id: "uuid",                                                │
│      student_id: "stu_turkana_001",                            │
│      sender: "student",                                         │
│      text: "What is a fraction?",                              │
│      timestamp: "2026-05-03T10:30:01Z"                         │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend broadcasts "agent_response" event                       │
│  {                                                               │
│    type: "agent_response",                                      │
│    message: {                                                   │
│      id: "uuid",                                                │
│      student_id: "stu_turkana_001",                            │
│      sender: "agent",                                           │
│      text: "Great question! Before I explain...",              │
│      agent: "tutoring",                                         │
│      agents_used: ["tutoring", "emotional_intelligence"],      │
│      timestamp: "2026-05-03T10:30:02Z"                         │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend broadcasts "agent_activity" event                       │
│  {                                                               │
│    type: "agent_activity",                                      │
│    student_id: "stu_turkana_001",                              │
│    agent: "tutoring",                                           │
│    agents_used: ["tutoring", "emotional_intelligence"],        │
│    response_time_ms: 1250                                       │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend receives all events and updates UI                     │
│  • Add messages to chat                                          │
│  • Update emotional state                                        │
│  • Trigger auto-speak if enabled                                 │
│  • Show toast notifications                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Component State Management

```
┌─────────────────────────────────────────────────────────────────┐
│  MwalimuChat Component State                                     │
│                                                                  │
│  messages: Message[]                                            │
│  • All chat messages (student, agent, teacher)                  │
│  • Loaded from backend on mount                                 │
│  • Updated via WebSocket events                                 │
│                                                                  │
│  inputText: string                                              │
│  • Current textarea value                                       │
│  • Cleared after sending message                                │
│                                                                  │
│  isLoading: boolean                                             │
│  • True while waiting for agent response                        │
│  • Shows loading spinner                                        │
│                                                                  │
│  isRecording: boolean                                           │
│  • True while recording voice input                             │
│  • Changes mic button color                                     │
│                                                                  │
│  isSpeaking: boolean                                            │
│  • True while text-to-speech is active                          │
│  • Disables speak buttons                                       │
│                                                                  │
│  autoSpeak: boolean                                             │
│  • Toggle for automatic text-to-speech                          │
│  • Persisted in component state                                 │
│                                                                  │
│  emotionalState: EmotionalState                                 │
│  • Current detected emotional state                             │
│  • Updated via agent_activity events                            │
│  • Triggers onEmotionalStateChange callback                     │
│                                                                  │
│  wsConnected: boolean                                           │
│  • WebSocket connection status                                  │
│  • Shows connection indicator badge                             │
│                                                                  │
│  sessionId: string                                              │
│  • Unique session identifier                                    │
│  • Generated on component mount                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│  Error Scenarios                                                 │
│                                                                  │
│  1. Backend API Unavailable                                     │
│     • HTTP request fails                                        │
│     • Show error toast                                          │
│     • Keep message in input for retry                           │
│                                                                  │
│  2. AI Agents Service Down                                      │
│     • Backend returns fallback_used: true                       │
│     • Show "Limited Mode" toast                                 │
│     • Display fallback message to student                       │
│                                                                  │
│  3. WebSocket Connection Lost                                   │
│     • wsConnected set to false                                  │
│     • Show "Connecting..." badge                                │
│     • Auto-reconnect after 3 seconds                            │
│     • Fallback to HTTP-only mode                                │
│                                                                  │
│  4. Voice Input Not Supported                                   │
│     • Check for Web Speech API                                  │
│     • Show error toast                                          │
│     • Disable microphone button                                 │
│                                                                  │
│  5. Text-to-Speech Not Supported                                │
│     • Check for Speech Synthesis API                            │
│     • Show error toast                                          │
│     • Disable speaker buttons                                   │
│                                                                  │
│  6. File Upload Fails                                           │
│     • Show error toast                                          │
│     • Clear file input                                          │
│     • Allow retry                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Optimizations

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Optimizations                                          │
│                                                                  │
│  • useCallback for all event handlers                           │
│  • useMemo for expensive computations                           │
│  • Debounced textarea input                                     │
│  • Lazy WebSocket connection                                    │
│  • Auto-cleanup on unmount                                      │
│  • Efficient re-renders with React.memo                         │
│  • Virtual scrolling for long message lists (future)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend Optimizations                                           │
│                                                                  │
│  • In-memory state (no DB queries)                              │
│  • Broadcast channel for WebSocket fan-out                      │
│  • Async/await for non-blocking I/O                             │
│  • Connection pooling for AI service                            │
│  • Timeout handling (30s max)                                   │
│  • Graceful degradation on errors                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  AI Agents Optimizations                                         │
│                                                                  │
│  • Parallel agent execution                                     │
│  • Response caching (future)                                    │
│  • Model quantization for speed                                 │
│  • Batch processing for multiple students                       │
│  • GPU acceleration (AMD ROCm)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Built with ❤️ by Kiro AI for SyncSenta Education OS**  
**May 3, 2026**
