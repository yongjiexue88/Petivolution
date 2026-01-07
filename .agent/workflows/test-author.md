---
description: create test
---

# /test-author Workflow Specification

## Description
Generate unit tests for uncovered or insufficiently tested components.

## Rules
- Focus on `src/sim` and `src/app` logic.
- Use `vitest` and `@testing-library/react`.
- Mock external dependencies (like Firebase or Canvas) where appropriate.

## Steps
1. Identify the file with low coverage from the `verify-app` report.
2. Read the file content.
3. Write a corresponding `.test.ts` or `.test.tsx` file.
4. Run `npm test [path/to/new/test]` to verify.
