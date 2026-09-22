# ✅ Activate Your $5,100 in Credits - Quick Checklist

## 🚀 Do This NOW (15 minutes)

### Step 1: Azure Credits ($5,000)

**Activate $1,000 (Immediate)**
```
1. Click the Red Bull Basement redemption link in your email
2. Login/create Microsoft account
3. Verify credits appear in Azure Portal
4. ✅ Done! Valid for 90 days
```

**Unlock $4,000 (Additional)**
```
1. Go to: https://learn.microsoft.com/en-us/microsoft-for-startups/application
2. Complete business verification:
   - Business registration documents
   - Website URL (syncsenta.com or GitHub)
   - LinkedIn profile
3. Wait 1-2 weeks for approval
4. ✅ $4,000 credits unlocked (valid 180 days)
```

### Step 2: AMD Developer Cloud ($100)

**Sign Up & Claim Credits**
```
1. Go to: https://www.amd.com/en/developer/ai-dev-program.html
2. Click "Join Now" (free)
3. Complete profile
4. Verify $100 credits in account
5. ✅ Done! ~50 GPU hours on MI300X
```

---

## 📋 Verification Checklist

### Azure Portal Check
```bash
# Login to Azure
az login

# Check credit balance
az consumption usage list --start-date 2026-04-01

# Expected output:
# - $1,000 available immediately
# - $4,000 pending business verification
```

### AMD Portal Check
```
1. Login to: https://amdcloud.com
2. Navigate to "Billing" → "Credits"
3. Verify: $100.00 available
4. Test: Launch a MI300X instance (don't worry, you can stop it)
```

---

## ⚡ Quick Test (Optional - 10 minutes)

### Test Azure (Deploy Hello World)
```bash
# Create resource group
az group create --name test-syncsenta --location eastus

# Deploy test container
az containerapp up \
  --name hello-syncsenta \
  --resource-group test-syncsenta \
  --location eastus \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest

# Check it works
# Visit the URL provided in output

# Clean up (don't waste credits)
az group delete --name test-syncsenta --yes
```

### Test AMD (Launch GPU Instance)
```
1. Login to AMD Developer Cloud portal
2. Click "Launch Instance"
3. Select: MI300X + Ubuntu 22.04 + ROCm 7
4. Launch (costs ~$2/hour from your $100)
5. SSH in and run: rocm-smi (verify GPU detected)
6. Stop instance (don't delete, you'll use it later)
```

---

## 🎯 What Happens Next?

### After Activation (Today)
- ✅ $1,100 credits active ($1,000 Azure + $100 AMD)
- ✅ Ready to deploy SyncSenta infrastructure
- ✅ Can start building immediately

### After Business Verification (1-2 weeks)
- ✅ $4,000 additional Azure credits unlocked
- ✅ Total: $5,100 available
- ✅ 6-12 months of free infrastructure

### After Bonsai Builds (Tonight)
- ✅ Tasks 9.3-25 implemented
- ✅ Ready to deploy to Azure
- ✅ Production-ready SyncSenta

---

## 💰 Credit Expiry Tracking

| Credit Source | Amount | Validity | Expires |
|--------------|--------|----------|---------|
| Azure (Immediate) | $1,000 | 90 days | July 27, 2026 |
| Azure (Verified) | $4,000 | 180 days | ~October 2026 |
| AMD Developer | $100 | 6 months | ~October 2026 |

**⚠️ Important:** Credits expire! Start using them within 30 days.

---

## 🚨 Common Issues & Solutions

### "Azure credits not showing"
```
Solution: Wait 24 hours after redemption
Check: Azure Portal → Cost Management → Credits
Contact: Red Bull Basement support if still missing
```

### "Business verification rejected"
```
Solution: Ensure you have:
- Valid business registration (or student startup status)
- Professional website/GitHub with project info
- Complete LinkedIn profile
- Clear business description

Reapply: Usually approved on second attempt
```

### "AMD credits not appearing"
```
Solution: Check spam folder for verification email
Verify: Complete email verification first
Contact: AMD Developer Support if still missing
```

---

## 📞 Support Contacts

### Azure Support
- **Red Bull Basement:** support@redbullbasement.com
- **Microsoft for Startups:** https://www.microsoft.com/en-us/startups/contact
- **Azure Support:** https://azure.microsoft.com/en-us/support/

### AMD Support
- **Developer Program:** https://www.amd.com/en/developer/ai-dev-program.html
- **Community:** https://community.amd.com/
- **Email:** developer-support@amd.com

---

## ✨ You're Ready!

Once you see credits in both portals:
1. ✅ Read `AZURE_AMD_INFRASTRUCTURE_STRATEGY.md`
2. ✅ Paste master prompt into Bonsai
3. ✅ Let Bonsai build while you sleep
4. ✅ Deploy to Azure tomorrow

**Your $5,100 runway starts now.** 🚀

---

*Last Updated: April 28, 2026*
*SyncSenta Education OS | Red Bull Basement 2026*
