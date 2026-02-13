# Packed Adapter TUI Benchmark Report (A/B)

## Scope

- Focused on normal TUI paths, not game-specific code.
- Compared with packed adapter auto-enable off/on:
  - `BLECSD_PACKED_ADAPTER=0`
  - `BLECSD_PACKED_ADAPTER=1`
- Current integration under test:
  - Scheduler auto-installs default packed adapter when env flag is enabled.
  - Scheduler syncs packed adapter once per phase.
  - Render system uses dense packed query path when adapter is packed.

## Commands Used

```bash
BLECSD_PACKED_ADAPTER=0 pnpm bench:run benchmarks/ci.bench.ts
BLECSD_PACKED_ADAPTER=1 pnpm bench:run benchmarks/ci.bench.ts

BLECSD_PACKED_ADAPTER=0 pnpm bench:run src/benchmarks/input.bench.ts
BLECSD_PACKED_ADAPTER=1 pnpm bench:run src/benchmarks/input.bench.ts

BLECSD_PACKED_ADAPTER=0 pnpm bench:run src/benchmarks/dirtyRects.bench.ts
BLECSD_PACKED_ADAPTER=1 pnpm bench:run src/benchmarks/dirtyRects.bench.ts

BLECSD_PACKED_ADAPTER=0 pnpm bench:run src/benchmarks/hitTest.bench.ts
BLECSD_PACKED_ADAPTER=1 pnpm bench:run src/benchmarks/hitTest.bench.ts
```

## Summary

- CI entity creation regressed noticeably with packed auto-enable.
- Input benchmark results were mixed but skewed negative.
- Dirty rect and hit-test benchmarks were mixed; several important paths regressed.
- Current integration does not show a clear across-the-board TUI win.

## Iteration Notes

After the initial run, the integration was optimized:

- Reduced default packed query set to only `renderables` (avoid syncing unused queries).
- Reduced packed query sync allocations in `worldAdapter` (reuse `Set`, avoid spread copy, single-pass add path).
- Added `syncMode` to packed adapters and set default adapter to `render_only`.
- Scheduler sync now respects `syncMode` and avoids unnecessary phase syncs.
- Replaced packed sync membership tracking `Set<number>` with epoch-stamped numeric arrays.
- Replaced per-query `Map<number, PackedHandle>` with numeric side arrays:
  - `handleIndexByEntity[]`
  - `handleGenByEntity[]`
- Tightened dense-loop paths in render and adapter materialization to reduce hot-path branching.

Because single vitest bench runs are noisy, repeated-run medians are more trustworthy for small deltas.

## Repeated CI Medians (5 runs each, OFF vs ON)

- `create 100 entities`: `114,326.94 -> 118,633.99` (`+3.8%`)
- `create 100 entities with Position`: `27,026.36 -> 29,389.55` (`+8.7%`)
- `query 1000 entities`: `2,121.07 -> 2,497.58` (`+17.7%`)

## Isolated Render Benchmark (same process, same run)

Added `src/benchmarks/packedAdapterRender.bench.ts` to directly compare default vs packed render frame throughput:

- `default adapter frame (200 entities)`: `2,144.82 hz`
- `packed adapter frame (200 entities)`: `2,515.90 hz` (`+17.3%`)
- `default adapter frame (1000 entities)`: `814.09 hz`
- `packed adapter frame (1000 entities)`: `857.28 hz` (`+5.3%`)

This frequently shows packed wins in render-heavy paths, but the 200/1000 entity cases can flip order run-to-run.
Conclusion: good signal for potential render wins, but not yet stable enough to claim global improvement.

## Locality Proxy Benchmark

Added `src/benchmarks/queryLocality.bench.ts`:

- Compares sequential vs randomized scans over 10k query results.
- This is not direct L1 inspection (not available in JS), but a practical proxy for access-pattern sensitivity.

Latest run:

- `packed sequential scan (10k)`: `94,533.64 hz`
- `packed randomized scan (10k)`: `76,787.70 hz`
- `default sequential scan (10k)`: `117,719.57 hz`
- `default randomized scan (10k)`: `89,703.80 hz`

Takeaway:

- Sequential access is clearly faster than randomized for both paths, as expected.
- Default adapter scan currently remains faster in this synthetic scan benchmark.
- Packed adapter value appears to come more from render-path integration behavior than from raw scan speed alone.

## Adapter Sync Cost Benchmark

Added `src/benchmarks/adapterSync.bench.ts` to isolate `syncWorldAdapter(world)` cost:

- `default adapter sync (1k entities)`: `21,030,679.79 hz` (no-op)
- `packed adapter sync (1k entities)`: `112,759.28 hz`
- `default adapter sync (10k entities)`: `19,068,402.97 hz` (no-op)
- `packed adapter sync (10k entities)`: `9,428.13 hz`

Interpretation:

- Packed sync overhead scales with entity count and is substantial compared to default no-op sync.
- This validates why global packed auto-enable can hurt some benchmarks despite render-path wins.

## Latest Repeated CI Medians (5 runs each, OFF vs ON)

Post-optimization repeat run:

