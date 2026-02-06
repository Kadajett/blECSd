# Game Loop API

Game loop with input priority, lifecycle management, fixed timestep support, and performance statistics.

## Quick Start

```typescript
import { createGameLoop, createWorld, LoopPhase } from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 }, {
  onStart: () => console.log('Game started!'),
  onStop: () => console.log('Game stopped!'),
});

loop.registerSystem(LoopPhase.UPDATE, myUpdateSystem);
loop.registerInputSystem(myInputSystem);

loop.start();
setTimeout(() => loop.stop(), 5000);
```

## Types

### LoopHook

```typescript
type LoopHook = (world: World, deltaTime: number) => void;
```

### FixedUpdateHook

```typescript
type FixedUpdateHook = (world: World, fixedDeltaTime: number, tickNumber: number) => void;
```

### InterpolateHook

```typescript
type InterpolateHook = (world: World, alpha: number) => void;
```

### FixedTimestepConfig

Configuration for fixed timestep mode. Essential for deterministic physics, network sync, and replays.

```typescript
interface FixedTimestepConfig {
  readonly tickRate: number;             // default: 60
  readonly maxUpdatesPerFrame: number;   // default: 5
  readonly interpolate: boolean;         // default: true
}
```

### GameLoopOptions

```typescript
interface GameLoopOptions {
  targetFPS?: number;                   // default: 60
  fixedTimestep?: boolean;              // default: true (deprecated, use fixedTimestepMode)
  maxDeltaTime?: number;               // default: 0.1
  fixedTimestepMode?: FixedTimestepConfig;
}
```

### GameLoopHooks

Lifecycle hooks for the game loop.

```typescript
interface GameLoopHooks {
  onBeforeInput?: LoopHook;
  onAfterInput?: LoopHook;
  onBeforeUpdate?: LoopHook;
  onAfterUpdate?: LoopHook;
  onBeforeRender?: LoopHook;
  onAfterRender?: LoopHook;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBeforeFixedUpdate?: FixedUpdateHook;
  onAfterFixedUpdate?: FixedUpdateHook;
  onInterpolate?: InterpolateHook;
}
```

### LoopStats

```typescript
interface LoopStats {
  fps: number;
  frameTime: number;
  frameCount: number;
  runningTime: number;
  tickCount: number;
  ticksPerSecond: number;
  interpolationAlpha: number;
  skippedUpdates: number;
}
```

### LoopState

```typescript
enum LoopState {
  STOPPED = 0,
  RUNNING = 1,
  PAUSED = 2,
}
```

### GameLoop

```typescript
interface GameLoop {
  getState(): LoopState;
  isRunning(): boolean;
  isPaused(): boolean;
  isStopped(): boolean;
  getStats(): LoopStats;
  getInterpolationAlpha(): number;
  getFixedTimestepConfig(): FixedTimestepConfig | undefined;
  isFixedTimestepMode(): boolean;
  getScheduler(): Scheduler;
  getWorld(): World;
  setWorld(world: World): void;
  setTargetFPS(fps: number): void;
  getTargetFPS(): number;
  registerSystem(phase: number, system: System, priority?: number): void;
  unregisterSystem(system: System): void;
  registerInputSystem(system: System, priority?: number): void;
  setHooks(hooks: GameLoopHooks): void;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  step(deltaTime?: number): void;
  stepFixed(): void;
}
```

## Functions

### createGameLoop

Creates a new game loop instance. Input is always processed first every frame.

```typescript
function createGameLoop(
  initialWorld: World,
  options?: GameLoopOptions,
  initialHooks?: GameLoopHooks
): GameLoop;
```

**Parameters:**
- `initialWorld` - The ECS world to process
- `options` - Loop configuration options
- `initialHooks` - Lifecycle hooks

**Returns:** A new GameLoop instance.

### isLoopRunning

Checks if a game loop exists and is running.

```typescript
function isLoopRunning(loop: GameLoop | undefined): boolean;
```

### isLoopPaused

Checks if a game loop exists and is paused.

```typescript
function isLoopPaused(loop: GameLoop | undefined): boolean;
```

## Usage Example

### Variable Timestep

```typescript
import { createGameLoop, createWorld, LoopPhase } from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

### Fixed Timestep with Interpolation

```typescript
import { createGameLoop, createWorld, LoopPhase } from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world, {
  fixedTimestepMode: {
    tickRate: 60,
    maxUpdatesPerFrame: 5,
    interpolate: true,
  },
}, {
  onInterpolate: (world, alpha) => {
    // Smooth rendering between physics ticks
    interpolatePositions(world, alpha);
  },
});

loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.UPDATE, physicsSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

### Manual Stepping (Testing)

```typescript
import { createGameLoop, createWorld } from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world);

// Step manually for deterministic testing
loop.step(1 / 60); // Advance one frame at 60fps
loop.step(1 / 60);

const stats = loop.getStats();
console.log(`Frames: ${stats.frameCount}`);
```
