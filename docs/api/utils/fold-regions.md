# Fold Regions

Folding/collapsing regions for efficient large document display. Manages fold state as metadata, dynamically adjusting visible line counts without re-rendering folded content. Supports nested regions with O(log n) fold/unfold operations.

## Import

```typescript
import {
  createFoldState,
  addFoldRegion,
  removeFoldRegion,
  foldRegion,
  unfoldRegion,
  toggleFold,
  foldAll,
  unfoldAll,
  foldAtDepth,
  getFoldAtLine,
  getAllFoldRegions,
  getVisibleFoldLines,
  visibleToOriginalLine,
  originalToVisibleLine,
  getFoldStats,
  updateTotalLines,
} from 'blecsd';
```

## Types

### FoldRegion

A fold region definition.

```typescript
interface FoldRegion {
  readonly id: string;
  readonly startLine: number;   // 0-based, inclusive
  readonly endLine: number;     // 0-based, inclusive
  readonly folded: boolean;
  readonly label: string;
  readonly depth: number;       // 0 = top-level
}
```

### FoldConfig

```typescript
interface FoldConfig {
  readonly minFoldableLines: number;  // Default: 2
  readonly labelTemplate: string;     // Default: '... {count} lines'
  readonly maxDepth: number;          // Default: 10
}
```

### VisibleLine

A visible line after applying fold state.

```typescript
interface VisibleLine {
  readonly originalLine: number;
  readonly isFoldPlaceholder: boolean;
  readonly foldId: string | undefined;
  readonly foldLabel: string | undefined;
  readonly hiddenLines: number;
}
```

### FoldStats

```typescript
interface FoldStats {
  readonly totalRegions: number;
  readonly foldedRegions: number;
  readonly hiddenLines: number;
  readonly visibleLines: number;
  readonly maxDepth: number;
}
```

## Functions

### createFoldState

Creates a fold manager for a document.

```typescript
function createFoldState(totalLines: number, config?: Partial<FoldConfig>): MutableFoldState
```

### addFoldRegion

Adds a foldable region. Returns `undefined` if the region is too small, out of bounds, or exceeds max depth.

```typescript
function addFoldRegion(
  state: MutableFoldState,
  startLine: number,
  endLine: number,
  label?: string,
): string | undefined
```

**Returns:** The fold region ID, or `undefined` if invalid

### removeFoldRegion

Removes a fold region by ID.

```typescript
function removeFoldRegion(state: MutableFoldState, foldId: string): boolean
```

### foldRegion / unfoldRegion

Folds (collapses) or unfolds (expands) a region.

```typescript
function foldRegion(state: MutableFoldState, foldId: string): boolean
function unfoldRegion(state: MutableFoldState, foldId: string): boolean
```

### toggleFold

Toggles a region's fold state.

```typescript
function toggleFold(state: MutableFoldState, foldId: string): boolean | undefined
```

**Returns:** The new folded state, or `undefined` if region not found

### foldAll / unfoldAll

Folds or unfolds all regions.

```typescript
function foldAll(state: MutableFoldState): number
function unfoldAll(state: MutableFoldState): number
```

**Returns:** Number of regions affected

### foldAtDepth

Folds all regions at or deeper than the specified depth.

```typescript
function foldAtDepth(state: MutableFoldState, depth: number): number
```

### getFoldAtLine

Gets the innermost fold region at a given line.

```typescript
function getFoldAtLine(state: MutableFoldState, line: number): FoldRegion | undefined
```

### getAllFoldRegions

Gets all fold regions sorted by start line.

```typescript
function getAllFoldRegions(state: MutableFoldState): readonly FoldRegion[]
```

### getVisibleFoldLines

Computes visible lines for a viewport, respecting fold state. Only processes lines within the viewport range.

```typescript
function getVisibleFoldLines(
  state: MutableFoldState,
  viewportStart: number,
  viewportHeight: number,
): readonly VisibleLine[]
```

### visibleToOriginalLine

Converts a visible line index (folded coordinates) to the original document line index.

```typescript
function visibleToOriginalLine(state: MutableFoldState, visibleLine: number): number
```

### originalToVisibleLine

Converts an original document line to the visible line index.

```typescript
function originalToVisibleLine(state: MutableFoldState, originalLine: number): number
```

**Returns:** Visible line index, or -1 if the line is hidden by a fold

### getFoldStats

Gets fold statistics.

```typescript
function getFoldStats(state: MutableFoldState): FoldStats
```

### updateTotalLines

Updates the total document line count. Removes regions that are now out of bounds.

```typescript
function updateTotalLines(state: MutableFoldState, totalLines: number): void
```

## Usage

```typescript
import {
  createFoldState, addFoldRegion, foldRegion,
  getVisibleFoldLines, getFoldStats,
} from 'blecsd';

const folds = createFoldState(10000);

// Add foldable regions (e.g., function bodies)
const id1 = addFoldRegion(folds, 10, 50);
const id2 = addFoldRegion(folds, 100, 200);

// Collapse a region
if (id1) foldRegion(folds, id1);

// Get visible lines for a viewport
const visible = getVisibleFoldLines(folds, 0, 40);
for (const line of visible) {
  if (line.isFoldPlaceholder) {
    console.log(`[${line.foldLabel}]`);  // "... 40 lines"
  } else {
    console.log(`Line ${line.originalLine}`);
  }
}

// Check stats
const stats = getFoldStats(folds);
console.log(`${stats.visibleLines} visible of ${stats.visibleLines + stats.hiddenLines} total`);
```

---

## Related

- [Cursor Navigation](./cursor-navigation.md) - Cursor/viewport management
- [Virtualized Line Store](./virtualized-line-store.md) - Large text content storage
