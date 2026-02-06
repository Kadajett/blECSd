# Change Coalescing

Batches multiple text changes within a single frame into a single re-layout/re-render, eliminating per-keystroke rendering during fast typing or streaming input.

## Import

```typescript
import {
  createCoalescer,
  queueChange,
  flushChanges,
  getCoalescingState,
  insertChange,
  deleteChange,
  replaceChange,
  destroyCoalescer,
} from 'blecsd';
```

## Types

### TextChange

A single text change operation.

```typescript
interface TextChange {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly text: string;
  readonly timestamp: number;
}
```

### DirtyRegion

A coalesced dirty region representing the union of changes.

```typescript
interface DirtyRegion {
  readonly startLine: number;
  readonly endLine: number;
  readonly lineCountChanged: boolean;
  readonly lineDelta: number;
}
```

### CoalescingConfig

Configuration for change coalescing.

```typescript
interface CoalescingConfig {
  readonly maxDelayMs: number;       // Default: 16 (~1 frame at 60fps)
  readonly maxBatchSize: number;     // Default: 100
  readonly immediateCursor: boolean; // Default: true
}
```

### FlushResult

Result of flushing coalesced changes.

```typescript
interface FlushResult {
  readonly dirtyRegion: DirtyRegion;
  readonly changeCount: number;
  readonly timeSpanMs: number;
  readonly changes: readonly TextChange[];
}
```

### CoalescingState

Read-only snapshot of the coalescer state.

```typescript
interface CoalescingState {
  readonly config: CoalescingConfig;
  readonly pendingCount: number;
  readonly flushScheduled: boolean;
  readonly totalProcessed: number;
  readonly totalFlushes: number;
  readonly avgChangesPerFlush: number;
}
```

## Functions

### createCoalescer

Creates a change coalescer that batches text changes.

```typescript
function createCoalescer(
  onFlush: (result: FlushResult) => void,
  config?: Partial<CoalescingConfig>,
): MutableCoalescingState
```

**Parameters:**
- `onFlush` - Callback invoked when changes are flushed
- `config` - Optional configuration overrides

**Returns:** Opaque coalescer state handle

### queueChange

Queues a text change for coalescing. Flushes immediately if the batch size limit is reached, otherwise schedules a flush after `maxDelayMs`.

```typescript
function queueChange(state: MutableCoalescingState, change: TextChange): void
```

**Parameters:**
- `state` - The coalescer state
- `change` - The text change to queue

### flushChanges

Forces an immediate flush of all pending changes.

```typescript
function flushChanges(state: MutableCoalescingState): FlushResult | undefined
```

**Parameters:**
- `state` - The coalescer state

**Returns:** The flush result, or `undefined` if no changes were pending

### getCoalescingState

Gets a read-only snapshot of the coalescer state.

```typescript
function getCoalescingState(state: MutableCoalescingState): CoalescingState
```

**Parameters:**
- `state` - The coalescer state

**Returns:** State snapshot

### insertChange

Creates a `TextChange` for an insertion at the given position.

```typescript
function insertChange(line: number, column: number, text: string): TextChange
```

### deleteChange

Creates a `TextChange` for a deletion spanning the given range.

```typescript
function deleteChange(
  startLine: number, startColumn: number,
  endLine: number, endColumn: number,
): TextChange
```

### replaceChange

Creates a `TextChange` for a replacement spanning the given range.

```typescript
function replaceChange(
  startLine: number, startColumn: number,
  endLine: number, endColumn: number,
  text: string,
): TextChange
```

### destroyCoalescer

Destroys the coalescer, flushing any remaining changes and removing the callback.

```typescript
function destroyCoalescer(state: MutableCoalescingState): FlushResult | undefined
```

**Returns:** Final flush result if there were pending changes

## Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createCoalescer, queueChange, insertChange } from 'blecsd';

const coalescer = createCoalescer((result) => {
  console.log(`Flushing ${result.changeCount} changes`);
  console.log(`Dirty region: lines ${result.dirtyRegion.startLine}-${result.dirtyRegion.endLine}`);
  rerender(result.dirtyRegion);
});

// Fast typing: multiple changes coalesced into one flush
queueChange(coalescer, insertChange(0, 5, 'a'));
queueChange(coalescer, insertChange(0, 6, 'b'));
queueChange(coalescer, insertChange(0, 7, 'c'));
// All three changes are batched into a single flush callback
```

---

## Related

- [Virtualized Line Store](./virtualized-line-store.md) - Large text content storage
- [Cursor Navigation](./cursor-navigation.md) - Cursor/viewport management
