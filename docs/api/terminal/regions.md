# Screen Region Operations API

High-level region manipulation for screen buffers.

## Overview

The regions module provides utilities for manipulating rectangular regions within screen buffers. These operations are useful for:

- Clearing areas before rendering
- Filling backgrounds
- Implementing scrolling
- Line insertion/deletion
- Region clipping and intersection

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScreenBuffer,
  clearRegion,
  fillRegion,
  scrollRegionUp,
  blankLine,
  createCell,
} from 'blecsd';

const buffer = createScreenBuffer(80, 24);

// Clear a rectangular region
clearRegion(buffer, 10, 5, 20, 10);

// Fill status bar with blue background
fillRegion(buffer, 0, 23, 80, 1, createCell(' ', 0xffffffff, 0x0000ffff));

// Scroll content up (for terminal output)
scrollRegionUp(buffer, 0, 0, 80, 24, 1);

// Blank bottom line after scroll
blankLine(buffer, 23);
```

## Region Functions

### clearRegion

Clears a rectangular region with empty cells.

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearRegion } from 'blecsd';

// Clear with default colors (white on black)
clearRegion(buffer, x, y, width, height);

// Clear with custom background
clearRegion(buffer, 0, 0, 80, 1, 0xffffffff, 0x0000ffff);
```

### fillRegion

Fills a rectangular region with a specific cell.

<!-- blecsd-doccheck:ignore -->
```typescript
import { fillRegion, createCell, Attr } from 'blecsd';

// Fill with red X characters
fillRegion(buffer, 10, 5, 20, 10, createCell('X', 0xff0000ff));

// Fill with styled background
const headerCell = createCell(' ', 0xffffffff, 0x0000ffff, Attr.BOLD);
fillRegion(buffer, 0, 0, 80, 1, headerCell);
```

### blankLine

Blanks a single line.

<!-- blecsd-doccheck:ignore -->
```typescript
import { blankLine } from 'blecsd';

// Blank line 5 with defaults
blankLine(buffer, 5);

// Blank with custom colors
blankLine(buffer, 23, 0xffffffff, 0x0000ffff);
```

### blankLines

Blanks multiple lines.

<!-- blecsd-doccheck:ignore -->
```typescript
import { blankLines } from 'blecsd';

// Blank lines 20-23 (bottom 4 lines)
blankLines(buffer, 20, 4);

// Blank with custom background
blankLines(buffer, 0, 2, 0xffffffff, 0x333333ff);
```

## Scrolling Functions

### scrollRegionUp

Scrolls a region up, filling empty lines at the bottom.

<!-- blecsd-doccheck:ignore -->
```typescript
import { scrollRegionUp } from 'blecsd';

// Scroll entire buffer up by 1 line
scrollRegionUp(buffer, 0, 0, 80, 24, 1);

// Scroll a sub-region up by 3 lines
scrollRegionUp(buffer, 10, 5, 40, 10, 3);

// Scroll with custom fill cell
scrollRegionUp(buffer, 0, 0, 80, 24, 1, createCell('~'));
```

### scrollRegionDown

Scrolls a region down, filling empty lines at the top.

<!-- blecsd-doccheck:ignore -->
```typescript
import { scrollRegionDown } from 'blecsd';

// Scroll entire buffer down by 1 line
scrollRegionDown(buffer, 0, 0, 80, 24, 1);

// Scroll a 40x10 region down by 3 lines
scrollRegionDown(buffer, 10, 5, 40, 10, 3);
```

### copyRegionInBuffer

Copies a region within the same buffer. Handles overlapping regions correctly.

<!-- blecsd-doccheck:ignore -->
```typescript
import { copyRegionInBuffer } from 'blecsd';

// Copy from (0,1) to (0,0) - scroll up simulation
copyRegionInBuffer(buffer, 0, 1, 0, 0, 80, 23);

// Copy from (0,0) to (0,1) - scroll down simulation
copyRegionInBuffer(buffer, 0, 0, 0, 1, 80, 23);
```

## Line Insertion/Deletion

### insertLines

Inserts blank lines, pushing content down.

