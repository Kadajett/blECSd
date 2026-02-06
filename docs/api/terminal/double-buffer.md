# Double Buffer System

The double buffer system provides efficient terminal rendering by maintaining two screen buffers and tracking dirty regions to minimize output.

## Overview

Double buffering is a rendering technique that uses two buffers:
- **Front buffer**: The currently displayed content
- **Back buffer**: The content being rendered

After rendering to the back buffer, you swap the buffers and only output the cells that changed. This minimizes terminal I/O for smoother rendering.

## Creating a Double Buffer

<!-- blecsd-doccheck:ignore -->
```typescript
import { createDoubleBuffer, getBackBuffer, setCell, createCell } from 'blecsd';

// Create a double buffer matching terminal size
const db = createDoubleBuffer(80, 24);

// Optionally provide a default cell
const customDefault = createCell('.', 0x808080ff);
const dbWithDefault = createDoubleBuffer(80, 24, customDefault);
```

## Basic Rendering Loop

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createDoubleBuffer,
  getBackBuffer,
  clearBackBuffer,
  markDirtyRegion,
  getMinimalUpdates,
  swapBuffers,
  clearDirtyRegions,
  setCell,
  createCell,
} from 'blecsd';

const db = createDoubleBuffer(80, 24);

function render(): void {
  // Clear back buffer for new frame
  clearBackBuffer(db);

  // Render your content to back buffer
  const back = getBackBuffer(db);
  setCell(back, 10, 5, createCell('X', 0xff0000ff));
  markDirtyRegion(db, 10, 5, 1, 1);

  // Get only the changed cells
  const updates = getMinimalUpdates(db);

  // Output to terminal
  for (const { x, y, cell } of updates) {
    moveCursor(x, y);
    outputCell(cell);
  }

  // Swap and clear tracking
  swapBuffers(db);
  clearDirtyRegions(db);
}
```

## Dirty Region Tracking

The system tracks which regions have changed to avoid comparing the entire buffer.

### Marking Dirty Regions

<!-- blecsd-doccheck:ignore -->
```typescript
import { markDirtyRegion, markLineDirty, markFullRedraw } from 'blecsd';

// Mark a specific region as dirty
markDirtyRegion(db, 10, 5, 20, 10); // x, y, width, height

// Mark a single line as dirty (entire width)
markLineDirty(db, 10); // line 10

// Mark entire screen for redraw (e.g., after resize)
markFullRedraw(db);
```

### Checking Dirty State

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  hasDirtyRegions,
  needsFullRedraw,
  getDirtyRegions,
  getDirtyLines,
} from 'blecsd';

// Check if any updates needed
if (hasDirtyRegions(db)) {
  // Need to render
}

// Check if full redraw needed
if (needsFullRedraw(db)) {
  // Skip dirty region optimization, redraw everything
}

// Get list of dirty regions
const regions = getDirtyRegions(db);
for (const { x, y, w, h } of regions) {
  console.log(`Dirty: ${x},${y} ${w}x${h}`);
}

// Get sorted list of dirty line numbers
const lines = getDirtyLines(db);
console.log(`Dirty lines: ${lines.join(', ')}`);
// Useful for line-by-line rendering optimizations
```

### Optimizing Dirty Regions

Multiple overlapping or adjacent dirty regions can be coalesced:

<!-- blecsd-doccheck:ignore -->
```typescript
import { coalesceDirtyRegions } from 'blecsd';

// Mark multiple regions
markDirtyRegion(db, 0, 0, 10, 10);
markDirtyRegion(db, 5, 5, 10, 10); // Overlaps with first

// Merge overlapping regions
coalesceDirtyRegions(db);

// Now getDirtyRegions() returns fewer, larger regions
```

## Buffer Management

### Accessing Buffers

