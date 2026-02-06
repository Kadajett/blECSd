# Virtualized Line Store

High-performance data structure for storing and accessing millions of lines with O(1) random access. Optimized for read-only content with streaming append support.

## Import

```typescript
import {
  createLineStore,
  createLineStoreFromLines,
  createEmptyLineStore,
  getLineAtIndex,
  getLineInfo,
  getLineRange,
  getVisibleLines,
  appendToStore,
  appendLines,
  getLineCount,
  getByteSize,
  isStoreEmpty,
  getStoreStats,
  getLineForOffset,
  getOffsetForLine,
  exportContent,
  exportLineRange,
  trimToLineCount,
  CHUNKED_THRESHOLD,
} from 'blecsd';
```

## Types

### VirtualizedLineStore

Immutable view of a virtualized line store.

```typescript
interface VirtualizedLineStore {
  readonly buffer: string;
  readonly offsets: Uint32Array;
  readonly lineCount: number;
  readonly byteSize: number;
  readonly indexed: boolean;
}
```

### LineStoreStats

```typescript
interface LineStoreStats {
  readonly lineCount: number;
  readonly byteSize: number;
  readonly offsetArrayBytes: number;
  readonly totalMemoryBytes: number;
  readonly avgLineLength: number;
  readonly indexed: boolean;
}
```

### LineRange

```typescript
interface LineRange {
  readonly lines: readonly string[];
  readonly startLine: number;
  readonly endLine: number;         // exclusive
  readonly extractTimeMs: number;
}
```

### LineInfo

```typescript
interface LineInfo {
  readonly text: string;
  readonly offset: number;
  readonly length: number;
  readonly lineNumber: number;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CHUNKED_THRESHOLD` | `1_000_000` | Maximum lines before switching to chunked mode |

## Zod Schemas

Validation schemas are exported for runtime validation of parameters.

```typescript
import { LineIndexSchema, LineRangeParamsSchema, VisibleLinesParamsSchema, TrimParamsSchema } from 'blecsd';
```

## Functions

### createLineStore

Creates a virtualized line store from text content.

```typescript
function createLineStore(content?: string): VirtualizedLineStore
```

### createLineStoreFromLines

Creates a line store from an array of lines.

```typescript
function createLineStoreFromLines(lines: readonly string[]): VirtualizedLineStore
```

### createEmptyLineStore

Creates an empty line store.

```typescript
function createEmptyLineStore(): VirtualizedLineStore
```

### getLineAtIndex

Gets a line at a specific index. O(1) operation.

```typescript
function getLineAtIndex(store: VirtualizedLineStore, index: number): string | undefined
```

### getLineInfo

Gets detailed information about a line.

```typescript
function getLineInfo(store: VirtualizedLineStore, index: number): LineInfo | undefined
```

### getLineRange

Gets a range of lines. Optimized for viewport extraction.

```typescript
function getLineRange(
  store: VirtualizedLineStore,
  startLine: number,
  endLine: number,
): LineRange
```

### getVisibleLines

Gets visible lines for a viewport with configurable overscan.

```typescript
function getVisibleLines(
  store: VirtualizedLineStore,
  firstVisible: number,
  visibleCount: number,
  overscanBefore?: number,  // Default: 5
  overscanAfter?: number,   // Default: 5
): LineRange
```

### appendToStore

Appends raw content to the store, returning a new store. Optimized for streaming append (log viewers).

```typescript
function appendToStore(store: VirtualizedLineStore, content: string): VirtualizedLineStore
```

### appendLines

Appends an array of lines to the store.

```typescript
function appendLines(store: VirtualizedLineStore, lines: readonly string[]): VirtualizedLineStore
```

### getLineCount / getByteSize / isStoreEmpty

Simple query functions.

```typescript
function getLineCount(store: VirtualizedLineStore): number
function getByteSize(store: VirtualizedLineStore): number
function isStoreEmpty(store: VirtualizedLineStore): boolean
```

### getStoreStats

Gets statistics about the store.

```typescript
function getStoreStats(store: VirtualizedLineStore): LineStoreStats
```

### getLineForOffset

Finds the line index for a byte offset using binary search. O(log n).

```typescript
function getLineForOffset(store: VirtualizedLineStore, byteOffset: number): number
```

### getOffsetForLine

Gets the byte offset for a line.

```typescript
function getOffsetForLine(store: VirtualizedLineStore, lineIndex: number): number
```

**Returns:** Byte offset, or -1 if out of bounds

### exportContent / exportLineRange

Exports content as strings.

```typescript
function exportContent(store: VirtualizedLineStore): string
function exportLineRange(store: VirtualizedLineStore, startLine: number, endLine: number): string
```

### trimToLineCount

Creates a trimmed store with only the last N lines. Useful for keeping log buffers bounded.

```typescript
function trimToLineCount(store: VirtualizedLineStore, maxLines: number): VirtualizedLineStore
```

## Usage

```typescript
import {
  createLineStore, getLineAtIndex, getLineRange,
  appendToStore, getStoreStats, trimToLineCount,
} from 'blecsd';

// Create store from content
const store = createLineStore('Line 1\nLine 2\nLine 3');

// O(1) random access
const line = getLineAtIndex(store, 1); // 'Line 2'

// Extract viewport
const viewport = getLineRange(store, 0, 25);
console.log(viewport.lines.length);       // 3
console.log(`${viewport.extractTimeMs}ms`);

// Streaming append for log viewers
let logStore = createLineStore('');
logStore = appendToStore(logStore, 'Log entry 1\nLog entry 2');
logStore = appendToStore(logStore, '\nLog entry 3');

// Keep log bounded
logStore = trimToLineCount(logStore, 10000);

// Stats
const stats = getStoreStats(store);
console.log(`${stats.lineCount} lines, ${stats.totalMemoryBytes} bytes`);
```

---

## Related

- [Lazy Content](./lazy-content.md) - Lazy loading for huge files
- [Cursor Navigation](./cursor-navigation.md) - Cursor/viewport management
- [Text Search](./text-search.md) - Search across text buffers
