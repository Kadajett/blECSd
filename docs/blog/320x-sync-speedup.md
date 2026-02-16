# How We Got a 320x Sync Speedup in an ECS Terminal UI Library

blECSd is a terminal UI library for Node.js. Every UI element, from a text label to a scrollable list to a game sprite, is an entity in a bitecs Entity Component System. Pure functions process those entities. No classes, no inheritance, no `this`.

Version 0.4.0 shipped with a performance fix that took the packed adapter's sync cost from 43,174 ops/sec to 13,816,289 ops/sec at 1,000 entities. At 10,000 entities the improvement is 4,454x. This post explains exactly what was slow, what replaced it, and why the fix is three lines of code.

## What the adapter does

blECSd's render system needs to know which entities are renderable. In bitecs, you find those entities with a query:

```typescript
const entities = query(world, [Position, Renderable]);
```

This returns every entity that has both a `Position` and a `Renderable` component. It works. The problem is _when_ it runs.

The default adapter calls `query()` directly every time the render system asks for renderables:

```typescript
const DEFAULT_WORLD_ADAPTER: WorldAdapter = {
  type: 'bitecs',
  queryRenderables: (world) => query(world, [Position, Renderable]),
};
```

For simple applications with a few dozen widgets, the cost is invisible. For anything with hundreds or thousands of entities (virtual scrolling, particle effects, dense dashboards), re-running the query every access adds up.

The packed query adapter exists to cache those results. The question is: when do you invalidate the cache?

## The original approach: diff on every sync

The first implementation of the packed adapter ran the full bitecs query inside `sync()`, then diffed the result against the previous frame to track adds and removes. Conceptually:

```
sync(world):
  newEntities = query(world, components)
  for each entity in newEntities:
    if not in previousSet: handle add
  for each entity in previousSet:
    if not in newEntities: handle remove
  previousSet = newEntities
```

This made `sync()` the bottleneck. At 1,000 entities, the packed adapter's sync ran at 43,174 ops/sec while the default adapter (which does nothing on sync) ran at 21,030,679 ops/sec. The adapter meant to improve render performance was 233x slower at the sync step.

**sync (1k entities):** Default adapter: 21,030,679 hz / Packed adapter: 43,174 hz

**sync (10k entities):** Default adapter: 19,068,402 hz / Packed adapter: 9,428 hz

The cost scaled with entity count. At 10k entities, packed sync dropped to 9,428 ops/sec. For a terminal UI library where input responsiveness is a hard requirement, this was unacceptable.

## The fix: stop doing work in sync

The rewrite replaced the diff-and-reconcile approach with a lazy frame counter. The entire `sync()` function became:

```typescript
sync(world: World): void {
  syncedWorld = world;
  frameId++;
}
```

Two assignments. No queries, no diffs, no allocations.

The actual bitecs query only runs when something accesses the cached data, and only once per frame:

```typescript
function ensureQueryCached(
  state: QueryCacheState,
  world: World,
  frameId: number
): void {
  if (state.cacheFrameId === frameId) {
    return;
  }
  const result = query(world, state.components);
  state.cachedResult = result;
  state.cachedSize = result.length;
  state.cacheFrameId = frameId;
}
```

The cache state is minimal:

```typescript
interface QueryCacheState {
  readonly name: string;
  readonly components: readonly QueryTerm[];
  cachedResult: readonly number[] | null;
  cachedSize: number;
  cacheFrameId: number; // -1 initially, never matches frameId
}
```

When the render system calls `queryRenderables(world)`, the adapter checks: does this cache's `cacheFrameId` match the current `frameId`? If yes, return the cached array. If no, run the query once and cache it.

```typescript
queryRenderables(world: World): readonly Entity[] {
  const state = queryStores.get('renderables');
  if (!state) return EMPTY_ENTITY_ARRAY;
  ensureQueryCached(state, world, frameId);
  return state.cachedResult ?? EMPTY_ENTITY_ARRAY;
},
```

Every subsequent access within the same frame returns the same cached array for free. The cost of `sync()` dropped from O(n) to O(1).

## Results

**Packed sync (1k entities):** 43,174 hz -> 13,816,289 hz (320x improvement)

**Packed sync (10k entities):** 3,357 hz -> 14,950,866 hz (4,454x improvement)

The packed adapter went from 233x slower than default to within 1.2x of default. Running the benchmark on the current codebase:

- **default sync (1k):** 22,028,639 ops/sec
- **packed sync (1k):** 18,289,346 ops/sec
- **default sync (10k):** 21,518,894 ops/sec
- **packed sync (10k):** 19,357,182 ops/sec

Comparing today's packed sync at 1k entities (18,289,346) against the pre-rewrite number (43,174) gives 423x. The reported 320x was conservative.

## What this does and doesn't mean

The 320x is the sync cost improvement for the packed adapter. It is not "your app is 320x faster." Render throughput improved 9-10% at 200-1000 entities, which is the end-user-visible gain.

