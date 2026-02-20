# Export Patterns Guide

blECSd uses a three-tier export system. Each tier provides a different level of API access.

## The Three Tiers

### Tier 1: Curated Essentials (`'blecsd'`)

The top-level import provides ~80 curated exports (64 values + 15 types): the most commonly used functions, types, and schemas. This is the default choice for most applications.

```typescript
import { createWorld, addEntity, createBoxEntity } from 'blecsd/core';
import { setPosition, setDimensions, setText, enableInput, enableMouse } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
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

```typescript
// Advanced ECS primitives
import {
  defineComponent,
  defineQuery,
  pipe,
} from 'blecsd/core';
import { query, removeComponent } from 'blecsd/core';

// Component data stores and helpers
import { Position, Dimensions, Renderable, Border } from 'blecsd/components';

// All systems including specialized ones
import { scrollSystem } from 'blecsd/systems';
import { collisionSystem } from 'blecsd/systems';

// Full terminal API
import { style, getColorDepth } from 'blecsd/terminal';
import { CursorShape } from 'blecsd/components';

// All widgets and widget-specific factories
import { createAccordion, createBigText } from 'blecsd/widgets';
import { createTextboxEntity } from 'blecsd/core';

// All validation schemas
import { ScreenConfigSchema } from 'blecsd/core';
import { KeyEventSchema } from 'blecsd/terminal';

// Utility functions
import { truncateText } from 'blecsd/utils';
import { getLineCount } from 'blecsd/utils';
```

### Tier 3: Functional Namespaces

Each module exports **namespace objects**: frozen plain objects that group related functions into discoverable, organized APIs. These are the recommended way to access the full API.

Namespace objects are **not classes**. They are plain frozen objects of pure function references, following the same pattern as Node.js `fs`, Lodash `_`, or D3 modules. No `this`, no state, no inheritance.

```typescript
// Component namespaces - grouped functions for each domain
import { createWorld, addEntity } from 'blecsd/core';
import { position, content, scroll, focus } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

position.set(world, eid, 10, 5);
position.moveBy(world, eid, 1, 0);
content.setText(world, eid, 'Hello');
scroll.toTop(world, eid);
focus.focus(world, eid);

// Widget namespaces
import { box } from 'blecsd/widgets';
import { list } from 'blecsd/components';

const boxEid = addEntity(world);
const boxWidget = box.create(world, boxEid, { width: 40, height: 10 });
box.setContent(world, boxEid, 'Hello');

const listEid = addEntity(world);
list.selection.first(world, listEid);
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
import { spring, spatialHash } from 'blecsd/systems';
import { collision } from 'blecsd/components';
        import { animation, velocity } from 'blecsd/components';
```

---

## Common Patterns

### Pattern 1: Typical Terminal App

```typescript
import { createWorld, createBoxEntity, createTextEntity } from 'blecsd/core';
import { setPosition, setDimensions, setText, enableInput } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem, cleanup } from 'blecsd/systems';

const world = createWorld();
const box = createBoxEntity(world, { x: 10, y: 5, width: 30, height: 10 });
setText(world, box, 'Hello, blECSd!');
```

### Pattern 2: Namespace-Based Development

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { position, content, scroll, focus } from 'blecsd/components';
import { box, listWidget } from 'blecsd/widgets';

const world2 = createWorld();

// Create UI using widget namespaces
const boxEid2 = addEntity(world2);
box.create(world2, boxEid2, { x: 0, y: 0, width: 80, height: 24 });

const listEid2 = addEntity(world2);
listWidget.create(world2, listEid2, { items: ['A', 'B', 'C'] });

// Manipulate via namespaces
position.set(world2, listEid2, 5, 2);
content.setText(world2, boxEid2, 'Title');
scroll.toTop(world2, listEid2);
focus.focus(world2, listEid2);
```

### Pattern 3: Custom ECS System

```typescript
import type { World } from 'blecsd/core';
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

```typescript
// Tier 1 for common operations
import { createBoxEntity } from 'blecsd/core';
import { renderSystem } from 'blecsd/systems';

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

```typescript
// Good: namespace for multiple related operations
import { scroll } from 'blecsd/components';
scroll.toTop(world, eid);
scroll.viewport.byLines(world, eid, 5);
scroll.bar.enable(world, eid);

// Also fine: flat import for a single function
import { scrollToTop } from 'blecsd/components';
scrollToTop(world, eid);
```

### Q: Can I mix import paths in the same file?

Yes. Use multiple import paths to signal intent:

```typescript
import { createBoxEntity } from 'blecsd/core';
import { setPosition } from 'blecsd/components';
import { cursor } from 'blecsd/terminal';
```

### Q: What if two modules have the same namespace name?

Some domains exist in both components and systems (e.g., `animation`). Since they come from different subpath imports, just alias when needed:

```typescript
import { animation } from 'blecsd/components';
import { animation as animationSystem } from 'blecsd/components';
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
