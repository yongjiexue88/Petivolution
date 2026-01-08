---
description: verify-app
---

This workflow verifies code quality and test coverage for the project.

## Phase 1: Linting & Type Checking
1. Verify Frontend
// turbo
```bash
cd frontend && npm run lint && npm run type-check
```
2. Verify Backend (Build Check)
// turbo
```bash
cd backend && npm run build
```

## Phase 2: Test Coverage Analysis
3. Run Frontend Tests with Coverage
// turbo
```bash
cd frontend && npm run test:coverage
```
4. Run Backend Tests (Pending)
*Backend currently has no test suite configured. Skip.*

## Phase 3: Coverage Evaluation
After running coverage, check the terminal output for coverage percentages:
- Frontend: Look for "All files" line coverage %
- Backend: N/A

**If Frontend has < 99% line coverage:**
5. Invoke test-author workflow with the following context:
   - Current coverage percentages
   - Top 10 uncovered files from coverage report (found in `coverage/coverage-summary.json` or terminal output)
   - Constraint: "No production logic changes allowed"

Example invocation:
```
/test-author
Coverage Report:
- Frontend: 85% lines (target: 99%)
Top Uncovered Files (Frontend):
1. src/components/Hero.tsx - 45% coverage
2. src/pages/BlogPostPage.tsx - 52% coverage
...
Constraints: No production logic changes allowed.
```