# Render System

The render system draws entities to the screen buffer. It runs in the RENDER phase after layout computation and handles background fills, borders, and content rendering.

## Overview

The render system:
- Queries entities with Position and Renderable components
- Filters to visible, dirty entities only
- Sorts by z-index (lower renders first, higher renders on top)
- Renders each entity: background, border, content
- Marks dirty regions for efficient terminal output
- Marks entities as clean after rendering

## Basic Usage

```typescript
import { createScheduler, createWorld, LoopPhase } from 'blecsd/core';
import { renderSystem, setRenderBuffer } from 'blecsd/systems';
import { createDoubleBuffer } from 'blecsd/terminal';

const world = createWorld();

// Create double buffer for rendering
const db = createDoubleBuffer(80, 24);

// Set the render buffer before running the system
setRenderBuffer(db);

// Register with scheduler
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

// In game loop
const deltaTime = 1 / 60;
scheduler.run(world, deltaTime);
void deltaTime;
```

## Setting Up Rendering

Before the render system can work, you must set a double buffer:

```typescript
import { createDoubleBuffer } from 'blecsd/terminal';
import { setRenderBuffer, getRenderBuffer, clearRenderBuffer } from 'blecsd/systems';

// Create and set buffer
const db = createDoubleBuffer(80, 24);
setRenderBuffer(db);

// Get current double buffer
const current = getRenderBuffer(); // Returns DoubleBufferData or null
void current;

// Clear when done
clearRenderBuffer();
```

## Rendering Order

Entities are rendered in z-index order:

```typescript
import { setPosition, setZIndex } from 'blecsd/components';
import { setStyle } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();

// Background panel (z=0)
const background = addEntity(world);
setPosition(world, background, 0, 0, 0);
setStyle(world, background, { bg: 0x333333ff });

// Content panel (z=10)
const content = addEntity(world);
setPosition(world, content, 10, 5);
setZIndex(world, content, 10);
setStyle(world, content, { bg: 0x0000ffff });

// Overlay (z=100)
const overlay = addEntity(world);
setPosition(world, overlay, 5, 3);
setZIndex(world, overlay, 100);
setStyle(world, overlay, { bg: 0xff0000ff });

// Render order: background -> content -> overlay
// Higher z-index renders on top
```

## Render Context

The render context provides access to rendering resources:

```typescript
import type { RenderContext } from 'blecsd/systems';
// RenderContext provides: world, buffer (ScreenBufferData), dirtyTracker (DirtyTracker)
void ({} as unknown as RenderContext);
```

## Render Functions

### renderBackground

Fills the entity's bounds with its background color:

```typescript
import { renderBackground, setRenderBuffer } from 'blecsd/systems';
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import { createScreenBuffer } from 'blecsd/terminal';

const world = createWorld();
const entity = addEntity(world);
const tracker = createDirtyTracker(80, 24);
const buffer = createScreenBuffer(80, 24);
setRenderBuffer(tracker, buffer);

const ctx = { world, buffer, dirtyTracker: tracker };
renderBackground(ctx, entity, { x: 10, y: 5, width: 20, height: 10 });
```

Respects the `transparent` style property:

```typescript
import { setStyle } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setStyle(world, entity, { bg: 0xff0000ff, transparent: true });
// Background will NOT be rendered
```

### renderBorder

Renders the entity's border if configured:

```typescript
import { renderBorder, setRenderBuffer } from 'blecsd/systems';
import { BorderType, setBorder } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import { createScreenBuffer } from 'blecsd/terminal';

const world = createWorld();
const entity = addEntity(world);
const tracker = createDirtyTracker(80, 24);
const buffer = createScreenBuffer(80, 24);
setRenderBuffer(tracker, buffer);

// Set up border
setBorder(world, entity, { type: BorderType.Line });

const ctx = { world, buffer, dirtyTracker: tracker };
// Render border
renderBorder(ctx, entity, { x: 10, y: 5, width: 20, height: 10 });
```

### renderContent

Base implementation is a placeholder for widget extensions:

```typescript
import { renderContent, setRenderBuffer } from 'blecsd/systems';
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import { createScreenBuffer } from 'blecsd/terminal';

const world = createWorld();
const entity = addEntity(world);
const tracker = createDirtyTracker(80, 24);
const buffer = createScreenBuffer(80, 24);
setRenderBuffer(tracker, buffer);

const ctx = { world, buffer, dirtyTracker: tracker };
const contentBounds = { x: 11, y: 6, width: 18, height: 8 };
// Called by render system, can be overridden by widgets
renderContent(ctx, entity, contentBounds);
```

### renderScrollbar

Placeholder for scrollable content support:

