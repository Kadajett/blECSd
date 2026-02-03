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
import { createWorld, addEntity, removeEntity, hasComponent } from 'bitecs';
import {
  createScheduler,
  LoopPhase,
  registerLayoutSystem,
  registerRenderSystem,
  registerMovementSystem,
  registerCollisionSystem,
  registerStateMachineSystem,
  createProgram,
  createPanel,
  createText,
  setPosition,
  setVelocity,
  attachCollider,
  attachStateMachine,
  sendEvent,
  getCurrentState,
  getCollisionEventBus,
  Position,
  Velocity,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register systems in order
registerStateMachineSystem(scheduler);
registerMovementSystem(scheduler);
registerCollisionSystem(scheduler);
registerLayoutSystem(scheduler);
registerRenderSystem(scheduler);

const program = createProgram({
  input: process.stdin,
  output: process.stdout,
});

program.alternateBuffer();
program.hideCursor();
```

## Step 2: Game Constants and State

```typescript
const GRID_WIDTH = 40;
const GRID_HEIGHT = 20;
const CELL_SIZE = 1;
const GAME_SPEED = 150; // ms per tick

// Directions
enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

const DIRECTION_VELOCITY: Record<Direction, { x: number; y: number }> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
};

// Game state
interface GameState {
  score: number;
  direction: Direction;
  nextDirection: Direction;
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
const { columns, rows } = process.stdout;

// Calculate centered game area
const gameX = Math.floor((columns - GRID_WIDTH - 2) / 2);
const gameY = Math.floor((rows - GRID_HEIGHT - 4) / 2);

// Game panel
const gamePanel = createPanel(world, {
  title: 'Snake Game',
  x: gameX,
  y: gameY,
  width: GRID_WIDTH + 2,
  height: GRID_HEIGHT + 4,
  border: 'single',
});

// Score display
const scoreText = createText(world, {
  x: 2,
  y: 1,
  content: 'Score: 0',
});
setParent(world, scoreText, gamePanel);

// Game over text (hidden initially)
const gameOverText = createText(world, {
  x: GRID_WIDTH / 2 - 5,
  y: GRID_HEIGHT / 2,
  content: 'GAME OVER',
  fg: 0xff0000ff,
  visible: false,
});
setParent(world, gameOverText, gamePanel);

// Help text
const helpText = createText(world, {
  x: 2,
  y: GRID_HEIGHT + 2,
  content: '[Arrow Keys] Move  [P] Pause  [R] Restart  [Q] Quit',
});
setParent(world, helpText, gamePanel);

function updateScore(): void {
  setContent(world, scoreText, `Score: ${state.score}`);
}
```

## Step 4: Snake Entity

```typescript
// Snake head component marker
const SnakeHead = defineComponent();

// Snake body segment marker
const SnakeBody = defineComponent({
  index: Types.ui16, // Position in snake
});

function createSnakeHead(x: number, y: number): number {
  const eid = addEntity(world);

  // Position in game grid (offset by panel position)
  setPosition(world, eid, gameX + 1 + x, gameY + 2 + y);

  // Collider for collision detection
  attachCollider(world, eid, {
    width: CELL_SIZE,
    height: CELL_SIZE,
    layer: 1, // Snake layer
    mask: 2 | 4, // Collide with food (2) and walls (4)
  });

  // Visual character
  setContent(world, eid, '█');
  setRenderable(world, eid, { fg: 0x00ff00ff });

  addComponent(world, SnakeHead, eid);

  return eid;
}

function createSnakeSegment(x: number, y: number, index: number): number {
  const eid = addEntity(world);

  setPosition(world, eid, gameX + 1 + x, gameY + 2 + y);
  setContent(world, eid, '█');
  setRenderable(world, eid, { fg: 0x00aa00ff });

  addComponent(world, SnakeBody, eid);
  SnakeBody.index[eid] = index;

  // Body segments can collide with head (game over condition)
  attachCollider(world, eid, {
    width: CELL_SIZE,
    height: CELL_SIZE,
    layer: 4, // Same as wall for collision
    mask: 1, // Can be hit by snake head
  });

  return eid;
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
    const segment = createSnakeSegment(startX - i, startY, i - 1);
    state.snakeBody.push(segment);
  }
}
```

## Step 5: Food Entity

```typescript
function createFood(): number {
  const eid = addEntity(world);

  // Random position
  const x = Math.floor(Math.random() * GRID_WIDTH);
  const y = Math.floor(Math.random() * GRID_HEIGHT);

  setPosition(world, eid, gameX + 1 + x, gameY + 2 + y);
  setContent(world, eid, '●');
  setRenderable(world, eid, { fg: 0xff0000ff });

  attachCollider(world, eid, {
    width: CELL_SIZE,
    height: CELL_SIZE,
    layer: 2, // Food layer
    mask: 1, // Can be hit by snake
    isTrigger: true, // Non-blocking
  });

  return eid;
}

