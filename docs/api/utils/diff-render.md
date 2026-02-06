# Diff Render

Fast diff computation and rendering for large changesets, with unified and side-by-side views, collapsible unchanged regions, and virtualized output.

## Import

```typescript
import {
  computeDiff,
  computeDiffLazy,
  computeDiffCached,
  createDiffCache,
  clearDiffCache,
  expandChunk,
  collapseChunk,
  toggleChunk,
  expandAll,
  collapseUnchanged,
  getVisibleDiffLines,
  getTotalLineCount,
  getSideBySideView,
  toUnifiedDiff,
  parseUnifiedDiff,
  getDiffStats,
  DEFAULT_CONTEXT,
  DEFAULT_COLLAPSE_THRESHOLD,
} from 'blecsd';
```

## Types

### DiffType

```typescript
type DiffType = 'add' | 'remove' | 'context' | 'header';
```

### DiffLine

A single line in a diff.

```typescript
interface DiffLine {
  readonly type: DiffType;
  readonly content: string;
  readonly oldLineNo?: number;
  readonly newLineNo?: number;
}
```

### DiffChunk

A chunk/hunk in a diff.

```typescript
interface DiffChunk {
  readonly id: number;
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
  readonly lines: readonly DiffLine[];
  collapsed: boolean;
  readonly contextBefore: number;
  readonly contextAfter: number;
}
```

### DiffResult

Full diff result.

```typescript
interface DiffResult {
  readonly chunks: readonly DiffChunk[];
  readonly additions: number;
  readonly deletions: number;
  readonly contextLines: number;
  readonly computeTimeMs: number;
}
```

### DiffConfig

```typescript
interface DiffConfig {
  readonly contextLines: number;        // Context lines around changes (default: 3)
  readonly collapseThreshold: number;   // Collapse unchanged regions above this (default: 10)
  readonly initiallyCollapsed: boolean; // Start with unchanged regions collapsed
}
```

### DiffCache

```typescript
interface DiffCache {
  oldHash: number;
  newHash: number;
  result: DiffResult | null;
  readonly expandedChunks: Set<number>;
}
```

### SideBySideLine

```typescript
interface SideBySideLine {
  readonly left?: SideBySideEntry<'remove' | 'context'>;
  readonly right?: SideBySideEntry<'add' | 'context'>;
}

interface SideBySideEntry<T extends SideBySideEntryType = SideBySideEntryType> {
  readonly lineNo: number;
  readonly content: string;
  readonly type: T;
}
```

### VisibleDiff

```typescript
interface VisibleDiff {
  readonly lines: readonly DiffLine[];
  readonly startIndex: number;
  readonly totalLines: number;
  readonly chunkInfo: readonly { chunkId: number; collapsed: boolean }[];
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_CONTEXT` | 3 | Default context lines around changes |
| `DEFAULT_COLLAPSE_THRESHOLD` | 10 | Collapse unchanged regions larger than this |

## Functions

### computeDiff

Computes the diff between two texts. Uses Myers' algorithm for large inputs (O((N+M)D)) and LCS for small inputs.

```typescript
function computeDiff(
  oldText: string,
  newText: string,
  config?: Partial<DiffConfig>,
): DiffResult
```

**Parameters:**
- `oldText` - Original text
- `newText` - Modified text
- `config` - Diff configuration

**Returns:** Diff result with chunks and stats.

**Example:**
```typescript
import { computeDiff } from 'blecsd';

const result = computeDiff(
  'line 1\nline 2\nline 3',
  'line 1\nmodified\nline 3',
);
console.log(result.additions);  // 1
console.log(result.deletions);  // 1
```

### computeDiffLazy

Computes diff lazily (currently delegates to `computeDiff`). Intended for very large inputs.

```typescript
function computeDiffLazy(
  oldText: string,
  newText: string,
  batchSize?: number,
): DiffResult
```

### createDiffCache / clearDiffCache

Creates and clears the diff cache.

```typescript
function createDiffCache(): DiffCache
function clearDiffCache(cache: DiffCache): void
```

### computeDiffCached

Computes diff with caching. Returns cached result when inputs have not changed.

```typescript
function computeDiffCached(
  cache: DiffCache,
  oldText: string,
  newText: string,
  config?: Partial<DiffConfig>,
): DiffResult
```

### Chunk Operations

#### expandChunk / collapseChunk / toggleChunk

```typescript
function expandChunk(cache: DiffCache, result: DiffResult, chunkId: number): void
function collapseChunk(cache: DiffCache, result: DiffResult, chunkId: number): void
function toggleChunk(cache: DiffCache, result: DiffResult, chunkId: number): boolean
```

`toggleChunk` returns `true` if the chunk is now collapsed, `false` if expanded.

#### expandAll / collapseUnchanged

```typescript
function expandAll(cache: DiffCache, result: DiffResult): void
function collapseUnchanged(cache: DiffCache, result: DiffResult): void
```

### Rendering

#### getVisibleDiffLines

Gets visible lines for virtualized rendering. Collapsed chunks appear as single placeholder lines.

```typescript
function getVisibleDiffLines(
  result: DiffResult,
  startLine: number,
  viewportSize: number,
): VisibleDiff
```

#### getTotalLineCount

Gets total line count accounting for collapsed chunks.

```typescript
function getTotalLineCount(result: DiffResult): number
```

#### getSideBySideView

Converts diff to side-by-side view with left/right line pairs.

```typescript
function getSideBySideView(
  result: DiffResult,
  startLine: number,
  viewportSize: number,
): readonly SideBySideLine[]
```

### Unified Format

#### toUnifiedDiff

Formats a diff result as unified diff text.

```typescript
function toUnifiedDiff(
  result: DiffResult,
  oldName?: string,
  newName?: string,
): string
```

#### parseUnifiedDiff

Parses unified diff text back into a DiffResult.

```typescript
function parseUnifiedDiff(diffText: string): DiffResult
```

### getDiffStats

Gets summary statistics.

```typescript
function getDiffStats(result: DiffResult): {
  additions: number;
  deletions: number;
  totalChanges: number;
  chunks: number;
  collapsedChunks: number;
}
```

## Usage Example

```typescript
import {
  computeDiffCached,
  createDiffCache,
  getVisibleDiffLines,
  toUnifiedDiff,
} from 'blecsd';

const cache = createDiffCache();

const oldText = 'function hello() {\n  return "world";\n}';
const newText = 'function hello() {\n  return "universe";\n}';

const result = computeDiffCached(cache, oldText, newText);

// Virtualized rendering
const visible = getVisibleDiffLines(result, 0, 20);
for (const line of visible.lines) {
  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
  console.log(prefix + line.content);
}

// Export as unified diff
console.log(toUnifiedDiff(result, 'old.ts', 'new.ts'));
```

---

## Related

- [Markdown Render](./markdown-render.md) - Markdown parsing and rendering
- [Virtual Scrollback](./virtual-scrollback.md) - Scrollback buffer for large output
