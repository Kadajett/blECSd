# Export Patterns Guide

This guide clarifies blECSd's module organization and explains when to use each import path.

## Overview

blECSd provides **multiple entry points** for different use cases:

```typescript
// Main entry point - everything you need for typical apps
import { createWorld, createBox, enableInput } from 'blecsd';

// Specialized modules - direct access to specific subsystems
import { cursor, style, screen } from 'blecsd/terminal';
import { BoxComponent, TextComponent } from 'blecsd/components';
import { renderSystem, layoutSystem } from 'blecsd/systems';
```

**General Rule**: Use `'blecsd'` for typical development. Use specialized paths (`blecsd/terminal`, `blecsd/components`, etc.) when you need fine-grained control or are building advanced integrations.

---

## Entry Points

### Primary Entry Point: `blecsd`

**Use for**: 99% of typical applications, widgets, and games.

```typescript
import {
  // World management
  createWorld, destroyWorld,

  // Entity management
  addEntity, removeEntity,

  // Widgets (high-level)
  createBox, createList, createText,

  // Input handling
  enableInput, disableInput,

  // Rendering
  render, flush,

  // Layout
  setPosition, setDimensions,

  // Game utilities
  startGameLoop, stopGameLoop
} from 'blecsd';
```

**What's included**:
- ECS core (World, Entity, Component management)
- All widgets (Box, List, Text, Table, etc.)
- All components (Position, Dimensions, Renderable, etc.)
- All systems (render, layout, input, etc.)
- Game API (game loop, collision detection)
- 3D rendering utilities
- Audio playback
- Input handling
- **Terminal I/O** (re-exported for convenience)

**Why use this**: The main entry point provides a curated, cohesive API that covers all common use cases. You don't need to know the internal module structure to build apps.

---

### Terminal Module: `blecsd/terminal`

**Use for**: Low-level terminal control, ANSI escape sequences, or custom rendering logic.

```typescript
import {
  // ANSI escape sequences
  cursor,    // Cursor movement: cursor.up(5), cursor.to(10, 20)
  style,     // Text styling: style.bold('text'), style.color(255, 0, 0)
  screen,    // Screen control: screen.alternateBuffer(), screen.clear()

  // Output buffering
  createOutputBuffer, writeChar, moveCursor,

  // Input parsing
  parseKeySequence, parseMouseSequence,

  // Terminal detection
  isKitty, isTmux, getColorDepth,

  // Capabilities
  getTerminalCapabilities, hasCapability
} from 'blecsd/terminal';
```

**What's included**:
- **ANSI module**: Direct escape sequence generation (`cursor`, `style`, `screen`, `mouse`, etc.)
- **Output buffering**: Low-level write operations
- **Input parsing**: Raw key/mouse sequence parsers
- **Terminal detection**: Query terminal type and capabilities
- **Terminfo**: Terminal capability database
- **Process utilities**: Spawn processes, suspend/resume

**When to use**:
- Building custom rendering engines
- Bypassing blECSd's render system for performance
- Implementing custom terminal features (e.g., graphics protocols)
- Writing terminal emulators or multiplexers
- Direct escape sequence generation for debugging

**When NOT to use**:
- Building typical terminal apps (use `blecsd` instead)
- Creating widgets (use `blecsd` widget API)
- Handling user input (use `blecsd` input systems)

---

### Components Module: `blecsd/components`

**Use for**: Direct component access when building custom systems or inspecting ECS state.

```typescript
import {
  Position, Dimensions, Renderable,
  Border, Padding, Margin,
  Text, Scrollable, Focusable
} from 'blecsd/components';

// Example: custom system that directly reads component data
function customRenderSystem(world: World): World {
  const entities = query(world, [Position, Renderable]);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const char = Renderable.char[eid];
    // Custom rendering logic...
  }

  return world;
}
```

**What's included**:
- All bitecs component definitions
- Component helper functions (`hasComponent`, `getComponent`)
- Component schemas (Zod validation)

**When to use**:
- Writing custom systems
- Accessing component data directly (advanced)
- Building low-level ECS integrations

**When NOT to use**:
- Normal app development (use `blecsd` helpers like `setPosition`, `setDimensions`)
- Creating widgets (use `blecsd` widget factories)

---

### Systems Module: `blecsd/systems`

**Use for**: Custom system execution order or selective system usage.

```typescript
import {
  inputSystem,
  layoutSystem,
  renderSystem,
  focusSystem,
  scrollSystem
} from 'blecsd/systems';

// Example: custom game loop with selective systems
function customGameLoop(world: World): void {
  inputSystem(world);      // Process input first
  updateGameLogic(world);  // Your game code
  layoutSystem(world);     // Recalculate layout
  renderSystem(world);     // Draw to screen
}
```

**What's included**:
- All system functions
- System execution order constants
- System utilities

**When to use**:
- Building custom update loops
- Disabling specific systems
- Optimizing system execution order for your use case

**When NOT to use**:
- Normal app development (use `blecsd` default game loop)

---

### Widgets Module: `blecsd/widgets`

