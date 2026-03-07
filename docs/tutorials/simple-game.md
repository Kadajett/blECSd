# Tutorial: Simple Game

**Difficulty:** Advanced
**Time:** 60 minutes
**Concepts:** Animation, collision, state machines, game loop

In this tutorial, you'll build a simple snake-like game that demonstrates blECSd's game-oriented features: animation, collision detection, state machines, and physics.

## What You'll Build

```
┌─ Snake Game ────────────────────────────────────────────┐
│                                                         │
│                    * Score: 15                          │
│                                                         │
│                        ●                                │
│                                                         │
│                  ████████                               │
│                        ██                               │
│                        ██                               │
│             ●                                           │
│                                                         │
│                                                         │
│                                                         │
│ [Arrow Keys] Move  [P] Pause  [Q] Quit                  │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Completed previous tutorials
- Understanding of game loops
- Basic ECS concepts

## Step 1: Project Setup

Create `snake.ts`:

```typescript
import {
  createWorld, addEntity, removeEntity, hasComponent, addComponent,
  createBoxEntity, createTextEntity, createScheduler, LoopPhase,
  createScreenEntity,
} from 'blecsd/core';
import { createRenderPipeline, onShutdown } from 'blecsd';
import { setPosition, getPosition, setText, setContent, setStyle, setVisible } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
import { type KeyEvent, createProgram } from 'blecsd/terminal';

const world = createWorld();
const scheduler = createScheduler();

// Register built-in systems
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);

// Create terminal program (handles alternate screen and cursor automatically)
const program = createProgram({
  useAlternateScreen: true,
  hideCursor: true,
});
program.init();

// Initialize render pipeline
const { cols, rows } = createRenderPipeline(process.stdout);
createScreenEntity(world, { width: cols, height: rows });

// Register clean shutdown on SIGINT/SIGTERM (returns a function you can call manually)
const shutdown = onShutdown(world, { program });
```

## Step 2: Game Constants and State

```typescript
const GRID_WIDTH = 40;
const GRID_HEIGHT = 20;
const CELL_SIZE = 1;
const GAME_SPEED = 150; // ms per tick

// Directions (use const object instead of enum for runtime compatibility)
const Direction = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
} as const;
type DirectionValue = typeof Direction[keyof typeof Direction];

const DIRECTION_VELOCITY: Record<DirectionValue, { x: number; y: number }> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
};

// Game state
interface GameState {
  score: number;
  direction: DirectionValue;
  nextDirection: DirectionValue;
  gameOver: boolean;
  paused: boolean;
  snakeHead: number;
  snakeBody: number[];
  food: number;
}

const state: GameState = {
  score: 0,
  direction: Direction.Right,
  nextDirection: Direction.Right,
  gameOver: false,
  paused: false,
  snakeHead: 0,
  snakeBody: [],
  food: 0,
};
```

## Step 3: Create UI

```typescript
const columns = process.stdout.columns || 80;
const rows = process.stdout.rows || 24;

// Calculate centered game area
const gameX = Math.floor((columns - GRID_WIDTH - 2) / 2);
const gameY = Math.floor((rows - GRID_HEIGHT - 4) / 2);

// Game panel (createBoxEntity returns an entity ID)
const gamePanel = createBoxEntity(world, {
  x: gameX,
  y: gameY,
  width: GRID_WIDTH + 2,
  height: GRID_HEIGHT + 4,
});

// Score display (createTextEntity returns an entity ID)
const scoreText = createTextEntity(world, {
  x: 2,
  y: 1,
  text: 'Score: 0',
  parent: gamePanel,
});

// Game over text (hidden initially)
const gameOverText = createTextEntity(world, {
  x: Math.floor(GRID_WIDTH / 2) - 5,
  y: Math.floor(GRID_HEIGHT / 2),
  text: 'GAME OVER',
  fg: 0xff0000ff,
  visible: false,
  parent: gamePanel,
});

// Help text
const helpText = createTextEntity(world, {
  x: 2,
  y: GRID_HEIGHT + 2,
  text: '[Arrow Keys] Move  [P] Pause  [R] Restart  [Q] Quit',
  parent: gamePanel,
});
console.log('Help text entity:', helpText);

function updateScore(): void {
  setText(world, scoreText, `Score: ${state.score}`);
}
```

## Step 4: Snake Entity

Define custom marker components for the snake, then create factory functions for the head and body segments.

```typescript
// Track snake entity types in a plain Map (no custom bitecs components needed)
const snakeEntityType = new Map<number, 'head' | 'body'>();

