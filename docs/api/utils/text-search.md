# Text Search

Fast search across massive text buffers with Boyer-Moore-Horspool for literal string matching, regex support with timeout protection, incremental search with result caching, and match navigation.

## Import

```typescript
import {
  // Search functions
  search,
  searchLiteral,
  searchRegex,
  searchReverse,
  searchBatch,
  boyerMooreHorspool,
  // Cache
  createSearchCache,
  clearSearchCache,
  updateSearchQuery,
  searchWithCache,
  // Navigation
  getNextMatch,
  getPreviousMatch,
  getMatchAt,
  findNearestMatch,
  getVisibleMatches,
  getMatchStatus,
  // Utilities
  positionToLineColumn,
  // Constants
  DEFAULT_TIMEOUT,
  DEFAULT_SEARCH_BATCH,
} from 'blecsd';
```

## Types

### SearchMatch

A single match result.

```typescript
interface SearchMatch {
  readonly start: number;   // Character index
  readonly end: number;     // Character index
  readonly line: number;    // 0-indexed
  readonly column: number;  // 0-indexed
  readonly text: string;    // Matched text
}
```

### SearchOptions

```typescript
interface SearchOptions {
  readonly caseSensitive?: boolean;  // Default: false
  readonly wholeWord?: boolean;      // Default: false
  readonly regex?: boolean;          // Default: false
  readonly maxMatches?: number;      // Default: unlimited
  readonly timeout?: number;         // Default: 5000ms (regex only)
  readonly startPosition?: number;
  readonly reverse?: boolean;
}
```

### SearchResult

```typescript
interface SearchResult {
  readonly matches: readonly SearchMatch[];
  readonly totalCount: number;
  readonly truncated: boolean;
  readonly timedOut: boolean;
  readonly timeMs: number;
  readonly query: string;
}
```

### SearchCache

Search cache for incremental updates and match navigation.

```typescript
interface SearchCache {
  query: string;
  options: SearchOptions;
  matches: SearchMatch[];
  textHash: number;
  currentIndex: number;
  complete: boolean;
  lastPosition: number;
}
```

### ProgressiveSearchResult

```typescript
interface ProgressiveSearchResult {
  readonly matches: readonly SearchMatch[];
  readonly hasMore: boolean;
  readonly nextPosition: number;
  readonly timeMs: number;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_TIMEOUT` | `5000` | Default regex timeout in milliseconds |
| `DEFAULT_SEARCH_BATCH` | `100000` | Default batch size for progressive search |

## Functions

### search

Unified search function handling both literal and regex patterns.

```typescript
function search(text: string, query: string, options?: SearchOptions): SearchResult
```

### searchLiteral

Searches for literal text using Boyer-Moore-Horspool.

```typescript
function searchLiteral(text: string, query: string, options?: SearchOptions): SearchResult
```

### searchRegex

Searches for regex pattern with timeout protection.

```typescript
function searchRegex(text: string, pattern: string, options?: SearchOptions): SearchResult
```

### searchReverse

Searches in reverse (from end to start), returning matches in reverse order.

```typescript
function searchReverse(text: string, query: string, options?: SearchOptions): SearchResult
```

### boyerMooreHorspool

Low-level Boyer-Moore-Horspool literal string search returning match start positions.

```typescript
function boyerMooreHorspool(
  text: string,
  pattern: string,
  caseSensitive?: boolean,
  startPosition?: number,
): number[]
```

### searchBatch

Performs incremental search in batches for progressive results.

```typescript
function searchBatch(
  text: string,
  query: string,
  startPosition: number,
  batchSize?: number,
  options?: SearchOptions,
): ProgressiveSearchResult
```

### positionToLineColumn

Converts a character position to line and column numbers.

```typescript
function positionToLineColumn(text: string, position: number): { line: number; column: number }
```

## Cache Functions

### createSearchCache / clearSearchCache

Creates or clears a search cache.

```typescript
function createSearchCache(): SearchCache
function clearSearchCache(cache: SearchCache): void
```

### updateSearchQuery

Updates the cache with a new query, invalidating if the query, options, or text changed.

```typescript
function updateSearchQuery(
  cache: SearchCache,
  text: string,
  query: string,
  options?: SearchOptions,
): boolean
```

**Returns:** Whether the cache was invalidated

### searchWithCache

Performs cached search with incremental updates. Continues from where the last search left off.

```typescript
function searchWithCache(
  cache: SearchCache,
  text: string,
  batchSize?: number,
): SearchResult
```

## Navigation Functions

### getNextMatch / getPreviousMatch

Navigates through matches, wrapping around at boundaries.

```typescript
function getNextMatch(cache: SearchCache): SearchMatch | undefined
function getPreviousMatch(cache: SearchCache): SearchMatch | undefined
```

### getMatchAt

Gets a specific match by index.

```typescript
function getMatchAt(cache: SearchCache, index: number): SearchMatch | undefined
```

### findNearestMatch

Finds the nearest match to a text position using binary search.

```typescript
function findNearestMatch(
  cache: SearchCache,
  position: number,
  preferAfter?: boolean,
): { match: SearchMatch; index: number } | undefined
```

### getVisibleMatches

Gets matches visible in a line range.

```typescript
function getVisibleMatches(
  cache: SearchCache,
  startLine: number,
  endLine: number,
): readonly SearchMatch[]
```

### getMatchStatus

Gets match count for display (e.g., "3 of 100").

```typescript
function getMatchStatus(cache: SearchCache): { current: number; total: number; complete: boolean }
```

## Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  search, searchLiteral, createSearchCache,
  updateSearchQuery, searchWithCache,
  getNextMatch, getMatchStatus, getVisibleMatches,
} from 'blecsd';

// Simple literal search
const result = searchLiteral(document, 'TODO', { caseSensitive: false });
console.log(`Found ${result.totalCount} matches in ${result.timeMs.toFixed(1)}ms`);

// Regex search with timeout
const regexResult = search(document, 'function\\s+\\w+', { regex: true, timeout: 3000 });
if (regexResult.timedOut) console.log('Search timed out');

// Cached incremental search for interactive use
const cache = createSearchCache();
updateSearchQuery(cache, document, 'error');

// Process in batches (non-blocking)
let result2 = searchWithCache(cache, document, 50000);
while (!cache.complete) {
  result2 = searchWithCache(cache, document, 50000);
}

// Navigate matches
const next = getNextMatch(cache);
if (next) console.log(`Match at line ${next.line}, column ${next.column}`);

const status = getMatchStatus(cache);
console.log(`${status.current} of ${status.total}`);

// Get matches for visible viewport
const visible = getVisibleMatches(cache, 0, 40);
```

---

## Related

- [Virtualized Line Store](./virtualized-line-store.md) - Large text content storage
- [Cursor Navigation](./cursor-navigation.md) - Cursor/viewport management
