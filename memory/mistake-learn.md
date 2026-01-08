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
## 2026-01-08
### Linting & Clean Code
- **Mistake**: Left unused `updateZoom` function in `WorldScene.ts` after refactoring to fixed zoom.
- **Correction**: Removed the unused function immediately upon lint warning.
- **Lesson**: When simplifying logic (e.g. dynamic -> fixed), aggressively remove the old code rather than leaving it "just in case" to keep the codebase clean and lint-free.

### Backend Testing
- **Mistake**: Attempted to run backend tests via `npm run test` without a test script defined in `package.json`.
- **Correction**: (Pending) Need to configure `vitest` or `jest` for the backend and define the script.
- **Lesson**: Always verify `package.json` scripts before assuming standard commands exist, especially in a new or refactored module.

### Sprite Resolution & Scaling
- **Mistake**: Generated 16x16 pixel art sprites but scaled them by `0.09` in-game, resulting in invisible micro-sprites (1-2px). This happened because I blindly copied the scaling factor from existing sprites (which were 1024x1024 placeholders) without checking the source resolution.
- **Correction**: Re-sliced the sprite sheets to **64x64px** and updated the in-game scale to **0.5**, resulting in a clear **32x32px** display size.
- **Lesson**: Always check the source resolution of assets before defining scale factors. For pixel art, aim for integer scaling relative to the game's tile size (e.g. 16px tile -> 32px or 48px sprite).
