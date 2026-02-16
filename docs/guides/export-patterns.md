# Export Patterns Guide

blECSd uses a three-tier export system. Each tier provides a different level of API access.

## The Three Tiers

### Tier 1: Curated Essentials (`'blecsd'`)

The top-level import provides ~95 curated exports: the most commonly used functions, types, and schemas. This is the default choice for most applications.

```typescript
import {
  createWorld, addEntity, createBoxEntity,
  setPosition, setDimensions, setText,
  layoutSystem, renderSystem, outputSystem,
  enableInput, enableMouse,
} from 'blecsd';
```

**Included in Tier 1:**
- ECS core: `createWorld`, `destroyWorld`, `addEntity`, `removeEntity`, `addComponent`, `hasComponent`
- Entity factories: `createBoxEntity`, `createTextEntity`, `createButtonEntity`, `createScreenEntity`, `createInputEntity`, `createListEntity`, `createCheckboxEntity`, `createSelectEntity`
- Systems: `layoutSystem`, `renderSystem`, `outputSystem`, `inputSystem`, `focusSystem`, `animationSystem`, `cleanup`, `clearScreen`
- Component helpers: `setPosition`, `getPosition`, `setDimensions`, `getDimensions`, `setText`, `getText`, `setZIndex`, `getZIndex`, `normalizeZIndices`, `scrollToTop`, `scrollToBottom`, `scrollToLine`, `scrollByLines`, `ensureCursorVisible`, `focusNext`, `focusPrev`, `prepend`, `toggle`, `hitTest`, `TextAlign`
- Terminal I/O: `enableInput`, `disableInput`, `enableMouse`, `disableMouse`, `enableKeys`, `disableKeys`, `createDoubleBuffer`, `fillRect`, `setCell`, `getCell`, `clearBuffer`, `stripAnsi`, `CursorShape`
- Schemas: `BoxConfigSchema`, `TextConfigSchema`, `PositionValueSchema`
- Utilities: `renderText`, `wrapText`, `getLine`, `getLines`, `getStats`
- Types: `World`, `Entity`, `System`, `BoxConfig`, `TextConfig`, `PositionValue`, `DimensionValue`, `HitTestResult`, `CleanupCallback`, `Unsubscribe`, `Cell`, `TerminalCapabilities`, `KeyHandler`, `MouseHandler`, `DirtyRect`

### Tier 2: Full Module Access (subpath imports)

Subpath imports provide complete access to every module's exports. Use these when you need symbols not in Tier 1, or when building advanced integrations.

```typescript
// Advanced ECS primitives
import { defineComponent, defineQuery, query, pipe, removeComponent } from 'blecsd/core';

// All component definitions and helpers
import { Position, Dimensions, Renderable, Border } from 'blecsd/components';

// All systems including specialized ones
import { scrollSystem, collisionSystem } from 'blecsd/systems';

// Full terminal API
import { cursor, style, screen, isKitty, getColorDepth } from 'blecsd/terminal';

// All widgets and widget-specific factories
import { createAccordion, createBigText, createTextboxEntity } from 'blecsd/widgets';

// All validation schemas
import { ScreenConfigSchema, KeyEventSchema } from 'blecsd/schemas';

// Utility functions
import { truncateText, getLineCount } from 'blecsd/utils';
```

### Tier 3: Functional Namespaces

Each module also exports namespace objects that group related functions:

```typescript
import { box, text, modal } from 'blecsd/widgets';

// Access all box functions via namespace
const entity = box.createBox(world, config);
box.setBoxContent(world, entity, 'Hello');
```

---

## Available Subpath Imports

| Path | Description |
|------|-------------|
| `blecsd` | Curated Tier 1 essentials (~95 exports) |
| `blecsd/core` | ECS primitives, world management, entity factories, schemas |
| `blecsd/components` | All component definitions and typed getters/setters |
| `blecsd/systems` | All system functions |
| `blecsd/terminal` | Terminal I/O, ANSI sequences, input parsing, detection |
| `blecsd/widgets` | All widget factories, configs, and namespace objects |
| `blecsd/widgets/bigText` | BigText widget (separate for bundle size) |
| `blecsd/widgets/fonts` | Bitmap font loading and rendering |
| `blecsd/schemas` | All Zod validation schemas |
| `blecsd/utils` | Text utilities, rope operations, color helpers |
| `blecsd/input` | Input handling utilities |
| `blecsd/debug` | Debug tools, logging, profiling |
| `blecsd/errors` | Error types and error handling utilities |

