# Lazy Content

Lazy content loading and pagination for huge files. Loads only the visible viewport initially, then progressively loads surrounding content in the background with a bounded memory footprint.

## Import

```typescript
import {
  createLazyContent,
  getLazyLines,
  prefetchAround,
  evictChunks,
  clearLazyContent,
  getLazyContentState,
  isRangeLoaded,
  createArraySource,
} from 'blecsd';
```

## Types

### LazyContentConfig

```typescript
interface LazyContentConfig {
  readonly chunkSize: number;       // Default: 1000
  readonly maxCachedChunks: number; // Default: 50
  readonly readAheadLines: number;  // Default: 500
  readonly readBehindLines: number; // Default: 200
  readonly maxMemoryBytes: number;  // Default: 100MB
}
```

### ContentChunk

A loaded content chunk.

```typescript
interface ContentChunk {
  readonly index: number;
  readonly startLine: number;
  readonly endLine: number;          // exclusive
  readonly lines: readonly string[];
  readonly byteSize: number;
  readonly lastAccessedAt: number;
}
```

### ContentSource

Content source that provides lazy loading capability.

```typescript
interface ContentSource {
  readonly totalLines: number;
  readonly loadRange: (startLine: number, endLine: number) => readonly string[];
  readonly isExactCount: boolean;
}
```

### LazyContentState

Read-only snapshot of the lazy content loader.

```typescript
interface LazyContentState {
  readonly config: LazyContentConfig;
  readonly totalLines: number;
  readonly loadedChunks: number;
  readonly memoryUsage: number;
  readonly hitRate: number;  // 0-1
}
```

## Functions

### createLazyContent

Creates a lazy content loader for a content source.

```typescript
function createLazyContent(
  source: ContentSource,
  config?: Partial<LazyContentConfig>,
): MutableLazyState
```

### getLazyLines

Gets lines from the lazy loader, loading chunks as needed. Chunks are loaded on demand and cached with LRU eviction.

```typescript
function getLazyLines(
  state: MutableLazyState,
  startLine: number,
  endLine: number,
): readonly string[]
```

### prefetchAround

Pre-loads chunks around a viewport for smooth scrolling.

```typescript
function prefetchAround(
  state: MutableLazyState,
  viewportStart: number,
  viewportEnd: number,
): void
```

### evictChunks

Evicts the least recently used chunks to free memory.

```typescript
function evictChunks(state: MutableLazyState, targetChunks?: number): number
```

**Returns:** Number of chunks evicted

### clearLazyContent

Clears all cached chunks and resets hit/miss counters.

```typescript
function clearLazyContent(state: MutableLazyState): void
```

### getLazyContentState

Gets a read-only snapshot of the loader statistics.

```typescript
function getLazyContentState(state: MutableLazyState): LazyContentState
```

### isRangeLoaded

Checks if a specific line range is already loaded.

```typescript
function isRangeLoaded(
  state: MutableLazyState,
  startLine: number,
  endLine: number,
): boolean
```

### createArraySource

Creates a content source from an array of lines. Useful for testing or in-memory content.

```typescript
function createArraySource(lines: readonly string[]): ContentSource
```

## Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createLazyContent, getLazyLines, prefetchAround, getLazyContentState } from 'blecsd';

// Create a source from a large file (e.g., via readline)
const source = {
  totalLines: 1000000,
  isExactCount: true,
  loadRange: (start, end) => fileLines.slice(start, end),
};

const loader = createLazyContent(source, { chunkSize: 500 });

// Get only the visible viewport lines
const visible = getLazyLines(loader, 500, 540);

// Pre-load surrounding chunks for smooth scrolling
prefetchAround(loader, 500, 540);

// Check loader stats
const stats = getLazyContentState(loader);
console.log(`${stats.loadedChunks} chunks, hit rate: ${(stats.hitRate * 100).toFixed(0)}%`);
```

---

## Related

- [Virtualized Line Store](./virtualized-line-store.md) - O(1) line access for in-memory content
- [Cursor Navigation](./cursor-navigation.md) - Cursor/viewport management
