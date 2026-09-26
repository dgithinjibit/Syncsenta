# 🧪 Teacher Dashboard Testing Guide

**Date**: May 3, 2026  
**Feature**: AI-Generated Teacher Recommendations

## 🎯 What to Test

The teacher dashboard now receives **real-time AI agent feedback** and generates **actionable recommendations** for teachers.

## 📋 Testing Flow

### 1. Start All Services

```bash
# Terminal 1: Backend (Rust)
cd backend/syncsenta-backend
cargo run

# Terminal 2: AI Agents (Python)
cd ai-agents
source venv/bin/activate
SYNCSENTA_OFFLINE_DEMO=1 python -m syncsenta_agents.api.server

# Terminal 3: Frontend (Next.js)
cd studio
npm run dev
```

### 2. Open Two Browser Windows

**Window 1: Student Chat**
- URL: http://localhost:5173/student/chat
- This is where the student interacts with Mwalimu AI

**Window 2: Teacher Dashboard**
- URL: http://localhost:5173/teacher
- This is where you'll see real-time agent activity and recommendations

## 🧪 Test Scenarios

### Scenario 1: Basic Tutoring Interaction

**Student Side:**
1. Open http://localhost:5173/student/chat
2. Send a message: "What is 2 + 2?"

**Teacher Side:**
1. Open http://localhost:5173/teacher
2. Select the student from the list
3. Go to "AI Agents" tab
4. **Expected**: See agent activity with recommendation:
   - Agent: "Socratic Tutor" or "Tutoring"
   - Recommendation: "Student is actively learning. Monitor progress and provide encouragement."

### Scenario 2: Emotional Intelligence Detection

**Student Side:**
1. Send a frustrated message: "I don't understand this at all! It's too hard!"

**Teacher Side:**
1. Check "AI Agents" tab
2. **Expected**: See agent activity with recommendation:
   - Agents Used: "emotional_intelligence", "tutoring"
   - Recommendation: "Student may need emotional support. Consider checking in personally or adjusting teaching approach."

### Scenario 3: Language Translation

**Student Side:**
1. Change language to Kiswahili
2. Send a message in Swahili

**Teacher Side:**
1. Check "AI Agents" tab
2. **Expected**: See agent activity with recommendation:
   - Agents Used: "translation", "tutoring"
   - Recommendation: "Student is using language translation. Consider providing bilingual materials or extra language support."

### Scenario 4: Complex Multi-Agent Question

**Student Side:**
1. Send a complex question: "Can you explain fractions using examples from my culture? I'm feeling confused."

**Teacher Side:**
1. Check "AI Agents" tab
2. **Expected**: See agent activity with recommendation:
   - Agents Used: Multiple agents (3+)
   - Recommendation: "Complex question requiring multiple agents. Student may benefit from one-on-one tutoring session."

### Scenario 5: Teacher Intervention

**Teacher Side:**
1. Select a student
2. Go to "Chat History" tab
3. Send a message: "Great work! Keep it up!"

**Student Side:**
1. **Expected**: See teacher message appear in chat
2. **Expected**: Toast notification: "Teacher Message - Your teacher sent you a message"

## ✅ What to Verify

### Real-Time Updates
- [ ] Agent activity appears immediately when student sends message
- [ ] WebSocket status shows "Live" (green badge)
- [ ] Student status updates (online/active/idle)
- [ ] Message count updates in real-time

### Agent Activity Display
- [ ] Agent name is displayed correctly
- [ ] Agent icon matches agent type
- [ ] Confidence percentage is shown
- [ ] Timestamp is accurate
- [ ] Agents used badges appear for multi-agent interactions

### Recommendations
- [ ] Recommendation appears for each agent activity
- [ ] Recommendation is contextual and actionable
- [ ] Recommendation changes based on agent type
- [ ] Multi-agent recommendations are more detailed

### Chat History
- [ ] All messages are displayed (student, agent, teacher)
- [ ] Messages are in chronological order
- [ ] Agent name is shown for AI responses
- [ ] Teacher can send intervention messages
- [ ] Sent messages appear immediately

