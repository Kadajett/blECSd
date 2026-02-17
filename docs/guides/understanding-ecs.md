# Understanding ECS (Entity Component System)

This guide explains ECS (Entity Component System) for developers new to the paradigm, and how blECSd uses ECS to build high-performance terminal UIs.

## What is ECS?

Entity Component System (ECS) is a data-oriented architecture pattern where:

- **Entities** are just unique IDs (numbers)
- **Components** are pure data containers
- **Systems** are functions that process entities with specific components

Instead of objects with methods, you have:
- **Data** (components) stored in efficient arrays
- **Behavior** (systems) separated from data
- **Composition** instead of inheritance

## The 5-Minute ECS Primer

### Traditional OOP Approach

<!-- blecsd-doccheck:ignore -->
```typescript
// OOP: Objects contain both data AND behavior (anti-pattern in blECSd)
class Button {
  x: number;
  y: number;
  label: string;

  constructor(x: number, y: number, label: string) {
    this.x = x;
    this.y = y;
    this.label = label;
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  render(): void {
    // Draw button at this.x, this.y
  }
}

const button = new Button(10, 5, 'Click me');
button.move(5, 0);
button.render();
```

### ECS Approach

```typescript
import { createWorld, addEntity, query } from 'blecsd/core';
import { Position, Velocity, setContent } from 'blecsd/components';
import type { World } from 'blecsd/core';

// ECS: Separate data from behavior

// 1. Components are pure data stores (Position, Velocity already defined by blECSd)
const ecsWorld = createWorld();

// 2. Entities are just IDs
const buttonEntity = addEntity(ecsWorld);

// 3. Add components to entities using typed arrays
Position.x[buttonEntity] = 10;
Position.y[buttonEntity] = 5;
setContent(ecsWorld, buttonEntity, 'Click me');

// 4. Systems process entities with specific components
function movementSystem(world: World): World {
    // Find all entities with Position and Velocity components
    const entities = query(world, [Position, Velocity]);
    for (const eid of entities) {
        // Update position based on velocity
        Position.x[eid] += Velocity.x[eid] ?? 0;
        Position.y[eid] += Velocity.y[eid] ?? 0;
    }
    return world;
}

// Run the system
movementSystem(ecsWorld);
```

## Why ECS for Terminal UIs?

### 1. **Performance**

Components use **Structure-of-Arrays** layout for cache-friendly iteration:

```typescript
import { Position, Velocity } from 'blecsd/components';

// Position.x and Position.y are Float32Array - all X/Y in one contiguous array
// This is Structure-of-Arrays (SoA) layout - very cache-friendly

// Iterate over 10,000 entities efficiently
for (let i = 0; i < 10000; i++) {
    Position.x[i] = (Position.x[i] ?? 0) + (Velocity.x[i] ?? 0);
    Position.y[i] = (Position.y[i] ?? 0) + (Velocity.y[i] ?? 0);
}
```

This is **much faster** than iterating over 10,000 objects with scattered memory locations.

### 2. **Composition over Inheritance**

Build complex entities by combining simple components:

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Content, Interactive, Focusable, Velocity, Renderable } from 'blecsd/components';

const compWorld = createWorld();

// A static text label
const label = addEntity(compWorld);
addComponent(compWorld, label, Position);
addComponent(compWorld, label, Renderable);
addComponent(compWorld, label, Content);

// A clickable button (label + interaction)
const compButton = addEntity(compWorld);
addComponent(compWorld, compButton, Position);
addComponent(compWorld, compButton, Renderable);
addComponent(compWorld, compButton, Content);
addComponent(compWorld, compButton, Interactive);  // Now it's clickable
addComponent(compWorld, compButton, Focusable);    // Now it can be focused

