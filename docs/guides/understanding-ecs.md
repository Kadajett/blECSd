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

```typescript
// OOP: Objects contain both data AND behavior
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
// ECS: Separate data from behavior

// 1. Components are just data
const Position = defineComponent({ x: Types.f32, y: Types.f32 });
const Dimensions = defineComponent({ width: Types.f32, height: Types.f32 });
const Content = defineComponent({ /* text data */ });

// 2. Entities are just IDs
const buttonEntity = addEntity(world);

// 3. Add components to entities
Position.x[buttonEntity] = 10;
Position.y[buttonEntity] = 5;
setContent(world, buttonEntity, 'Click me');

// 4. Systems process entities with specific components
function movementSystem(world: World): World {
  // Find all entities with Position and Velocity components
  const entities = movementQuery(world);

  for (const eid of entities) {
    // Update position based on velocity
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}

function renderSystem(world: World): World {
  // Find all entities with Position and Renderable components
  const entities = renderableQuery(world);

  for (const eid of entities) {
    // Draw entity at its position
    draw(Position.x[eid], Position.y[eid], Renderable[eid]);
  }

  return world;
}
```

## Why ECS for Terminal UIs?

### 1. **Performance**

Components use **Structure-of-Arrays** layout for cache-friendly iteration:

```typescript
// All X coordinates in one array
Position.x = [10, 20, 30, 40, ...];
// All Y coordinates in another array
Position.y = [5, 10, 15, 20, ...];

// Iterate over 10,000 entities efficiently
for (let i = 0; i < 10000; i++) {
  Position.x[i] += Velocity.x[i];
  Position.y[i] += Velocity.y[i];
}
```

This is **much faster** than iterating over 10,000 objects with scattered memory locations.

### 2. **Composition over Inheritance**

Build complex entities by combining simple components:

```typescript
// A static text label
const label = addEntity(world);
addComponent(world, label, Position);
addComponent(world, label, Renderable);
addComponent(world, label, Content);

// A clickable button (label + interaction)
const button = addEntity(world);
addComponent(world, button, Position);
addComponent(world, button, Renderable);
addComponent(world, button, Content);
addComponent(world, button, Interactive);  // Now it's clickable
addComponent(world, button, Focusable);    // Now it can be focused

// An animated button (button + physics)
const animatedButton = addEntity(world);
addComponent(world, animatedButton, Position);
addComponent(world, animatedButton, Renderable);
addComponent(world, animatedButton, Content);
addComponent(world, animatedButton, Interactive);
addComponent(world, animatedButton, Focusable);
addComponent(world, animatedButton, Velocity);     // Now it moves
addComponent(world, animatedButton, Spring);       // Now it bounces
```

No deep inheritance hierarchies. Just mix and match components.

### 3. **Flexibility**

The same architecture scales from simple CLI tools to complex dashboards to terminal games:

```typescript
// Simple CLI tool: just text and layout
const entities = addEntities(world, 10);
for (const eid of entities) {
  addComponents(world, eid, [Position, Content, Renderable]);
}

// Complex dashboard: add scrolling, borders, interactions
for (const eid of entities) {
  addComponents(world, eid, [Scrollable, Border, Interactive]);
}

// Terminal game: add physics, collision, AI
for (const eid of entities) {
  addComponents(world, eid, [Velocity, Collider, AIBehavior]);
}
```

## How blECSd Uses ECS

### The World

Everything lives in a **World**:

```typescript
import { createWorld } from 'blecsd';

const world = createWorld();
```

The world stores all entities, components, and systems.

### Creating Entities

blECSd provides two ways to create entities:

#### 1. **High-Level: Entity Factories** (recommended for most cases)

```typescript
import { createBoxEntity, createButtonEntity } from 'blecsd';

const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 10,
  border: { type: BorderType.Line },
});

const button = createButtonEntity(world, {
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
import { addEntity, addComponent, Position, Dimensions } from 'blecsd';

const customEntity = addEntity(world);
addComponent(world, customEntity, Position);
addComponent(world, customEntity, Dimensions);

Position.x[customEntity] = 10;
Position.y[customEntity] = 5;
Dimensions.width[customEntity] = 40;
Dimensions.height[customEntity] = 10;
```

Use this when you need precise control.

### Querying Entities

Find entities with specific components:

```typescript
import { defineQuery, Position, Velocity } from 'blecsd';

// Define a query once
const movingEntities = defineQuery([Position, Velocity]);

// Use it in a system
function animationSystem(world: World): World {
  const entities = movingEntities(world);

  for (const eid of entities) {
    // Only entities with BOTH Position AND Velocity
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
```

Queries are **cached** and **fast**.

### Systems

Systems are pure functions that transform world state:

```typescript
import { createGameLoop, LoopPhase } from 'blecsd';

const loop = createGameLoop(world, { targetFPS: 60 });

// Register systems in specific phases
loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start the loop
loop.start();
```

See [System Execution Order](./system-execution-order.md) for phase details.

## Mental Model Shift from OOP

