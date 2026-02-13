# Packed Store Integration TODO (No bitECS Rewrite)

## Completed

- [x] Wire automatic packed-query adapter sync into scheduler execution paths (`run`, `runInputOnly`, `runFixedUpdatePhases`, `runRenderPhases`).
- [x] Add scheduler test proving packed adapter queries are up-to-date without manual `adapter.sync(world)`.
- [x] Fix benchmark discovery so top-level `benchmarks/**/*.bench.ts` (including CI benchmark) is discoverable by Vitest.
- [x] Add `createDefaultPackedQueryAdapter()` helper and env-gated scheduler auto-install (`BLECSD_PACKED_ADAPTER=1`).
- [x] Add packed adapter sync strategy (`syncMode: 'all' | 'render_only'`) and use `render_only` for default TUI integration.
- [x] Migrate `renderSystem`/`markAllDirty` to packed dense query path (`getQueryData` + `getQuerySize`).
- [x] Reduce packed query sync overhead:
  - stamp-array membership (`currentMarks` + `currentEpoch`) instead of `Set`
  - numeric side arrays (`handleIndexByEntity`/`handleGenByEntity`) instead of `Map<number, PackedHandle>`
  - tighter dense-loop assumptions in hot paths
- [x] Add locality-proxy benchmark (`src/benchmarks/queryLocality.bench.ts`) for sequential vs randomized dense query scans.
- [x] Add scheduler telemetry field `adapterSyncMs` to directly measure packed adapter sync overhead per frame.
- [x] Add direct adapter sync benchmark (`src/benchmarks/adapterSync.bench.ts`) to isolate sync maintenance cost.
- [x] Replace sync-and-diff with lazy query cache: `sync()` is near-zero-cost frame counter bump; queries run lazily on first `getQueryData`/`queryRenderables` access per frame. Eliminates 320x-4454x sync overhead.
- [x] Unify render system to single indexed-iteration path (remove `isPackedQueryAdapter` branch in hot loop). Both adapter types now use `queryRenderables()` with `for (let i = 0; ...)`.

## Next

- [ ] Add deterministic benchmark harness (fixed warmup/iteration counts, per-case isolated process) to reduce Vitest bench noise.
- [ ] Add scheduler-level bench cases for `run`, `runRenderPhases`, and `runInputOnly` with packed adapter OFF vs ON.
- [ ] Add optional packed registrations for input/focus queries behind explicit opt-in config (not default), then benchmark before enabling.
- [ ] Consider removing env-gating now that packed adapter shows consistent wins across all benchmarks.
- [ ] Profile whether pre-sorting entities by z-index across frames (maintaining a sorted cache) could further improve render throughput.
