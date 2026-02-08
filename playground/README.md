# blECSd Playground

A sandbox environment for experimenting with blECSd APIs and testing ideas quickly.

## Quick Start

```bash
# Run the playground
pnpm playground

# Or use tsx directly
tsx playground/index.ts
```

## What's Included

The playground comes with example code demonstrating:

1. **Box Widget** - Basic container with borders and content
2. **List Widget** - Keyboard-navigable list
3. **ECS Components** - Position, Velocity, and other components
4. **Animation** - Simple physics-based movement
5. **Input Handling** - Keyboard and mouse events
6. **Game Loop** - Continuous update cycle

## How to Use

### Basic Experimentation

Edit `playground/index.ts` and add your code at the bottom in the "YOUR EXPERIMENTS BELOW" section. The playground will automatically use your local source code from `src/`.

```typescript
// Example: Create a custom widget
const myEntity = addEntity(world);
const myBox = createBox(world, myEntity, {
  x: 10,
  y: 10,
  width: 30,
  height: 8,
  border: { type: 'double' }
});
setContent(world, myBox, 'Hello from playground!');
```

### Running Your Code

```bash
# Run the playground
pnpm playground

# Press 'q' to quit
```

### Hot Reloading

For faster iteration, use `tsx` in watch mode:

```bash
tsx watch playground/index.ts
```

This will automatically restart when you save changes.

## Common Patterns

### Creating Entities and Widgets

```typescript
import { addEntity, createBox, setContent } from '../src/index';

const entity = addEntity(world);
const box = createBox(world, entity, {
  x: 5,
  y: 5,
  width: 40,
  height: 10
});
setContent(world, box, 'My content here');
```

### Working with Components

```typescript
import { Position, Velocity, setPosition, setVelocity } from '../src/index';

const entity = addEntity(world);
setPosition(world, entity, 10, 5);
setVelocity(world, entity, { x: 1, y: 0, friction: 0.9, maxSpeed: 5 });

// Access component data directly
console.log(`Entity at: (${Position.x[entity]}, ${Position.y[entity]})`);
```

### Querying Entities

```typescript
import { query, Position, Velocity } from '../src/index';

// Find all entities with both Position and Velocity
const entities = query(world, [Position, Velocity]);
for (const eid of entities) {
  // Update entity positions
  Position.x[eid] += Velocity.x[eid];
  Position.y[eid] += Velocity.y[eid];
}
```

### Creating Systems

```typescript
import { defineSystem, query, Position, Velocity } from '../src/index';

const mySystem = defineSystem((world) => {
  const entities = query(world, [Position, Velocity]);
  for (const eid of entities) {
    // Your logic here
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }
  return world;
});
```

### Input Events

```typescript
import { getInputEventBus } from '../src/index';

const inputBus = getInputEventBus(world);

// Keyboard events
inputBus.on('key', (event) => {
  console.log('Key pressed:', event.name);
  if (event.name === 'space') {
    // Handle spacebar
  }
});

// Mouse events
inputBus.on('mouse', (event) => {
  console.log('Mouse:', event.x, event.y, event.action);
});
```

### Animation Loop

```typescript
function gameLoop() {
  // Update game state
  updatePlayerPosition();
  updateEnemies();

  // Render
  renderSystem(world);

  // Continue loop
  setTimeout(gameLoop, 16); // ~60 FPS
}

gameLoop();
```

## Examples

### Bouncing Box

```typescript
const entity = addEntity(world);
setPosition(world, entity, 10, 10);
setVelocity(world, entity, { x: 2, y: 1, friction: 1.0, maxSpeed: 5 });

const box = createBox(world, entity, {
  x: 10,
  y: 10,
  width: 5,
  height: 3
});

function loop() {
  const x = Position.x[entity];
  const y = Position.y[entity];

  // Bounce off edges
  if (x <= 0 || x >= 75) Velocity.x[entity] *= -1;
  if (y <= 0 || y >= 20) Velocity.y[entity] *= -1;

  // Apply velocity
  Position.x[entity] += Velocity.x[entity];
  Position.y[entity] += Velocity.y[entity];

  // Update widget
  setPosition(world, box, Math.floor(Position.x[entity]), Math.floor(Position.y[entity]));

  renderSystem(world);
  setTimeout(loop, 16);
}
loop();
```

### Interactive Menu

```typescript
import { createList } from '../src/index';

const listEntity = addEntity(world);
const list = createList(world, listEntity, {
  x: 10,
  y: 5,
  width: 40,
  height: 15,
  items: [
    { label: 'Start Game', value: 'start' },
    { label: 'Settings', value: 'settings' },
    { label: 'Exit', value: 'exit' }
  ]
});

// Handle selection
inputBus.on('key', (event) => {
  if (event.name === 'return') {
    const selected = list.getSelectedItem();
    if (selected?.value === 'exit') {
      process.exit(0);
    }
  }
});
```

## Tips

### 1. Use TypeScript Features

The playground has full TypeScript support. Use type checking to catch errors:

```typescript
import type { World, Entity } from '../src/index';

function myFunction(world: World, entity: Entity): void {
  // TypeScript will catch type errors
}
```

### 2. Check Component Existence

Always check if component data exists before using it:

```typescript
const x = Position.x[entity];
if (x !== undefined) {
  // Safe to use x
  Position.x[entity] = x + 1;
}
```

### 3. Clean Up Resources

When done with entities, remove them:

```typescript
import { removeEntity } from '../src/index';

removeEntity(world, entity);
```

### 4. Debug with Console

Use console.log for debugging:

```typescript
console.log('Entity:', entity);
console.log('Position:', Position.x[entity], Position.y[entity]);
```

### 5. Reference Examples

Check the `examples/` directory for more complete applications:
- `examples/01-hello-world.ts` - Basic setup
- `examples/02-dashboard.ts` - Multiple widgets
- `examples/03-form-validation.ts` - Form controls
- `examples/04-animation-physics.ts` - Animation
- `examples/05-game-ecs.ts` - Full game

## Troubleshooting

### Playground Won't Run

```bash
# Make sure dependencies are installed
pnpm install

# Rebuild the project
pnpm build
```

### TypeScript Errors

The playground uses source files directly from `src/`, so any TypeScript errors in the source will appear here. Run:

```bash
pnpm typecheck
```

### Terminal Issues

If the terminal display looks garbled:
- Resize your terminal (minimum 80x24 recommended)
- Try a different terminal emulator
- Press `Ctrl+C` to exit and restart

### Import Errors

Always import from `../src/index` in the playground:

```typescript
// Good
import { createWorld } from '../src/index';

// Bad (won't work in playground)
import { createWorld } from 'blecsd';
```

## Next Steps

Once you're comfortable with the basics:

1. **Build a complete app** - Start with a simple dashboard or menu
2. **Explore components** - Check `src/components/` for all available components
3. **Create custom systems** - Write your own game logic or UI behavior
4. **Try advanced features** - Collision detection, particle systems, 3D rendering
5. **Read the docs** - See `docs/` for comprehensive guides

## Resources

- [API Reference](../docs/api/index.md)
- [Getting Started Guide](../docs/getting-started/concepts.md)
- [Examples](../examples/)
- [GitHub](https://github.com/Kadajett/blECSd)

Happy experimenting! 🚀
