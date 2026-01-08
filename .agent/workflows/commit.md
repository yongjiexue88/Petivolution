---
description: commit
---

// turbo-all

This workflow verifies code quality, ensures test coverage, then commits changes.

## Phase 1: Lint & Type Check (from /verify-app)

1. Verify Frontend
```bash
cd frontend && npm run lint && npm run type-check
```

2. Verify Backend (Build Check)
```bash
cd backend && npm run build
```

## Phase 2: Test Coverage (from /verify-app)

3. Run Frontend Tests with Coverage
```bash
cd frontend && npm run test:coverage
```

### Coverage Evaluation
Answer: Did all tests pass?
If NO, stop and fix tests.

## Phase 3: Auto-fix & Build

4. Frontend format fix and lint fix
*(If scripts exist, otherwise skip)*
```bash
cd frontend && npm run lint -- --fix
```

5. Backend (Skip auto-fix, no scripts)

## Phase 4: Commit

6. Stage all changes
```bash
git add .
```

7. Commit changes
Generate a conventional commit message based on the changes made (e.g., feat:, fix:, chore:, refactor:, docs:, test:).
Analyze staged files with `git diff --cached --stat` to determine the appropriate type and scope.
```bash
git commit -m "<type>(<optional-scope>): <description>"
```