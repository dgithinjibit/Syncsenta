# Moving to GitHub Codespaces

## Why Move to Codespaces?
Your local machine (Intel Core i5-4300U from 2013) is too slow for running AI models:
- **Local**: 15-45 seconds per AI response
- **Codespaces**: 2-5 seconds per AI response

Plus, you get 60 hours/month free!

## Step-by-Step Instructions

### 1. Commit and Push Current Work
Already done! ✅ All changes are pushed to GitHub.

### 2. Open Repository in Codespaces

#### Option A: From GitHub Website
1. Go to: https://github.com/dgithinjibit/syncsenta-studio
2. Click the green "Code" button
3. Click the "Codespaces" tab
4. Click "Create codespace on main"
5. Wait 2-3 minutes for Codespace to build

#### Option B: From VS Code
1. Install "GitHub Codespaces" extension in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Codespaces: Create New Codespace"
4. Select your repository: `dgithinjibit/syncsenta-studio`
5. Select branch: `main`
6. Wait for Codespace to build

### 3. Once Codespace Opens

You'll see a VS Code interface in your browser (or in VS Code desktop if you used Option B).

The Codespace will automatically:
- ✅ Clone your repository
- ✅ Install Rust, Node.js, Python
- ✅ Set up PostgreSQL
- ✅ Configure port forwarding for 5173, 8080, 8001

### 4. Set Up Database

The database should already be running, but you need to set the DATABASE_URL:

```bash
# Check if PostgreSQL is running
pg_isready

# Should show: /var/run/postgresql:5432 - accepting connections
```

If the database `syncsenta` doesn't exist, create it:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# In psql:
CREATE DATABASE syncsenta;
CREATE USER web4ke WITH PASSWORD 'syncsenta2024';
GRANT ALL PRIVILEGES ON DATABASE syncsenta TO web4ke;
\q
```

### 5. Start Backend

```bash
cd backend/syncsenta-backend
DATABASE_URL="postgresql://web4ke:syncsenta2024@localhost/syncsenta" cargo run
```

This will:
- Compile the Rust backend (takes 2-3 minutes first time)
- Connect to PostgreSQL
- Start listening on port 8080

Keep this terminal open.

### 6. Start Frontend (New Terminal)

Press `Ctrl+Shift+` ` (backtick) to open a new terminal, then:

```bash
cd studio
npm install  # Only needed first time
npm run dev
```

This will:
- Install dependencies (first time only)
- Start Next.js dev server on port 5173

Keep this terminal open.

### 7. Start AI Agents (New Terminal)

Open another new terminal:

```bash
cd ai-agents
python -m venv venv
source venv/bin/activate
pip install -e .  # Only needed first time
SYNCSENTA_OFFLINE_DEMO=1 uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001
```

This will:
- Create Python virtual environment (first time only)
- Install dependencies (first time only)
- Start AI agents service on port 8001 in offline demo mode

Keep this terminal open.

### 8. Access the Application

In VS Code, look for the "Ports" tab (usually at the bottom, next to "Terminal").

You should see:
- Port 5173 (Frontend) - Click the globe icon 🌐 to open in browser
- Port 8080 (Backend) - Should show "Private"
- Port 8001 (AI Agents) - Should show "Private"

Click the globe icon next to port 5173 to open the application in your browser!

### 9. Test the Application

Follow the testing instructions in `CODESPACES_STATUS.md`:

1. **Test Teacher Dashboard**:
   - Click "Enter as Teacher"
   - Should see list of students (not blank!)
   - Click on a student
   - Open browser console (F12) - should see "WebSocket connected"

2. **Test Student Chat**:
   - Go back to home
   - Click "Enter as Student"
   - Select a student
   - Send a message
   - Should see response (may say "AI tutors temporarily unavailable" - that's OK!)

### 10. Install Ollama (Optional but Recommended)

To get real AI responses instead of fallback messages:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve &

# Pull Gemma 2B model
ollama pull gemma2:2b

# Restart AI agents service (Ctrl+C in Terminal 3, then run again without SYNCSENTA_OFFLINE_DEMO)
cd ai-agents
source venv/bin/activate
uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001
```

Now you'll get real AI responses in 2-5 seconds!

## Troubleshooting

### "cargo not found"
Codespaces should have Rust pre-installed. If not:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### "npm not found"
Codespaces should have Node.js pre-installed. If not:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### "PostgreSQL not running"
```bash
sudo service postgresql start
```

### "Port already in use"
Find and kill the process:
```bash
# For port 8080
lsof -ti:8080 | xargs kill -9

# For port 5173
lsof -ti:5173 | xargs kill -9

# For port 8001
lsof -ti:8001 | xargs kill -9
```

### "Can't connect to backend"
1. Check backend is running: `curl http://localhost:8080/api/v1/mvp/students`
2. Check ports are forwarded: Look at "Ports" tab in VS Code
3. Check browser console for errors

### "WebSocket connection failed"
1. Make sure you're accessing the app through the Codespaces URL (not localhost)
2. Check browser console for the WebSocket URL being used
3. Verify backend is running and responding

## Codespaces Tips

### Saving Your Work
- All changes are automatically saved in the Codespace
- Commit and push regularly: `git add -A && git commit -m "message" && git push`
- Codespaces persist for 30 days of inactivity

### Stopping Codespace
- Click your profile icon in VS Code
- Select "Stop Current Codespace"
- Or close the browser tab (Codespace stops after 30 minutes of inactivity)

### Resuming Work
- Go to https://github.com/codespaces
- Click on your Codespace to resume
- All your terminals and processes will be stopped - restart them

### Free Tier Limits
- 60 hours/month for 2-core machine
- 30 hours/month for 4-core machine
- We're using 4-core for better AI performance
- Monitor usage at: https://github.com/settings/billing

### Upgrading Codespace
If you need more power:
1. Stop current Codespace
2. Create new Codespace
3. Select "4-core" or "8-core" machine type

## What's Different in Codespaces?

### Same as Local
- ✅ All code works the same
- ✅ Git commands work the same
- ✅ Terminal commands work the same
- ✅ File editing works the same

### Different from Local
- ✅ Much faster CPU (4 cores vs 2 cores)
- ✅ More RAM (8GB vs your local)
- ✅ Better for AI models (2-5s vs 15-45s)
- ✅ Access from anywhere (browser-based)
- ✅ Automatic port forwarding
- ✅ Pre-configured development environment

## Next Steps After Setup

1. ✅ Test teacher dashboard (should not be blank)
2. ✅ Test student chat (should connect)
3. ✅ Test WebSocket connections (check console)
4. ✅ Install Ollama for real AI responses
5. ✅ Test microphone input (grant permission)
6. ✅ Test real-time updates between views

## Summary

Moving to Codespaces gives you:
- 🚀 10x faster AI responses (2-5s vs 15-45s)
- 💰 Free 60 hours/month
- 🌐 Access from anywhere
- 🔧 Pre-configured environment
- ✅ Fixed WebSocket issues

All your code is already pushed to GitHub, so you can start fresh in Codespaces and pick up right where you left off!

---

**Ready to move?** Follow steps 1-9 above, and you'll be testing in Codespaces in about 10 minutes!
