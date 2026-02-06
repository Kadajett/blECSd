# Fast Wrap

Efficient word wrapping with per-paragraph caching, dirty tracking, and progressive rewrapping that prioritizes the visible region for responsive UI.

## Import

```typescript
import {
  createWrapCache,
  clearWrapCache,
  resizeWrapCache,
  wrapWithCache,
  wrapVisibleFirst,
  continueWrap,
  invalidateRange,
  invalidateParagraph,
  invalidateAll,
  lineToPosition,
  positionToLine,
  getWrapCacheStats,
  getWidth,
  MAX_PARAGRAPH_CHUNK,
  DEFAULT_BATCH_SIZE,
} from 'blecsd';
```

## Types

### WrapEntry

Cached wrap result for a single paragraph.

```typescript
interface WrapEntry {
  readonly text: string;
  readonly hash: number;
  readonly width: number;
  readonly lines: readonly string[];
  readonly breakPoints: readonly number[];
}
```

### WrapCache

The wrap cache data structure.

```typescript
interface WrapCache {
  width: number;
  readonly entries: Map<number, WrapEntry>;
  readonly dirty: Set<number>;
  totalLines: number;
  readonly lineOffsets: number[];
  fullInvalidate: boolean;
}
```

### FastWrapOptions

Options for wrap operations.

```typescript
interface FastWrapOptions {
  readonly width: number;           // Max width in characters
  readonly breakWord?: boolean;     // Break mid-word (default: false)
  readonly unicodeWidth?: boolean;  // Unicode-aware width (default: true)
}
```

### ProgressiveWrapResult

Result of progressive wrapping.

```typescript
interface ProgressiveWrapResult {
  readonly lines: readonly string[];
  readonly hasMore: boolean;
  readonly nextParagraph: number;
  readonly timeMs: number;
}
```

### LinePosition

Maps a display line back to its paragraph and character offset.

```typescript
interface LinePosition {
  readonly paragraph: number;
  readonly lineInParagraph: number;
  readonly charOffset: number;
}
```

### WrapCacheStats

```typescript
interface WrapCacheStats {
  readonly cachedParagraphs: number;
  readonly dirtyParagraphs: number;
  readonly totalLines: number;
  readonly width: number;
  readonly fullInvalidate: boolean;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_PARAGRAPH_CHUNK` | 1000 | Max paragraph length before splitting |
| `DEFAULT_BATCH_SIZE` | 100 | Default paragraphs per progressive batch |

## Functions

### Cache Management

#### createWrapCache

Creates a new wrap cache.

```typescript
function createWrapCache(width: number): WrapCache
```

**Example:**
```typescript
import { createWrapCache } from 'blecsd';

const cache = createWrapCache(80);
```

#### clearWrapCache

Clears all cached entries.

```typescript
function clearWrapCache(cache: WrapCache): void
```

#### resizeWrapCache

Resizes the cache to a new width, invalidating all entries.

```typescript
function resizeWrapCache(cache: WrapCache, newWidth: number): void
```

### Wrapping

#### wrapWithCache

Wraps text using the cache. Paragraphs are cached individually: unchanged paragraphs reuse their previous result.

```typescript
function wrapWithCache(
  cache: WrapCache,
  text: string,
  options?: Partial<FastWrapOptions>,
): readonly string[]
```

**Parameters:**
- `cache` - The wrap cache
- `text` - Text to wrap (newlines split paragraphs)
- `options` - Wrap options

**Returns:** Array of wrapped lines.

**Example:**
```typescript
import { createWrapCache, wrapWithCache } from 'blecsd';

const cache = createWrapCache(40);
const lines = wrapWithCache(cache, 'This is a long paragraph that will be wrapped at 40 characters.');
// ['This is a long paragraph that will be', 'wrapped at 40 characters.']
```

#### wrapVisibleFirst

Wraps only the visible region first for responsive UI. Returns a `ProgressiveWrapResult` so you can continue wrapping the rest in the background.

