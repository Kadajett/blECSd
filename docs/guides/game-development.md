# Game Development Guide

blECSd's ECS architecture and animation system make it well-suited for terminal games. This guide covers game-specific patterns and features.

## Why ECS for Games?

The Entity Component System pattern originated in game development. Benefits for terminal games:

- **Performance**: Process thousands of entities efficiently
- **Composition**: Mix and match behaviors without inheritance
- **Separation**: Data (components) is separate from logic (systems)
- **Queries**: Efficiently find entities matching specific criteria

## Game Loop Setup

For games, you'll typically want a continuous update loop:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScheduler, LoopPhase } from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Input always runs first (built-in)
scheduler.add(LoopPhase.UPDATE, updateGameLogic);
scheduler.add(LoopPhase.ANIMATION, updatePhysics);
scheduler.add(LoopPhase.RENDER, renderFrame);

// Start with fixed timestep (16ms = ~60fps)
scheduler.start(world, { fixedTimestep: 16 });
```

## Movement and Velocity

The Velocity component enables smooth movement:

<!-- blecsd-doccheck:ignore -->
```typescript
import { setPosition, setVelocity, getVelocity } from 'blecsd';

// Create a moving entity
const player = addEntity(world);
setPosition(world, player, 10, 5);
setVelocity(world, player, 1, 0);  // Moving right

// Movement system
function movementSystem(world: World, delta: number): World {
  const entities = movingQuery(world);
  for (const eid of entities) {
    const vx = Velocity.x[eid];
    const vy = Velocity.y[eid];
    Position.x[eid] += vx * delta;
    Position.y[eid] += vy * delta;
  }
  return world;
}
```

## Collision Detection

Basic AABB collision for terminal games:

```typescript
import { getPosition, getDimensions } from 'blecsd';

function checkCollision(world: World, a: number, b: number): boolean {
  const posA = getPosition(world, a);
  const posB = getPosition(world, b);
  const dimA = getDimensions(world, a);
  const dimB = getDimensions(world, b);

  if (!posA || !posB || !dimA || !dimB) return false;

  return (
    posA.x < posB.x + dimB.width &&
    posA.x + dimA.width > posB.x &&
    posA.y < posB.y + dimB.height &&
    posA.y + dimA.height > posB.y
  );
}
```

## Game State Machine

Use state machines for game states:

<!-- blecsd-doccheck:ignore -->
```typescript
import { attachStateMachine, sendEvent, getState } from 'blecsd';

const gameStateMachine = {
  initial: 'menu',
  states: {
    menu: { on: { START: 'playing', QUIT: 'exiting' } },
    playing: { on: { PAUSE: 'paused', GAME_OVER: 'gameOver' } },
    paused: { on: { RESUME: 'playing', QUIT: 'menu' } },
    gameOver: { on: { RESTART: 'playing', QUIT: 'menu' } },
    exiting: {},
  },
};

// Attach to a game controller entity
const gameController = addEntity(world);
attachStateMachine(world, gameController, gameStateMachine);

// Transition states
sendEvent(world, gameController, 'START');
```

## Enemy AI with State Machines

Individual entities can have their own state machines:

```typescript
const enemyBehavior = {
  initial: 'idle',
  states: {
    idle: { on: { PLAYER_NEAR: 'chase' } },
    chase: { on: { PLAYER_FAR: 'search', PLAYER_CAUGHT: 'attack' } },
    search: { on: { PLAYER_FOUND: 'chase', TIMEOUT: 'idle' } },
    attack: { on: { ATTACK_DONE: 'idle' } },
  },
};

const enemy = addEntity(world);
attachStateMachine(world, enemy, enemyBehavior);
```

## Sprite Animation

Frame-based animation for characters:

```typescript
interface AnimationData {
  frames: string[];
  frameTime: number;
  currentFrame: number;
  elapsed: number;
}

const animations = new Map<number, AnimationData>();

// Define animation
animations.set(player, {
  frames: ['@', 'O', '@', 'o'],  // Walking animation
  frameTime: 200,  // ms per frame
  currentFrame: 0,
  elapsed: 0,
});

// Animation system
function animationSystem(world: World, delta: number): World {
  for (const [eid, anim] of animations) {
    anim.elapsed += delta;
    if (anim.elapsed >= anim.frameTime) {
      anim.elapsed = 0;
      anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
      setContent(world, eid, anim.frames[anim.currentFrame]);
    }
  }
  return world;
}
```

## Camera and Viewport

For games larger than the terminal:

```typescript
interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
  target: number | null;  // Entity to follow
}

const camera: Camera = {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  target: player,
};

function cameraSystem(world: World): World {
  if (camera.target === null) return world;

  const pos = getPosition(world, camera.target);
  if (!pos) return world;

  // Center camera on target
  camera.x = pos.x - Math.floor(camera.width / 2);
  camera.y = pos.y - Math.floor(camera.height / 2);

  return world;
}

