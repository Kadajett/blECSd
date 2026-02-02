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

## Smart CSR

Automatic detection and optimization for scroll operations.

### createSmartCSRContext

Create a smart CSR context with automatic detection.

```typescript
import { createSmartCSRContext } from 'blecsd';

const ctx = createSmartCSRContext(
  { width: 80, height: 24, supportsCSR: true },
  {
    enabled: true,           // Enable smart detection
    minRegionHeight: 4,      // Minimum region height
    maxScrollRatio: 0.5,     // Max scroll as ratio of region (50%)
    minLinesPreserved: 2,    // Min lines to preserve for benefit
    bytesPerCell: 10,        // Estimated bytes per cell for cost calc
    csrOverhead: 30,         // Fixed CSR overhead in bytes
    requireCleanSides: false, // Require empty edges
  }
);
```

### SmartCSRConfig

```typescript
interface SmartCSRConfig {
  readonly enabled?: boolean;         // default: true
  readonly minRegionHeight?: number;  // default: 4
  readonly maxScrollRatio?: number;   // default: 0.5
  readonly minLinesPreserved?: number; // default: 2
  readonly bytesPerCell?: number;     // default: 10
  readonly csrOverhead?: number;      // default: 30
  readonly requireCleanSides?: boolean; // default: false
}
```

### analyzeCSR

Analyze whether CSR should be used for a scroll operation.

```typescript
import { createSmartCSRContext, analyzeCSR } from 'blecsd';

const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
const analysis = analyzeCSR(ctx, 5, 20, 3, 'up');

if (analysis.shouldUseCSR) {
  console.log(`CSR saves ${analysis.bytesSaved} bytes`);
  console.log(`Preserving ${analysis.linesPreserved} lines`);
} else {
  console.log(`Skipping CSR: ${analysis.reason}`);
}
```

### SmartCSRAnalysis

```typescript
interface SmartCSRAnalysis {
  readonly shouldUseCSR: boolean;
  readonly reason: SmartCSRReason;
  readonly csrCost: number;
  readonly redrawCost: number;
  readonly bytesSaved: number;
  readonly linesPreserved: number;
  readonly scrollOperation: ScrollOperation | null;
}

type SmartCSRReason =
  | 'csr_disabled'
  | 'terminal_no_csr'
  | 'region_too_small'
  | 'scroll_too_large'
  | 'too_few_lines_preserved'
  | 'edges_not_clean'
  | 'no_scroll_detected'
  | 'csr_more_expensive'
  | 'csr_beneficial';
```

### analyzeBufferForCSR

Analyze buffer changes and detect if CSR should be used.

```typescript
import { createSmartCSRContext, analyzeBufferForCSR } from 'blecsd';

const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
const analysis = analyzeBufferForCSR(ctx, oldBuffer, newBuffer);

if (analysis.shouldUseCSR && analysis.scrollOperation) {
  const result = scrollWithCSR(ctx, analysis.scrollOperation);
  process.stdout.write(result.sequences.join(''));
}
```

### smartScroll

One-step smart scroll with buffer comparison.

```typescript
import { createSmartCSRContext, smartScroll } from 'blecsd';

const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
const result = smartScroll(ctx, oldBuffer, newBuffer);

if (result.usedCSR) {
  process.stdout.write(result.sequences.join(''));
  for (const line of result.linesToRedraw) {
    redrawLine(line);
  }
}
```

### checkEdges

Check if region edges are clean for CSR.

```typescript
import { checkEdges } from 'blecsd';

const edges = checkEdges(buffer, 5, 20);
if (edges.leftClean && edges.rightClean) {
  // Safe to use CSR
}
```

### SmartCSRBuffer Interface

Buffer interface for smart CSR analysis.

```typescript
interface SmartCSRBuffer {
  readonly width: number;
  readonly height: number;
  getCell(x: number, y: number): SmartCSRCell | undefined;
  getLineContent(y: number): string;
}

interface SmartCSRCell {
  readonly char: string;
  readonly isEmpty: boolean;
}
```

### calculateCSREfficiency

Calculate efficiency ratio for CSR vs redraw.

```typescript
import { createSmartCSRContext, calculateCSREfficiency } from 'blecsd';

const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
const efficiency = calculateCSREfficiency(ctx, 20, 3);

// efficiency > 1.0 means CSR is more efficient
// efficiency < 1.0 means redraw is more efficient
console.log(`CSR is ${efficiency}x more efficient`);
```

### isSmartCSREnabled

Check if smart CSR is enabled.

```typescript
import { createSmartCSRContext, isSmartCSREnabled } from 'blecsd';

const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
if (isSmartCSREnabled(ctx)) {
  // Use smart CSR
}
```

### updateSmartCSRConfig

Update smart CSR configuration.

```typescript
import { createSmartCSRContext, updateSmartCSRConfig } from 'blecsd';

let ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
ctx = updateSmartCSRConfig(ctx, { minRegionHeight: 6 });
```

## Example: Automatic Scroll Detection

```typescript
import {
  createSmartCSRContext,
  smartScroll,
  type SmartCSRBuffer,
} from 'blecsd';

// Create smart CSR context
const ctx = createSmartCSRContext(
  { width: 80, height: 24, supportsCSR: true },
  { enabled: true }
);

// Render function with automatic CSR detection
function render(oldBuffer: SmartCSRBuffer, newBuffer: SmartCSRBuffer): void {
  // Try smart scroll first
  const result = smartScroll(ctx, oldBuffer, newBuffer);

  if (result.usedCSR) {
    // Hardware scroll worked
    process.stdout.write(result.sequences.join(''));

    // Only redraw newly exposed lines
    for (const line of result.linesToRedraw) {
      renderLine(newBuffer, line);
    }
  } else {
    // Fall back to full redraw
    fullRedraw(newBuffer);
  }
}
```

## Performance Tips

1. **Check CSR support** - Query terminal capabilities at startup
2. **Cache line hashes** - Compute hashes incrementally as content changes
3. **Full-width scrolling** - CSR works best with full-width regions
4. **Batch scroll operations** - Combine multiple scrolls when possible
5. **Reset scroll region** - Always reset after CSR to avoid side effects
6. **Use smart CSR** - Let the system decide when CSR is beneficial
7. **Tune thresholds** - Adjust minRegionHeight and maxScrollRatio for your use case

## Terminal Compatibility

Most modern terminals support CSR:
- xterm and derivatives
- iTerm2
- Terminal.app
- Windows Terminal
- Alacritty
- Kitty

Check capabilities via terminfo `change_scroll_region` (cs) capability.
