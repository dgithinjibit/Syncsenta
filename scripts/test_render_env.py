#!/usr/bin/env python3
"""
Quick script to test if Render environment variables are set correctly.
Run this locally to see what your code expects.
"""

import os
from dotenv import load_dotenv

# Load local .env for comparison
load_dotenv()

print("=" * 60)
print("ENVIRONMENT VARIABLE CHECK")
print("=" * 60)

required_vars = {
    "SUPABASE_URL": "Supabase project URL",
    "SUPABASE_SERVICE_KEY": "Supabase service role key",
    "GROQ_API_KEY": "Groq API key for LLM",
}

print("\n📋 Required Variables:\n")

all_set = True
for var_name, description in required_vars.items():
    value = os.getenv(var_name)
    
    if value:
        # Mask sensitive values
        if "KEY" in var_name:
            display_value = f"{value[:10]}...{value[-4:]}" if len(value) > 14 else "***"
        else:
            display_value = value
        
        print(f"✅ {var_name}")
        print(f"   Value: {display_value}")
        print(f"   Description: {description}")
    else:
        print(f"❌ {var_name}")
        print(f"   Value: NOT SET")
        print(f"   Description: {description}")
        all_set = False
    
    print()

print("=" * 60)

if all_set:
    print("✅ All required environment variables are set!")
    print("\nYour Render service needs these same values.")
else:
    print("❌ Some environment variables are missing!")
    print("\nSet these in Render Dashboard:")
    print("https://dashboard.render.com → Your Service → Environment")

print("=" * 60)

# Test Supabase connection
if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY"):
    print("\n🔌 Testing Supabase Connection...\n")
    try:
        from supabase import create_client
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        print(f"Connecting to: {supabase_url}")
        client = create_client(supabase_url, supabase_key)
        
        # Try a simple query
        result = client.table("schemes").select("count", count="exact").limit(0).execute()
        
        print(f"✅ Connection successful!")
        print(f"   Schemes table exists with {result.count} rows")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nThis is the same error your Render service is experiencing!")
else:
    print("\n⚠️  Skipping connection test (env vars not set)")

print("=" * 60)
