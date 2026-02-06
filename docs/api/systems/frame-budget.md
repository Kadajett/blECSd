# Frame Budget System API

Performance profiling and frame budget enforcement system with rolling statistics and per-phase budget tracking.

## Overview

The frame budget manager handles:
- Per-system execution time measurement
- Rolling statistics (average, p50, p95, p99)
- Configurable per-phase time budgets
- Budget overrun alerts with callbacks
- Metrics export for external analysis

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createFrameBudgetManager,
  profiledSystem,
  recordFrameTime,
  getFrameBudgetStats,
} from 'blecsd';

const manager = createFrameBudgetManager({ targetFrameMs: 16.67 });

// Wrap systems with profiling
const timedMovement = profiledSystem('movement', movementSystem);

// Record frame times in your loop
recordFrameTime(frameTimeMs);

// Check stats
const stats = getFrameBudgetStats();
console.log(`Avg FPS: ${stats.stats.avgFps.toFixed(1)}`);
```

## Types

### FrameBudgetConfig

```typescript
interface FrameBudgetConfig {
  /** Target frame time in ms (default: 16.67 = 60fps) */
  readonly targetFrameMs: number;
  /** Per-phase budget overrides in ms (phase -> budget) */
  readonly phaseBudgets: Readonly<Partial<Record<LoopPhase, number>>>;
  /** Number of frames to keep in rolling stats (default: 120) */
  readonly rollingWindowSize: number;
  /** Whether to emit warnings on budget overruns (default: true) */
  readonly warnOnOverrun: boolean;
}
```

### SystemTiming

Per-system timing record with percentile statistics.

```typescript
interface SystemTiming {
  readonly name: string;
  readonly lastMs: number;
  readonly avgMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly count: number;
}
```

### FrameStats

Frame-level statistics aggregated from system timings.

```typescript
interface FrameStats {
  readonly frameTimeMs: number;
  readonly avgFrameMs: number;
  readonly p50FrameMs: number;
  readonly p95FrameMs: number;
  readonly p99FrameMs: number;
  readonly fps: number;
  readonly avgFps: number;
  readonly totalFrames: number;
  readonly budgetOverruns: number;
  readonly systemTimings: readonly SystemTiming[];
  readonly phaseTimings: Readonly<Record<string, number>>;
}
```

### BudgetAlert

Alert emitted when a phase exceeds its budget.

```typescript
interface BudgetAlert {
  readonly phase: LoopPhase;
  readonly budgetMs: number;
  readonly actualMs: number;
  readonly frame: number;
}
```

### FrameBudgetManager

Top-level manager state returned by query functions.

```typescript
interface FrameBudgetManager {
  readonly config: FrameBudgetConfig;
  readonly stats: FrameStats;
  readonly alerts: readonly BudgetAlert[];
}
```

## Functions

### createFrameBudgetManager

Creates and activates the frame budget manager.

```typescript
function createFrameBudgetManager(config?: Partial<FrameBudgetConfig>): FrameBudgetManager
```

**Parameters:**
- `config` - Optional configuration overrides

**Returns:** The initial `FrameBudgetManager` state.

```typescript
import { createFrameBudgetManager, LoopPhase } from 'blecsd';

const manager = createFrameBudgetManager({
  targetFrameMs: 16.67,
  rollingWindowSize: 240,
  phaseBudgets: {
    [LoopPhase.UPDATE]: 5,
    [LoopPhase.RENDER]: 8,
  },
});
```

### profiledSystem

Wraps a system with automatic timing. Each call records the system's execution time.

```typescript
function profiledSystem(name: string, system: System): System
```

**Parameters:**
- `name` - The system name for profiling reports
- `system` - The system function to wrap

**Returns:** A wrapped `System` that records its execution time.

<!-- blecsd-doccheck:ignore -->
```typescript
import { profiledSystem } from 'blecsd';

const timedMovement = profiledSystem('movement', movementSystem);
const timedRender = profiledSystem('render', renderSystem);

scheduler.registerSystem(LoopPhase.UPDATE, timedMovement);
scheduler.registerSystem(LoopPhase.RENDER, timedRender);
```

### recordFrameBudgetSystemTime

Records the execution time of a named system manually.

```typescript
function recordFrameBudgetSystemTime(name: string, timeMs: number): void
```

### recordPhaseTime

Records phase completion time and checks against the phase budget.

```typescript
function recordPhaseTime(phase: LoopPhase, timeMs: number): void
```

### recordFrameTime

Records a complete frame time for FPS tracking.

```typescript
function recordFrameTime(frameTimeMs: number): void
```

### getFrameBudgetStats

Gets a snapshot of current frame budget statistics.

```typescript
function getFrameBudgetStats(): FrameBudgetManager
```

```typescript
import { getFrameBudgetStats } from 'blecsd';

const { stats, alerts } = getFrameBudgetStats();
console.log(`FPS: ${stats.fps.toFixed(1)}, Avg: ${stats.avgFps.toFixed(1)}`);
console.log(`p95 frame: ${stats.p95FrameMs.toFixed(2)}ms`);

for (const timing of stats.systemTimings) {
  console.log(`  ${timing.name}: avg=${timing.avgMs.toFixed(2)}ms p95=${timing.p95Ms.toFixed(2)}ms`);
}
```

### onBudgetAlert

Registers a callback for budget overrun alerts.

```typescript
function onBudgetAlert(callback: (alert: BudgetAlert) => void): void
```

```typescript
import { onBudgetAlert } from 'blecsd';

onBudgetAlert((alert) => {
  console.warn(
    `Phase ${alert.phase} exceeded budget: ${alert.actualMs.toFixed(2)}ms > ${alert.budgetMs}ms`
  );
});
```

### resetFrameBudget

Resets all profiling data while keeping the configuration.

```typescript
function resetFrameBudget(): void
```

### destroyFrameBudgetManager

Destroys the frame budget manager and clears all state.

```typescript
function destroyFrameBudgetManager(): void
```

### exportFrameBudgetMetrics

Exports metrics as a JSON-serializable object for external analysis.

```typescript
function exportFrameBudgetMetrics(): Record<string, unknown>
```

```typescript
import { exportFrameBudgetMetrics } from 'blecsd';

const metrics = exportFrameBudgetMetrics();
// Send to analytics, write to file, etc.
```

## Usage Example

Complete example with budget alerts and profiled systems:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  createScheduler,
  createFrameBudgetManager,
  profiledSystem,
  recordFrameTime,
  recordPhaseTime,
  onBudgetAlert,
  getFrameBudgetStats,
  destroyFrameBudgetManager,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Create budget manager with per-phase limits
createFrameBudgetManager({
  targetFrameMs: 16.67,
  phaseBudgets: {
    [LoopPhase.UPDATE]: 5,
    [LoopPhase.RENDER]: 8,
  },
});

// Alert on budget overruns
onBudgetAlert((alert) => {
  console.warn(`Budget exceeded in frame ${alert.frame}`);
});

// Wrap systems with profiling
const timedUpdate = profiledSystem('gameLogic', myUpdateSystem);
const timedRender = profiledSystem('renderer', myRenderSystem);

scheduler.registerSystem(LoopPhase.UPDATE, timedUpdate);
scheduler.registerSystem(LoopPhase.RENDER, timedRender);

// Game loop
let lastTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  scheduler.run(world, dt / 1000);
  recordFrameTime(dt);
}, 16);

// Periodically log stats
setInterval(() => {
  const { stats } = getFrameBudgetStats();
  console.log(`FPS: ${stats.avgFps.toFixed(1)} | Overruns: ${stats.budgetOverruns}`);
}, 5000);
```