// When rendering, offset positions by camera
function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  return {
    x: worldX - camera.x,
    y: worldY - camera.y,
  };
}
```

## Game Events

Common game event patterns:

```typescript
interface GameEvents {
  'player:spawn': { x: number; y: number };
  'player:death': { cause: string };
  'enemy:spawn': { type: string; x: number; y: number };
  'enemy:death': { id: number; score: number };
  'item:pickup': { itemType: string; value: number };
  'level:complete': { level: number; time: number };
  'score:update': { score: number; combo: number };
}

const events = createEventBus<GameEvents>();

// Score system subscribes to kills
events.on('enemy:death', (e) => {
  currentScore += e.score;
  events.emit('score:update', { score: currentScore, combo: currentCombo });
});
```

## Roguelike Patterns

### Turn-Based Movement

```typescript
let playerTurn = true;

function handleInput(key: KeyEvent): void {
  if (!playerTurn) return;

  let moved = false;
  if (key.name === 'up') { moveBy(world, player, 0, -1); moved = true; }
  if (key.name === 'down') { moveBy(world, player, 0, 1); moved = true; }
  // ...

  if (moved) {
    playerTurn = false;
    processEnemyTurns();
    playerTurn = true;
  }
}
```

### FOV (Field of View)

```typescript
function calculateFOV(world: World, viewer: number, radius: number): Set<string> {
  const visible = new Set<string>();
  const pos = getPosition(world, viewer);
  if (!pos) return visible;

  // Simple raycasting
  for (let angle = 0; angle < 360; angle += 1) {
    const rad = angle * Math.PI / 180;
    for (let r = 0; r <= radius; r++) {
      const x = Math.round(pos.x + r * Math.cos(rad));
      const y = Math.round(pos.y + r * Math.sin(rad));
      visible.add(`${x},${y}`);
      if (isBlocking(x, y)) break;
    }
  }

  return visible;
}
```

## Performance Tips

### Object Pooling

Reuse entities instead of creating/destroying:

```typescript
const bulletPool: number[] = [];

function spawnBullet(x: number, y: number, vx: number, vy: number): number {
  let bullet = bulletPool.pop();
  if (bullet === undefined) {
    bullet = addEntity(world);
    // Add components once
  }
  setPosition(world, bullet, x, y);
  setVelocity(world, bullet, vx, vy);
  show(world, bullet);
  return bullet;
}

function despawnBullet(bullet: number): void {
  hide(world, bullet);
  bulletPool.push(bullet);
}
```

### Spatial Partitioning

For many entities, use spatial hashing:

```typescript
const CELL_SIZE = 10;
const spatialHash = new Map<string, Set<number>>();

function getCellKey(x: number, y: number): string {
  return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
}

function getNearbyEntities(x: number, y: number): number[] {
  const nearby: number[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = getCellKey(x + dx * CELL_SIZE, y + dy * CELL_SIZE);
      const cell = spatialHash.get(key);
      if (cell) nearby.push(...cell);
    }
  }
  return nearby;
}
```

## Example: Simple Snake Game

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, setContent, setStyle, getPosition } from 'blecsd';

const world = createWorld();

// Snake segments
const snake: number[] = [];
let direction = { x: 1, y: 0 };
let foodPos = { x: 15, y: 10 };

// Initialize snake
for (let i = 0; i < 3; i++) {
  const segment = addEntity(world);
  setPosition(world, segment, 10 - i, 10);
  setContent(world, segment, i === 0 ? '@' : 'o');
  setStyle(world, segment, { fg: '#00ff00' });
  snake.push(segment);
}

// Food
const food = addEntity(world);
setPosition(world, food, foodPos.x, foodPos.y);
setContent(world, food, '*');
setStyle(world, food, { fg: '#ff0000' });

function updateSnake(): void {
  const head = snake[0];
  const headPos = getPosition(world, head)!;

  // Move body
  for (let i = snake.length - 1; i > 0; i--) {
    const prev = getPosition(world, snake[i - 1])!;
    setPosition(world, snake[i], prev.x, prev.y);
  }

  // Move head
  setPosition(world, head, headPos.x + direction.x, headPos.y + direction.y);

  // Check food collision
  const newHead = getPosition(world, head)!;
  if (newHead.x === foodPos.x && newHead.y === foodPos.y) {
    growSnake();
    spawnFood();
  }
}
```

## See Also

- [Core Concepts](../getting-started/concepts.md) - ECS fundamentals
- [Animation System](../api/animation.md) - Physics-based movement
- [State Machines](../api/state-machine.md) - FSM documentation
- [Events](../api/events.md) - Event bus for game systems
