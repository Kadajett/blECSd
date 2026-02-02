# CSR (Change Scroll Region) Optimization API

Hardware-accelerated scrolling using terminal scroll regions.

## Overview

The CSR system provides:
- Hardware scrolling using terminal escape sequences
- Automatic detection of when CSR is beneficial
- Scroll operation detection by comparing buffer states
- Insert/delete line alternatives
- Full-width and sub-region scrolling

Hardware scrolling is significantly faster than redrawing because the terminal can shift existing content without receiving new cell data.

## Quick Start

```typescript
import {
  createCSRContext,
  canUseCSR,
  getScrollSequence,
  scrollWithCSR,
} from 'blecsd';

// Create context with terminal capabilities
const ctx = createCSRContext({
  width: 80,
  height: 24,
  supportsCSR: true,
});

// Check if CSR can be used for a scroll operation
if (canUseCSR(ctx, 5, 20, 3, 'up')) {
  // Get the escape sequences to perform hardware scroll
  const result = getScrollSequence(ctx, 5, 20, 3, 'up');

  // Write sequences to terminal
  process.stdout.write(result.sequences.join(''));

  // Redraw the newly exposed lines
  for (const line of result.linesToRedraw) {
    redrawLine(line);
  }
}
```

## Context

### createCSRContext

Create a CSR context with terminal capabilities.

```typescript
import { createCSRContext } from 'blecsd';

const ctx = createCSRContext({
  width: 80,
  height: 24,
  supportsCSR: true,        // Terminal supports scroll regions
  supportsInsertDelete: true, // Terminal supports insert/delete line
  destroysOutsideContent: false, // Scrolling preserves content outside region
});
```

### CSRContextOptions

```typescript
interface CSRContextOptions {
  readonly width: number;
  readonly height: number;
  readonly supportsCSR?: boolean;        // default: true
  readonly supportsInsertDelete?: boolean; // default: true
  readonly destroysOutsideContent?: boolean; // default: false
}
```

### resizeCSRContext

Update context dimensions after terminal resize.

```typescript
import { resizeCSRContext } from 'blecsd';

const resized = resizeCSRContext(ctx, 120, 40);
```

## Detection

### canUseCSR

Determine if hardware scrolling would be beneficial.

```typescript
import { canUseCSR } from 'blecsd';

// Can we use CSR to scroll lines 5-20 up by 3?
if (canUseCSR(ctx, 5, 20, 3, 'up')) {
  // Hardware scroll is beneficial
}
```

CSR is beneficial when:
1. Terminal supports CSR
2. Scroll region is valid (top < bottom, within bounds)
3. Scroll amount is positive and less than region height
4. CSR cost is less than redraw cost

### hasCleanSides

Check if region edges are suitable for CSR.

```typescript
import { hasCleanSides } from 'blecsd';

// CSR works best with full-width scrolling
const clean = hasCleanSides(leftEdgeEmpty, rightEdgeEmpty);
```

### detectScrollOperation

Detect scroll operations by comparing buffer states.

```typescript
import { detectScrollOperation, computeLineHashes } from 'blecsd';

// Compute hashes for old and new buffer states
const oldHashes = computeLineHashes(oldLines);
const newHashes = computeLineHashes(newLines);

// Detect if a scroll occurred
const op = detectScrollOperation(oldHashes, newHashes, 0, 24);
if (op) {
  console.log(`Detected scroll ${op.direction} by ${op.lines} lines`);
}
```

## Scroll Sequences

### getScrollSequence

Generate escape sequences for a scroll operation.

```typescript
import { getScrollSequence } from 'blecsd';

const result = getScrollSequence(ctx, 5, 20, 3, 'up');

if (result.usedCSR) {
  // Write escape sequences to terminal
  process.stdout.write(result.sequences.join(''));

  // Redraw newly exposed lines
  for (const line of result.linesToRedraw) {
    redrawLine(line);
  }
}
```

### CSRScrollResult

```typescript
interface CSRScrollResult {
  readonly usedCSR: boolean;
  readonly sequences: readonly string[];
  readonly linesToRedraw: readonly number[];
}
```

### scrollWithCSR

Convenience function using a scroll operation object.

```typescript
import { scrollWithCSR } from 'blecsd';

const result = scrollWithCSR(ctx, {
  top: 5,
  bottom: 20,
  lines: 3,
  direction: 'up',
});
```

