---
description: Update project progress, run tests/coverage, and log memory
---

This workflow does two things:
1. Runs tests to verify current state (targeted to what changed)
2. Updates memory files with progress and learnings

## Phase 1: Detect What Changed (Targeted Test Selection)

We only run tests for the package(s) that were touched in this session.

1. Get changed files (staged + unstaged) compared to `HEAD`
// turbo
```bash
git diff --name-only HEAD
```

2. Decide which tests to run (rules):
   - Touched only `frontend/**` → run only frontend tests
   - Touched only `backend/**` → run only backend tests
   - Touched only `memory/**` → skip tests
   - Touched multiple packages → run tests for those packages only
   - Treat as "touched multiple" (run relevant/all package tests) if you changed shared/root config, e.g.:
     - `package.json` (root), lockfiles
     - shared tsconfig, eslint/prettier configs
     - CI configs (`.github/workflows/`)

## Phase 2: Run Targeted Tests (Only What You Touched)

Based on your analysis in Phase 1, run the relevant tests below. **Skip** any steps for packages that were not touched.

A) Frontend tests (run if frontend/** changed)
```bash
cd frontend && npm run test
```

B) Backend tests (run if backend/** changed)
```bash
cd backend && npm run test
```

## Phase 3: Update Memory Files

3. Update `memory/progress.md`
   - Review changes made in this session
   - Move completed items from "🚧 Remaining TODO Items" to "✅ Completed Work"
   - Add new TODO items discovered during work
   - Update dates and descriptions

4. Update `memory/mistake-learn.md`
   - If any bugs were encountered or mistakes were made during this session:
     - Add a new entry with the date
     - Document: Problem, Root Cause, Solution, Prevention
     - Categorize under appropriate section (Auth, Build, Code Quality, Workflow, etc.)

   **Entry Template for mistakes-learn.md**
   ```markdown
   ### [YYYY-MM-DD] - [Brief Description]
   **Problem:** What went wrong
   **Root Cause:** Why it happened
   **Solution:** How it was fixed
   **Prevention:** How to avoid this in the future
   ```

## Phase 4: Save Progress

5. Stage memory file changes
// turbo
```bash
git add memory/
```

6. Commit progress update
```bash
git commit -m "docs(memory): update progress and learnings"
```