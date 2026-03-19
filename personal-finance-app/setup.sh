#!/bin/bash
set -e

echo "🚀 Setting up Personal Finance App..."

# Backend
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "⚙️  Creating backend .env..."
if [ ! -f .env ]; then
  echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env
  echo "PORT=5000" >> .env
  echo "CLIENT_URL=http://localhost:3000" >> .env
  echo "✅ backend/.env created with random JWT_SECRET"
else
  echo "⚠️  backend/.env already exists, skipping"
fi

echo "🗄️  Setting up SQLite database..."
npx prisma migrate dev --name init
npx prisma generate
echo "✅ Database ready at backend/prisma/finance.db"

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "⚙️  Creating frontend .env..."
if [ ! -f .env ]; then
  echo "VITE_API_URL=http://localhost:5000/api/v1" > .env
  echo "✅ frontend/.env created"
else
  echo "⚠️  frontend/.env already exists, skipping"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the app, open two terminals:"
echo "  Terminal 1 → cd backend && npm run dev"
echo "  Terminal 2 → cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
echo "First time? Go to Settings → add your Anthropic or Groq API key to enable the AI assistant."
