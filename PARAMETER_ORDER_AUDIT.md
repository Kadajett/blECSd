# Parameter Order Audit Report - Issue #1196

## Status: RESOLVED

All documented parameter order violations have been fixed. Functions that previously took `(eid: Entity, ...)` without `world` now follow the `(world: World, eid: Entity, ...)` convention.

## What Was Fixed

### Phase 1: Function Signatures (113 functions across 20 files)
- Components: radioButton.ts, checkbox.ts, form.ts, spinner.ts, collision.ts
- Component directories: list/callbacks.ts, list/display.ts, list/filter.ts, list/items.ts, list/multiSelect.ts, list/options.ts, list/rendering.ts, list/search.ts, list/selection.ts, list/virtualization.ts
- Core: effects.ts, entityData.ts
- Systems: smoothScroll.ts
- Widgets: hoverText.ts, prompt.ts

### Phase 2: Call Sites (526+ call sites across 48 files)
All call sites updated to pass `world` as the first argument.

### Phase 3: Test Updates
All test files updated with `world` variable declarations and updated function calls.

## Previously Fixed (Before This PR)
The following modules were already using the correct convention:
- textInput/ (cursor.ts, callbacks.ts, config.ts, validation.ts, etc.)
- slider.ts (data-only, no exported functions)
- progressBar.ts (already correct)
- select.ts (already correct)
- table.ts (data-only, no exported functions)
- terminalBuffer/ (already correct)
- dragSystem.ts (already correct)
- virtualizedRenderSystem.ts (already correct)
- lifecycleEvents.ts (already correct)

## Convention

All public functions that accept entity parameters follow:
```typescript
function name(world: World, eid: Entity, ...otherParams): ReturnType
```

Functions that don't use `world` internally use `_world` prefix to satisfy the linter while maintaining API consistency.
