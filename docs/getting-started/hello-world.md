# Hello World

A minimal example using blECSd components.

## The Code

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  setPosition,
  setDimensions,
  setStyle,
  setBorder,
  setContent,
  BorderType,
  getPosition,
  getContent,
} from 'blecsd';

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
import { createWorld, createBoxEntity, createTextEntity, BorderType } from 'blecsd';

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

## Rendering

blECSd does not include a renderer. You write your own or use the Program class for low-level terminal control:

<!-- blecsd-doccheck:ignore -->
```typescript
import { cursor, style, screen } from 'blecsd/terminal';

// Enter alternate screen
process.stdout.write(screen.alternateOn());
process.stdout.write(cursor.hide());

// Move cursor and write
process.stdout.write(cursor.move(5, 3));
process.stdout.write(style.fgRgb(255, 255, 255));
process.stdout.write(style.bgRgb(0, 102, 204));
process.stdout.write('Hello, Terminal!');

// Reset
process.stdout.write(style.reset());
process.stdout.write(cursor.show());
process.stdout.write(screen.alternateOff());
```

## A Simple Render Loop

Combining ECS data with terminal output:

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  setPosition,
  setStyle,
  setContent,
  getPosition,
  getContent,
  getStyle,
  queryRenderable,
  filterVisible,
} from 'blecsd';
import { cursor, style, screen } from 'blecsd/terminal';

const world = createWorld();

// Create a status indicator entity
const statusIndicator = addEntity(world);
setPosition(world, statusIndicator, 10, 5);
setStyle(world, statusIndicator, { fg: '#00ff00' });
setContent(world, statusIndicator, '● Online');

// Simple render function
function render() {
  process.stdout.write(screen.clear());

  const entities = filterVisible(world, queryRenderable(world));
  for (const eid of entities) {
    const pos = getPosition(world, eid);
    const content = getContent(world, eid);
    const entityStyle = getStyle(world, eid);

    if (pos && content) {
      process.stdout.write(cursor.move(pos.x, pos.y));
      if (entityStyle) {
        const { r, g, b } = unpackColor(entityStyle.fg);
        process.stdout.write(style.fgRgb(r, g, b));
      }
      process.stdout.write(content);
      process.stdout.write(style.reset());
    }
  }
}

// Initialize terminal
process.stdout.write(screen.alternateOn());
process.stdout.write(cursor.hide());

render();

// Cleanup on exit
process.on('exit', () => {
  process.stdout.write(cursor.show());
  process.stdout.write(screen.alternateOff());
});
```

## Input Handling

Add keyboard input:

```typescript
import { parseKeyBuffer } from 'blecsd';
import { moveBy, getPosition } from 'blecsd';

process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('data', (buffer) => {
  const key = parseKeyBuffer(buffer);
  if (!key) return;

  if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
    process.exit(0);
  }

  // Arrow keys move the selected element
  if (key.name === 'up') moveBy(world, statusIndicator, 0, -1);
  if (key.name === 'down') moveBy(world, statusIndicator, 0, 1);
  if (key.name === 'left') moveBy(world, statusIndicator, -1, 0);
  if (key.name === 'right') moveBy(world, statusIndicator, 1, 0);

  render();
});
```
