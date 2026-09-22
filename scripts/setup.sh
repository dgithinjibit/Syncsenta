#!/bin/bash

# SyncSenta 2.0 - Quick Setup Script

set -e

echo "🚀 SyncSenta 2.0 - Quick Setup"
echo "================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust not found. Install from: https://rustup.rs/"
    exit 1
fi
echo "✅ Rust installed: $(rustc --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js installed: $(node --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. You'll need to install it separately."
else
    echo "✅ PostgreSQL installed: $(psql --version)"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. You'll need to install it separately."
else
    echo "✅ Redis installed"
fi

echo ""
echo "📦 Setting up project..."

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your credentials before running the server"
else
    echo "✅ .env file already exists"
fi

# Install sqlx-cli if not present
if ! command -v sqlx &> /dev/null; then
    echo "📦 Installing sqlx-cli..."
    cargo install sqlx-cli --no-default-features --features postgres
else
    echo "✅ sqlx-cli already installed"
fi

# Backend setup
echo ""
echo "🦀 Setting up Rust backend..."
cd backend
cargo build
echo "✅ Backend dependencies installed"
cd ..

# Frontend setup
echo ""
echo "⚛️  Setting up Next.js frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env with your database and API credentials"
echo "2. Start PostgreSQL and Redis"
echo "3. Run database migrations:"
echo "   cd backend && sqlx database create && sqlx migrate run"
echo "4. Start the backend:"
echo "   cd backend && cargo run --bin syncsenta-backend"
echo "5. In another terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "📖 See README.md for detailed instructions"
echo "📊 Check PROJECT_STATUS.md for current progress"