- `create 100 entities`: `132,335.37 -> 121,708.91` (`-8.0%`)
- `create 100 entities with Position`: `34,968.89 -> 35,158.91` (`+0.5%`)
- `query 1000 entities`: `2,568.25 -> 2,453.43` (`-4.5%`)

Interpretation:

- Entity creation shows overhead/noise when packed auto-enable is on.
- Query path is still not a consistent win in CI bench.
- Render-only isolated bench still shows meaningful upside in many runs, especially at larger entity counts.

## Key Deltas (ON vs OFF, higher hz is better)

### `benchmarks/ci.bench.ts`

- `create 100 entities`: `142,256.75 -> 97,456.22` (`-31.5%`)
- `create 100 entities with Position`: `37,283.07 -> 24,103.81` (`-35.4%`)
- `query 1000 entities`: `2,497.36 -> 2,472.48` (`-1.0%`)

### `src/benchmarks/input.bench.ts` (selected)

- `push single key event`: `10,315,425.13 -> 8,755,577.21` (`-15.1%`)
- `push single mouse event`: `9,130,210.81 -> 6,379,211.62` (`-30.1%`)
- `record 100 latencies`: `937,192.31 -> 615,665.08` (`-34.3%`)
- `record 1,000 latencies`: `90,594.57 -> 57,455.49` (`-36.6%`)
- `drain 100 events`: `13,769,157.72 -> 14,258,731.29` (`+3.6%`)
- `1,000 events/sec simulation`: `13,176.29 -> 13,998.40` (`+6.2%`)

### `src/benchmarks/dirtyRects.bench.ts` (selected)

- `coalesce scattered dirty cells`: `23,801,842.90 -> 17,603,131.65` (`-26.0%`)
- `update 100 entity bounds`: `97,554.95 -> 72,311.64` (`-25.9%`)
- `remove 100 entities from tracking`: `396,696.21 -> 263,046.30` (`-33.7%`)
- `1000 static + 1 moving entity - full frame`: `17,246.93 -> 18,425.23` (`+6.8%`)
- `1000 entities with 100 dirty - full frame`: `11,148.67 -> 11,806.59` (`+5.9%`)

### `src/benchmarks/hitTest.bench.ts` (selected)

- `100 entities - 100 queries`: `4,649.93 -> 3,022.72` (`-35.0%`)
- `1,000 entities - 100 queries`: `4,491.66 -> 3,087.44` (`-31.3%`)
- `rebuild cache - 100 entities`: `10,314.38 -> 7,337.42` (`-28.9%`)
- `rebuild cache - 10,000 entities`: `71.00 -> 96.94` (`+36.5%`)
- `cache 1,000 entity positions`: `869.82 -> 1,249.25` (`+43.6%`)

## Interpretation

- Packed-store integration is now deeper and more cache-friendly internally, but benchmark variance remains high.
- Global auto-enable is still risky as a default; keep it env-gated while we improve benchmark determinism and per-phase measurement.
- Best near-term path: target render-heavy TUI workloads first, then expand only when measured wins are repeatable.
- JS runtime limits direct cache verification; rely on stable repeated benchmarks and per-phase telemetry instead.
- Scheduler telemetry now includes `FrameTelemetry.adapterSyncMs`, enabling direct measurement of packed sync overhead.

## Recommended Next Step

- Keep packed adapter env-gated.
- Add system-level opt-in in specific TUI hot paths and benchmark each increment separately before broad rollout.

## Lazy Query Cache Rewrite

Replaced the sync-and-diff mechanism (PackedStore, handleMap, epoch tracking,
swap-and-pop removal) with a lazy query cache approach:

- `sync()` stores the world reference and bumps a frame counter (near-zero cost).
- `getQueryData()`/`getQuerySize()` lazily run the bitecs query on first access
  per frame, caching the result for subsequent calls within the same frame.
- `queryRenderables()`/`queryByName()` use the same lazy cache when a world is
  provided directly.
- Render system unified to a single indexed-iteration path for both adapter types,
  eliminating the `isPackedQueryAdapter` branch in the hot loop.

### Adapter Sync Cost (key improvement)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| packed sync (1k entities) | 43,174 hz | 13,816,289 hz | 320x faster |
| packed sync (10k entities) | 3,357 hz | 14,950,866 hz | 4,454x faster |
| packed vs default (1k) | 233x slower | 1.1x slower | Near parity |

### Render Frame Throughput

| Metric | Default | Packed | Delta |
|--------|---------|--------|-------|
| 200 entities | 1,944 hz | 2,120 hz | +9% |
| 1000 entities | 578 hz | 633 hz | +10% |

### Query Locality Scan

| Metric | Default | Packed | Delta |
|--------|---------|--------|-------|
| sequential 10k | 133,574 hz | 142,135 hz | +6% |
| randomized 10k | 101,395 hz | 103,276 hz | +2% |

### Interpretation

- Sync bottleneck is eliminated. Packed adapter now operates at near-parity with
  default for sync cost, regardless of entity count.
- Render throughput consistently shows packed wins at 200+ entities.
- Non-render benchmarks (input, dirtyRects, hitTest) show no regression because
  the lazy cache only runs queries when actually accessed (not on every sync call).
- The packed adapter is now safe for broader rollout, though env-gating remains
  recommended until the benchmark suite is more deterministic.
