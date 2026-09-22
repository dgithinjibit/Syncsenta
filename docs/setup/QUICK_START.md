# 🚀 ChatDev Quick Start - 3 Steps

## Step 1: Get Groq API Key (30 seconds)

1. Visit: **https://console.groq.com/keys**
2. Sign up (free, no credit card)
3. Create API key
4. Copy it

## Step 2: Run ChatDev (1 command)

```bash
./chatdev-harness.sh my-task-name
```

Paste your API key when prompted. Done!

## Step 3: Check Output

```bash
ls ChatDev/WareHouse/my-task-name/
```

---

## 📚 Examples

```bash
# Simple task
./chatdev-harness.sh user-auth

# With your spec
./chatdev-harness.sh task-1 .kiro/specs/syncsenta-education-os/requirements.md

# Implement from tasks.md
./chatdev-harness.sh implement-rbac .kiro/specs/syncsenta-education-os/tasks.md
```

---

## 📖 More Info

- **Harness Guide**: `cat CHATDEV_HARNESS.md`
- **Full Docs**: `cat CHATDEV_QUICKSTART.md`
- **Help**: `./chatdev-harness.sh --help`

---

**That's it!** 🎉 You're ready to use ChatDev with Groq's free API.
