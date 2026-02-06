# Virtual Scrollback

Efficient virtualized scrollback buffer with chunked storage, LRU caching, optional compression, and fast line range lookups for unlimited scrollback history.

## Import

```typescript
import {
  createScrollbackBuffer,
  clearScrollback,
  appendLine,
  appendLines,
  getLine,
  getLineRange,
  getVisibleLines,
  jumpToLine,
  scrollBy,
  scrollToTop,
  scrollToBottom,
  getScrollbackStats,
  getMemoryUsage,
  loadFromText,
  exportToText,
  trimToLineCount,
  compressOldChunks,
  decompressAll,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_CACHED,
  DEFAULT_MAX_MEMORY,
  COMPRESSION_RATIO,
} from 'blecsd';
```

## Types

### ScrollbackLine

A single line of content with optional metadata.

```typescript
interface ScrollbackLine {
  readonly text: string;
  readonly ansi?: string;
  readonly timestamp?: number;
  readonly meta?: Record<string, unknown>;
}
```

### Chunk

A chunk of stored lines.

```typescript
interface Chunk {
  readonly id: number;
  readonly lines: ScrollbackLine[];
  readonly startLine: number;
  readonly lineCount: number;
  compressed: boolean;
  compressedData?: string;
  memorySize: number;
  lastAccess: number;
}
```

### ScrollbackConfig

Buffer configuration.

```typescript
interface ScrollbackConfig {
  readonly chunkSize: number;           // Lines per chunk (default: 1000)
  readonly maxCachedChunks: number;     // Max chunks in memory (default: 100)
  readonly enableCompression: boolean;  // Compress old chunks (default: true)
  readonly maxLines: number;            // Max total lines, 0 = unlimited
  readonly maxMemory: number;           // Memory limit in bytes, 0 = unlimited
}
```

### LineRange

Result from a line range query.

```typescript
interface LineRange {
  readonly lines: readonly ScrollbackLine[];
  readonly startLine: number;
  readonly endLine: number;
  readonly complete: boolean;
  readonly loadTimeMs: number;
}
```

### ScrollbackStats

```typescript
interface ScrollbackStats {
  readonly totalLines: number;
  readonly totalChunks: number;
  readonly cachedChunks: number;
  readonly compressedChunks: number;
  readonly memoryBytes: number;
  readonly memoryMB: number;
}
```

### ScrollbackBuffer

The main buffer object.

```typescript
interface ScrollbackBuffer {
  readonly config: ScrollbackConfig;
  readonly chunks: Map<number, Chunk>;
  readonly lruOrder: number[];
  totalLines: number;
  memoryBytes: number;
  nextChunkId: number;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_CHUNK_SIZE` | 1000 | Default lines per chunk |
| `DEFAULT_MAX_CACHED` | 100 | Default max cached chunks |
| `DEFAULT_MAX_MEMORY` | 209715200 | Default memory limit (200 MB) |
| `COMPRESSION_RATIO` | 0.5 | Estimated compression ratio |

## Functions

### Buffer Creation

#### createScrollbackBuffer

Creates a new scrollback buffer.

```typescript
function createScrollbackBuffer(config?: Partial<ScrollbackConfig>): ScrollbackBuffer
```

**Example:**
```typescript
import { createScrollbackBuffer } from 'blecsd';

const buffer = createScrollbackBuffer({
  chunkSize: 1000,
  maxCachedChunks: 100,
  enableCompression: true,
});
```

#### clearScrollback

Clears all content from the buffer.

```typescript
function clearScrollback(buffer: ScrollbackBuffer): void
```

### Line Operations

#### appendLine

Appends a single line. Automatically manages chunking, LRU eviction, and compression.

```typescript
function appendLine(
  buffer: ScrollbackBuffer,
  text: string,
  ansi?: string,
  meta?: Record<string, unknown>,
): void
```