### ScrollOperation

```typescript
interface ScrollOperation {
  readonly top: number;      // 0-indexed
  readonly bottom: number;   // 0-indexed, exclusive
  readonly lines: number;
  readonly direction: CSRScrollDirection;
}

type CSRScrollDirection = 'up' | 'down';
```

## Escape Sequences

Low-level escape sequence generators.

### setScrollRegion / resetScrollRegion

```typescript
import { setScrollRegion, resetScrollRegion } from 'blecsd';

// Set scroll region to lines 5-20 (1-indexed)
const set = setScrollRegion(5, 20);  // '\x1b[5;20r'

// Reset to full screen
const reset = resetScrollRegion();   // '\x1b[r'
```

### scrollUp / scrollDown

```typescript
import { scrollUp, scrollDown } from 'blecsd';

const up = scrollUp(3);    // '\x1b[3S'
const down = scrollDown(2); // '\x1b[2T'
```

### insertLine / deleteLine

```typescript
import { insertLine, deleteLine } from 'blecsd';

const ins = insertLine(5);  // '\x1b[5L'
const del = deleteLine(3);  // '\x1b[3M'
```

### moveCursor

```typescript
import { moveCursor } from 'blecsd';

const move = moveCursor(10, 20);  // '\x1b[10;20H' (1-indexed)
```

## Insert/Delete Line Sequences

Alternative to scroll regions for some operations.

### getInsertLineSequence

```typescript
import { getInsertLineSequence } from 'blecsd';

// Insert 2 lines at row 5, with region bottom at 20
const sequences = getInsertLineSequence(ctx, 5, 2, 20);
process.stdout.write(sequences.join(''));
```

### getDeleteLineSequence

```typescript
import { getDeleteLineSequence } from 'blecsd';

// Delete 2 lines at row 5, with region bottom at 20
const sequences = getDeleteLineSequence(ctx, 5, 2, 20);
process.stdout.write(sequences.join(''));
```

## Line Hashing

Utilities for scroll detection.

### hashLine

Compute a fast hash for a line of content.

```typescript
import { hashLine } from 'blecsd';

const hash = hashLine('Hello, World!');
```

### computeLineHashes

Compute hashes for multiple lines.

```typescript
import { computeLineHashes } from 'blecsd';

const hashes = computeLineHashes(['Line 1', 'Line 2', 'Line 3']);
```

## Example: Scrolling Text Area

```typescript
import {
  createCSRContext,
  canUseCSR,
  getScrollSequence,
  detectScrollOperation,
  computeLineHashes,
} from 'blecsd';

// Text area scroll handler
function scrollTextArea(
  ctx: CSRContext,
  oldContent: string[],
  newContent: string[],
  top: number,
  bottom: number,
): void {
  // Try to detect if this is a scroll operation
  const oldHashes = computeLineHashes(oldContent);
  const newHashes = computeLineHashes(newContent);

  const detected = detectScrollOperation(oldHashes, newHashes, top, bottom);

  if (detected && canUseCSR(ctx, detected.top, detected.bottom, detected.lines, detected.direction)) {
    // Use hardware scroll
    const result = getScrollSequence(
      ctx,
      detected.top,
      detected.bottom,
      detected.lines,
      detected.direction
    );

    // Send scroll sequences
    process.stdout.write(result.sequences.join(''));

    // Only redraw the newly exposed lines
    for (const line of result.linesToRedraw) {
      renderLine(newContent[line], line);
    }
  } else {
    // Fall back to full redraw
    for (let i = top; i < bottom; i++) {
      renderLine(newContent[i], i);
    }
  }
}
```

## Performance Tips

1. **Check CSR support** - Query terminal capabilities at startup
2. **Cache line hashes** - Compute hashes incrementally as content changes
3. **Full-width scrolling** - CSR works best with full-width regions
4. **Batch scroll operations** - Combine multiple scrolls when possible
5. **Reset scroll region** - Always reset after CSR to avoid side effects

## Terminal Compatibility

Most modern terminals support CSR:
- xterm and derivatives
- iTerm2
- Terminal.app
- Windows Terminal
- Alacritty
- Kitty

Check capabilities via terminfo `change_scroll_region` (cs) capability.
