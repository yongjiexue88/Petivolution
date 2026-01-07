# Mistakes & Lessons Learned

## 2026-01-07
### Workflow Configuration
- **Mistake**: The `/progress` workflow relied on missing sub-workflows (`verify-app`, `test-author`, `commit`) and targeted non-existent memory files (`progress-todo.md`).
- **Correction**: Created standard sub-workflows and synced memory filenames to match existing patterns (`progress.md`, `mistake-learn.md`).
- **Lesson**: workflows must be self-contained or explicitly reference existing files/tools.

### React Hook Rules
- **Mistake**: `useGameStore` was called inside an IIFE/callback in `Toolbar.tsx`, violating the Rules of Hooks.
- **Correction**: Moved all `useGameStore` calls to the top level of the functional component.
- **Lesson**: Hooks must always be at the top level to ensure consistent call order across renders.

### Vitest Mocking & Hoisting
- **Mistake**: Variables used in `vi.mock` factory were declared outside, leading to `ReferenceError` during hoisting.
- **Correction**: Wrapped mock definitions in `vi.hoisted` or moved them inside the factory.
- **Lesson**: Vitest hoists `vi.mock` to the top; any dependencies must also be hoisted or natively available.

### Store Mocking in Tests
- **Mistake**: Mocked `useGameStore` in `SpawnPanel.test.tsx` lacked the `getState` method required for manual store access in handlers.
- **Correction**: Added `getState` to the mock object using `Object.assign`.
- **Lesson**: Always verify if components use `getState()` or `get()` when mocking Zustand stores.