function createSnakeHead(x: number, y: number): number {
  const headEid = addEntity(world);

  // Position in game grid (offset by panel position)
  setPosition(world, headEid, gameX + 1 + x, gameY + 2 + y);

  // Visual character and color
  setContent(world, headEid, '█');
  setStyle(world, headEid, { fg: 0x00ff00ff });

  snakeEntityType.set(headEid, 'head');

  return headEid;
}

function createSnakeSegment(x: number, y: number): number {
  const segEid = addEntity(world);

  setPosition(world, segEid, gameX + 1 + x, gameY + 2 + y);
  setContent(world, segEid, '█');
  setStyle(world, segEid, { fg: 0x00aa00ff });

  snakeEntityType.set(segEid, 'body');

  return segEid;
}

function initializeSnake(): void {
  // Start in the middle
  const startX = Math.floor(GRID_WIDTH / 2);
  const startY = Math.floor(GRID_HEIGHT / 2);

  // Create head
  state.snakeHead = createSnakeHead(startX, startY);

  // Create initial body (3 segments)
  state.snakeBody = [];
  for (let i = 1; i <= 3; i++) {
    const bodySegment = createSnakeSegment(startX - i, startY);
    state.snakeBody.push(bodySegment);
  }
}
```

## Step 5: Food Entity

```typescript
function createFood(): number {
  const foodEid = addEntity(world);

  // Random position
  const foodX = Math.floor(Math.random() * GRID_WIDTH);
  const foodY = Math.floor(Math.random() * GRID_HEIGHT);

  setPosition(world, foodEid, gameX + 1 + foodX, gameY + 2 + foodY);
  setContent(world, foodEid, '●');
  setStyle(world, foodEid, { fg: 0xff0000ff });

  return foodEid;
}

function spawnFood(): void {
  // Remove existing food
  if (state.food) {
    removeEntity(world, state.food);
  }

  // Spawn new food
  state.food = createFood();
}
```

## Step 6: Game Logic

```typescript
// Position history for snake movement
const positionHistory: Array<{ x: number; y: number }> = [];

function updateSnakeMovement(): void {
  if (state.paused || state.gameOver) return;

  // Apply direction change
  state.direction = state.nextDirection;
  const vel = DIRECTION_VELOCITY[state.direction];

  // Get current head position (relative to game grid)
  const headPos = getPosition(world, state.snakeHead);
  const headX = headPos.x - (gameX + 1);
  const headY = headPos.y - (gameY + 2);

  // Save current position for body to follow
  positionHistory.unshift({ x: headX, y: headY });

  // Calculate new head position
  let newX = headX + vel.x;
  let newY = headY + vel.y;

  // Wrap around edges (or game over, depending on rules)
  if (newX < 0) newX = GRID_WIDTH - 1;
  if (newX >= GRID_WIDTH) newX = 0;
  if (newY < 0) newY = GRID_HEIGHT - 1;
  if (newY >= GRID_HEIGHT) newY = 0;

  // Move head
  setPosition(world, state.snakeHead, gameX + 1 + newX, gameY + 2 + newY);

  // Move body segments to follow
  state.snakeBody.forEach((segment, index) => {
    if (positionHistory[index + 1]) {
      const pos = positionHistory[index + 1];
      setPosition(world, segment, gameX + 1 + pos.x, gameY + 2 + pos.y);
    }
  });

  // Keep history length manageable
  while (positionHistory.length > state.snakeBody.length + 1) {
    positionHistory.pop();
  }
}

function growSnake(): void {
  // Get last segment position
  const lastPos = positionHistory[positionHistory.length - 1];

  if (lastPos) {
    const newSegment = createSnakeSegment(lastPos.x, lastPos.y);
    state.snakeBody.push(newSegment);
  }
}

function checkSelfCollision(): boolean {
  const headPos = getPosition(world, state.snakeHead);

  // Check collision with any body segment
  for (const segment of state.snakeBody) {
    const segPos = getPosition(world, segment);

    if (Math.abs(headPos.x - segPos.x) < 0.5 && Math.abs(headPos.y - segPos.y) < 0.5) {
      return true;
    }
  }

  return false;
}