<!-- blecsd-doccheck:ignore -->
```typescript
import { getBackBuffer, getFrontBuffer } from 'blecsd';

// Get back buffer for rendering
const back = getBackBuffer(db);

// Get front buffer (currently displayed)
const front = getFrontBuffer(db);
```

### Swapping Buffers

<!-- blecsd-doccheck:ignore -->
```typescript
import { swapBuffers } from 'blecsd';

// After rendering and outputting changes
swapBuffers(db);
```

### Clearing

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearBackBuffer, clearDirtyRegions, createCell } from 'blecsd';

// Clear back buffer to spaces
clearBackBuffer(db);

// Clear to custom cell
clearBackBuffer(db, createCell('#', 0x00ff00ff));

// Clear dirty tracking (after rendering)
clearDirtyRegions(db);
```

### Copying Between Buffers

<!-- blecsd-doccheck:ignore -->
```typescript
import { copyFrontToBack } from 'blecsd';

// Copy front to back (useful when starting from current state)
copyFrontToBack(db);
```

## Resizing

<!-- blecsd-doccheck:ignore -->
```typescript
import { resizeDoubleBuffer, createCell } from 'blecsd';

// Handle terminal resize
function onResize(newWidth: number, newHeight: number): void {
  db = resizeDoubleBuffer(db, newWidth, newHeight);

  // Optionally specify fill cell for new areas
  db = resizeDoubleBuffer(db, newWidth, newHeight, createCell('.'));
}
```

## Statistics

Get debugging information about buffer state:

<!-- blecsd-doccheck:ignore -->
```typescript
import { getDoubleBufferStats } from 'blecsd';

const stats = getDoubleBufferStats(db);
console.log(`Size: ${stats.width}x${stats.height}`);
console.log(`Total cells: ${stats.totalCells}`);
console.log(`Dirty regions: ${stats.dirtyRegionCount}`);
console.log(`Dirty area: ${stats.dirtyAreaTotal}`);
console.log(`Full redraw: ${stats.needsFullRedraw}`);
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `DoubleBufferData` | Main double buffer structure |
| `Rect` | Rectangle with x, y, w, h properties |

### DoubleBufferData

```typescript
interface DoubleBufferData {
  readonly width: number;
  readonly height: number;
  frontBuffer: ScreenBufferData;
  backBuffer: ScreenBufferData;
  readonly dirtyRegions: Rect[];
  fullRedraw: boolean;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createDoubleBuffer(width, height, defaultCell?)` | Create new double buffer |
| `getBackBuffer(db)` | Get back buffer for rendering |
| `getFrontBuffer(db)` | Get front buffer (displayed) |
| `swapBuffers(db)` | Swap front and back buffers |
| `markDirtyRegion(db, x, y, w, h)` | Mark region as needing update |
| `markLineDirty(db, y)` | Mark entire line as dirty |
| `markFullRedraw(db)` | Mark entire screen for redraw |
| `clearDirtyRegions(db)` | Clear all dirty tracking |
| `getDirtyRegions(db)` | Get array of dirty regions |
| `getDirtyLines(db)` | Get sorted array of dirty line numbers |
| `hasDirtyRegions(db)` | Check if updates needed |
| `needsFullRedraw(db)` | Check if full redraw needed |
| `coalesceDirtyRegions(db)` | Merge overlapping regions |
| `getMinimalUpdates(db)` | Get changed cells to output |
| `clearBackBuffer(db, cell?)` | Clear back buffer |
| `copyFrontToBack(db)` | Copy front buffer to back |
| `resizeDoubleBuffer(db, w, h, fill?)` | Resize buffers |
| `getDoubleBufferStats(db)` | Get debugging statistics |

## Performance Tips

1. **Mark precise dirty regions** rather than the entire screen
2. **Use `coalesceDirtyRegions`** before `getMinimalUpdates` for many small changes
3. **Avoid `markFullRedraw`** except for terminal resize or major state changes
4. **Clear dirty regions after rendering** to avoid redundant comparisons
