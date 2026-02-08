# Choosing an API

blECSd provides **two different APIs** for building terminal applications. This guide helps you choose which one to use.

## Two Paths

```
┌─────────────────────────────────────────────────┐
│         Which API Should I Use?                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Are you building a game or real-time app?      │
│                                                 │
│         YES                  NO                 │
│          │                   │                  │
│          ▼                   ▼                  │
│    Game API            Low-Level ECS API        │
│  (Simplified)           (Full Control)          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Option 1: Game API (High-Level)

**Best for**: Games, real-time applications, rapid prototyping

```typescript
import { createGame } from 'blecsd';

const game = createGame({ width: 80, height: 24 });

const player = game.createBox({ x: 10, y: 5, width: 2, height: 2 });

game.onKey('up', () => {
  // Move player
});

game.onUpdate((dt) => {
  // Game logic
});

game.start();
```

**Characteristics**:
- ✅ Simple, intuitive API
- ✅ Built-in game loop
- ✅ Input handling simplified
- ✅ Good for beginners
- ❌ Less flexibility
- ❌ Hides ECS details

---

### Option 2: Low-Level ECS API

**Best for**: Custom frameworks, tools, complex TUIs, maximum control

```typescript
import {
  createWorld,
  createGameLoop,
  createBoxEntity,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const screen = createScreenEntity(world, { width: 80, height: 24 });
const player = createBoxEntity(world, { x: 10, y: 5, width: 2, height: 2 });

const loop = createGameLoop(world, { targetFPS: 60 });

loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, updateSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

loop.start();
```

**Characteristics**:
- ✅ Maximum flexibility
- ✅ Direct ECS access
- ✅ Custom system pipelines
- ✅ Performance control
- ❌ Steeper learning curve
- ❌ More boilerplate

---

## Decision Tree

### Use the **Game API** if:

- ✅ You're building a **game or real-time app**
- ✅ You want to **get started quickly**
- ✅ You're **new to ECS**
- ✅ You want **built-in input handling**
- ✅ You're **prototyping** an idea

**Example use cases**:
- Terminal games (roguelikes, arcade games, puzzle games)
- Real-time dashboards
- Interactive demos
- Prototypes

---

### Use the **Low-Level ECS API** if:

- ✅ You need **full control** over the ECS world
- ✅ You're building a **custom framework or tool**
- ✅ You need **custom system pipelines**
- ✅ You're familiar with **ECS patterns**
- ✅ You need **maximum performance**

**Example use cases**:
- Custom TUI frameworks
- IDE-like applications
- File managers
- Complex data visualization tools
- Performance-critical applications

---

## Comparison

| Feature | Game API | ECS API |
|---------|----------|---------|
| **Ease of Use** | Easy | Moderate |
| **Learning Curve** | Gentle | Steep |
| **Boilerplate** | Minimal | More |
| **Flexibility** | Limited | Maximum |
| **ECS Knowledge** | Not required | Required |
| **Input Handling** | Built-in | Manual |
| **Game Loop** | Automatic | Manual setup |
| **Performance** | Good | Best (with tuning) |
| **Custom Systems** | Limited | Full control |

---

## Can I Mix Both?

**Yes!** The Game API is built on the ECS API, so you can access the underlying world:

```typescript
import { createGame } from 'blecsd';
import { addComponent, Velocity } from 'blecsd';

const game = createGame({ width: 80, height: 24 });
const player = game.createBox({ x: 10, y: 5, width: 2, height: 2 });

// Access underlying ECS world
const world = game.world;

// Add physics component directly
addComponent(world, player, Velocity);
Velocity.x[player] = 5;
```

This gives you the **convenience of the Game API** with the **power of the ECS API** when needed.

---

## Migrating Between APIs

### From Game API to ECS API

The Game API is just a wrapper, so you can always drop down to the ECS level:

```typescript
// Start with Game API
const game = createGame({ width: 80, height: 24 });

// Access the underlying world
const world = game.world;
const loop = game.loop;

// Now you can use ECS API directly
loop.registerSystem(LoopPhase.ANIMATION, customPhysicsSystem);
```

### From ECS API to Game API

You can't wrap an existing ECS world in the Game API, but you can create a Game instance and access its world:

```typescript
// If you started with ECS and want Game API convenience
const game = createGame({ width: 80, height: 24 });

// Use game.world for existing ECS code
yourExistingFunction(game.world);

// Use game.createBox() etc. for new code
const box = game.createBox({ x: 10, y: 5, width: 20, height: 10 });
```

---

## Examples

### Game API Example: Snake Game

```typescript
import { createGame } from 'blecsd';

const game = createGame({ title: 'Snake', width: 40, height: 20 });

const snake = { x: 20, y: 10, dx: 1, dy: 0, body: [] };
const food = game.createBox({ x: 30, y: 15, width: 1, height: 1 });

game.onKey('up', () => { snake.dy = -1; snake.dx = 0; });
game.onKey('down', () => { snake.dy = 1; snake.dx = 0; });
game.onKey('left', () => { snake.dx = -1; snake.dy = 0; });
game.onKey('right', () => { snake.dx = 1; snake.dy = 0; });

game.onUpdate((dt) => {
  // Snake logic
  snake.x += snake.dx;
  snake.y += snake.dy;
});

game.start();
```

### ECS API Example: File Manager

```typescript
import {
  createWorld,
  createScreenEntity,
  createBoxEntity,
  createListEntity,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const screen = createScreenEntity(world, { width: 80, height: 24 });

const sidebar = createBoxEntity(world, { x: 0, y: 0, width: 20, height: 24 });
const fileList = createListEntity(world, {
  parent: sidebar,
  items: ['file1.txt', 'file2.txt', 'file3.txt'],
});

const loop = createGameLoop(world, { targetFPS: 30 });

loop.registerSystem(LoopPhase.INPUT, fileManagerInputSystem);
loop.registerSystem(LoopPhase.UPDATE, fileManagerUpdateSystem);
loop.registerSystem(LoopPhase.RENDER, fileManagerRenderSystem);

loop.start();
```

---

## Next Steps

### If you chose the **Game API**:

1. Read: [Game API Getting Started](./game-api.md)
2. Try: [Simple Game Tutorial](../tutorials/simple-game.md)
3. Reference: [Game API Reference](../api/game.md)

### If you chose the **ECS API**:

1. Read: [ECS API Getting Started](./ecs-api.md)
2. Read: [Understanding ECS](../guides/understanding-ecs.md)
3. Reference: [Entity Factories](../api/entities.md)
4. Reference: [Game Loop](../api/game-loop.md)

---

## Summary

- **Game API**: Simple, beginner-friendly, great for games and prototypes
- **ECS API**: Powerful, flexible, best for custom tools and frameworks
- **Both are valid**: Pick based on your needs, not dogma
- **You can mix them**: Game API is built on ECS API