**Use for**: Direct widget factory access (rarely needed, as `blecsd` re-exports these).

```typescript
import { createBox, createList, createText } from 'blecsd/widgets';
```

**When to use**:
- Tree-shaking optimizations (import only specific widgets)
- Building widget libraries that extend blECSd widgets

**When NOT to use**:
- Normal app development (use `blecsd` instead)

---

### Specialized Modules

These modules provide focused functionality for specific use cases:

#### `blecsd/game`
Game-specific APIs (collision, sprites, physics):
```typescript
import { startGameLoop, detectCollisions, updatePhysics } from 'blecsd/game';
```

#### `blecsd/3d`
3D rendering utilities:
```typescript
import { three, create3DBox, renderScene } from 'blecsd/3d';
```

#### `blecsd/audio`
Audio playback:
```typescript
import { playSound, createAudioSource } from 'blecsd/audio';
```

#### `blecsd/utils`
Utility functions (text rendering, virtualized scrollback, etc.):
```typescript
import { renderText, wrapText, truncateText } from 'blecsd/utils';
```

#### `blecsd/schemas`
Zod schemas for validation:
```typescript
import { BoxConfigSchema, TextConfigSchema } from 'blecsd/schemas';
```

---

## Decision Tree

**Choose your import path**:

```
┌─────────────────────────────────────────────────┐
│ Are you building a typical terminal app?       │
│ (widgets, layout, input handling)               │
└─────────────────────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │ YES                    │ NO
         ▼                        ▼
   Use 'blecsd'         ┌────────────────────────────┐
                        │ Do you need low-level      │
                        │ terminal control?          │
                        │ (ANSI sequences, raw I/O)  │
                        └────────────────────────────┘
                                  │
                      ┌───────────┴────────────┐
                      │ YES                    │ NO
                      ▼                        ▼
                Use 'blecsd/terminal'  Use specialized module:
                                       - blecsd/components
                                       - blecsd/systems
                                       - blecsd/game
                                       - blecsd/3d
                                       - blecsd/audio
```

---

## Common Patterns

### Pattern 1: Typical Terminal App

```typescript
// RECOMMENDED: Single import from main entry point
import {
  createWorld,
  createBox,
  createText,
  enableInput,
  render
} from 'blecsd';

const world = createWorld();
const box = createBox(world, { x: 10, y: 5, width: 30, height: 10 });
enableInput(world);
render(world);
```

**Why**: Simple, cohesive API. Everything you need in one import.

---

### Pattern 2: Custom Rendering with Terminal Module

```typescript
// Use terminal module for low-level control
import { cursor, style, screen } from 'blecsd/terminal';

// Clear screen and move cursor manually
screen.clear();
cursor.to(10, 5);
console.log(style.bold(style.color(255, 0, 0)('Error!')));
```

**Why**: Direct escape sequence control. Bypasses blECSd's render system for maximum performance or custom rendering logic.

---

### Pattern 3: Building Custom Systems

```typescript
// Import components and systems directly
import { Position, Velocity } from 'blecsd/components';
import { query } from 'blecsd/core';
import type { World } from 'blecsd';

// Custom physics system
export function physicsSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
```

**Why**: Direct component access for building ECS systems. Needed for advanced customization.

---

### Pattern 4: Hybrid Approach (Main + Terminal)

```typescript
// Most APIs from main entry point
import {
  createWorld,
  createBox,
  enableInput,
  render
} from 'blecsd';

// Low-level terminal detection
import { isKitty, getColorDepth } from 'blecsd/terminal';

const world = createWorld();

// Adjust behavior based on terminal capabilities
if (isKitty()) {
  // Enable Kitty-specific features
}

const colorDepth = getColorDepth();
if (colorDepth >= 24) {
  // Use true color
}

const box = createBox(world, { ... });
render(world);
```

**Why**: Combines high-level API with terminal detection for adaptive behavior.

---

## TypeScript Package Exports

The `package.json` defines all entry points:

```json
{
  "exports": {
    ".": "./dist/index.js",               // Main entry point
    "./components": "./dist/components/index.js",
    "./systems": "./dist/systems/index.js",
    "./widgets": "./dist/widgets/index.js",
    "./terminal": "./dist/terminal/index.js",
    "./3d": "./dist/3d/index.js",
    "./game": "./dist/game/index.js",
    "./audio": "./dist/audio/index.js",
    "./utils": "./dist/utils/index.js",
    "./schemas": "./dist/schemas/index.js",
    "./core": "./dist/core/index.js",
    "./debug": "./dist/debug/index.js",
    "./errors": "./dist/errors/index.js",
    "./input": "./dist/input/index.js"
  }
}
```

**Benefits**:
- **Tree-shaking**: Bundlers can eliminate unused code
- **Type safety**: TypeScript validates import paths
- **Explicit boundaries**: Clear module separation

---

## Migration from Inconsistent Imports

### Before (Inconsistent)

```typescript
// Some files used terminal module
import { cursor, style } from 'blecsd/terminal';

// Others used main entry point
import { cursor, style } from 'blecsd';

// Confusion: which is correct?
```