<!-- blecsd-doccheck:ignore -->
```typescript
import { insertLines } from 'blecsd';

// Insert 3 blank lines at line 5
insertLines(buffer, 5, 3);

// Insert within a region (lines 5-15)
insertLines(buffer, 5, 2, 15);
```

### deleteLines

Deletes lines, pulling content up.

<!-- blecsd-doccheck:ignore -->
```typescript
import { deleteLines } from 'blecsd';

// Delete 2 lines starting at line 5
deleteLines(buffer, 5, 2);

// Delete within a region (lines 5-15)
deleteLines(buffer, 5, 2, 15);
```

## Region Geometry

### createRegion

Creates a region bounds object.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createRegion } from 'blecsd';

const region = createRegion(10, 5, 20, 15);
// { x: 10, y: 5, width: 20, height: 15 }
```

### intersectRegions

Computes the intersection of two regions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { intersectRegions } from 'blecsd';

const a = { x: 0, y: 0, width: 20, height: 10 };
const b = { x: 10, y: 5, width: 20, height: 10 };

const overlap = intersectRegions(a, b);
// { x: 10, y: 5, width: 10, height: 5 }

// Returns null if no overlap
const noOverlap = intersectRegions(
  { x: 0, y: 0, width: 10, height: 10 },
  { x: 50, y: 50, width: 10, height: 10 }
);
// null
```

### unionRegions

Computes the bounding box of two regions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { unionRegions } from 'blecsd';

const a = { x: 0, y: 0, width: 10, height: 10 };
const b = { x: 15, y: 5, width: 10, height: 10 };

const bbox = unionRegions(a, b);
// { x: 0, y: 0, width: 25, height: 15 }
```

### isPointInRegion

Checks if a point is inside a region.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isPointInRegion } from 'blecsd';

const region = { x: 10, y: 5, width: 20, height: 10 };

isPointInRegion(region, 15, 8);  // true - inside
isPointInRegion(region, 5, 8);   // false - left of region
isPointInRegion(region, 30, 8);  // false - on right edge (exclusive)
```

### isRegionEmpty

Checks if a region has zero or negative dimensions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isRegionEmpty } from 'blecsd';

isRegionEmpty({ x: 0, y: 0, width: 0, height: 10 });   // true
isRegionEmpty({ x: 0, y: 0, width: 10, height: -5 });  // true
isRegionEmpty({ x: 0, y: 0, width: 10, height: 10 });  // false
```

### clipToBuffer

Clips a region to buffer bounds.

<!-- blecsd-doccheck:ignore -->
```typescript
import { clipToBuffer, createScreenBuffer } from 'blecsd';

const buffer = createScreenBuffer(80, 24);
const region = { x: -5, y: -5, width: 100, height: 30 };

const clipped = clipToBuffer(buffer, region);
// { x: 0, y: 0, width: 80, height: 24 }
```

## Types

### RegionBounds

```typescript
interface RegionBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```

## Use Cases

### Terminal Scrollback

```typescript
// Scroll content up and add new line at bottom
scrollRegionUp(buffer, 0, 0, width, height, 1);
writeString(buffer, 0, height - 1, newLine);
```

### Clearing Before Render

```typescript
// Clear entity's area before drawing
clearRegion(buffer, entity.x, entity.y, entity.width, entity.height);
renderEntity(buffer, entity);
```

### Status Bar Updates

```typescript
// Redraw status bar
blankLine(buffer, statusBarY, 0xffffffff, 0x0000ffff);
writeString(buffer, 0, statusBarY, statusText);
```

### Editor Line Operations

```typescript
// Insert blank line at cursor
insertLines(buffer, cursorY, 1, scrollRegionBottom);

// Delete line at cursor
deleteLines(buffer, cursorY, 1, scrollRegionBottom);
```

## Best Practices

1. **Use scrolling for performance** - Scrolling moves cells, avoiding full redraws
2. **Clip to bounds** - Use `clipToBuffer` before operations on user-specified regions
3. **Batch operations** - Multiple region operations in sequence are efficient
4. **Use typed regions** - Pass `RegionBounds` objects for clarity
