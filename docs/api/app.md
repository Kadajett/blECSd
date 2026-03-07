# Application Helpers

High-level utilities for common blECSd setup patterns. These eliminate boilerplate for world creation, render pipeline wiring, input handling, and shutdown.

## Import

```typescript
import {
  createApp,
  createRenderPipeline,
  onShutdown,
  renderToString,
} from 'blecsd';
import type { App, AppOptions, RenderPipeline, ShutdownOptions } from 'blecsd';
```

## createApp()

**Recommended** — Full application bootstrap in a single call.

Creates a world, wires the render pipeline, sets up input handling, registers shutdown handlers, and optionally starts a render loop.

```typescript
import { createApp } from 'blecsd';

const app = await createApp({
  fullscreen: true,
  fps: 30,
});

// app.world — ECS world instance
// app.program — terminal program (input handling)
// app.cols, app.rows — terminal dimensions
// app.render() — run one frame
// app.shutdown() — clean exit
// app.start() — start the render loop (returns stop function)
```

### AppOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cols` | `number` | auto | Terminal columns override |
| `rows` | `number` | auto | Terminal rows override |
| `fps` | `number` | `0` | Target FPS (0 = manual rendering) |
| `fullscreen` | `boolean` | `true` | Use alternate screen |
| `programOptions` | `ProgramConfig` | - | Additional program config |

### App Handle

| Property/Method | Description |
|----------------|-------------|
| `world` | The ECS world |
| `program` | Terminal program (input handling) |
| `cols` | Terminal column count |
| `rows` | Terminal row count |
| `render()` | Run one frame (layout → render → output) |
| `shutdown()` | Gracefully shut down and exit |
| `start()` | Start render loop (if fps > 0), returns stop function |

### Complete Example

```typescript
import { createApp } from 'blecsd';
import { addEntity } from 'blecsd/core';
import { setPosition, setContent, setStyle } from 'blecsd/components';

// Bootstrap application
const app = await createApp({
  fullscreen: true,
  fps: 30,
});

// Create UI
const panel = addEntity(app.world);
setPosition(app.world, panel, 10, 5);
setContent(app.world, panel, 'Hello, blECSd!');
setStyle(app.world, panel, { fg: 0xffffffff, bg: 0x0000ffff });

// Handle input
app.program.on('keypress', (ch, key) => {
  if (key?.name === 'q') {
    app.shutdown();
  }
});

// Start render loop
app.start();
```

## createRenderPipeline()

Wire up the output → double-buffer → dirty-tracker pipeline.

Replaces this boilerplate:
```typescript
setOutputStream(process.stdout);
const db = createDoubleBuffer(cols, rows);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(db));
```

With:
```typescript
import { createRenderPipeline } from 'blecsd';

const { cols, rows } = createRenderPipeline(process.stdout, {
  cols: 80,
  rows: 24,
});
```

### When to Use

- **Use `createApp()`** for full application setup (recommended)
- **Use `createRenderPipeline()`** when you need manual control over:
  - World creation
  - Game loop construction
  - Input handling
  - Shutdown logic

### RenderPipelineOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cols` | `number` | auto | Terminal columns |
| `rows` | `number` | auto | Terminal rows |

Auto-detection order: `stream.columns` → `$COLUMNS` → 80

## onShutdown()

Register SIGINT/SIGTERM handlers for clean teardown.

```typescript
import { onShutdown } from 'blecsd';
import { createWorld } from 'blecsd/core';

const world = createWorld();
const program = /* ... */;

const shutdown = onShutdown(world, {
  program,
  exitCode: 0,
  onBeforeExit: () => console.log('Goodbye!'),
});

// Later: shutdown manually
process.on('keypress', (ch, key) => {
  if (key?.name === 'q') shutdown();
});
```

### ShutdownOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `program` | `Program` | - | Program instance to destroy |
| `exitCode` | `number` | `0` | Process exit code |
| `onBeforeExit` | `() => void` | - | Cleanup callback before exit |

**Handles:**
- Cursor restore
- Alternate screen exit
- Program destruction
- Idempotent guard against double-shutdown

## renderToString()

Render one frame to a string instead of the terminal. Useful for testing and snapshots.

```typescript
import { renderToString } from 'blecsd';
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setContent } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);
setPosition(world, entity, 5, 3);
setContent(world, entity, 'Test');

const frame = renderToString(world, 80, 24);
// frame contains ANSI escape sequences as a string
```

**Note:** Creates a temporary render pipeline. Does not disturb existing pipeline configuration.

## Migration Guide

### From Manual Setup

**Before:**
```typescript
import { createWorld } from 'blecsd/core';
import { createGameLoop, LoopPhase } from 'blecsd/core';
import { layoutSystem, renderSystem, outputSystem, setOutputStream, setRenderBuffer, setOutputBuffer } from 'blecsd/systems';
import { createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';
import { createDirtyTracker } from 'blecsd/core';
import { createProgram } from 'blecsd/terminal';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 30 });

setOutputStream(process.stdout);
const db = createDoubleBuffer(80, 24);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(80, 24), getBackBuffer(db));

loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

const program = createProgram({ useAlternateScreen: true });
await program.init();

// ... more setup ...
```

**After:**
```typescript
import { createApp } from 'blecsd';

const app = await createApp({ fps: 30, fullscreen: true });

// app.world, app.program ready to use
```

## See Also

- [Game Loop](./core/gameLoop.md) - For custom loop requirements
- [Scheduler](./core/scheduler.md) - For advanced system scheduling
- [Render System](./systems/render.md) - Manual rendering
- [Program](./terminal/program.md) - Input handling
