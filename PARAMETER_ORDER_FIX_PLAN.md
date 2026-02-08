# Parameter Order Fix Plan

## Objective
Add `world` parameter to getter/setter functions for API consistency across the ECS architecture.

## textInput.ts Functions to Fix

###  Pure Getters (add world as first param)
1. `getCursorPos(eid)` → `getCursorPos(world, eid)`
2. `getSelection(eid)` → `getSelection(world, eid)`
3. `hasSelection(eid)` → `hasSelection(world, eid)`
4. `getCursorConfig(eid)` → `getCursorConfig(world, eid)`
5. `getCursorMode(eid)` → `getCursorMode(world, eid)`
6. `isCursorBlinkEnabled(eid)` → `isCursorBlinkEnabled(world, eid)`
7. `getCursorChar(eid)` → `getCursorChar(world, eid)`
8. `getNormalizedSelection(eid)` → `getNormalizedSelection(world, eid)`
9. `getTextInputConfig(eid)` → `getTextInputConfig(world, eid)`
10. `isSecretMode(eid)` → `isSecretMode(world, eid)`
11. `getCensorChar(eid)` → `getCensorChar(world, eid)`
12. `getPlaceholder(eid)` → `getPlaceholder(world, eid)`
13. `getMaxLength(eid)` → `getMaxLength(world, eid)`
14. `isMultiline(eid)` → `isMultiline(world, eid)`
15. `maskValue(eid, value)` → `maskValue(world, eid, value)`
16. `getValidationError(eid)` → `getValidationError(world, eid)`
17. `hasValidationError(eid)` → `hasValidationError(world, eid)`

### Setters that don't have world (add world as first param)
18. `setCursorConfig(eid, options)` → `setCursorConfig(world, eid, options)`
19. `setTextInputConfig(eid, options)` → `setTextInputConfig(world, eid, options)`
20. `resetCursorBlink(eid)` → `resetCursorBlink(world, eid)`
21. `clearValidationError(eid)` → `clearValidationError(world, eid)`

### Callback registration (add world as first param)
22. `onTextInputChange(eid, callback)` → `onTextInputChange(world, eid, callback)`
23. `onTextInputSubmit(eid, callback)` → `onTextInputSubmit(world, eid, callback)`
24. `onTextInputCancel(eid, callback)` → `onTextInputCancel(world, eid, callback)`
25. `clearTextInputCallbacks(eid)` → `clearTextInputCallbacks(world, eid)`

### Functions that use eid internally (add world as first param)
26. `emitValueChange(eid, value)` → `emitValueChange(world, eid, value)`
27. `emitSubmit(eid, value)` → `emitSubmit(world, eid, value)`
28. `emitCancel(eid)` → `emitCancel(world, eid)`
29. `validateTextInput(eid, value)` → `validateTextInput(world, eid, value)`

## Call Site Updates Required

Files that import/use these functions:
- src/widgets/textbox.ts
- src/widgets/textarea.ts
- src/components/textInput.test.ts
- src/core/entities/factories.ts
- src/systems/outputSystem.ts
- src/terminal/cursor/artificial.ts
- Any other files in the grep results

## Implementation Strategy

1. Update function signatures in textInput.ts
2. Update all internal calls within textInput.ts
3. Find and update all external call sites
4. Run tests after each file
5. Commit when all tests pass

## Status
- [ ] textInput.ts (29 functions)
- [ ] table.ts (19 functions)
- [ ] slider.ts (17 functions)
- [ ] progressBar.ts (16 functions)
- [ ] select.ts (15 functions)
