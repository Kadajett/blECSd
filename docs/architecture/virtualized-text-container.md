# Architecture Decision: Virtualized Text Container Data Structure

**Status**: Decided
**Date**: 2026-02-02
**Issue**: blessed-zxj
**Epic**: blessed-7e1 (Virtualized Text Container)

## Context

We need a data structure to store and efficiently access tens of millions of lines of text for:
- Log viewers
- Large file viewers
- Debug consoles
- Data inspection tools

### Requirements

| Requirement | Target |
|-------------|--------|
| Line count | 10M+ lines |
| Scroll performance | 60fps smooth scrolling |
| Line access | O(1) for any line |
| Memory | Constant viewport memory |
| Streaming | Append 1000 lines/sec without lag |

### Non-Goals (v1)
- Editing support (read-only first)
- Horizontal virtualization
- Search/find

## Options Evaluated

### Option 1: Line Index Array

Store raw text as a single buffer with an array of byte offsets for line starts.

```typescript
interface LineIndexStore {
  /** Raw text content (single large string or ArrayBuffer) */
  buffer: string;
  /** Byte offset of each line start */
  lineOffsets: Uint32Array;
  /** Total line count */
  lineCount: number;
}
```

**Complexity:**
- Line access: O(1)
- Append: O(1) amortized (grow arrays)
- Insert/delete: O(n) - must rebuild offsets

**Memory (10M lines @ 80 chars avg):**
- Text: ~800MB
- Offsets: ~40MB (10M * 4 bytes)
- **Overhead: ~5%**

**Pros:**
- Simplest implementation
- Fastest random access
- Minimal memory overhead

**Cons:**
- Expensive insert/delete (but not needed for v1)
- Must load entire file into memory

### Option 2: Rope Data Structure

Tree of text chunks with O(log n) operations. Already implemented in `src/utils/rope.ts`.

**Complexity:**
- Line access: O(log n)
- Append: O(log n)
- Insert/delete: O(log n)

**Memory (10M lines):**
- Text: ~800MB
- Tree structure: ~200MB (nodes, pointers)
- **Overhead: ~25%**

**Pros:**
- Efficient editing
- Already implemented
- Line tracking built-in

**Cons:**
- Higher memory overhead
- Slower random access than array
- More complex for read-only use case

### Option 3: Chunked Storage (VirtualScrollback)

Lines grouped into chunks with LRU caching. Implemented in `src/utils/virtualScrollback.ts`.

```typescript
interface Chunk {
  lines: ScrollbackLine[];
  startLine: number;
  lineCount: number;
  compressed: boolean;
}
```

**Complexity:**
- Line access: O(1) in cache, O(chunk_size) cache miss
- Append: O(1)
- Memory management: Automatic via LRU

**Memory (10M lines):**
- Only cached chunks in memory
- **Can work with files larger than RAM**

**Pros:**
- Handles files larger than memory
- Built-in compression
- Already implemented

**Cons:**
- Cache misses cause latency spikes
- More complex for small files

### Option 4: Hybrid Approach (RECOMMENDED)

Combine approaches based on content size:

| Content Size | Strategy |
|-------------|----------|
| < 1M lines | Line Index Array (all in memory) |
| 1M - 50M lines | Chunked with aggressive caching |
| > 50M lines | Chunked with compression + disk spillover |

## Decision

**Use the Hybrid Approach** with Line Index Array as the primary in-memory structure, falling back to Chunked Storage for extremely large content.

### Rationale

1. **Performance**: Line Index Array provides O(1) access, which is critical for 60fps scrolling
2. **Memory**: For 10M lines (target use case), ~900MB total is acceptable on modern systems
3. **Simplicity**: Read-only v1 doesn't need rope's editing capabilities
4. **Extensibility**: Can add chunked/disk spillover later for extreme sizes
5. **Existing code**: Can reuse VirtualScrollback for the chunked fallback

### Implementation Plan

1. **VirtualizedLineStore** - New data structure optimized for read-only access
   - Line Index Array for content
   - Typed arrays for maximum performance
   - Lazy line extraction (don't split until accessed)

2. **VirtualViewport** - ECS component for viewport state
   - First/last visible line
   - Overscan configuration
   - Integration with existing Scrollable

3. **VirtualizedRenderSystem** - System to render only visible lines
   - Query viewport state
   - Extract only visible lines from store
   - Update only changed cells

## Interfaces

### VirtualizedLineStore

```typescript
interface VirtualizedLineStore {
  /** Raw content buffer */
  readonly buffer: string;
  /** Line start offsets (lazy-computed) */
  readonly offsets: Uint32Array;
  /** Total line count */
  readonly lineCount: number;
  /** Total byte size */
  readonly byteSize: number;
  /** Whether offsets are computed */
  readonly indexed: boolean;
}

// Creation
function createLineStore(content: string): VirtualizedLineStore;
function createLineStoreFromChunks(chunks: string[]): VirtualizedLineStore;

// Access - O(1)
function getLineAtIndex(store: VirtualizedLineStore, index: number): string;
function getLineRange(store: VirtualizedLineStore, start: number, end: number): string[];

// Streaming
function appendToStore(store: VirtualizedLineStore, content: string): VirtualizedLineStore;
function appendLines(store: VirtualizedLineStore, lines: string[]): VirtualizedLineStore;

// Statistics
function getStoreStats(store: VirtualizedLineStore): LineStoreStats;
```

### VirtualViewport Component

```typescript
const VirtualViewport = {
  // Viewport window
  firstVisibleLine: Uint32Array,
  visibleLineCount: Uint32Array,

  // Content info
  totalLineCount: Uint32Array,

  // Overscan for smooth scrolling
  overscanBefore: Uint8Array,
  overscanAfter: Uint8Array,

  // Performance hints
  estimatedLineHeight: Uint8Array,
  isVariableHeight: Uint8Array,
};
```

## Memory Analysis

### 10 Million Lines @ 80 chars average

| Component | Size |
|-----------|------|
| Raw text | 800 MB |
| Line offsets (Uint32Array) | 40 MB |
| Viewport buffer (25 lines) | ~2 KB |
| **Total** | **~840 MB** |

### Comparison to Alternatives

| Approach | Memory | Access Time |
|----------|--------|-------------|
| Line Index Array | 840 MB | O(1) |
| Rope | ~1 GB | O(log n) |
| Chunked (100 chunks cached) | ~8 MB active | O(1) cache hit |

## Success Criteria

- [ ] Scroll through 10M lines at 60fps
- [ ] Memory usage constant relative to viewport size
- [ ] Jump to line N is instant (< 1ms)
- [ ] Append 1000 lines/sec without visible lag
- [ ] Works with existing Scrollable component