**Example:**
```typescript
import { createScrollbackBuffer, appendLine } from 'blecsd';

const buffer = createScrollbackBuffer();
appendLine(buffer, 'Hello, world!');
appendLine(buffer, '\x1b[31mRed text\x1b[0m', undefined, { color: 'red' });
```

#### appendLines

Appends multiple lines at once.

```typescript
function appendLines(buffer: ScrollbackBuffer, lines: readonly string[]): void
```

#### getLine

Gets a single line by index.

```typescript
function getLine(buffer: ScrollbackBuffer, lineIndex: number): ScrollbackLine | undefined
```

#### getLineRange

Gets a range of lines.

```typescript
function getLineRange(
  buffer: ScrollbackBuffer,
  startLine: number,
  endLine: number,
): LineRange
```

#### getVisibleLines

Gets lines for a viewport.

```typescript
function getVisibleLines(
  buffer: ScrollbackBuffer,
  viewportStart: number,
  viewportSize: number,
): LineRange
```

### Scrolling

#### jumpToLine

Jumps to a line, preloading surrounding context.

```typescript
function jumpToLine(
  buffer: ScrollbackBuffer,
  lineIndex: number,
  contextLines?: number,
): LineRange
```

**Parameters:**
- `buffer` - The buffer
- `lineIndex` - Target line
- `contextLines` - Lines to preload before and after (default: 100)

#### scrollBy

Scrolls by a delta.

```typescript
function scrollBy(
  buffer: ScrollbackBuffer,
  currentLine: number,
  delta: number,
  viewportSize: number,
): LineRange
```

**Parameters:**
- `delta` - Lines to scroll (positive = down, negative = up)

#### scrollToTop / scrollToBottom

```typescript
function scrollToTop(buffer: ScrollbackBuffer, viewportSize: number): LineRange
function scrollToBottom(buffer: ScrollbackBuffer, viewportSize: number): LineRange
```

### Statistics

#### getScrollbackStats

```typescript
function getScrollbackStats(buffer: ScrollbackBuffer): ScrollbackStats
```

#### getMemoryUsage

```typescript
function getMemoryUsage(buffer: ScrollbackBuffer): number
```

### Bulk Operations

#### loadFromText

Loads content from a newline-separated text string.

```typescript
function loadFromText(buffer: ScrollbackBuffer, text: string): void
```

#### exportToText

Exports buffer content as text.

```typescript
function exportToText(
  buffer: ScrollbackBuffer,
  startLine?: number,
  endLine?: number,
): string
```

#### trimToLineCount

Trims old content to stay within a line limit.

```typescript
function trimToLineCount(buffer: ScrollbackBuffer, maxLines: number): void
```

### Compression Control

#### compressOldChunks

Forces compression of all chunks except the most recent N.

```typescript
function compressOldChunks(buffer: ScrollbackBuffer, keepUncompressed?: number): void
```

#### decompressAll

Decompresses all chunks (for export or bulk processing).

```typescript
function decompressAll(buffer: ScrollbackBuffer): void
```

## Usage Example

```typescript
import {
  createScrollbackBuffer,
  appendLine,
  getVisibleLines,
  scrollToBottom,
  getScrollbackStats,
} from 'blecsd';

const buffer = createScrollbackBuffer({ chunkSize: 500 });

// Simulate terminal output
for (let i = 0; i < 10000; i++) {
  appendLine(buffer, `[${new Date().toISOString()}] Log line ${i}`);
}

// Get visible viewport
const visible = scrollToBottom(buffer, 40);
for (const line of visible.lines) {
  console.log(line.text);
}

// Check stats
const stats = getScrollbackStats(buffer);
console.log(`${stats.totalLines} lines, ${stats.memoryMB} MB, ${stats.compressedChunks} compressed`);
```

---

## Related

- [Line Gutter](./line-gutter.md) - Line number rendering for scrolled views
- [Fast Wrap](./fast-wrap.md) - Word wrapping with caching