### OOP: Objects Own Their Behavior

```typescript
// OOP
const button = new Button({ text: 'Click me' });
button.on('press', handler);
button.move(10, 0);
button.render();
```

The button object has methods that operate on itself.

### ECS: Systems Process Entities

```typescript
// ECS
const button = createButtonEntity(world, { label: 'Click me' });

// Systems handle behavior
inputSystem(world);      // Processes button clicks
movementSystem(world);   // Moves entities with Velocity
renderSystem(world);     // Draws entities with Renderable
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
import { hasComponent, Position } from 'blecsd';

if (hasComponent(world, eid, Position)) {
  console.log(`Entity ${eid} has a position`);
}
```

### Pattern 2: Adding a Component at Runtime

```typescript
import { addComponent, Velocity } from 'blecsd';

// Make a static entity start moving
addComponent(world, eid, Velocity);
Velocity.x[eid] = 5;
Velocity.y[eid] = 0;
```

### Pattern 3: Removing a Component

```typescript
import { removeComponent, Velocity } from 'blecsd';

// Stop an entity from moving
removeComponent(world, eid, Velocity);
```

### Pattern 4: Iterating Over Query Results

```typescript
import { defineQuery, Interactive, Focusable } from 'blecsd';

const focusableInteractive = defineQuery([Interactive, Focusable]);

function handleTabKey(world: World): void {
  const entities = focusableInteractive(world);

  for (const eid of entities) {
    if (Focusable.tabIndex[eid] > 0) {
      // Process focusable interactive entities
    }
  }
}
```

### Pattern 5: Parent-Child Relationships

```typescript
import { setParent, getChildren } from 'blecsd';

const parent = createBoxEntity(world, { x: 10, y: 5, width: 50, height: 20 });
const child = createBoxEntity(world, { x: 5, y: 2, width: 20, height: 5 });

// Attach child to parent
setParent(world, child, parent);

// Get all children of an entity
const children = getChildren(world, parent);
for (const childEid of children) {
  console.log(`Child entity: ${childEid}`);
}
```

## Common Pitfalls

### Pitfall 1: Storing Entity References Instead of IDs

```typescript
// ❌ WRONG: Storing entity objects
const button = { id: addEntity(world), label: 'Click me' };
// Entity is just a number, not an object

// ✅ CORRECT: Store entity IDs directly
const button: Entity = createButtonEntity(world, { label: 'Click me' });
```

Entities are just numbers. Don't wrap them in objects.

### Pitfall 2: Trying to Access Component Data Directly on Entities

```typescript
// ❌ WRONG: Entities don't have properties
const x = button.x;  // Error: entities are numbers, not objects

// ✅ CORRECT: Access component arrays
const x = Position.x[button];
```

Component data is stored in typed arrays, not on entity objects.

### Pitfall 3: Mutating Component Data Outside Systems

```typescript
// ❌ AVOID: Direct mutation outside systems
Position.x[eid] = 100;

// ✅ BETTER: Use helper functions
setPosition(world, eid, 100, Position.y[eid]);

// ✅ BEST: Put logic in systems
function repositionSystem(world: World): World {
  const entities = repositionQuery(world);
  for (const eid of entities) {
    Position.x[eid] = calculateNewX(eid);
  }
  return world;
}
```

While direct mutation works, helper functions and systems are more maintainable.

### Pitfall 4: Storing World References in Closures

```typescript
// ❌ RISKY: Storing world reference
let cachedWorld: World;

function setup() {
  cachedWorld = createWorld();
}

// ✅ BETTER: Pass world explicitly
function setup(): World {
  return createWorld();
}

function update(world: World): World {
  // World is explicit parameter
  return world;
}
```

Always pass `world` as a parameter, never cache it globally.

### Pitfall 5: Over-Using Systems

```typescript
// ❌ OVERKILL: Creating a system for one-off operations
function setTitleSystem(world: World): World {
  const eid = screenQuery(world)[0];
  if (eid) setContent(world, eid, 'New Title');
  return world;
}

// ✅ BETTER: Just call a function directly
const screen = getScreenEntity(world);
if (screen) setContent(world, screen, 'New Title');
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
  BorderType,
} from 'blecsd';

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

// Register systems
loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, updateSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start
loop.start();
```

## Next Steps

- **Read**: [System Execution Order](./system-execution-order.md) - Understand loop phases
- **Read**: [Coordinate System](../api/coordinate-system.md) - Learn about positioning
- **Read**: [Widgets vs Components](../architecture/widgets-vs-components.md) - Understand abstraction layers
- **Try**: [Simple Game Tutorial](../tutorials/simple-game.md) - Build a real ECS application

## Further Reading

- [bitECS documentation](https://github.com/NateTheGreatt/bitECS) - The ECS library blECSd uses
- [ECS FAQ](https://github.com/SanderMertens/ecs-faq) - Common ECS questions
- [Data-Oriented Design](https://www.dataorienteddesign.com/dodbook/) - Theory behind ECS