```typescript
import { renderScrollbar, setRenderBuffer } from 'blecsd/systems';
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import { createScreenBuffer } from 'blecsd/terminal';

const world = createWorld();
const entity = addEntity(world);
const tracker = createDirtyTracker(80, 24);
const buffer = createScreenBuffer(80, 24);
setRenderBuffer(tracker, buffer);

const ctx = { world, buffer, dirtyTracker: tracker };
const bounds = { x: 10, y: 5, width: 20, height: 10 };
// Called by render system when scrollable
renderScrollbar(ctx, entity, bounds);
```

## Utility Functions

### renderText

Writes text to the buffer:

```typescript
import { renderText } from 'blecsd/systems';
import { Attr, createScreenBuffer } from 'blecsd/terminal';

const buffer = createScreenBuffer(80, 24);

// Simple text
renderText(buffer, 10, 5, 'Hello, World!', 0xffffffff, 0x000000ff);

// Bold text
renderText(buffer, 10, 7, 'Bold Text', 0xffffffff, 0x000000ff, Attr.BOLD);

// Multiple attributes
renderText(buffer, 10, 9, 'Styled', 0xff0000ff, 0x000000ff, Attr.BOLD | Attr.UNDERLINE);
```

### renderRect

Fills a rectangular region:

```typescript
import { renderRect } from 'blecsd/systems';
import { createCell, createScreenBuffer } from 'blecsd/terminal';

const buffer = createScreenBuffer(80, 24);

// Fill region with blue background
renderRect(buffer, 10, 5, 20, 10, createCell(' ', 0xffffffff, 0x0000ffff));

// Fill with character
renderRect(buffer, 0, 0, 80, 1, createCell('=', 0xffff00ff, 0x000000ff));
```

### markAllDirty

Forces all entities to re-render:

```typescript
import { markAllDirty } from 'blecsd/systems';
import { createWorld } from 'blecsd/core';

const world = createWorld();

// After major state change
markAllDirty(world);
```

## Integration with Layout System

The render system uses computed layout for positions:

```typescript
import { layoutSystem, renderSystem } from 'blecsd/systems';
import { createScheduler, createWorld, LoopPhase } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();

// Layout must run before render
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
void world;
```

## Complete Render Loop Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createDirtyTracker } from 'blecsd/core';
import {
  setPosition,
  setDimensions,
  setStyle,
  setBorder,
  BorderType,
} from 'blecsd/components';
import { layoutSystem, renderSystem, setRenderBuffer } from 'blecsd/systems';
import { createScreenBuffer } from 'blecsd/terminal';

// Setup
const world = createWorld();
const tracker = createDirtyTracker(80, 24);
const buffer = createScreenBuffer(80, 24);
setRenderBuffer(tracker, buffer);

// Create entity
const panel = addEntity(world);
setPosition(world, panel, 10, 5);
setDimensions(world, panel, 30, 10);
setStyle(world, panel, { fg: 0xffffffff, bg: 0x0000ffff });
setBorder(world, panel, { type: BorderType.Line });

// Render one frame
// Run layout to compute positions
layoutSystem(world);

// Run render to draw entities
renderSystem(world);
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `renderSystem(world)` | Main render system (register with scheduler) |
| `createRenderSystem()` | Factory function returning renderSystem |
| `setRenderBuffer(db)` | Set the double buffer for rendering |
| `getRenderBuffer()` | Get current double buffer |
| `clearRenderBuffer()` | Clear the render buffer reference |
| `renderBackground(ctx, eid, bounds)` | Render entity background |
| `renderBorder(ctx, eid, bounds)` | Render entity border |
| `renderContent(ctx, eid, bounds)` | Render entity content (placeholder) |
| `renderScrollbar(ctx, eid, bounds)` | Render entity scrollbar (placeholder) |
| `renderText(buffer, x, y, text, fg, bg, attrs)` | Write text to buffer |
| `renderRect(buffer, x, y, w, h, cell)` | Fill rectangle in buffer |
| `markAllDirty(world)` | Mark all entities for redraw |

### Types

```typescript
import type { RenderContext } from 'blecsd/systems';
// RenderContext interface:
// interface RenderContext {
//   readonly world: World;
//   readonly buffer: ScreenBufferData;
//   readonly dirtyTracker: DirtyTracker;
// }
void ({} as unknown as RenderContext);
```

## Performance Tips

1. **Only mark dirty when needed** - avoid unnecessary `markDirty` calls
2. **Use z-index wisely** - minimize overlapping renders
3. **Batch style changes** - set all styles before rendering
4. **Leverage transparency** - use `transparent: true` for overlay content
5. **Use layout system** - let ComputedLayout handle position calculations

## See Also

- [Layout System](./layout.md) - Pre-compute positions before rendering
- [Double Buffer](../terminal/cell.md) - Efficient terminal output
- [Renderable Component](../renderable.md) - Visual styling
- [Border Component](../border.md) - Border configuration
