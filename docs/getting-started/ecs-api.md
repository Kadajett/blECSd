# Getting Started with the ECS API

This guide shows you how to build your first application using blECSd's **low-level ECS API** - a powerful, flexible interface for building custom frameworks, tools, and complex terminal UIs.

## What is the ECS API?

The ECS API gives you direct control over the Entity Component System:

- ✅ **Maximum flexibility** - full control over entities, components, and systems
- ✅ **Custom system pipelines** - build exactly the flow you need
- ✅ **Performance control** - optimize for your specific use case
- ✅ **Framework building** - create your own abstractions on top

**Best for**: TUI frameworks, tools, IDEs, file managers, complex applications

**Requires**: Understanding of ECS concepts (entities, components, systems)

**New to ECS?** Read [Understanding ECS](../guides/understanding-ecs.md) first.

## Your First Application

### 1. Create a World

```typescript
import { createWorld } from 'blecsd';

const world = createWorld();
```

The world holds all entities, components, and state.

### 2. Create the Screen Entity

```typescript
import { createScreenEntity } from 'blecsd';

const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  title: 'My Application',
});
```

The screen is the root entity that represents the terminal viewport.

### 3. Create UI Elements

```typescript
import { createBoxEntity, createTextEntity, BorderType } from 'blecsd';

// Container box
const container = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 60,
  height: 15,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Title text
const title = createTextEntity(world, {
  parent: container,
  x: 2,
  y: 1,
  text: 'Hello, ECS API!',
  fg: 0xffffffff,
});
```

### 4. Define Systems

Systems process entities with specific components:

```typescript
import { query, Position, Velocity } from 'blecsd';
import type { World } from 'blecsd';

// System that moves entities
function movementSystem(world: World): World {
  // Query for entities with Position and Velocity
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
```

### 5. Set Up the Game Loop

```typescript
import { createGameLoop, LoopPhase, query, Position, Velocity } from 'blecsd';
import type { World } from 'blecsd';

// Define a system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);
  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
}

const loop = createGameLoop(world, {
  targetFPS: 60,
});

// Register systems in specific phases
// Note: INPUT phase is protected and populated automatically
loop.registerSystem(LoopPhase.UPDATE, movementSystem);

// Start the loop
loop.start();
```

See [System Execution Order](../guides/system-execution-order.md) for phase details.

## Complete Example: Interactive Box

```typescript
import {
  createWorld,
  createScreenEntity,
  createBoxEntity,
  createGameLoop,
  LoopPhase,
  BorderType,
  Position,
  Velocity,
  addComponent,
  query,
} from 'blecsd';
import type { World } from 'blecsd';

// Create world and screen
const world = createWorld();
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
});

// Create a box with velocity
const box = createBoxEntity(world, {
  x: 35,
  y: 10,
  width: 10,
  height: 5,
  fg: 0x00ff00ff,
  border: { type: BorderType.Line },
});

addComponent(world, box, Velocity);
Velocity.x[box] = 1;
Velocity.y[box] = 0;

// Movement system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];

    // Bounce off walls
    if (Position.x[eid] < 0 || Position.x[eid] > 70) {
      Velocity.x[eid] *= -1;
    }
    if (Position.y[eid] < 0 || Position.y[eid] > 19) {
      Velocity.y[eid] *= -1;
    }
  }

  return world;
}

// Create game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);

loop.start();
```

## Core Concepts

### Entities are IDs

Entities are just numbers:

```typescript
import { addEntity } from 'blecsd';

const entity = addEntity(world);
console.log(typeof entity); // "number"
```

### Components are Data

Components are typed arrays:

```typescript
import { addEntity, Position, Dimensions } from 'blecsd';

const box = addEntity(world);
Position.x[box] = 10;
Position.y[box] = 5;
Dimensions.width[box] = 40;
Dimensions.height[box] = 10;
```

### Systems are Functions

Systems transform world state:

```typescript
function mySystem(world: World): World {
  // Process entities
  return world;
}
```

## Working with Components

### Adding Components