### After (Clear Intent)

```typescript
// High-level app: use main entry point
import { createWorld, createBox, render } from 'blecsd';

// Low-level ANSI control: use terminal module
import { cursor, style, screen } from 'blecsd/terminal';
```

**Rule**:
- If you're using **widgets, layout, input handling** → `blecsd`
- If you're using **raw ANSI sequences** → `blecsd/terminal`

---

## Re-exports in Main Entry Point

The main `blecsd` entry point re-exports terminal utilities for convenience:

```typescript
// These are equivalent (terminal utilities are re-exported)
import { cursor, style } from 'blecsd';
import { cursor, style } from 'blecsd/terminal';
```

**Recommendation**: Prefer `'blecsd/terminal'` when working extensively with low-level terminal I/O. This signals intent and improves code clarity.

**Example**:
```typescript
// GOOD: Clear intent - this file does low-level terminal work
import { cursor, style, screen, mouse } from 'blecsd/terminal';

function drawCustomFrame() {
  cursor.hide();
  screen.alternateBuffer();
  // ... custom rendering
  cursor.show();
}
```

```typescript
// OKAY: Mixing high-level and low-level in same file
import { createBox, render } from 'blecsd';
import { cursor } from 'blecsd/terminal';

const box = createBox(world, { ... });
cursor.hide();  // Temporarily hide cursor
render(world);
cursor.show();
```

---

## FAQ

### Q: Should I always use `blecsd` or always use specialized modules?

**A**: Use `blecsd` for typical development. Use specialized modules when:
- You need fine-grained control (custom systems, low-level I/O)
- You're building advanced integrations (plugins, extensions)
- You want tree-shaking optimizations (import only what you need)

---

### Q: Why does `blecsd` re-export terminal utilities?

**A**: Convenience. Most apps need a few terminal utilities (cursor, style) alongside widgets. Re-exporting avoids requiring two imports:

```typescript
// Without re-exports (verbose)
import { createBox, render } from 'blecsd';
import { cursor } from 'blecsd/terminal';

// With re-exports (concise)
import { createBox, render, cursor } from 'blecsd';
```

However, if your file is **heavily** using terminal I/O, prefer `'blecsd/terminal'` to signal intent.

---

### Q: Can I mix import paths in the same file?

**A**: Yes, but use it to signal intent:

```typescript
// High-level widget logic
import { createBox, setPosition } from 'blecsd';

// Low-level rendering optimization
import { createOutputBuffer, writeChar } from 'blecsd/terminal';
```

This shows: "This file uses high-level APIs but drops down to low-level for specific optimizations."

---

### Q: What about tree-shaking? Should I always use specialized modules?

**A**: Modern bundlers (Rollup, esbuild, Webpack 5+) tree-shake unused exports automatically. You don't need to micro-optimize imports unless you're building libraries or have strict bundle size constraints.

**For apps**: Use `blecsd` for simplicity.
**For libraries**: Use specialized modules for smaller footprint.

---

### Q: How do I know what's exported from each module?

**A**: Check the [API Reference](/docs/api/) or use TypeScript autocomplete. Each module's `index.ts` explicitly lists all exports.

---

## Summary

| Module | Use Case | Example |
|--------|----------|---------|
| `blecsd` | **Default choice** for apps, widgets, games | `import { createWorld, createBox } from 'blecsd';` |
| `blecsd/terminal` | Low-level terminal I/O, ANSI sequences | `import { cursor, style } from 'blecsd/terminal';` |
| `blecsd/components` | Custom ECS systems, direct component access | `import { Position, Velocity } from 'blecsd/components';` |
| `blecsd/systems` | Custom system execution order | `import { renderSystem } from 'blecsd/systems';` |
| `blecsd/widgets` | Direct widget factories (rarely needed) | `import { createBox } from 'blecsd/widgets';` |
| `blecsd/game` | Game-specific APIs | `import { detectCollisions } from 'blecsd/game';` |
| `blecsd/3d` | 3D rendering | `import { three } from 'blecsd/3d';` |
| `blecsd/audio` | Audio playback | `import { playSound } from 'blecsd/audio';` |
| `blecsd/utils` | Text utilities, helpers | `import { wrapText } from 'blecsd/utils';` |
| `blecsd/schemas` | Zod validation schemas | `import { BoxConfigSchema } from 'blecsd/schemas';` |

**Rule of thumb**: Start with `blecsd`. Use specialized modules when you need explicit control or are building advanced features.

---

## Related Guides

- [Getting Started](/docs/guides/getting-started.md) - Building your first blECSd app
- [ECS Architecture](/docs/guides/ecs-architecture.md) - Understanding the Entity Component System
- [Game API vs UI API](/docs/guides/game-vs-ui-api.md) - When to use game features vs terminal widgets
- [Terminal I/O](/docs/api/terminal.md) - Low-level terminal control reference

---

**Next**: [Cheat Sheet](/docs/guides/cheat-sheet.md) - Quick reference for common APIs