// An animated button (button + physics)
const animatedButton = addEntity(compWorld);
addComponent(compWorld, animatedButton, Position);
addComponent(compWorld, animatedButton, Renderable);
addComponent(compWorld, animatedButton, Content);
addComponent(compWorld, animatedButton, Interactive);
addComponent(compWorld, animatedButton, Focusable);
addComponent(compWorld, animatedButton, Velocity);     // Now it moves
// Spring animation: add Velocity and configure spring dynamics in your animation system
```

No deep inheritance hierarchies. Just mix and match components.

### 3. **Flexibility**

The same architecture scales from simple CLI tools to complex dashboards to terminal games:

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Content, Renderable, Interactive, Velocity, Collider, Scrollable } from 'blecsd/components';

const flexWorld = createWorld();

// Simple CLI tool: just text and layout
for (let i = 0; i < 10; i++) {
    const eid = addEntity(flexWorld);
    addComponent(flexWorld, eid, Position);
    addComponent(flexWorld, eid, Content);
    addComponent(flexWorld, eid, Renderable);
}

// Complex dashboard entity: add scrolling and interactions
const dashEid = addEntity(flexWorld);
addComponent(flexWorld, dashEid, Scrollable);
addComponent(flexWorld, dashEid, Interactive);

// Terminal game entity: add physics and collision
const gameEid = addEntity(flexWorld);
addComponent(flexWorld, gameEid, Velocity);
addComponent(flexWorld, gameEid, Collider);
```

## How blECSd Uses ECS

### The World

Everything lives in a **World**:

```typescript
import { createWorld } from 'blecsd/core';

const world = createWorld();
```

The world stores all entities, components, and systems.

### Creating Entities

blECSd provides two ways to create entities:

#### 1. **High-Level: Entity Factories** (recommended for most cases)

```typescript
import { createBoxEntity, createButtonEntity, createWorld } from 'blecsd/core';
import { BorderType } from 'blecsd/components';

const factoryWorld = createWorld();

const box = createBoxEntity(factoryWorld, {
    x: 10,
    y: 5,
    width: 40,
    height: 10,
    border: { type: BorderType.Line },
});

const button = createButtonEntity(factoryWorld, {
    x: 15,
    y: 8,
    width: 12,
    height: 3,
    label: 'Click me',
});
```

Entity factories handle component setup for you.

#### 2. **Low-Level: Manual Component Assembly** (for custom entities)

```typescript
import { addEntity, addComponent, createWorld } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

const lowLevelWorld = createWorld();
const customEntity = addEntity(lowLevelWorld);
addComponent(lowLevelWorld, customEntity, Position);
addComponent(lowLevelWorld, customEntity, Dimensions);

Position.x[customEntity] = 10;
Position.y[customEntity] = 5;
Dimensions.width[customEntity] = 40;
Dimensions.height[customEntity] = 10;
```

Use this when you need precise control.

### Querying Entities

Find entities with specific components:

```typescript
import { query, createWorld } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

// Use query in a system
function animationSystem(world: World): World {
    const entities = query(world, [Position, Velocity]);
    for (const eid of entities) {
        // Only entities with BOTH Position AND Velocity
        Position.x[eid] = (Position.x[eid] ?? 0) + (Velocity.x[eid] ?? 0);
        Position.y[eid] = (Position.y[eid] ?? 0) + (Velocity.y[eid] ?? 0);
    }
    return world;
}

const queryWorld = createWorld();
animationSystem(queryWorld);
```

Queries are **cached** and **fast**.

### Systems

Systems are pure functions that transform world state:

```typescript
import { inputSystem, renderSystem, layoutSystem } from 'blecsd/systems';
import { createGameLoop, LoopPhase, createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

const sysWorld = createWorld();
const loop = createGameLoop(sysWorld, { targetFPS: 60 });

// Register input system using the dedicated method (LoopPhase.INPUT is protected)
loop.registerInputSystem(inputSystem);

// Register systems in specific phases
function gameLogicSystem(world: World): World { return world; }
function physicsSystem(world: World): World { return world; }
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Note: call loop.start() in a real app to run the loop
```

See [System Execution Order](./system-execution-order.md) for phase details.

## Mental Model Shift from OOP

### OOP: Objects Own Their Behavior

<!-- blecsd-doccheck:ignore -->
```typescript
// OOP approach (anti-pattern in blECSd - shown for comparison)
const button = new Button({ text: 'Click me' });
button.on('press', handler);
button.move(10, 0);
button.render();
```

The button object has methods that operate on itself.

### ECS: Systems Process Entities

