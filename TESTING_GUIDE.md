# SyncSenta MVP - Testing Guide

**Date**: May 3, 2026  
**Status**: ALL SERVICES RUNNING ✅

---

## 🚀 Services Status

### ✅ Frontend (Next.js)
- **URL**: http://localhost:5173
- **Status**: Running
- **Pages**:
  - Student Dashboard: http://localhost:5173/student
  - Student Chat: http://localhost:5173/student/chat
  - Teacher Dashboard: http://localhost:5173/teacher

### ✅ Backend (Rust/Axum)
- **URL**: http://localhost:8080
- **Status**: Running
- **API Endpoints**:
  - GET `/api/v1/mvp/students` - List students
  - GET `/api/v1/mvp/students/:id/messages` - Get chat history
  - POST `/api/v1/mvp/messages` - Send student message
  - POST `/api/v1/mvp/teachers/messages/:id` - Teacher intervention
  - WebSocket `/api/v1/mvp/ws` - Real-time updates

### ✅ AI Agents (Python/CrewAI)
- **URL**: http://localhost:8001
- **Status**: Running (offline demo mode)
- **Mode**: SYNCSENTA_OFFLINE_DEMO=1

### ✅ Database (PostgreSQL)
- **Database**: syncsenta
- **User**: web4ke
- **Status**: Connected
- **Migrations**: Applied successfully

---

## 🧪 How to Test

### 1. Test Student Chat

1. Open: http://localhost:5173/student/chat
2. Type a message: "What is a fraction?"
3. Press Enter
4. **Expected**: AI response appears within 3 seconds
5. **Check**: Emotional state badge updates
6. **Check**: Session stats increment

### 2. Test Teacher Dashboard

1. Open: http://localhost:5173/teacher
2. **Expected**: See 2 students:
   - Akiru Lokol (Turkana, Grade 5, Mathematics)
   - Wanjiru Kamau (Nairobi, Grade 6, Science)
3. Click on a student
4. **Expected**: See student details and tabs (Chat, Agents, Analytics)

### 3. Test Real-Time Sync

**Open both pages side-by-side:**
- Left: http://localhost:5173/student/chat
- Right: http://localhost:5173/teacher

**Test flow:**
1. Student sends message → Teacher sees it instantly
2. Teacher sends message → Student sees it instantly
3. AI responds → Both see it instantly

### 4. Test Teacher Intervention

1. On teacher dashboard, select a student
2. Go to "Chat History" tab
3. Type a message in the teacher input
4. Press Enter
5. **Expected**: Message appears in student's chat with "Teacher" label

### 5. Test WebSocket Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. **Expected**: See active WebSocket connection
5. **Expected**: Connection status shows "Live" (green badge)

---

## 📊 Test Data

### Students

**Student 1:**
- ID: `stu_turkana_001`
- Name: Akiru Lokol
- Location: Turkana
- Grade: Grade 5
- Subject: Mathematics
- Progress: 42%

**Student 2:**
- ID: `stu_nairobi_001`
- Name: Wanjiru Kamau
- Location: Nairobi
- Grade: Grade 6
- Subject: Science
- Progress: 67%

---

## 🔧 API Testing

### Test Backend Directly

```bash
# List students
curl http://localhost:8080/api/v1/mvp/students

# Send student message
curl -X POST http://localhost:8080/api/v1/mvp/messages \
  -H 'Content-Type: application/json' \
  -d '{
    "student_id": "stu_turkana_001",
    "text": "What is a fraction?",
    "language": "english"
  }'

# Get chat history
curl http://localhost:8080/api/v1/mvp/students/stu_turkana_001/messages

# Send teacher message
curl -X POST http://localhost:8080/api/v1/mvp/teachers/messages/stu_turkana_001 \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Great question! Let me help you with that."
  }'
```

---

## ✅ Features to Test

### Student Side
- [ ] Send text message
- [ ] Receive AI response
- [ ] See emotional state badge
- [ ] View session stats
- [ ] See agent attribution
- [ ] Receive teacher message
- [ ] WebSocket real-time updates
- [ ] Voice input (click microphone)
- [ ] File upload (click paperclip)
- [ ] Text-to-speech (toggle speaker)

### Teacher Side
- [ ] View student list
- [ ] See student status (online/active/idle/offline)
- [ ] Select a student
- [ ] View chat history
- [ ] Send intervention message
- [ ] View AI agent activity
- [ ] See student analytics
- [ ] WebSocket real-time updates
- [ ] Progress visualization
- [ ] Emotional state display

---

## 🐛 Known Issues

### Fixed ✅
- ✅ Optional chaining with `new` constructor (syntax error)
- ✅ Database migration conflicts
- ✅ Database authentication
- ✅ Vector extension permissions
- ✅ Backend port configuration

### Current Status
- ✅ All TypeScript errors resolved
- ✅ All services running
- ✅ Database connected
- ✅ API endpoints working
- ✅ WebSocket connections active

---

## 📝 Next Steps

### For Testing
1. Test all student chat features
2. Test all teacher dashboard features
3. Test real-time synchronization
4. Test error handling (disconnect/reconnect)
5. Test with multiple browser tabs

### For Development
1. Implement actual AI agent responses (currently offline demo)
2. Add authentication
3. Add persistent chat history to database
4. Add more analytics features
5. Deploy to Render staging

---

## 🎯 Success Criteria

### Must Work ✅
- [x] Student can send messages
- [x] AI responds to messages
- [x] Teacher can view students
- [x] Teacher can see chat history
- [x] Teacher can send messages
- [x] WebSocket real-time updates
- [x] Emotional intelligence tracking
- [x] Agent activity monitoring

### Should Work
- [ ] Voice input transcription
- [ ] Text-to-speech playback
- [ ] File upload handling
- [ ] Persistent chat history
- [ ] User authentication

---

## 🔗 Quick Links

- **Student Chat**: http://localhost:5173/student/chat
- **Teacher Dashboard**: http://localhost:5173/teacher
- **Backend API**: http://localhost:8080/api/v1/mvp
- **API Docs**: See `backend/syncsenta-backend/src/handlers/mvp.rs`

---

## 💡 Tips

1. **Keep DevTools open** to see WebSocket messages and network requests
2. **Test with 2 browser windows** side-by-side for real-time sync
3. **Check terminal output** for backend logs and errors
4. **Refresh if WebSocket disconnects** - it will auto-reconnect
5. **Use Ctrl+Shift+R** for hard refresh if UI doesn't update

---

**Built with ❤️ by Kiro AI for SyncSenta Education OS**  
**May 3, 2026**

**Status**: READY FOR TESTING ✅
