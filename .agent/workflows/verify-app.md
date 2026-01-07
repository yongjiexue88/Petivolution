---
description: verify-app
---

# /verify-app Workflow Specification

## Description
Run all quality gates, tests, and coverage checks for the project.

## Steps

### 1. Linting
// turbo
- `npm run lint`

### 2. Testing
// turbo
- `npm test`

### 3. Coverage Analysis
- Check if coverage meets 80% threshold for frontend and backend.
- If coverage reports are generated, extract the "Total" line for lines coverage.

## Output Requirement
- A summary of Pass/Fail status for linting and tests.
- A summary of line coverage percentages.