```typescript
import { addEntity, addComponent, Position, Velocity } from 'blecsd';

const entity = addEntity(world);

// Add components
addComponent(world, entity, Position);
addComponent(world, entity, Velocity);

// Set values
Position.x[entity] = 10;
Position.y[entity] = 5;
Velocity.x[entity] = 2;
Velocity.y[entity] = 0;
```

### Removing Components

```typescript
import { removeComponent, Velocity } from 'blecsd';

// Stop entity from moving
removeComponent(world, entity, Velocity);
```

### Checking Components

```typescript
import { hasComponent, Position } from 'blecsd';

if (hasComponent(world, entity, Position)) {
  console.log('Entity has a position');
}
```

## Querying Entities

### Use Queries in Systems

Queries are created using the `query` function:

```typescript
import { query, Position, Velocity, Renderable } from 'blecsd';
import type { World } from 'blecsd';

function renderSystem(world: World): World {
  // Query entities with Position and Renderable
  const entities = query(world, [Position, Renderable]);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const char = Renderable.char[eid];
    const fg = Renderable.fg[eid];

    // Draw entity at position
    draw(x, y, char, fg);
  }

  return world;
}
```

## System Registration

Systems run in phases:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createGameLoop, LoopPhase } from 'blecsd';

const loop = createGameLoop(world, { targetFPS: 60 });

// INPUT phase runs automatically - you cannot register systems to it

// EARLY_UPDATE phase
loop.registerSystem(LoopPhase.EARLY_UPDATE, prepareLogicSystem);

// UPDATE phase (main game logic)
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.UPDATE, collisionSystem);

// LATE_UPDATE phase (dependent logic)
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);

// ANIMATION phase (physics, tweens)
loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);

// LAYOUT phase (UI layout)
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);

// RENDER phase (drawing)
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// POST_RENDER phase (debug overlays)
loop.registerSystem(LoopPhase.POST_RENDER, debugSystem);

loop.start();
```

See [System Execution Order](../guides/system-execution-order.md) for details.

## Example: Moving Particles

```typescript
import {
  createWorld,
  createGameLoop,
  addEntity,
  addComponent,
  query,
  Position,
  Velocity,
  LoopPhase,
} from 'blecsd';
import type { World } from 'blecsd';

const world = createWorld();

// Create 100 particles
for (let i = 0; i < 100; i++) {
  const particle = addEntity(world);

  addComponent(world, particle, Position);
  addComponent(world, particle, Velocity);

  Position.x[particle] = Math.random() * 80;
  Position.y[particle] = Math.random() * 24;

  Velocity.x[particle] = (Math.random() - 0.5) * 2;
  Velocity.y[particle] = (Math.random() - 0.5) * 2;
}

// Movement system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];

    // Wrap around screen
    if (Position.x[eid] < 0) Position.x[eid] = 80;
    if (Position.x[eid] > 80) Position.x[eid] = 0;
    if (Position.y[eid] < 0) Position.y[eid] = 24;
    if (Position.y[eid] > 24) Position.y[eid] = 0;
  }

  return world;
}

// Render system (simplified)
function renderSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  // Clear screen
  console.clear();

  for (const eid of entities) {
    const x = Math.floor(Position.x[eid]);
    const y = Math.floor(Position.y[eid]);
    // Draw particle at (x, y)
  }

  return world;
}

// Game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

## Helper Functions

blECSd provides helper functions for common operations:

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  getPosition,
  setDimensions,
  getDimensions,
  setContent,
  getContent,
  moveBy,
  resizeBy,
} from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Set position
setPosition(world, entity, 10, 5);

// Get position
const pos = getPosition(world, entity);
console.log(`Position: (${pos.x}, ${pos.y})`);

// Move relative
moveBy(world, entity, 5, 0); // Move right 5 units

// Set dimensions
setDimensions(world, entity, 40, 10);

// Set content
setContent(world, entity, 'Hello, World!');
```

## Parent-Child Hierarchies

```typescript
import { createWorld, createBoxEntity, setParent, getChildren } from 'blecsd';

