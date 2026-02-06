# Cursor Navigation

Cursor/caret navigation for large documents with O(log n) line lookup via binary search indexing, cursor-first viewport management, and instant page/document navigation.

## Import

```typescript
import {
  buildLineIndex,
  buildLineIndexFromLengths,
  lineForOffset,
  offsetForLine,
  createCursor,
  createViewport,
  createNavConfig,
  ensureCursorVisible,
  clampCursor,
  moveCursorUp,
  moveCursorDown,
  moveCursorLeft,
  moveCursorRight,
  goToLine,
  pageUp,
  pageDown,
  goToStart,
  goToEnd,
} from 'blecsd';
```

## Types

### CursorPosition

```typescript
interface CursorPosition {
  readonly line: number;    // 0-based
  readonly column: number;  // 0-based
}
```

### ViewportState

```typescript
interface ViewportState {
  readonly topLine: number;     // First visible line (0-based)
  readonly height: number;      // Visible line count
  readonly leftColumn: number;  // First visible column
  readonly width: number;       // Visible width in columns
}
```

### CursorNavConfig

```typescript
interface CursorNavConfig {
  readonly scrollPadding: number;      // Default: 5
  readonly horizontalPadding: number;  // Default: 5
  readonly lineWrap: boolean;          // Default: true
  readonly tabWidth: number;           // Default: 4
}
```

### LineIndex

A line index for O(log n) line lookups by byte offset.

```typescript
interface LineIndex {
  readonly offsets: readonly number[];
  readonly lineCount: number;
}
```

### NavigationResult

```typescript
interface NavigationResult {
  readonly cursor: CursorPosition;
  readonly viewport: ViewportState;
  readonly scrolled: boolean;
}
```

## Functions

### buildLineIndex

Builds a line index from text content for O(log n) lookups.

```typescript
function buildLineIndex(text: string): LineIndex
```

**Parameters:**
- `text` - The full document text

**Returns:** A line index structure

### buildLineIndexFromLengths

Builds a line index from an array of line lengths. More efficient when line lengths are already known.

```typescript
function buildLineIndexFromLengths(lineLengths: readonly number[]): LineIndex
```

### lineForOffset

Finds the line number for a given byte offset using binary search. O(log n).

```typescript
function lineForOffset(index: LineIndex, offset: number): number
```

### offsetForLine

Gets the byte offset for the start of a line.

```typescript
function offsetForLine(index: LineIndex, line: number): number
```

**Returns:** Byte offset, or -1 if out of range

### createCursor

Creates a cursor position, clamped to non-negative values.

```typescript
function createCursor(line?: number, column?: number): CursorPosition
```

### createViewport

Creates a viewport state with sensible defaults.

```typescript
function createViewport(
  topLine?: number,     // Default: 0
  height?: number,      // Default: 24
  leftColumn?: number,  // Default: 0
  width?: number,       // Default: 80
): ViewportState
```

### createNavConfig

Creates a navigation config with defaults.

```typescript
function createNavConfig(config?: Partial<CursorNavConfig>): CursorNavConfig
```

### ensureCursorVisible

Adjusts the viewport to ensure the cursor is visible, applying scroll padding.

```typescript
function ensureCursorVisible(
  cursor: CursorPosition,
  viewport: ViewportState,
  totalLines: number,
  config?: Partial<CursorNavConfig>,
): { viewport: ViewportState; scrolled: boolean }
```

### clampCursor

Clamps a cursor position within document bounds.

```typescript
function clampCursor(
  cursor: CursorPosition,
  totalLines: number,
  getLineLength: (line: number) => number,
): CursorPosition
```

### moveCursorUp / moveCursorDown

Moves cursor vertically by a given number of lines.

```typescript
function moveCursorUp(
  cursor: CursorPosition, lines: number,
  viewport: ViewportState, totalLines: number,
  config?: Partial<CursorNavConfig>,
): NavigationResult

function moveCursorDown(
  cursor: CursorPosition, lines: number,
  viewport: ViewportState, totalLines: number,
  config?: Partial<CursorNavConfig>,
): NavigationResult
```

### moveCursorLeft / moveCursorRight

Moves cursor horizontally. Wraps to adjacent lines when `lineWrap` is enabled.

```typescript
function moveCursorLeft(
  cursor: CursorPosition, columns: number,
  viewport: ViewportState, totalLines: number,
  getLineLength: (line: number) => number,
  config?: Partial<CursorNavConfig>,
): NavigationResult

function moveCursorRight(
  cursor: CursorPosition, columns: number,
  viewport: ViewportState, totalLines: number,
  getLineLength: (line: number) => number,
  config?: Partial<CursorNavConfig>,
): NavigationResult
```

### goToLine

Jumps to a specific line using O(1) direct jump.

```typescript
function goToLine(
  targetLine: number,
  viewport: ViewportState,
  totalLines: number,
  config?: Partial<CursorNavConfig>,
): NavigationResult
```

### pageUp / pageDown

Moves cursor by one viewport height.

```typescript
function pageUp(cursor: CursorPosition, viewport: ViewportState, totalLines: number, config?: Partial<CursorNavConfig>): NavigationResult
function pageDown(cursor: CursorPosition, viewport: ViewportState, totalLines: number, config?: Partial<CursorNavConfig>): NavigationResult
```

### goToStart / goToEnd

Jumps to the beginning or end of the document.

```typescript
function goToStart(viewport: ViewportState, totalLines: number, config?: Partial<CursorNavConfig>): NavigationResult
function goToEnd(viewport: ViewportState, totalLines: number, config?: Partial<CursorNavConfig>): NavigationResult
```

## Usage

```typescript
import {
  buildLineIndex, lineForOffset, createCursor, createViewport,
  ensureCursorVisible, goToLine,
} from 'blecsd';

// Build a line index for fast offset-to-line lookups
const index = buildLineIndex('hello\nworld\nfoo');
lineForOffset(index, 7); // 1 (within "world")

// Cursor and viewport management
const cursor = createCursor(100, 0);
const viewport = createViewport(0, 40);
const { viewport: newVp, scrolled } = ensureCursorVisible(cursor, viewport, 10000);

// Instant jump to any line in a million-line document
const result = goToLine(999999, viewport, 1000000);
```

---

## Related

- [Change Coalescing](./change-coalescing.md) - Batching text changes
- [Fold Regions](./fold-regions.md) - Collapsible document regions
- [Virtualized Line Store](./virtualized-line-store.md) - Large text content storage