```typescript
import { createButtonEntity, createWorld } from 'blecsd/core';
import { inputSystem, renderSystem } from 'blecsd/systems';
import type { World } from 'blecsd/core';

const mentalWorld = createWorld();
const mentalButton = createButtonEntity(mentalWorld, { label: 'Click me' });

// Systems handle behavior
function movementSystem(world: World): World { return world; }

inputSystem(mentalWorld);       // Processes button clicks
movementSystem(mentalWorld);    // Moves entities with Velocity
renderSystem(mentalWorld);      // Draws entities with Renderable
```

Behavior lives in systems, not in the entity.

### Key Differences

| OOP | ECS |
|-----|-----|
| `button.move(10, 0)` | `moveBy(world, button, 10, 0)` |
| `button.render()` | `renderSystem(world)` (renders all entities) |
| `button.label = 'New'` | `setContent(world, button, 'New')` |
| `button.onClick(fn)` | `onButtonPress(button, fn)` |
| Inheritance (`extends`) | Composition (add components) |

## Common Patterns

### Pattern 1: Checking if an Entity Has a Component

```typescript
import { hasComponent, createWorld, addEntity } from 'blecsd/core';
import { Position } from 'blecsd/components';

const pat1World = createWorld();
const pat1Eid = addEntity(pat1World);

if (hasComponent(pat1World, pat1Eid, Position)) {
  console.log(`Entity ${pat1Eid} has a position`);
}
```

### Pattern 2: Adding a Component at Runtime

```typescript
import { addComponent, createWorld, addEntity } from 'blecsd/core';
import { Velocity } from 'blecsd/components';

const pat2World = createWorld();
const pat2Eid = addEntity(pat2World);

// Make a static entity start moving
addComponent(pat2World, pat2Eid, Velocity);
Velocity.x[pat2Eid] = 5;
Velocity.y[pat2Eid] = 0;
```

### Pattern 3: Removing a Component

```typescript
import { removeComponent, addComponent, createWorld, addEntity } from 'blecsd/core';
import { Velocity } from 'blecsd/components';

const pat3World = createWorld();
const pat3Eid = addEntity(pat3World);
addComponent(pat3World, pat3Eid, Velocity);

// Stop an entity from moving
removeComponent(pat3World, pat3Eid, Velocity);
```

### Pattern 4: Iterating Over Query Results

```typescript
import { Focusable } from 'blecsd/components';
import { query, createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

function handleTabKey(world: World): void {
    const entities = query(world, [Focusable]);

    for (const eid of entities) {
        if ((Focusable.tabIndex[eid] ?? 0) > 0) {
            // Process focusable interactive entities
        }
    }
}

const pat4World = createWorld();
handleTabKey(pat4World);
```

### Pattern 5: Parent-Child Relationships

```typescript
import { getChildren, setParent } from 'blecsd/components';
import { createBoxEntity, createWorld } from 'blecsd/core';

const pat5World = createWorld();
const pat5Parent = createBoxEntity(pat5World, { x: 10, y: 5, width: 50, height: 20 });
const pat5Child = createBoxEntity(pat5World, { x: 5, y: 2, width: 20, height: 5 });

// Attach child to parent
setParent(pat5World, pat5Child, pat5Parent);

// Get all children of an entity
const pat5Children = getChildren(pat5World, pat5Parent);
for (const childEid of pat5Children) {
    console.log(`Child entity: ${childEid}`);
}
```

## Common Pitfalls

### Pitfall 1: Storing Entity References Instead of IDs

<!-- blecsd-doccheck:ignore -->
```typescript
// ❌ WRONG: Storing entity objects (anti-pattern)
const button = { id: addEntity(world), label: 'Click me' };
// Entity is just a number, not an object
```

```typescript
import { createButtonEntity, createWorld } from 'blecsd/core';
import type { Entity } from 'blecsd/core';

const pit1World = createWorld();

// ✅ CORRECT: Store entity IDs directly
const pit1Button: Entity = createButtonEntity(pit1World, { label: 'Click me' });
```

Entities are just numbers. Don't wrap them in objects.

### Pitfall 2: Trying to Access Component Data Directly on Entities

```typescript
import { createButtonEntity, createWorld } from 'blecsd/core';
import { Position } from 'blecsd/components';

const pit2World = createWorld();
const pit2Button = createButtonEntity(pit2World, { label: 'Click me' });

// ✅ CORRECT: Access component arrays
const pit2X = Position.x[pit2Button];
```

