---
description: Update project progress, run tests/coverage, and log memory
---

# /progress Workflow Specification

## Description
When the user triggers /progress, you must own testing end-to-end and project memory updates.

## Core Responsibilities
- Run all quality gates and coverage checks
- Ensure minimum coverage requirements are met
- Author missing tests when allowed
- Maintain project progress and learning records under `memory/`

## Execution Rules

### End-to-End Testing Ownership
- Call subagent `verify-app` to run all quality gates + coverage.
- If coverage < 80% (frontend/backend) OR tests are missing/insufficient, call subagent `test-author` to write tests.
- Re-run `verify-app`.
- Stop only when PASS, or when BLOCKED, or after max iterations.

### Hard Rules
- You may apply ONLY:
  - format/lint auto-fixes (via scripts)
  - test-only changes (new tests, mocks, setup/config for coverage)
- Do NOT change production logic to make tests pass unless the user explicitly requests.

### Max Iterations
- Max 2 loops:
  - Loop 1: `verify-app` → (maybe `test-author`) → `verify-app`
  - Loop 2 (only if needed): `test-author` → `verify-app`
- If still not PASS after 2 loops, stop and report what remains.

### Coverage Policy (Minimum)
- Frontend coverage (lines): ≥ 80%
- Backend coverage (lines): ≥ 80%
- Electron: coverage is OPTIONAL unless a test harness already exists; report as N/A if not configured.

## Steps

### 1) Pre-context
- `git status -sb`
- `git diff --stat`

### 2) Loop 1
- Call subagent `verify-app`.
- Verdict handling:
  - PASS → proceed to memory updates and finish.
  - BLOCKED → proceed to memory updates, print report, and stop.
  - FAIL:
    - If failures are format/lint → `verify-app` should have auto-fixed; proceed based on output.
    - If coverage < 80% (frontend/backend) → call `test-author`.
    - If failures are due to missing tests or easy test setup issues → call `test-author`.
    - If failures require production logic changes → STOP and report (do not proceed).

### 3) After test-author
- Re-run `verify-app`.
- If PASS → proceed to memory updates and finish.
- If not PASS and loop count < 2 and remaining blockers are coverage or test-only issues → loop again.
- Otherwise → proceed to memory updates and STOP.

## Memory Logging (MANDATORY)
After `/progress` reaches a terminal state (PASS / FAIL / BLOCKED), you MUST update files under `memory/`.

### 1) Ensure files exist (create if missing)
- `memory/progress-todo.md`
- `memory/mistakes-learn.md`

Rules:
- Create files if missing.
- Never delete or rewrite existing history.
- Append only.

### 2) Update memory/progress-todo.md (ALWAYS)
Append a dated entry including:
- Timestamp
- Final verdict (PASS / FAIL / BLOCKED)
- Actions taken (auto-fixes, tests added, config changes)
- Remaining TODOs (only if FAIL/BLOCKED), with clear next steps

Behavior:
- If PASS → mark relevant work as completed.
- If FAIL/BLOCKED → add or retain actionable TODO items.

### 3) Update memory/mistakes-learn.md (CONDITIONAL, but checked EVERY run)
Add a new entry only if:
- Verdict is FAIL or BLOCKED, or
- Non-trivial issues occurred (missing tooling, coverage provider issues, flaky tests, setup problems)

Entry must include:
- Problem
- Root Cause
- Solution
- Prevention

If PASS with no meaningful issues beyond routine auto-fixes, do not add an entry.

### 4) Source of Truth
Use the final `verify-app` report and actions taken by `test-author` only.

## Output Requirements
- Final `verify-app` report (verbatim structure)
- One-line ending:
  - ✅ Ready to commit (PASS)
  - ❌ Not ready to commit (FAIL/BLOCKED)

## Minimal File Templates (used only if files are missing)

### memory/progress-todo.md
# progress-todo

## ✅ Completed
- (none)

## 🚧 Remaining TODO Items
- (none)

## 🗓️ Progress Log

### memory/mistakes-learn.md
# mistakes-learn

## Entries
