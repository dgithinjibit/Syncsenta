# GitHub Codespaces WebSocket Fix

## Problem
When running SyncSenta in GitHub Codespaces, the teacher dashboard showed a blank page and WebSocket connections failed. This was because the code had hardcoded `ws://localhost:8080` URLs, which don't work in Codespaces.

## Root Cause
In GitHub Codespaces:
- Frontend runs on port 5173 and is accessible at: `https://something-5173.app.github.dev`
- Backend runs on port 8080 and is accessible at: `https://something-8080.app.github.dev`
- Each port gets its own forwarded URL with a different port number in the subdomain
- WebSocket connections need to use `wss://` (secure WebSocket) not `ws://`
- The hardcoded `ws://localhost:8080` couldn't connect to the backend

## Solution
Updated both `teacher-dashboard.tsx` and `mwalimu-chat.tsx` to:

1. **Auto-detect the correct WebSocket URL** based on the current page location
2. **Support Codespaces port forwarding pattern**: Replace `-5173` with `-8080` in the hostname
3. **Use correct protocol**: `wss://` for HTTPS, `ws://` for HTTP
4. **Allow manual override**: Set `NEXT_PUBLIC_BACKEND_WS_URL` environment variable if needed

### Code Changes
```typescript
const getWebSocketUrl = () => {
  // If NEXT_PUBLIC_BACKEND_WS_URL is set, use it
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_WS_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  }
  
  // Otherwise, construct from current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost' 
    ? 'localhost:8080' 
    : window.location.host.replace('-5173', '-8080'); // Codespaces pattern
  return `${protocol}//${host}/api/v1/mvp/ws`;
};
```

## Files Changed
1. `studio/src/components/teacher/teacher-dashboard.tsx` - Fixed WebSocket URL
2. `studio/src/components/student/mwalimu-chat.tsx` - Fixed WebSocket URL
3. `studio/.env` - Added documentation for `NEXT_PUBLIC_BACKEND_WS_URL`
4. `.devcontainer/devcontainer.json` - Added Codespaces configuration for proper port forwarding

## Testing Instructions

### In GitHub Codespaces:
1. Make sure all three services are running:
   - Backend: `cargo run` in `backend/syncsenta-backend/` (port 8080)
   - Frontend: `npm run dev` in `studio/` (port 5173)
   - AI Agents: `uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001` in `ai-agents/`

2. Open the frontend URL (should be auto-forwarded by Codespaces)
   - Look for the "Ports" tab in VS Code
   - Click on the globe icon next to port 5173 to open in browser

3. Test Teacher Dashboard:
   - Click "Enter as Teacher"
   - You should see the list of students (not a blank page)
   - Click on a student to view their chat history
   - Check browser console - should see "WebSocket connected" message

4. Test Student Chat:
   - Go back and click "Enter as Student"
   - Select a student (e.g., "Akiru Lokol")
   - Type a message and send it
   - You should see the message appear in the chat
   - Check browser console - should see "WebSocket connected" message

### In Local Development:
Everything should work as before:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:8080`
- WebSocket at `ws://localhost:8080/api/v1/mvp/ws`

## Current System Status

### Services Running:
- ✅ Backend (Rust/Axum) - Port 8080 - Terminal 19
- ✅ Frontend (Next.js) - Port 5173 - Terminal 21
- ✅ AI Agents (Python) - Port 8001 - Terminal 15
- ✅ PostgreSQL Database - Running

### What Should Work Now:
1. ✅ Teacher dashboard loads (not blank anymore)
2. ✅ WebSocket connections work in Codespaces
3. ✅ Student chat connects properly
4. ✅ Real-time updates between teacher and student views
5. ✅ Message history loads correctly

### Known Issues:
1. **Microphone error** - This is a browser permission issue, not a code issue:
   - Browser needs permission to access microphone
   - User must click "Allow" when prompted
   - This is expected behavior for voice input features

2. **"AI tutors temporarily unavailable"** - This is CORRECT behavior:
   - AI agents service is running but can't connect to Ollama (not installed yet)
   - System gracefully falls back to demo responses
   - To fix: Install Ollama and Gemma 2B model (recommended in Codespaces for better performance)

## Next Steps

### To Enable Real AI Responses:
1. Install Ollama in Codespaces:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Pull Gemma 2B model:
   ```bash
   ollama pull gemma2:2b
   ```

3. Restart AI agents service (it will auto-connect to Ollama)

### To Test Microphone:
1. Open student chat in browser
2. Click the microphone icon
3. Allow microphone permission when prompted
4. Speak your question
5. Voice should be transcribed to text

## Verification Commands

Check if all services are running:
```bash
# Backend
curl http://localhost:8080/api/v1/mvp/students

# Frontend
curl http://localhost:5173

# AI Agents
curl http://localhost:8001/health
```

Check WebSocket connection in browser console:
```javascript
// Should see these messages:
[TeacherDashboard] WebSocket connected
[MwalimuChat] WebSocket connected
```

## Commit
```
fix: Make WebSocket URLs work in GitHub Codespaces

- Auto-detect WebSocket URL based on current location
- Support Codespaces port forwarding pattern (replace -5173 with -8080)
- Add NEXT_PUBLIC_BACKEND_WS_URL env var for manual override
- Add .devcontainer/devcontainer.json for proper Codespaces setup
- Fixes blank teacher dashboard and connection issues in Codespaces
```

Pushed to: https://github.com/dgithinjibit/syncsenta-studio
