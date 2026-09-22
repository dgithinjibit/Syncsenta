# ChatDev Harness - Quick Start

## 🎯 Super Simple Setup

### 1. Get Groq API Key (Free!)

1. Go to: https://console.groq.com/keys
2. Sign up (it's free!)
3. Create an API key
4. Copy it

### 2. Run the Harness

```bash
./chatdev-harness.sh my-task-name
```

It will prompt you for your Groq API key on first run.

### 3. With Spec File

```bash
./chatdev-harness.sh implement-task-1 .kiro/specs/syncsenta-education-os/requirements.md
```

## 📝 Examples

```bash
# Simple task
./chatdev-harness.sh user-authentication

# With requirements
./chatdev-harness.sh implement-rbac .kiro/specs/syncsenta-education-os/requirements.md

# With design doc
./chatdev-harness.sh implement-api .kiro/specs/syncsenta-education-os/design.md

# With tasks
./chatdev-harness.sh task-1 .kiro/specs/syncsenta-education-os/tasks.md
```

## 🔍 Output Location

Results are in: `ChatDev/WareHouse/<task-name>/`

## 🚀 Why Groq?

- ✅ **Free** - No credit card required
- ✅ **Fast** - Fastest inference available
- ✅ **OpenAI Compatible** - Works with ChatDev out of the box
- ✅ **Good Models** - Llama 3.3 70B, Mixtral, etc.

## 🛠️ Manual Configuration

If you want to manually set your API key:

```bash
nano ChatDev/.env
```

Change this line:
```
API_KEY=your-groq-api-key-here
```

To:
```
API_KEY=g<REDACTED_SECRET>
```

## 💡 Tips

1. **Start Small**: Test with a simple task first
2. **Use Specs**: Attach your spec files for better context
3. **Check Output**: Review generated code in `ChatDev/WareHouse/`
4. **Iterate**: You can run multiple times on the same task

## 🎓 Groq Models

Available models (configured in ChatDev):
- `llama-3.3-70b-versatile` - Best for coding (default)
- `mixtral-8x7b-32768` - Good balance
- `llama-3.1-8b-instant` - Fastest

## 🔧 Troubleshooting

### "Virtual environment not found"
```bash
cd ChatDev
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

### "API key not configured"
Just run the harness again - it will prompt you.

### "Permission denied"
```bash
chmod +x chatdev-harness.sh
```

---

**That's it!** Just run `./chatdev-harness.sh <task-name>` and you're good to go! 🚀