const world = createWorld();

const parent = createBoxEntity(world, { x: 10, y: 5, width: 50, height: 20 });
const child1 = createBoxEntity(world, { x: 2, y: 2, width: 20, height: 5 });
const child2 = createBoxEntity(world, { x: 2, y: 8, width: 20, height: 5 });

// Attach children to parent
setParent(world, child1, parent);
setParent(world, child2, parent);

// Get all children
const children = getChildren(world, parent);
for (const childEid of children) {
  console.log(`Child: ${childEid}`);
}
```

## Next Steps

- **Read**: [Understanding ECS](../guides/understanding-ecs.md) - ECS concepts
- **Read**: [System Execution Order](../guides/system-execution-order.md) - Loop phases
- **Read**: [Coordinate System](../api/coordinate-system.md) - Positioning guide
- **Reference**: [Entity Factories](../api/entities.md) - Entity creation API
- **Reference**: [Components](../api/components.md) - Component reference
- **Reference**: [Game Loop](../api/game-loop.md) - Loop API

## Common Patterns

### Collision Detection System

```typescript
import { query, Position, Dimensions, createBoxEntity } from 'blecsd';

function collisionSystem(world: World): World {
  const entities = query(world, [Position, Dimensions]);

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      if (checkCollision(a, b)) {
        // Handle collision
        handleCollision(world, a, b);
      }
    }
  }

  return world;
}
```

### Camera Follow System

```typescript
function cameraFollowSystem(world: World): World {
  const player = getPlayerEntity(world);
  const camera = getCameraEntity(world);

  if (!player || !camera) return world;

  // Center camera on player
  Position.x[camera] = Position.x[player] - (Dimensions.width[camera] / 2);
  Position.y[camera] = Position.y[player] - (Dimensions.height[camera] / 2);

  return world;
}

// Register in LATE_UPDATE (after player moves in UPDATE)
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
```

### Cleanup System

```typescript
import { createWorld, createGameLoop, query, removeEntity, LoopPhase } from 'blecsd';
import type { World } from 'blecsd';

const world = createWorld();

// Define a marker component for entities to delete
const MarkedForDeletion = {
  marked: new Uint8Array(10000),
};

function cleanupSystem(world: World): World {
  const entities = query(world, [MarkedForDeletion]);

  for (const eid of entities) {
    removeEntity(world, eid);
  }

  return world;
}

// Create loop and register in POST_RENDER (after all other systems)
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.POST_RENDER, cleanupSystem);
```

## Namespace API

As your application grows, you may want to organize imports using namespace objects. blECSd provides namespace imports from subpaths like `blecsd/components`, `blecsd/systems`, `blecsd/terminal`, and `blecsd/utils`.

### Why Use Namespaces?

Namespace imports help with:
- Organizing related functions by domain
- Reducing naming conflicts in larger codebases
- Making code more maintainable and searchable
- Creating clearer boundaries between different parts of your application

### Component Namespaces

Instead of importing many individual functions:

```typescript
import {
  setPosition,
  getPosition,
  moveBy,
  setDimensions,
  getDimensions,
  setContent,
  getText,
} from 'blecsd';
```

Use component namespaces:

```typescript
import { position, dimensions, content } from 'blecsd/components';

// Position operations
position.set(world, eid, 10, 5);
const pos = position.get(world, eid);
position.moveBy(world, eid, 2, 0);

// Dimensions operations
dimensions.set(world, eid, { width: 40, height: 10 });
const size = dimensions.get(world, eid);

// Content operations
content.setText(world, eid, 'Hello, World!');
const text = content.getText(world, eid);
```

### System Namespaces

Systems can also be imported as namespaces:

```typescript
import { animation, layout, render, input } from 'blecsd/systems';
import type { World } from 'blecsd';

function gameLoop(world: World): void {
  // Process input
  input.processInput(world);

  // Update animations
  animation.updateAnimations(world);

  // Calculate layout
  layout.calculateLayout(world);

  // Render to buffer
  render.renderEntities(world);
}
```

### Terminal Namespaces

For low-level terminal operations:

```typescript
import { cursor, screen, graphics } from 'blecsd/terminal';