The sync cost matters because it runs every frame on every phase where the adapter is active. In `render_only` mode (the default), sync runs twice per frame: once before input, once before render. In `all` mode it runs before every phase. A sync that costs microseconds instead of milliseconds means the adapter doesn't eat into the frame budget.

## Why the packed store exists separately

The lazy cache solves the sync problem. But blECSd also ships a general-purpose `PackedStore<T>` data structure for cache-friendly iteration in user code. This is a separate concept from the query adapter.

The problem the packed store solves: arrays are fast to iterate but slow to delete from (shifting everything after the gap). Linked lists are fast to delete from but terrible to iterate (pointer chasing, cache misses, 20x slower in benchmarks). The packed store combines the strengths of both by using three coordinated arrays.

The three-vector pattern:

```typescript
interface PackedStore<T> {
  readonly data: T[];           // Dense contiguous storage
  readonly dataIndex: Int32Array; // handle index -> data position
  readonly id: Int32Array;       // data position -> handle index
  readonly generations: Uint32Array;
  size: number;
  capacity: number;
}
```

- `data[]` is a dense, contiguous array. Iterating it is cache-friendly.
- `dataIndex[]` maps stable handles to positions in `data[]`.
- `id[]` is the inverse: maps data positions back to handles.
- `generations[]` prevents use-after-free. When a handle is removed, its generation increments. If something later tries to access that handle, the generation won't match, and the lookup returns nothing instead of silently pointing at whatever now occupies that slot.

Removal uses swap-and-pop: the last element moves into the removed element's slot, keeping `data[]` dense without gaps. All operations are O(1).

```typescript
// Removal: swap last element into the gap
if (dataPos !== lastPos) {
  data[dataPos] = data[lastPos];
  id[dataPos] = id[lastPos];
  dataIndex[id[lastPos]] = dataPos;
}
dataIndex[handle.index] = INVALID_INDEX;
generations[handle.index]++;
store.size--;
```

Walk through a concrete removal: say handle 3 points to `data[7]`, and the last element is at `data[12]`. Swap `data[7]` with `data[12]`. Update `id[7]` to reflect the moved element's handle. Use that handle to fix its entry in `dataIndex` so it now points to position 7 instead of 12. Bump `generations[3]` so any stale references to handle 3 are detectable. Pop the last element. Five index writes, no shifting, no allocation. O(1) regardless of how many elements the store holds.

The packed store is available as a standalone export. You don't need the adapter or the update loop to use it.

## How the pieces fit together in a frame

The scheduler orchestrates the phases:

1. `syncWorldAdapter(world)` before INPUT. For the packed adapter, this bumps `frameId`.
2. Input systems run. If they call `queryByName('interactive', world)`, `ensureQueryCached` runs the query once and caches it.
3. UPDATE, LATE_UPDATE, ANIMATION, LAYOUT phases run.
4. `syncWorldAdapter(world)` before RENDER. Bumps `frameId` again, invalidating caches from earlier in the frame.
5. `renderSystem` calls `queryRenderables(world)`. Cache miss on the new `frameId`, query runs once.
6. Any other render-phase code accessing the same query gets a cache hit.

The `syncMode` option controls this. `render_only` syncs only before INPUT and RENDER. `all` syncs before every phase. Most terminal applications only need queries during rendering, so `render_only` avoids unnecessary invalidation.

## What the benchmark actually measures

The [benchmark](https://github.com/Kadajett/blECSd/blob/main/src/benchmarks/adapterSync.bench.ts) is intentionally narrow. It creates a world, populates it with entities that have Position, Dimensions, and Style components, does one warm-up sync, then benchmarks `syncWorldAdapter(world)` in a tight loop:

```typescript
bench('packed adapter sync (1k entities)', () => {
  syncWorldAdapter(packed1k.world);
});
```

For the default adapter, `syncWorldAdapter` is a no-op (no packed adapter registered, early return). For the packed adapter, it's `syncedWorld = world; frameId++`. The benchmark confirms that the packed adapter's per-frame overhead is now comparable to doing nothing.

This doesn't measure query execution cost or render throughput. Those benchmarks exist separately and show more modest gains because query execution cost was never the bottleneck after lazy caching. The bottleneck was running queries eagerly on every sync call.

## The broader pattern

Lazy invalidation with frame counters is not novel. Game engines have used this pattern for decades. The insight for terminal UIs is that the same technique applies: most frames, the set of renderable entities hasn't changed, so re-running queries is pure waste.

What made this specific to blECSd's architecture:

- **Library-first constraint**: Users control their own world and update loop. The adapter can't assume it owns the frame lifecycle. Frame counters work regardless of who calls `sync()`.
- **Named query registration**: Queries are registered upfront with names. This lets the adapter pre-allocate cache states and avoid dynamic dispatch on the hot path.
- **Zero-allocation returns**: Cache hits return frozen empty arrays from shared constants. No garbage collection pressure from adapter internals.

The fix shipped in 0.4.0 alongside constraint layouts, spring animations, five new widgets, and a pluggable render backend. 12,442 tests pass. The library remains purely functional, zero classes.

`npm i blecsd`
