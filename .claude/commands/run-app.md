# Run Personal Finance App

Start both backend and frontend servers for the Personal Finance App.

## Steps

1. Check if backend (port 5000) is already running:
   - Run: `curl http://localhost:5000/health`
   - If running, skip backend start

2. If backend not running:
   - Run in background: `cd e:/Projects_AI/claude_learning/personal-finance-app/backend && npm run dev`
   - Wait 4 seconds for it to start

3. Start frontend in background:
   - Run: `cd e:/Projects_AI/claude_learning/personal-finance-app/frontend && npm run dev`
   - Wait 4 seconds

4. Check the output to find which port Vite picked (it auto-increments if busy)

5. Report the final URLs:
   - Backend: http://localhost:5000
   - Frontend: the URL shown in Vite output (usually 3002, 3003, 3004...)

Tell the user the exact frontend URL to open.
