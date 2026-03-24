---
name: pullreq
description: Push current changes to a new branch and open a PR targeting main
allowed-tools: Bash, Read
---

# Pull Request

You have access to the **current session context** — use it before touching git.

## Step 1 — Read session context first

Scan the current conversation history:
- What files were edited or created in this session?
- What was the user trying to accomplish? (use their own words)
- Bug fix, new feature, cleanup, config change?

Only run git commands to confirm and fill gaps:
```bash
git status
git diff HEAD
git log --oneline -5
```

## Step 2 — Pick a branch name

Pattern: `<type>/<slug>` — 2–5 lowercase hyphenated words from the session goal.

| type | when |
|------|------|
| `feat` | new feature |
| `fix` | bug fix |
| `refactor` | restructure, no behaviour change |
| `chore` | config, deps, deletions, tooling |
| `docs` | docs only |
| `ui` | frontend/visual only |

Check for collision: `git branch --list "<name>"` — append `-2` if taken.

## Step 3 — Branch, commit, push

```bash
git checkout -b <branch-name>
git add -A
```

Before committing, verify nothing sensitive got staged (`.env`, `config.json`, `*.db`, `dist/`, `node_modules/`). Unstage if found:
```bash
git restore --staged <file>
```

Commit with conventional format:
```
<type>(<scope>): <imperative summary ≤72 chars>

- <why — drawn from session context, not just the diff>
- <second key change if needed>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

```bash
git commit -m "$(cat <<'EOF'
<message>
EOF
)"
```

```bash
git push -u origin <branch-name>
```

Never force push. If push is rejected, stop and explain.

## Step 4 — Open PR targeting main

```bash
gh pr create \
  --base main \
  --title "<commit summary line>" \
  --body "$(cat <<'EOF'
## Summary
<2–4 bullets — what and why, drawn from session context>

## Changes
<key files or areas touched>

## Test plan
<what the reviewer should verify>

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

## Step 5 — Report back

Return:
- Branch name created
- Commit message
- PR URL

## Guardrails

- Never push to `main`/`master` directly — always branch first
- Never force push without explicit user instruction
- Never commit `.env`, `config.json`, `*.db`, `node_modules/`, `dist/`
- If nothing to commit, say so immediately
- If `gh` not authenticated: run `gh auth login`
