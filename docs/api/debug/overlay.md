# Debug Overlay API

Debug overlay widget for visual debugging. Displays real-time FPS, entity count, system timings, and memory usage. Also provides an input event logger, a mini profiler for measuring code sections, and a frame rate graph.

## Quick Start

```typescript
import { createDebugOverlay } from 'blecsd';

const overlay = createDebugOverlay(world, {
  toggleKey: 'F12',
  showSystemTimings: true,
});

// In game loop
overlay.update(world, loop);

// Toggle visibility
overlay.toggle();
```

## Types

### DebugOverlayConfig

```typescript
interface DebugOverlayConfig {
  readonly x?: number;                  // default: 0
  readonly y?: number;                  // default: 0
  readonly width?: number;              // default: 35
  readonly toggleKey?: string;          // default: 'F12'
  readonly showFPS?: boolean;           // default: true
  readonly showEntityCount?: boolean;   // default: true
  readonly showMemory?: boolean;        // default: true
  readonly showSystemTimings?: boolean; // default: true
  readonly maxSystemsShown?: number;    // default: 5
  readonly bgColor?: number;           // default: 0x000080ff (navy blue)
  readonly fgColor?: number;           // default: 0xffffffff (white)
  readonly visibleOnStart?: boolean;   // default: false
}
```

### DebugOverlay

```typescript
interface DebugOverlay {
  readonly visible: boolean;
  readonly entity: Entity | null;
  readonly config: Required<DebugOverlayConfig>;
  show(): void;
  hide(): void;
  toggle(): void;
  update(world: World, loop?: GameLoop): void;
  destroy(): void;
}
```

### MiniProfiler

```typescript
interface MiniProfiler {
  start(name: string): void;
  end(name: string): number;
  getAverage(name: string): number;
  getAll(): Record<string, { avg: number; min: number; max: number; count: number }>;
  reset(): void;
}
```

### FrameRateGraph

```typescript
interface FrameRateGraph {
  addSample(frameTimeMs: number): void;
  getSamples(): readonly number[];
  getCurrentFPS(): number;
  getAverageFPS(): number;
  getMinMaxFPS(): { min: number; max: number };
  reset(): void;
}
```

## Functions

### createDebugOverlay

Creates a debug overlay for the given world. Displays real-time debugging information and can be toggled with a configurable key.

```typescript
function createDebugOverlay(world: World, config?: DebugOverlayConfig): DebugOverlay;
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional configuration

**Returns:** Debug overlay controller.

```typescript
import { createDebugOverlay } from 'blecsd';

const overlay = createDebugOverlay(world, {
  toggleKey: 'F12',
  showSystemTimings: true,
  visibleOnStart: true,
});
```

### createInputLogger

Creates an input event logger for debugging.

```typescript
function createInputLogger(maxEntries?: number): InputLogger;
```

**Parameters:**
- `maxEntries` - Maximum entries to keep (default: 20)

**Returns:** Input logger instance with `log`, `clear`, and `getRecentEntries` methods.

```typescript
import { createInputLogger } from 'blecsd';

const logger = createInputLogger(10);

// In input handler
logger.log('key', `${event.name} ${event.ctrl ? '+Ctrl' : ''}`);
logger.log('mouse', `${event.action} @ ${event.x},${event.y}`);

// Get recent entries
const recent = logger.getRecentEntries(5);
```

### createMiniProfiler

Creates a mini profiler for measuring code sections.

```typescript
function createMiniProfiler(): MiniProfiler;
```

```typescript
import { createMiniProfiler } from 'blecsd';

const profiler = createMiniProfiler();

profiler.start('render');
// ... render code ...
const elapsed = profiler.end('render');

console.log(`Render avg: ${profiler.getAverage('render').toFixed(2)}ms`);

// Get all timings
const all = profiler.getAll();
for (const [name, stats] of Object.entries(all)) {
  console.log(`${name}: avg=${stats.avg.toFixed(2)}ms min=${stats.min.toFixed(2)}ms max=${stats.max.toFixed(2)}ms (${stats.count} samples)`);
}
```

### createFrameRateGraph

Creates a frame rate graph for visualizing performance over time.

```typescript
function createFrameRateGraph(sampleCount?: number): FrameRateGraph;
```

**Parameters:**
- `sampleCount` - Number of samples to keep (default: 60)

```typescript
import { createFrameRateGraph } from 'blecsd';

const graph = createFrameRateGraph(120); // 2 seconds at 60fps

// In game loop
graph.addSample(deltaTime * 1000);

console.log(`Current FPS: ${graph.getCurrentFPS().toFixed(0)}`);
console.log(`Average FPS: ${graph.getAverageFPS().toFixed(0)}`);

const { min, max } = graph.getMinMaxFPS();
console.log(`FPS range: ${min.toFixed(0)} - ${max.toFixed(0)}`);
```

## Usage Example

```typescript
import {
  createDebugOverlay,
  createInputLogger,
  createMiniProfiler,
  createFrameRateGraph,
  createGameLoop,
  createWorld,
} from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// Debug overlay
const overlay = createDebugOverlay(world, {
  showFPS: true,
  showEntityCount: true,
  showMemory: true,
  showSystemTimings: true,
  visibleOnStart: false,
});

// Input logger
const inputLog = createInputLogger(20);

// Code profiler
const profiler = createMiniProfiler();

// FPS graph
const fpsGraph = createFrameRateGraph(120);

// In game loop
function onUpdate(deltaTime: number) {
  fpsGraph.addSample(deltaTime * 1000);

  profiler.start('update');
  // ... game logic ...
  profiler.end('update');

  profiler.start('render');
  overlay.update(world, loop);
  profiler.end('render');
}

// Toggle with key
function onKey(event: KeyEvent) {
  inputLog.log('key', event.name);
  if (event.name === 'F12') {
    overlay.toggle();
  }
}

// Cleanup
overlay.destroy();
```
