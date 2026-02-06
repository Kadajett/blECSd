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

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScheduler,
  LoopPhase,
  renderSystem,
  setRenderBuffer,
  createDoubleBuffer,
} from 'blecsd';

// Create double buffer for rendering
const db = createDoubleBuffer(80, 24);

// Set the render buffer before running the system
setRenderBuffer(db);

// Register with scheduler
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

// In game loop
scheduler.run(world, deltaTime);
```

## Setting Up Rendering

Before the render system can work, you must set a double buffer:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createDoubleBuffer, setRenderBuffer, clearRenderBuffer } from 'blecsd';

// Create and set buffer
const db = createDoubleBuffer(80, 24);
setRenderBuffer(db);

// Get current buffer
const current = getRenderBuffer(); // Returns DoubleBufferData or null

// Clear when done
clearRenderBuffer();
```

## Rendering Order

Entities are rendered in z-index order:

<!-- blecsd-doccheck:ignore -->
```typescript
import { setPosition, setZIndex, setStyle } from 'blecsd';

// Background panel (z=0)
const background = addEntity(world);
setPosition(world, background, 0, 0, 0);
setStyle(world, background, { bg: '#333333' });

// Content panel (z=10)
const content = addEntity(world);
setPosition(world, content, 10, 5);
setZIndex(world, content, 10);
setStyle(world, content, { bg: '#0000ff' });

// Overlay (z=100)
const overlay = addEntity(world);
setPosition(world, overlay, 5, 3);
setZIndex(world, overlay, 100);
setStyle(world, overlay, { bg: '#ff0000' });

// Render order: background -> content -> overlay
// Higher z-index renders on top
```

## Render Context

The render context provides access to rendering resources:

```typescript
import type { RenderContext } from 'blecsd';

interface RenderContext {
  readonly world: World;
  readonly buffer: ScreenBufferData;
  readonly doubleBuffer: DoubleBufferData;
}
```

## Render Functions

### renderBackground

Fills the entity's bounds with its background color:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderBackground } from 'blecsd';

// Render background for entity
renderBackground(ctx, entity, { x: 10, y: 5, width: 20, height: 10 });
```

Respects the `transparent` style property:

```typescript
setStyle(world, entity, { bg: '#ff0000', transparent: true });
// Background will NOT be rendered
```

### renderBorder

Renders the entity's border if configured:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderBorder, setBorder, BorderType } from 'blecsd';

// Set up border
setBorder(world, entity, { type: BorderType.Line });

// Render border
renderBorder(ctx, entity, { x: 10, y: 5, width: 20, height: 10 });
```

### renderContent

Base implementation is a placeholder for widget extensions:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderContent } from 'blecsd';

// Called by render system, can be overridden by widgets
renderContent(ctx, entity, contentBounds);
```

### renderScrollbar

Placeholder for scrollable content support:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderScrollbar } from 'blecsd';

// Called by render system when scrollable
renderScrollbar(ctx, entity, bounds);
```

## Utility Functions

### renderText

Writes text to the buffer:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderText, Attr } from 'blecsd';

// Simple text
renderText(buffer, 10, 5, 'Hello, World!', 0xffffffff, 0x000000ff);

// Bold text
renderText(buffer, 10, 7, 'Bold Text', 0xffffffff, 0x000000ff, Attr.BOLD);

// Multiple attributes
renderText(buffer, 10, 9, 'Styled', 0xff0000ff, 0x000000ff, Attr.BOLD | Attr.UNDERLINE);
```

### renderRect

Fills a rectangular region:

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderRect, createCell } from 'blecsd';

// Fill region with blue background
renderRect(buffer, 10, 5, 20, 10, createCell(' ', 0xffffffff, 0x0000ffff));

// Fill with character
renderRect(buffer, 0, 0, 80, 1, createCell('=', 0xffff00ff, 0x000000ff));
```

### markAllDirty

Forces all entities to re-render:

```typescript
import { markAllDirty } from 'blecsd';

// After major state change
markAllDirty(world);
```

## Integration with Layout System

The render system uses computed layout for positions:

<!-- blecsd-doccheck:ignore -->
```typescript
import { layoutSystem, renderSystem } from 'blecsd';

// Layout must run before render
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
```

## Complete Render Loop Example

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setStyle,
  setBorder,
  BorderType,
  layoutSystem,
  renderSystem,
  setRenderBuffer,
  createDoubleBuffer,
  getBackBuffer,
  getMinimalUpdates,
  swapBuffers,
  clearDirtyRegions,
} from 'blecsd';

// Setup
const world = createWorld();
const db = createDoubleBuffer(80, 24);
setRenderBuffer(db);

// Create entity
const panel = addEntity(world);
setPosition(world, panel, 10, 5);
setDimensions(world, panel, 30, 10);
setStyle(world, panel, { fg: '#ffffff', bg: '#0000ff' });
setBorder(world, panel, { type: BorderType.Line });

// Render loop
function render(): void {
  // Run layout to compute positions
  layoutSystem(world);

  // Run render to draw entities
  renderSystem(world);

  // Get changed cells
  const updates = getMinimalUpdates(db);

  // Output to terminal (your implementation)
  for (const { x, y, cell } of updates) {
    outputCell(x, y, cell);
  }

  // Swap and clear
  swapBuffers(db);
  clearDirtyRegions(db);
}
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
interface RenderContext {
  readonly world: World;
  readonly buffer: ScreenBufferData;
  readonly doubleBuffer: DoubleBufferData;
}
```

## Performance Tips

1. **Only mark dirty when needed** - avoid unnecessary `markDirty` calls
2. **Use z-index wisely** - minimize overlapping renders
3. **Batch style changes** - set all styles before rendering
4. **Leverage transparency** - use `transparent: true` for overlay content
5. **Use layout system** - let ComputedLayout handle position calculations

## See Also

- [Layout System](./layout.md) - Pre-compute positions before rendering
- [Double Buffer](../terminal/double-buffer.md) - Efficient terminal output
- [Renderable Component](../renderable.md) - Visual styling
- [Border Component](../border.md) - Border configuration
