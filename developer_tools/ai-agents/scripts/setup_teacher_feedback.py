"""Setup script for teacher feedback loop database.

Run this to initialize the teacher feedback system.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_supabase_client() -> Client:
    """Get Supabase client."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations
    
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment"
        )
    
    return create_client(url, key)


def read_schema_file() -> str:
    """Read the SQL schema file."""
    schema_path = Path(__file__).parent.parent / "src" / "syncsenta_agents" / "db" / "teacher_feedback_schema.sql"
    
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    
    return schema_path.read_text()


def setup_database():
    """Set up the teacher feedback database tables."""
    print("🚀 Setting up Teacher Feedback Loop database...")
    print()
    
    try:
        # Get Supabase client
        print("📡 Connecting to Supabase...")
        supabase = get_supabase_client()
        print("✅ Connected!")
        print()
        
        # Read schema
        print("📄 Reading schema file...")
        schema_sql = read_schema_file()
        print("✅ Schema loaded!")
        print()
        
        # Note: Supabase Python client doesn't support raw SQL execution
        # You need to run the SQL file manually or use psql
        print("⚠️  MANUAL STEP REQUIRED:")
        print()
        print("The Supabase Python client doesn't support raw SQL execution.")
        print("Please run the schema file manually using one of these methods:")
        print()
        print("Method 1: Supabase Dashboard")
        print("  1. Go to https://app.supabase.com")
        print("  2. Select your project")
        print("  3. Go to SQL Editor")
        print("  4. Paste the contents of:")
        print(f"     ai-agents/src/syncsenta_agents/db/teacher_feedback_schema.sql")
        print("  5. Click 'Run'")
        print()
        print("Method 2: psql Command Line")
        print("  psql -h <your-supabase-host> -U postgres -d postgres -f ai-agents/src/syncsenta_agents/db/teacher_feedback_schema.sql")
        print()
        
        # Test connection by checking if we can query
        print("🧪 Testing database connection...")
        try:
            # Try to query a table (will fail if not created yet)
            result = supabase.table("ai_decisions").select("count", count="exact").limit(0).execute()
            print("✅ Tables already exist!")
            print(f"   Found {result.count} AI decisions")
        except Exception as e:
            print("⚠️  Tables not found - please run the schema file manually")
            print(f"   Error: {e}")
        
        print()
        print("📊 Next Steps:")
        print("  1. Run the schema file (see instructions above)")
        print("  2. Verify tables exist in Supabase dashboard")
        print("  3. Start using the teacher feedback system!")
        print()
        print("🎯 Once set up, every AI decision will be logged automatically")
        print("   Teachers can review and provide feedback to help SyncSenta learn!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def verify_setup():
    """Verify the setup is working."""
    print()
    print("🔍 Verifying setup...")
    print()
    
    try:
        supabase = get_supabase_client()
        
        # Check each table
        tables = [
            "ai_decisions",
            "learned_rules",
            "cultural_patterns",
            "teacher_rule_proposals",
            "rule_votes",
            "rule_ab_tests"
        ]
        
        for table in tables:
            try:
                result = supabase.table(table).select("count", count="exact").limit(0).execute()
                print(f"✅ {table}: {result.count} rows")
            except Exception as e:
                print(f"❌ {table}: Not found or error - {e}")
        
        print()
        print("✅ Verification complete!")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup teacher feedback loop database")
    parser.add_argument("--verify", action="store_true", help="Verify setup instead of running it")
    
    args = parser.parse_args()
    
    if args.verify:
        verify_setup()
    else:
        setup_database()