// Cursor control
cursor.hide();
cursor.to(10, 5);
process.stdout.write('Hello');
cursor.show();

// Screen management
screen.clear();
screen.alternateOn();
// ... your app
screen.alternateOff();

// Graphics primitives
graphics.drawLine(world, 0, 0, 40, 20, '─');
graphics.fillRect(world, 5, 5, 30, 10, '█');
```

### Mixing Approaches

You can mix flat imports and namespace imports freely:

```typescript
// Core ECS always from 'blecsd'
import { createWorld, addEntity, query } from 'blecsd';

// Namespaces for organization
import { position, dimensions, scroll } from 'blecsd/components';
import { animation, layout } from 'blecsd/systems';

const world = createWorld();
const eid = addEntity(world);

// Use both styles
position.set(world, eid, 10, 5);
dimensions.set(world, eid, { width: 40, height: 10 });

// Systems
animation.updateAnimations(world);
layout.calculateLayout(world);
```

### Complete Example with Namespaces

```typescript
import { createWorld, addEntity, createGameLoop, LoopPhase } from 'blecsd';
import { position, dimensions, velocity } from 'blecsd/components';
import { animation, layout, render } from 'blecsd/systems';
import { cursor, screen } from 'blecsd/terminal';
import type { World } from 'blecsd';

// Create world
const world = createWorld();

// Create entities
for (let i = 0; i < 10; i++) {
  const particle = addEntity(world);

  position.set(world, particle, Math.random() * 80, Math.random() * 24);
  dimensions.set(world, particle, { width: 1, height: 1 });
  velocity.set(world, particle, {
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
  });
}

// Custom movement system using namespace functions
function movementSystem(world: World): World {
  // Get all entities with velocity (using has check)
  const entities = [];
  for (let eid = 0; eid < 10000; eid++) {
    if (velocity.has(world, eid) && position.has(world, eid)) {
      entities.push(eid);
    }
  }

  for (const eid of entities) {
    const pos = position.get(world, eid);
    const vel = velocity.get(world, eid);

    if (pos && vel) {
      position.set(world, eid, pos.x + vel.x, pos.y + vel.y);
    }
  }

  return world;
}

// Setup terminal
screen.alternateOn();
cursor.hide();

// Create game loop
const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.ANIMATION, animation.updateAnimations);
loop.registerSystem(LoopPhase.LAYOUT, layout.calculateLayout);
loop.registerSystem(LoopPhase.RENDER, render.renderEntities);

loop.start();

// Cleanup on exit
process.on('SIGINT', () => {
  loop.stop();
  cursor.show();
  screen.alternateOff();
  process.exit(0);
});
```

Note: Namespace imports work best with helper functions like `set()`, `get()`, `has()`. For queries that need component objects, use the flat import style from `'blecsd'` or import component objects directly from their files.

### Namespace Reference

Available namespace subpaths:

| Subpath | Contains |
|---------|----------|
| `blecsd/components` | Component namespaces (position, dimensions, content, border, scroll, focus, etc.) |
| `blecsd/systems` | System namespaces (animation, layout, render, input, output, collision, etc.) |
| `blecsd/terminal` | Terminal namespaces (cursor, screen, graphics, program, etc.) |
| `blecsd/utils` | Utility namespaces (colors, textWrap, unicode, rope, etc.) |

See the [Export Patterns Guide](../guides/export-patterns.md) for more details on the three-tier export system.

## Summary

The ECS API provides:

- ✅ Direct access to entities, components, and systems
- ✅ Custom system pipelines with phases
- ✅ Maximum flexibility and performance
- ✅ Framework-building capabilities
- ❌ More boilerplate than Game API
- ❌ Requires ECS knowledge

**Perfect for**: Custom frameworks, tools, complex UIs, maximum control

**Not ideal for**: Quick prototypes, beginners, simple games

For a simpler API, see the [Game API Getting Started](./game-api.md).
