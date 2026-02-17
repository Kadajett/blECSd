# Export Patterns Guide

blECSd uses a three-tier export system. Each tier provides a different level of API access.

## The Three Tiers

### Tier 1: Curated Essentials (`'blecsd'`)

The top-level import provides ~80 curated exports (64 values + 15 types): the most commonly used functions, types, and schemas. This is the default choice for most applications.

<!-- blecsd-doccheck:ignore -->
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

Subpath imports provide complete access to every module's exports, including both flat functions and namespace objects. Use these when you need symbols not in Tier 1.

<!-- blecsd-doccheck:ignore -->
```typescript
// Advanced ECS primitives
import { defineComponent, defineQuery, query, pipe, removeComponent } from 'blecsd/core';

// Component data stores and helpers
import { Position, Dimensions, Renderable, Border } from 'blecsd/components';

// All systems including specialized ones
import { scrollSystem, collisionSystem } from 'blecsd/systems';

// Full terminal API
import { CursorShape, style, getColorDepth } from 'blecsd/terminal';

// All widgets and widget-specific factories
import { createAccordion, createBigText, createTextboxEntity } from 'blecsd/widgets';

// All validation schemas
import { ScreenConfigSchema, KeyEventSchema } from 'blecsd/schemas';

// Utility functions
import { truncateText, getLineCount } from 'blecsd/utils';
```

### Tier 3: Functional Namespaces

Each module exports **namespace objects**: frozen plain objects that group related functions into discoverable, organized APIs. These are the recommended way to access the full API.

Namespace objects are **not classes**. They are plain frozen objects of pure function references, following the same pattern as Node.js `fs`, Lodash `_`, or D3 modules. No `this`, no state, no inheritance.

<!-- blecsd-doccheck:ignore -->
```typescript
// Component namespaces
import { position, content, scroll, focus } from 'blecsd/components';

position.set(world, eid, 10, 5);
position.moveBy(world, eid, 1, 0);
position.zIndex.bringToFront(world, eid, siblings);
content.setText(world, eid, 'Hello');
scroll.toTop(world, eid);
focus.next(world);

// Widget namespaces
import { box, list, modal } from 'blecsd/widgets';

const { eid } = box.create(world, config);
box.setContent(world, eid, 'Hello');
list.select(world, listEid, 0);
modal.open(world, modalEid);

// System namespaces
import { layout, render, spring } from 'blecsd/systems';

layout.create(world);
render.system(world);
spring.create(world, eid, { stiffness: 300, damping: 20 });

// Terminal namespaces
import { cursor, screen, ansiCodes } from 'blecsd/terminal';

const manager = cursor.createCursorManager();
cursor.moveCursorTo(manager, cursorId, 10, 5);

// Utility namespaces
import { rope, textWrap, unicode } from 'blecsd/utils';

const r = rope.createRope('Hello, world!');
const wrapped = textWrap.wordWrap(text, 80);
const width = unicode.width.stringWidth('Hello');
```

**Why namespaces?** They solve the discoverability problem. Instead of autocompleting through thousands of flat function names, you import a namespace and explore its API via `.` notation. Namespace names are unambiguous: `textInput.cursor.set` is clearly different from `cursor.moveCursorTo`.

---

## Available Subpath Imports

| Path | Description |
|------|-------------|
| `blecsd` | Curated Tier 1 essentials (~80 exports) |
| `blecsd/core` | ECS primitives, world management, entity factories, schemas |
| `blecsd/components` | All component definitions, typed getters/setters, and namespaces |
| `blecsd/systems` | All system functions and namespaces |
| `blecsd/terminal` | Terminal I/O, ANSI sequences, input parsing, namespaces |
| `blecsd/widgets` | All widget factories, configs, and namespaces |
| `blecsd/widgets/bigText` | BigText widget (separate for bundle size) |
| `blecsd/widgets/fonts` | Bitmap font loading and rendering |
| `blecsd/schemas` | All Zod validation schemas |
| `blecsd/utils` | Text utilities, rope operations, color helpers, namespaces |
| `blecsd/input` | Input handling utilities |
| `blecsd/debug` | Debug tools, logging, profiling |
| `blecsd/errors` | Error types and error handling utilities |

