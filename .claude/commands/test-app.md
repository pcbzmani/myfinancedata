# Test Personal Finance App

You are a QA engineer testing the Personal Finance App at http://localhost:3003 (frontend) and http://localhost:5000 (backend).

## Your job
1. **Test all API endpoints** using fetch/curl against the backend
2. **Identify bugs, errors, and UX issues**
3. **Fix the code** based on findings
4. **Report** what was tested, what failed, and what was fixed

## Step-by-step testing process

### Step 1 — Check servers are running
```
GET http://localhost:5000/health
```
If not running, report clearly which server is down.

### Step 2 — Test Auth flow
- POST /api/v1/auth/register with `{ name, email, password }`
- POST /api/v1/auth/login with same credentials
- Save the returned JWT token for all further requests

### Step 3 — Test Transactions
- POST /api/v1/transactions — add income and expense entries
- GET /api/v1/transactions — verify they return
- DELETE /api/v1/transactions/:id — verify deletion

### Step 4 — Test Investments
- POST /api/v1/investments — add stocks, mutual_fund, fd entries
- GET /api/v1/investments — verify data
- PUT /api/v1/investments/:id — update currentValue
- DELETE /api/v1/investments/:id

### Step 5 — Test Insurance
- POST /api/v1/insurance — add health, life, term policies
- GET /api/v1/insurance — verify data
- DELETE /api/v1/insurance/:id

### Step 6 — Test Dashboard
- GET /api/v1/dashboard — verify summary totals match what was added

### Step 7 — Test Export
- GET /api/v1/export/transactions.csv?token=JWT — verify CSV content
- GET /api/v1/export/investments.csv?token=JWT
- GET /api/v1/export/insurance.csv?token=JWT

### Step 8 — Test Settings
- PUT /api/v1/settings — save aiProvider, aiModel, aiApiKey
- GET /api/v1/settings — verify key is masked

### Step 9 — Test AI chat (if API key available in settings)
- POST /api/v1/ai/chat with `{ message: "What is my net savings?" }`

### Step 10 — Check frontend files for obvious bugs
- Read src/pages/*.tsx and src/components/*.tsx
- Check for missing imports, wrong API URLs, broken logic

## After testing

1. List all issues found with severity: 🔴 Critical | 🟡 Warning | 🟢 Minor
2. Fix all 🔴 Critical and 🟡 Warning issues directly in the code
3. Report a summary of what was fixed

## Files to fix are in
`e:\Projects_AI\claude_learning\personal-finance-app\`