---

## Decision Tree

```
Are you building a typical terminal app?
├── YES -> Use 'blecsd' (Tier 1)
│         Need a symbol not in Tier 1?
│         ├── Advanced ECS (defineComponent, query) -> blecsd/core
│         ├── Specialized widget -> blecsd/widgets
│         ├── Raw terminal control -> blecsd/terminal
│         └── Specialized system -> blecsd/systems
└── NO
    ├── Building a custom ECS system? -> blecsd/components + blecsd/core
    ├── Low-level terminal work? -> blecsd/terminal
    └── Extending the widget library? -> blecsd/widgets
```

---

## Common Patterns

### Pattern 1: Typical Terminal App

```typescript
import {
  createWorld, createBoxEntity, createTextEntity,
  setPosition, setDimensions, setText,
  layoutSystem, renderSystem, outputSystem,
  enableInput, cleanup,
} from 'blecsd';

const world = createWorld();
const box = createBoxEntity(world, { x: 10, y: 5, width: 30, height: 10 });
setText(world, box, 'Hello, blECSd!');
```

### Pattern 2: Custom ECS System

<!-- blecsd-doccheck:ignore -->
```typescript
import type { World } from 'blecsd';
import { Position, Velocity } from 'blecsd/components';
import { query } from 'blecsd/core';

export function physicsSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);
  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
}
```

### Pattern 3: Mixed High-Level and Low-Level

```typescript
// High-level widget logic
import { createBoxEntity, renderSystem } from 'blecsd';

// Low-level terminal detection
import { isKitty, getColorDepth } from 'blecsd/terminal';
```

### Pattern 4: Specialized Widget Work

```typescript
// Common factories from Tier 1
import { createBoxEntity, createTextEntity } from 'blecsd';

// Specialized factories from widgets module
import { createTextboxEntity, createFormEntity, createSliderEntity } from 'blecsd/widgets';
```

---

## FAQ

### Q: What changed from the old `export *` approach?

The top-level `'blecsd'` import used to re-export everything (~4,500 symbols). Now it exports ~95 curated symbols. Everything else is still accessible via subpath imports (`blecsd/components`, `blecsd/terminal`, etc.).

### Q: I was importing X from 'blecsd' and now it's gone. Where did it move?

Check the subpath import that matches the module:
- Widget functions (createBox, createAccordion, etc.) -> `blecsd/widgets`
- ECS primitives (defineComponent, defineQuery) -> `blecsd/core`
- Terminal internals (isScreen, setCursorVisible) -> `blecsd/terminal`
- Debug tools (debugLog) -> `blecsd/debug`
- Error utilities -> `blecsd/errors`
- Specialized systems (scrollSystem) -> `blecsd/systems`

### Q: Can I mix import paths in the same file?

Yes. Use multiple import paths to signal intent:

```typescript
import { createBoxEntity, setPosition } from 'blecsd';
import { createOutputBuffer, writeChar } from 'blecsd/terminal';
```

### Q: Does tree-shaking still work?

Yes. Modern bundlers tree-shake unused exports from any import path. The curated Tier 1 makes it easier to understand what you're importing, and subpath imports provide natural code-splitting boundaries.

### Q: How do I know what's exported from each module?

Use TypeScript autocomplete, or check the module's `index.ts` file. The [API Reference](/docs/api/) documents all exports.

---

## Related Guides

- [Getting Started](/docs/guides/getting-started.md) - Building your first blECSd app
- [ECS Architecture](/docs/guides/ecs-architecture.md) - Understanding the Entity Component System
- [Terminal I/O](/docs/api/terminal.md) - Low-level terminal control reference