---

## Namespace Reference

### Component Namespaces (`blecsd/components`)

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `position` | Position and z-ordering | `set`, `get`, `moveBy`, `zIndex.bringToFront` |
| `content` | Text content management | `setText`, `getText`, `append`, `clear` |
| `dimensions` | Width/height management | `set`, `get`, `has` |
| `scroll` | Scrolling and viewport | `toTop`, `toBottom`, `toLine`, `bar.enable` |
| `focus` | Focus management | `focus`, `blur`, `next`, `prev`, `makeFocusable` |
| `hierarchy` | Parent/child relationships | `appendChild`, `removeChild`, `getChildren` |
| `border` | Border styling | `set`, `get`, `has`, `remove` |
| `padding` | Padding values | `set`, `get`, `has` |
| `animation` | Animation components | `set`, `get`, `play`, `pause` |
| `renderable` | Visibility/rendering | `set`, `get`, `toggle`, `markDirty` |
| `interactive` | Input handling | `set`, `get`, `enable`, `disable` |
| `textInput` | Text input fields | `cursor.set`, `selection.set`, `callbacks` |
| `select` | Dropdown/select controls | `options.add`, `selected.byIndex`, `display` |
| `slider` | Slider controls | `set`, `get`, `setRange` |
| `checkbox` | Checkbox controls | `toggle`, `isChecked`, `set` |
| `table` | Table data | `setData`, `getRow`, `sort` |

### System Namespaces (`blecsd/systems`)

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `animation` | Animation system | `create`, `register`, `update`, `system` |
| `layout` | Layout computation | `create`, `compute`, `invalidate`, `system` |
| `render` | Rendering pipeline | `create`, `clear`, `system` |
| `input` | Input processing | `create`, `register`, `hitTest`, `system` |
| `output` | Terminal output | `create`, `cleanup`, `system` |
| `focus` | Focus management | `create`, `focusEntity`, `focusNext`, `system` |
| `collision` | Collision detection | `create`, `detect`, `getColliding` |
| `spring` | Spring physics | `create`, `setTarget`, `isActive` |
| `smoothScroll` | Smooth scrolling | `create`, `scrollTo`, `applyImpulse` |
| `spatialHash` | Spatial indexing | `create`, `insert`, `queryArea` |
| `drag` | Drag and drop | `create`, `setConstraints` |

### Terminal Namespaces (`blecsd/terminal`)

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `cursor` | Cursor management | `createCursorManager`, `moveCursorTo`, `addCursor` |
| `screen` | Screen buffers | `create`, `getCell`, `setCell`, `diff` |
| `graphics` | Graphics rendering | `createManager`, `render`, `detect` |
| `ansiCodes` | ANSI escape sequences | Constants for cursor, colors, modes |
| `program` | Terminal program control | `create`, `write`, `flush` |
| `cleanup` | Terminal cleanup/restore | `create`, `register`, `cleanup` |
| `terminfo` | Terminal capabilities | `get`, `has`, `query` |

### Utility Namespaces (`blecsd/utils`)

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `rope` | Rope data structure | `createRope`, `insert`, `delete`, `getLine` |
| `textWrap` | Text wrapping | `wordWrap`, `wrapText`, `truncate`, `alignLine` |
| `unicode` | Unicode handling | `width.stringWidth`, `width.charWidth` |
| `colors` | Color conversion | `hexToRgb`, `rgbToHex`, `blend` |
| `syntaxHL` | Syntax highlighting | `highlight`, `createGrammar` |
| `fuzzySearch` | Fuzzy matching | `fuzzyMatch`, `search`, `fuzzyFilter` |
| `markdownRenderer` | Markdown rendering | `render`, `parse` |

---

## Decision Tree