function spawnFood(): void {
  // Remove existing food
  if (state.food && hasComponent(world, Position, state.food)) {
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

  // Get current head position
  const headX = Position.x[state.snakeHead] - (gameX + 1);
  const headY = Position.y[state.snakeHead] - (gameY + 2);

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
  const lastSegment = state.snakeBody[state.snakeBody.length - 1];
  const lastPos = positionHistory[positionHistory.length - 1];

  if (lastPos) {
    const newSegment = createSnakeSegment(
      lastPos.x,
      lastPos.y,
      state.snakeBody.length
    );
    state.snakeBody.push(newSegment);
  }
}

function checkSelfCollision(): boolean {
  const headX = Position.x[state.snakeHead];
  const headY = Position.y[state.snakeHead];

  // Check collision with any body segment
  for (const segment of state.snakeBody) {
    const segX = Position.x[segment];
    const segY = Position.y[segment];

    if (Math.abs(headX - segX) < 0.5 && Math.abs(headY - segY) < 0.5) {
      return true;
    }
  }

  return false;
}
```

## Step 7: Collision Handling

```typescript
// Listen for collision events
const collisionBus = getCollisionEventBus();

collisionBus.on('triggerEnter', ({ entityA, entityB }) => {
  // Check if snake head hit food
  const isHeadA = hasComponent(world, SnakeHead, entityA);
  const isHeadB = hasComponent(world, SnakeHead, entityB);
  const foodEntity = state.food;

  if ((isHeadA && entityB === foodEntity) || (isHeadB && entityA === foodEntity)) {
    // Eat food
    state.score += 10;
    updateScore();
    growSnake();
    spawnFood();
  }
});

collisionBus.on('collisionStart', ({ entityA, entityB }) => {
  // Check if snake head hit body (game over)
  const isHeadA = hasComponent(world, SnakeHead, entityA);
  const isHeadB = hasComponent(world, SnakeHead, entityB);
  const isBodyA = hasComponent(world, SnakeBody, entityA);
  const isBodyB = hasComponent(world, SnakeBody, entityB);

  if ((isHeadA && isBodyB) || (isHeadB && isBodyA)) {
    gameOver();
  }
});
```

## Step 8: Game State Management

```typescript
function gameOver(): void {
  state.gameOver = true;
  setVisible(world, gameOverText, true);
  setContent(world, gameOverText, `GAME OVER - Score: ${state.score}`);
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
    setContent(world, gameOverText, 'PAUSED');
    setVisible(world, gameOverText, true);
  } else {
    setVisible(world, gameOverText, false);
  }
}
```

## Step 9: Input Handling

```typescript
import { parseKeyBuffer, type KeyEvent } from 'blecsd';

function handleKey(key: KeyEvent): void {
  // Prevent 180-degree turns
  const opposites: Record<Direction, Direction> = {
    [Direction.Up]: Direction.Down,
    [Direction.Down]: Direction.Up,
    [Direction.Left]: Direction.Right,
    [Direction.Right]: Direction.Left,
  };

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
      cleanup();
      process.exit(0);
      break;
  }
}

process.stdin.setRawMode(true);
process.stdin.on('data', (data) => {
  const key = parseKeyBuffer(data);
  handleKey(key);
});
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

      // Check self-collision after movement
      if (checkSelfCollision()) {
        gameOver();
      }
    }

    lastTick = now;
  }

  // Run ECS systems
  scheduler.run(world, deltaTime);
}

function cleanup(): void {
  program.showCursor();
  program.normalBuffer();
  process.stdin.setRawMode(false);
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Initialize game
initializeSnake();
spawnFood();
updateScore();

// Start game loop
setInterval(gameLoop, 16); // ~60 FPS render
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
- Collision detection and events
- State machine integration
- Complex game state management

## Complete Source

See the full example at: `examples/snake/index.ts`

## Next Steps

- [Animation System Reference](../api/systems/animationSystem.md)
- [Collision System Reference](../api/systems/collisionSystem.md)
- [State Machine Reference](../api/systems/stateMachineSystem.md)