```typescript
function wrapVisibleFirst(
  cache: WrapCache,
  text: string,
  startLine: number,
  endLine: number,
  options?: Partial<FastWrapOptions>,
): ProgressiveWrapResult
```

**Parameters:**
- `cache` - The wrap cache
- `text` - Text to wrap
- `startLine` - First visible line
- `endLine` - Last visible line (exclusive)
- `options` - Wrap options

**Returns:** Progressive wrap result.

**Example:**
```typescript
import { createWrapCache, wrapVisibleFirst, continueWrap } from 'blecsd';

const cache = createWrapCache(80);

// Wrap visible region first (fast)
const result = wrapVisibleFirst(cache, longText, 0, 50);

// Continue wrapping the rest in the background
if (result.hasMore) {
  const more = continueWrap(cache, longText, result.nextParagraph);
}
```

#### continueWrap

Continues wrapping from a specific paragraph. Use this for background processing after the visible region is done.

```typescript
function continueWrap(
  cache: WrapCache,
  text: string,
  startParagraph: number,
  batchSize?: number,
  options?: Partial<FastWrapOptions>,
): ProgressiveWrapResult
```

### Invalidation

#### invalidateRange

Invalidates a range of paragraphs, forcing rewrap on next call.

```typescript
function invalidateRange(
  cache: WrapCache,
  startParagraph: number,
  endParagraph: number,
): void
```

#### invalidateParagraph

Invalidates a single paragraph.

```typescript
function invalidateParagraph(cache: WrapCache, paragraph: number): void
```

#### invalidateAll

Invalidates all paragraphs.

```typescript
function invalidateAll(cache: WrapCache): void
```

### Line Mapping

#### lineToPosition

Maps a display line number to paragraph position. Uses binary search.

```typescript
function lineToPosition(cache: WrapCache, lineNumber: number): LinePosition | undefined
```

**Example:**
```typescript
import { createWrapCache, wrapWithCache, lineToPosition } from 'blecsd';

const cache = createWrapCache(40);
wrapWithCache(cache, 'First paragraph\nSecond paragraph that wraps');

const pos = lineToPosition(cache, 2);
// { paragraph: 1, lineInParagraph: 1, charOffset: 20 }
```

#### positionToLine

Maps a paragraph position to a display line number.

```typescript
function positionToLine(
  cache: WrapCache,
  paragraph: number,
  lineInParagraph?: number,
): number
```

**Returns:** Display line number, or -1 if invalid.

### Utilities

#### getWidth

Gets the visible width of a string. Uses Unicode-aware width when enabled.

```typescript
function getWidth(text: string, unicodeWidth: boolean): number
```

#### getWrapCacheStats

Gets cache statistics.

```typescript
function getWrapCacheStats(cache: WrapCache): WrapCacheStats
```

## Usage Example

```typescript
import {
  createWrapCache,
  wrapWithCache,
  resizeWrapCache,
  wrapVisibleFirst,
  continueWrap,
  lineToPosition,
} from 'blecsd';

const cache = createWrapCache(80);
const text = 'Line one.\nA longer second paragraph that needs wrapping.\nThird line.';

// Full wrap
const lines = wrapWithCache(cache, text);
console.log(lines);

// On terminal resize
resizeWrapCache(cache, 40);
const visible = wrapVisibleFirst(cache, text, 0, 20);
console.log(visible.lines);

// Background wrap remaining
if (visible.hasMore) {
  continueWrap(cache, text, visible.nextParagraph);
}

// Map display line to source
const pos = lineToPosition(cache, 1);
console.log(`Paragraph ${pos?.paragraph}, offset ${pos?.charOffset}`);
```

---

## Related

- [Unicode](./unicode.md) - Unicode width calculation used by the wrapper
- [Line Gutter](./line-gutter.md) - Line number gutter rendering
- [Virtual Scrollback](./virtual-scrollback.md) - Scrollback buffer for wrapped content