<!-- blecsd-doccheck:ignore -->
```
What are you building?
|
+-- Standard terminal app
|   +-- Start with 'blecsd' (Tier 1)
|   +-- Need more? Use namespaces from subpath imports
|
+-- Complex app with many features
|   +-- Use namespace imports for each domain:
|       import { position, scroll } from 'blecsd/components';
|       import { layout, render } from 'blecsd/systems';
|       import { box, modal } from 'blecsd/widgets';
|
+-- Custom ECS system or framework
|   +-- Import component data stores and ECS primitives:
|       import { Position, Velocity } from 'blecsd/components';
|       import { defineQuery, query } from 'blecsd/core';
|
+-- Low-level terminal work
|   +-- Use terminal namespaces:
|       import { cursor, screen, ansiCodes } from 'blecsd/terminal';
|
+-- Game or physics-based UI
    +-- Use systems namespaces:
        import { collision, spring, spatialHash } from 'blecsd/systems';
        import { animation, velocity } from 'blecsd/components';
```

---

## Common Patterns

### Pattern 1: Typical Terminal App

<!-- blecsd-doccheck:ignore -->
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

### Pattern 2: Namespace-Based Development

<!-- blecsd-doccheck:ignore -->
```typescript
import { position, content, scroll, focus } from 'blecsd/components';
import { box, list } from 'blecsd/widgets';
import { layout, render } from 'blecsd/systems';

// Create UI
const { eid: boxEid } = box.create(world, { x: 0, y: 0, width: 80, height: 24 });
const { eid: listEid } = list.create(world, { items: ['A', 'B', 'C'] });

// Manipulate via namespaces
position.set(world, listEid, 5, 2);
content.setText(world, boxEid, 'Title');
scroll.toTop(world, listEid);
focus.focus(world, listEid);
```

### Pattern 3: Custom ECS System

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

### Pattern 4: Mixed Tiers

<!-- blecsd-doccheck:ignore -->
```typescript
// Tier 1 for common operations
import { createBoxEntity, renderSystem } from 'blecsd';

// Tier 3 namespaces for specialized work
import { cursor, ansiCodes } from 'blecsd/terminal';
import { rope } from 'blecsd/utils';
```

---

## FAQ

### Q: What changed from the old `export *` approach?

The top-level `'blecsd'` import used to re-export everything (~4,500 symbols). Now it exports ~80 curated symbols (64 values + 15 types). Everything else is still accessible via subpath imports (`blecsd/components`, `blecsd/terminal`, etc.).

### Q: I was importing X from 'blecsd' and now it's gone. Where did it move?

Check the subpath import that matches the module:
- Widget functions (createBox, createAccordion, etc.) -> `blecsd/widgets`
- ECS primitives (defineComponent, defineQuery) -> `blecsd/core`
- Terminal internals (setCursorVisible) -> `blecsd/terminal`
- Debug tools (debugLog) -> `blecsd/debug`
- Error utilities -> `blecsd/errors`
- Specialized systems (scrollSystem) -> `blecsd/systems`

### Q: Should I use flat imports or namespaces?

**Prefer namespaces** when working with a specific domain. They provide better discoverability and prevent name collisions. Use flat imports when you only need one or two functions from a module.

<!-- blecsd-doccheck:ignore -->
```typescript
// Good: namespace for multiple related operations
import { scroll } from 'blecsd/components';
scroll.toTop(world, eid);
scroll.byLines(world, eid, 5);
scroll.bar.enable(world, eid);

// Also fine: flat import for a single function
import { scrollToTop } from 'blecsd/components';
scrollToTop(world, eid);
```

### Q: Can I mix import paths in the same file?

Yes. Use multiple import paths to signal intent:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createBoxEntity, setPosition } from 'blecsd';
import { cursor } from 'blecsd/terminal';
```

### Q: What if two modules have the same namespace name?

Some domains exist in both components and systems (e.g., `animation`). Since they come from different subpath imports, just alias when needed:

<!-- blecsd-doccheck:ignore -->
```typescript
import { animation } from 'blecsd/components';
import { animation as animationSystem } from 'blecsd/systems';
```

### Q: Does tree-shaking still work?

Yes. Modern bundlers tree-shake unused exports from any import path. Namespace objects use `Object.freeze` with direct function references, which bundlers can analyze statically.

### Q: How do I know what's exported from each module?

Use TypeScript autocomplete, or check the module's `index.ts` file. The [API Reference](/docs/api/) documents all exports.

---

## Related Guides

- [Getting Started](../getting-started/installation.md) - Building your first blECSd app
- [ECS Architecture](./understanding-ecs.md) - Understanding the Entity Component System
- Terminal I/O - Low-level terminal control reference