function checkFoodCollision(): boolean {
  const headPos = getPosition(world, state.snakeHead);
  const foodPos = getPosition(world, state.food);

  return Math.abs(headPos.x - foodPos.x) < 0.5 &&
         Math.abs(headPos.y - foodPos.y) < 0.5;
}
```

## Step 7: Collision Handling

Each game tick, check for food collection and self-collision:

```typescript
function handleCollisions(): void {
  // Check if snake head hit food
  if (checkFoodCollision()) {
    state.score += 10;
    updateScore();
    growSnake();
    spawnFood();
  }

  // Check if snake head hit its own body
  if (checkSelfCollision()) {
    gameOver();
  }
}
```

> **Note:** For larger projects, `@blecsd/game` provides an ECS-based collision system with layers, triggers, and event callbacks. This tutorial uses manual collision checks for simplicity.

## Step 8: Game State Management

```typescript
function gameOver(): void {
  state.gameOver = true;
  setVisible(world, gameOverText, true);
  setText(world, gameOverText, `GAME OVER - Score: ${state.score}`);
}

function restartGame(): void {
  // Remove all snake entities
  removeEntity(world, state.snakeHead);
  state.snakeBody.forEach(segment => removeEntity(world, segment));
  state.snakeBody = [];
  positionHistory.length = 0;

  // Reset state
  state.score = 0;
  state.direction = Direction.Right;
  state.nextDirection = Direction.Right;
  state.gameOver = false;
  state.paused = false;

  // Hide game over text
  setVisible(world, gameOverText, false);

  // Reinitialize
  initializeSnake();
  spawnFood();
  updateScore();
}

function togglePause(): void {
  if (state.gameOver) return;
  state.paused = !state.paused;

  if (state.paused) {
    setText(world, gameOverText, 'PAUSED');
    setVisible(world, gameOverText, true);
  } else {
    setVisible(world, gameOverText, false);
  }
}
```

## Step 9: Input Handling

Use `createProgram`'s built-in key event handling instead of manual `process.stdin` parsing:

```typescript
function handleKey(key: KeyEvent): void {
  // Prevent 180-degree turns
  switch (key.name) {
    case 'up':
    case 'w':
      if (state.direction !== Direction.Down) {
        state.nextDirection = Direction.Up;
      }
      break;

    case 'down':
    case 's':
      if (state.direction !== Direction.Up) {
        state.nextDirection = Direction.Down;
      }
      break;

    case 'left':
    case 'a':
      if (state.direction !== Direction.Right) {
        state.nextDirection = Direction.Left;
      }
      break;

    case 'right':
    case 'd':
      if (state.direction !== Direction.Left) {
        state.nextDirection = Direction.Right;
      }
      break;

    case 'p':
      togglePause();
      break;

    case 'r':
      restartGame();
      break;

    case 'q':
      shutdown();
      break;
  }
}

// program.on('key') provides parsed KeyEvent objects automatically
program.on('key', handleKey);
```

## Step 10: Game Loop

```typescript
let lastTick = Date.now();

function gameLoop(): void {
  const now = Date.now();
  const deltaTime = (now - lastTick) / 1000;

  // Update at fixed interval
  if (now - lastTick >= GAME_SPEED) {
    if (!state.paused && !state.gameOver) {
      updateSnakeMovement();
      handleCollisions();
    }

    lastTick = now;
  }

  // Run ECS systems (layout, render, output)
  scheduler.run(world, deltaTime);
}

// Initialize game
initializeSnake();
spawnFood();
updateScore();

// Start game loop at ~60 FPS render
setInterval(gameLoop, 16);
```

## Step 11: Run the Game

```bash
npx tsx snake.ts
```

## Controls

| Key | Action |
|-----|--------|
| `↑` / `W` | Move up |
| `↓` / `S` | Move down |
| `←` / `A` | Move left |
| `→` / `D` | Move right |
| `P` | Pause/Resume |
| `R` | Restart |
| `Q` | Quit |

## Exercises

1. **Add difficulty levels:** Increase speed as score increases
2. **Add walls:** Create obstacle entities that end the game
3. **Add power-ups:** Special food with bonus effects
4. **Add high scores:** Track and display top scores
5. **Add sounds:** Play sounds on eat and game over

## What You Learned

- Game loop with fixed timestep
- Entity creation and removal
- Manual collision detection between entities
- Complex game state management
- Custom ECS components with `withStore`

## Complete Source

See the full example in the [blECSd-Examples repository](https://github.com/Kadajett/blECSd-Examples).

## Next Steps

- [Animation System Reference](../api/systems/animationSystem.md)
- [State Machine Reference](../api/systems/stateMachineSystem.md)
- [Addon Packages Guide](../guides/addon-packages.md) - Explore @blecsd/game, @blecsd/3d, @blecsd/media, and other addon packages
- [@blecsd/game](https://github.com/Kadajett/blECSd-Examples) - Full game framework with ECS-based collision, physics, and input actions