### Student Analytics
- [ ] Progress percentage is displayed
- [ ] Question count is accurate
- [ ] Message count is correct
- [ ] Last active time updates

## 🎯 Expected Recommendations by Agent Type

| Agent Type | Recommendation |
|------------|----------------|
| **tutoring** / **socratic_tutor** | "Student is actively learning. Monitor progress and provide encouragement." |
| **emotional_intelligence** | "Student may need emotional support. Consider checking in personally or adjusting teaching approach." |
| **translation** | "Student is using language translation. Consider providing bilingual materials or extra language support." |
| **assessment** | "Student is being assessed. Review results and provide targeted feedback." |
| **content** | "Student accessing learning materials. Ensure content is appropriate for their level." |
| **analytics** | "Performance data being analyzed. Review insights for intervention opportunities." |
| **Multi-agent (3+)** | "Complex question requiring multiple agents. Student may benefit from one-on-one tutoring session." |

## 🐛 Common Issues

### WebSocket Not Connecting
**Symptom**: Badge shows "Connecting" instead of "Live"

**Fix**:
1. Check backend is running on port 8080
2. Check browser console for WebSocket errors
3. Verify WebSocket URL: `ws://localhost:8080/api/v1/mvp/ws`

### No Agent Activity Showing
**Symptom**: "No agent activity yet" message persists

**Fix**:
1. Ensure AI agents service is running on port 8001
2. Check backend logs for agent activity broadcasts
3. Verify student has sent at least one message

### Recommendations Not Appearing
**Symptom**: Agent activity shows but no recommendation

**Fix**:
1. Check browser console for JavaScript errors
2. Verify `generateTeacherRecommendation()` function is working
3. Ensure agent type is recognized

### Messages Not Appearing in Real-Time
**Symptom**: Need to refresh to see new messages

**Fix**:
1. Check WebSocket connection status
2. Verify backend is broadcasting events
3. Check browser console for WebSocket message parsing errors

## 📊 Performance Metrics

### Expected Response Times
- **WebSocket connection**: < 1 second
- **Agent activity broadcast**: < 100ms after student message
- **Recommendation generation**: Instant (client-side)
- **Message delivery**: < 50ms via WebSocket

### Expected Behavior
- **WebSocket reconnection**: Automatic after 3 seconds if disconnected
- **Message history**: Loads on student selection
- **Student list**: Loads on dashboard mount
- **Real-time updates**: No page refresh needed

## 🎓 For Developers

### Key Files
- `studio/src/components/teacher/teacher-dashboard.tsx` - Main dashboard logic
- `studio/src/components/teacher/agent-activity.tsx` - Agent activity display
- `studio/src/components/teacher/chat-history.tsx` - Chat history viewer
- `studio/src/components/teacher/student-analytics.tsx` - Student analytics
- `backend/syncsenta-backend/src/handlers/mvp.rs` - Backend WebSocket broadcasts

### WebSocket Events
```typescript
// Student message
{ type: 'student_message', message: {...} }

// Agent response
{ type: 'agent_response', message: {...} }

// Teacher message
{ type: 'teacher_message', message: {...} }

// Agent activity (triggers recommendation)
{ 
  type: 'agent_activity',
  student_id: string,
  agent: string,
  agents_used: string[],
  response_time_ms: number
}

// Status change
{ type: 'status_change', student_id: string, status: string }
```

### Adding New Recommendations

Edit `generateTeacherRecommendation()` in `teacher-dashboard.tsx`:

```typescript
function generateTeacherRecommendation(agentData: any): string {
  // Add your custom logic here
  if (agentData.agent === 'your_new_agent') {
    return 'Your custom recommendation';
  }
  // ...
}
```

## 🚀 Next Steps

After testing, consider:
1. Adding more sophisticated recommendation logic
2. Implementing recommendation history
3. Adding teacher action tracking (did they follow the recommendation?)
4. Creating recommendation analytics
5. Adding AI-powered recommendation generation (instead of rule-based)

---

**Happy Testing! 🎉**

If you find any issues, check the browser console and backend logs for detailed error messages.
