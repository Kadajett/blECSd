# TUI Rendering Optimization Map

This document maps common game optimization techniques to the current blECSd terminal rendering pipeline. It is meant as a practical reference for where each technique is already implemented, partially implemented, or missing.

## Pipeline Overview (Current)

Rendering in blECSd is a multi-phase ECS pipeline.

- Layout: `ComputedLayout` is produced in `src/systems/layoutSystem.ts`.
- Render: `renderSystem` draws to a back buffer and marks dirty regions in `src/systems/renderSystem.ts`.
- Output: `outputSystem` computes minimal cell updates and writes ANSI to the terminal in `src/systems/outputSystem.ts`.

Virtualized list rendering is handled separately by `virtualizedRenderSystem` in `src/systems/virtualizedRenderSystem.ts`.

## Benchmarks Inventory (What Is Measured)

These files define the performance targets and microbenchmarks for rendering, diffing, and output.

- `src/benchmarks/screenBuffer.bench.ts` covers cell writes, double buffer creation, dirty region tracking, and minimal update extraction.
- `src/benchmarks/output.bench.ts` measures `src/terminal/optimizedOutput.ts` (cursor movement, color changes, frame building).
- `src/benchmarks/diffRender.bench.ts` defines acceptance criteria for diff performance (10K lines < 100ms initial, 60fps scrolling, <16ms expand/collapse).
- `src/benchmarks/dirtyRects.bench.ts` measures `src/core/dirtyRects.ts` (dirty cell/region tracking and entity bounds).
- `src/benchmarks/3d-pipeline.bench.ts` provides end-to-end 3D pipeline targets and costs.
- `docs/performance/3d-baseline.md` records measured 3D results and budgets.

## Optimization Map (Transcript Techniques → Codebase Status)

| Technique | Status | Codebase Touchpoints | Notes |
|---|---|---|---|
| Frame budget definition | Partial | Bench targets in `src/benchmarks/*.bench.ts` | Targets exist but are not enforced by runtime budgeting in the ECS loop. |
| Profiling hooks | Partial | Debug loggers in `src/terminal/debug.ts`, bench suites | No frame timing instrumentation in render or output systems by default. |
| Top-down profiling | Partial | Bench suites | No integrated “frame breakdown” per phase (layout/render/output). |
| Bottom-up optimization | Partial | Microbenchmarks in `src/benchmarks/*` | Benchmarks cover primitives but not full UI workloads. |
| Data-oriented layout (SoA) | Implemented | `src/components/position.ts`, `src/components/renderable.ts`, `src/systems/layoutSystem.ts` | Core components are SoA typed arrays. |
| Reduce indirection | Implemented | ECS queries in `src/systems/renderSystem.ts` | Data access is direct typed array reads. |
| Branch predictability | Partial | `isEffectivelyVisible` and `isDirty` checks in `src/components/renderable.ts` | The system still iterates all Position+Renderable entities each frame. |
| Batching / instancing | Implemented | `src/terminal/screen/doubleBuffer.ts`, `src/systems/outputSystem.ts` | Uses minimal updates + single output write per frame. |
| Dirty rectangles | Implemented (two systems) | `src/terminal/screen/doubleBuffer.ts` and `src/core/dirtyRects.ts` | DirtyRects is not wired into `renderSystem` yet. |
| “Do less work” (culling) | Partial | `isEffectivelyVisible` in `src/components/renderable.ts` | No explicit viewport bounds culling before render loops. |
| Viewport culling / virtualization | Implemented | `src/components/virtualViewport.ts`, `src/systems/virtualizedRenderSystem.ts` | Supports 10M+ lines with visible-range rendering. |
| Occlusion / overlap culling | Missing | N/A | Render order is z-sort but hidden regions are not skipped. |
| LOD / impostors | Missing | N/A | No content-level quality scaling in core systems. |
| Output sequence coalescing | Implemented | `generateOutput` in `src/systems/outputSystem.ts` | Sorted changes reduce cursor moves and style churn. |
| Output buffering with state | Implemented (alternate path) | `src/terminal/optimizedOutput.ts` | Not used by `outputSystem`, so it is not in the default pipeline. |
| Worst-case spike control | Partial | `markDirty` usage in `src/components/renderable.ts` | No built-in frame “budget clamps” or adaptive degradation. |

## Observed Gaps and Opportunities

These are the most direct gaps between the optimization techniques in the transcript and the current implementation.

1. Dirty tracking is split between two systems. `renderSystem` uses `DoubleBufferData` dirty regions, while `core/dirtyRects.ts` is benchmarked but not integrated. This creates duplicated concepts and makes it hard to leverage entity-based dirty tracking at runtime.
2. `outputSystem` always sorts all changes in `generateOutput`, even for full redraws where `getMinimalUpdates` already produces row-major order. This adds an O(n log n) step in the worst-case path.
3. `optimizedOutput` is benchmarked but is not used in the default ECS output path. The active output path is `generateOutput`, which has its own logic and separate performance characteristics.
4. `renderSystem` only filters by visibility and dirty flags. It still loops across all Position+Renderable entities and does not do viewport bounds culling before draw calls.
5. There is no per-phase budget reporting or frame-time telemetry in the scheduler loop. Benchmarks provide offline visibility, but real-time profiling is not present by default.

## How This Maps to Real-World TUI Workloads

These are direct translations of game optimization ideas into TUI-specific practices that are already supported by the codebase.

- “Do less work” → Use `virtualizedRenderSystem` for lists and logs. Render only visible lines.
- “Batch draws” → Use the double buffer and output system so you only write changed cells.
- “Data layout matters” → Use component arrays (SoA) for UI state and avoid per-entity object graphs.
- “Avoid worst-case spikes” → Keep entity dirtiness scoped (mark only what changed) and avoid full redraws unless required.

## Practical Audit Checklist (Current Code)

- ECS render loop: `src/systems/renderSystem.ts`
- Virtualized rendering: `src/systems/virtualizedRenderSystem.ts`
- Dirty region tracking: `src/terminal/screen/doubleBuffer.ts`
- Entity dirty tracking (unused): `src/core/dirtyRects.ts`
- Output pipeline: `src/systems/outputSystem.ts`
- Alternate output pipeline: `src/terminal/optimizedOutput.ts`
- Benchmarks: `src/benchmarks/*.bench.ts`

