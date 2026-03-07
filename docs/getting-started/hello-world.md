# Hello World

A minimal example using blECSd components.

## The Code

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import {
  setStyle,
  setBorder,
  setContent,
  getContent,
  BorderType,
} from 'blecsd/components';

// Create world and entity
const world = createWorld();
const box = addEntity(world);

// Position at 5, 3
setPosition(world, box, 5, 3);

// Size 30x5
setDimensions(world, box, 30, 5);

// White text on blue background
setStyle(world, box, {
  fg: '#ffffff',
  bg: '#0066cc',
});

// Line border on all sides
setBorder(world, box, {
  type: BorderType.Line,
  left: true,
  right: true,
  top: true,
  bottom: true,
});

// Text content
setContent(world, box, 'Hello, Terminal!');

// Read back the data
const pos = getPosition(world, box);
const content = getContent(world, box);

console.log(`Box at ${pos?.x}, ${pos?.y}`);
console.log(`Content: ${content}`);
```

## Alternative: Namespace Imports

For larger applications, you can use namespace imports from `blecsd/components` to organize your code:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { position, dimensions, content, border, renderable } from 'blecsd/components';
import { BorderType } from 'blecsd/components';

// Create world and entity
const world = createWorld();
const box = addEntity(world);

// Position at 5, 3
position.set(world, box, 5, 3);

// Size 30x5
dimensions.set(world, box, 30, 5);

// White text on blue background
renderable.setStyle(world, box, {
  fg: '#ffffff',
  bg: '#0066cc',
});

// Line border on all sides
border.set(world, box, {
  type: BorderType.Line,
  left: true,
  right: true,
  top: true,
  bottom: true,
});

// Text content
content.setText(world, box, 'Hello, Terminal!');

// Read back the data
const pos = position.get(world, box);
const text = content.getText(world, box);

console.log(`Box at ${pos?.x}, ${pos?.y}`);
console.log(`Content: ${text}`);
```

Namespace imports help organize related functions and reduce naming conflicts as your application grows.

## What Happened

1. **createWorld()** initializes a bitECS world
2. **addEntity()** creates an entity (returns an integer ID)
3. **setPosition()** adds the Position component with coordinates
4. **setDimensions()** adds the Dimensions component with size
5. **setStyle()** adds the Renderable component with colors
6. **setBorder()** adds the Border component
7. **setContent()** adds the Content component with text

## Using Entity Factories

Entity factories create entities with multiple components pre-configured:

```typescript
import { createWorld, createBoxEntity, createTextEntity } from 'blecsd/core';
import { BorderType } from 'blecsd/components';

const world = createWorld();

// Creates entity with Position, Dimensions, Renderable, Border
const box = createBoxEntity(world, {
  x: 5,
  y: 3,
  width: 30,
  height: 5,
  fg: 0xffffffff,
  bg: 0x0066ccff,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Creates entity with Position, Dimensions, Renderable, Content
const text = createTextEntity(world, {
  x: 7,
  y: 5,
  text: 'Hello, Terminal!',
  fg: 0xffffffff,
});
```

## Hello World with createApp()

The simplest way to start a blECSd app is with `createApp()`:

```typescript
import { createApp } from 'blecsd';
import { addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setContent, setStyle } from 'blecsd/components';

const app = await createApp({ fullscreen: true });

const statusIndicator = addEntity(app.world);
setPosition(app.world, statusIndicator, 10, 5);
setDimensions(app.world, statusIndicator, 10, 1);
setStyle(app.world, statusIndicator, { fg: '#00ff00' });
setContent(app.world, statusIndicator, '● Online');

app.program.on('key', (event) => {
  if (event.name === 'q' || (event.ctrl && event.name === 'c')) {
    app.shutdown();
  }
  app.render();
});

app.render();
```

That's it! `createApp()` handles:
- World creation
- Screen entity setup
- Render pipeline wiring (double-buffer + dirty tracking)
- Terminal initialization (alternate screen, cursor, raw mode)
- Signal-safe shutdown handlers (SIGINT/SIGTERM)

## Input Handling

Add keyboard input using the `program` property from the app:

```typescript
import { moveBy } from 'blecsd/components';

app.program.on('key', (event) => {
  if (event.name === 'q' || (event.ctrl && event.name === 'c')) {
    app.shutdown();
  }

  // Arrow keys move the selected element
  if (event.name === 'up') moveBy(app.world, statusIndicator, 0, -1);
  if (event.name === 'down') moveBy(app.world, statusIndicator, 0, 1);
  if (event.name === 'left') moveBy(app.world, statusIndicator, -1, 0);
  if (event.name === 'right') moveBy(app.world, statusIndicator, 1, 0);

  app.render();
});
```

## Advanced: Manual Pipeline Setup

For more control, you can wire the pipeline manually using `createRenderPipeline()`:

```typescript
import { createWorld, createScreenEntity } from 'blecsd/core';
import { createRenderPipeline, onShutdown } from 'blecsd';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
import { createProgram } from 'blecsd/terminal';

const { cols, rows } = createRenderPipeline(process.stdout);
const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

const program = createProgram({ useAlternateScreen: true });
await program.init();

const shutdown = onShutdown(world, { program });

function render(): void {
  layoutSystem(world);
  renderSystem(world);
  outputSystem(world);
}

// ... add entities ...

render();
```

For complete low-level control, see the terminal module:

```typescript
import { cursor, style, screen } from 'blecsd/terminal';
import { setOutputStream, setOutputBuffer, setRenderBuffer } from 'blecsd/systems';
import { createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';
import { createDirtyTracker } from 'blecsd/core';

// Manual buffer setup
setOutputStream(process.stdout);
const db = createDoubleBuffer(80, 24);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(80, 24), getBackBuffer(db));
```