Component data is stored in typed arrays, not on entity objects.

### Pitfall 3: Mutating Component Data Outside Systems

```typescript
import { createWorld, addEntity, addComponent, query } from 'blecsd/core';
import { Position, setPosition } from 'blecsd/components';
import type { World } from 'blecsd/core';

const pit3World = createWorld();
const pit3Eid = addEntity(pit3World);
addComponent(pit3World, pit3Eid, Position);

// ✅ BETTER: Use helper functions
setPosition(pit3World, pit3Eid, 100, Position.y[pit3Eid] ?? 0);

// ✅ BEST: Put logic in systems
const pit3Query = query(pit3World, [Position]);
function repositionSystem(world: World): World {
    const entities = query(world, [Position]);
    for (const eid of entities) {
        Position.x[eid] = 0;
    }
    return world;
}
repositionSystem(pit3World);
```

While direct mutation works, helper functions and systems are more maintainable.

### Pitfall 4: Storing World References in Closures

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

// ✅ BETTER: Pass world explicitly
function pit4Setup(): World {
    return createWorld();
}

function pit4Update(world: World): World {
    // World is explicit parameter
    return world;
}

const pit4World = pit4Setup();
pit4Update(pit4World);
```

Always pass `world` as a parameter, never cache it globally.

### Pitfall 5: Over-Using Systems

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setContent } from 'blecsd/components';
import type { World } from 'blecsd/core';

const pit5World = createWorld();
const pit5TitleEid = addEntity(pit5World);

// ✅ BETTER: Just call a function directly for a one-off operation
setContent(pit5World, pit5TitleEid, 'New Title');
```

Systems are for recurring logic. One-off operations can just be functions.

## When to Use Systems vs Helper Functions

### Use Systems When:
- Logic runs **every frame** (rendering, animation, input)
- Logic processes **multiple entities** (collision, layout)
- Logic has **dependencies** on other systems (update before render)

### Use Helper Functions When:
- Logic runs **on demand** (user action, initialization)
- Logic operates on **one specific entity** (set title, move button)
- Logic is **stateless** and **pure** (calculate color, format text)

## Example: Building a Simple Menu

```typescript
import {
  createWorld,
  createGameLoop,
  createBoxEntity,
  createButtonEntity,
  createTextEntity,
  LoopPhase,
} from 'blecsd/core';
import { BorderType } from 'blecsd/components';
import { renderSystem } from 'blecsd/systems';

const world = createWorld();

// Create container
const menu = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 20,
  border: { type: BorderType.Line },
});

// Create title
const title = createTextEntity(world, {
  parent: menu,
  x: 2,
  y: 1,
  width: 36,
  text: 'Main Menu',
});

// Create buttons
const startButton = createButtonEntity(world, {
  parent: menu,
  x: 5,
  y: 5,
  width: 30,
  height: 3,
  label: 'Start Game',
  tabIndex: 0,
});

const settingsButton = createButtonEntity(world, {
  parent: menu,
  x: 5,
  y: 9,
  width: 30,
  height: 3,
  label: 'Settings',
  tabIndex: 1,
});

const quitButton = createButtonEntity(world, {
  parent: menu,
  x: 5,
  y: 13,
  width: 30,
  height: 3,
  label: 'Quit',
  tabIndex: 2,
});

// Set up game loop
const loop = createGameLoop(world, { targetFPS: 60 });

// Register systems (INPUT phase runs automatically)
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start
loop.start();
```

## Next Steps

- **Read**: [System Execution Order](./system-execution-order.md) - Understand loop phases
- **Read**: [Coordinate System](../api/positioning.md) - Learn about positioning
- **Read**: [Widgets vs Components](../architecture/widgets-vs-components.md) - Understand abstraction layers
- **Try**: [Simple Game Tutorial](../tutorials/simple-game.md) - Build a real ECS application

## Further Reading

- [bitECS documentation](https://github.com/NateTheGreatt/bitECS) - The ECS library blECSd uses
- [ECS FAQ](https://github.com/SanderMertens/ecs-faq) - Common ECS questions
- [Data-Oriented Design](https://www.dataorienteddesign.com/dodbook/) - Theory behind ECS
