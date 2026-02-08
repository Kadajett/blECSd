# Getting Started with the Game API

This guide shows you how to build your first application using blECSd's **Game API** - a simplified, beginner-friendly interface for terminal games and real-time applications.

## What is the Game API?

The Game API wraps blECSd's ECS implementation with a simple, intuitive interface:

- ✅ **No ECS knowledge required** - just create elements and handle input
- ✅ **Built-in game loop** - automatic update and render cycles
- ✅ **Simple input handling** - straightforward key and mouse events
- ✅ **Quick setup** - less boilerplate, faster prototyping

**Best for**: Games, real-time dashboards, prototypes, beginners

## Your First Application

### 1. Create a Game Instance

```typescript
import { createGame } from 'blecsd';

const game = createGame({
  title: 'My First Game',
  width: 80,
  height: 24,
  targetFPS: 60,
});
```

### 2. Create UI Elements

```typescript
// Create a box
const box = game.createBox({
  x: 10,
  y: 5,
  width: 30,
  height: 10,
  border: { type: 1 }, // BorderType.Line
});

// Create text
const title = game.createText({
  x: 15,
  y: 7,
  text: 'Hello, Game API!',
});

// Create a button
const button = game.createButton({
  x: 15,
  y: 10,
  width: 20,
  height: 3,
  label: 'Click me',
});
```

### 3. Handle Input

```typescript
// Keyboard input
game.onKey('q', () => {
  game.quit();
});

game.onKey('up', () => {
  // Move something up
  box.y -= 1;
});

// Mouse input
game.onMouse('click', (event) => {
  console.log(`Clicked at ${event.x}, ${event.y}`);
});
```

### 4. Update Game State

```typescript
let score = 0;

game.onUpdate((dt) => {
  // dt is delta time in seconds
  score += dt * 10;

  // Update text
  game.setText(title, `Score: ${Math.floor(score)}`);
});
```

### 5. Start the Game

```typescript
game.start();
```

## Complete Example: Moving Box

```typescript
import { createGame } from 'blecsd';

const game = createGame({
  title: 'Moving Box Demo',
  width: 80,
  height: 24,
  targetFPS: 60,
});

// Create a player box
const player = game.createBox({
  x: 40,
  y: 12,
  width: 2,
  height: 2,
  fg: 0x00ff00ff, // Green
});

// Movement controls
const speed = 5;

game.onKey('up', () => {
  player.y = Math.max(0, player.y - speed);
});

game.onKey('down', () => {
  player.y = Math.min(game.height - 2, player.y + speed);
});

game.onKey('left', () => {
  player.x = Math.max(0, player.x - speed);
});

game.onKey('right', () => {
  player.x = Math.min(game.width - 2, player.x + speed);
});

// Quit on 'q' or Ctrl+C
game.onKey('q', () => game.quit());
game.onKey('c', { ctrl: true }, () => game.quit());

// Position display
const positionText = game.createText({
  x: 2,
  y: 1,
  text: 'Position: (0, 0)',
});

game.onUpdate(() => {
  game.setText(positionText, `Position: (${player.x}, ${player.y})`);
});

game.start();
```

## Game API Methods

### Creating Elements

```typescript
// Box (container with optional border)
const box = game.createBox({ x, y, width, height, border: { type: 1 } });

// Text (static or dynamic text)
const text = game.createText({ x, y, text: 'Hello' });

// Button (interactive element)
const button = game.createButton({ x, y, width, height, label: 'Click' });

// Input (text input field)
const input = game.createInput({ x, y, width, height, placeholder: 'Enter...' });

// List (scrollable list of items)
const list = game.createList({ x, y, width, height, items: ['A', 'B', 'C'] });
```

### Input Handling

```typescript
// Single key
game.onKey('space', () => { /* jump */ });

// Key with modifiers
game.onKey('s', { ctrl: true }, () => { /* save */ });

// Multiple keys at once
game.onKeys(['w', 'a', 's', 'd'], (key) => {
  // Handle WASD movement
});

// Mouse events
game.onMouse('click', (event) => {
  console.log(`Click at ${event.x}, ${event.y}`);
});

game.onMouse('move', (event) => {
  // Track mouse position
});
```

### Game Loop Hooks

```typescript
// Every frame (for game logic)
game.onUpdate((dt) => {
  // dt = time since last frame (in seconds)
  player.x += velocity * dt;
});

// Before rendering
game.onBeforeRender(() => {
  // Prepare visuals
});

// After rendering
game.onAfterRender(() => {
  // Debug overlays
});
```

### Game Control

```typescript
// Start the game loop
game.start();

// Pause the game
game.pause();

// Resume the game
game.resume();

// Quit (cleanup and exit)
game.quit();

// Check state
if (game.isPaused()) {
  // Game is paused
}
```

## Example: Simple Snake Game

```typescript
import { createGame } from 'blecsd';

const game = createGame({ title: 'Snake', width: 40, height: 20, targetFPS: 10 });

// Snake state
const snake = {
  x: 20,
  y: 10,
  dx: 1,
  dy: 0,
  body: [{ x: 20, y: 10 }],
};

// Food
const food = game.createBox({
  x: Math.floor(Math.random() * game.width),
  y: Math.floor(Math.random() * game.height),
  width: 1,
  height: 1,
  fg: 0xff0000ff, // Red
});

// Controls
game.onKey('up', () => {
  if (snake.dy !== 1) { snake.dx = 0; snake.dy = -1; }
});

game.onKey('down', () => {
  if (snake.dy !== -1) { snake.dx = 0; snake.dy = 1; }
});

game.onKey('left', () => {
  if (snake.dx !== 1) { snake.dx = -1; snake.dy = 0; }
});

game.onKey('right', () => {
  if (snake.dx !== -1) { snake.dx = 1; snake.dy = 0; }
});

game.onKey('q', () => game.quit());

// Game logic
game.onUpdate(() => {
  // Move snake
  snake.x += snake.dx;
  snake.y += snake.dy;

  // Wrap around
  if (snake.x < 0) snake.x = game.width - 1;
  if (snake.x >= game.width) snake.x = 0;
  if (snake.y < 0) snake.y = game.height - 1;
  if (snake.y >= game.height) snake.y = 0;

  // Check food collision
  if (snake.x === food.x && snake.y === food.y) {
    snake.body.push({ x: snake.x, y: snake.y });
    food.x = Math.floor(Math.random() * game.width);
    food.y = Math.floor(Math.random() * game.height);
  }

  // Update body
  snake.body.unshift({ x: snake.x, y: snake.y });
  if (snake.body.length > 5) {
    snake.body.pop();
  }

  // Render snake (clear and redraw each frame)
  // Implementation depends on rendering approach
});

game.start();
```

## Accessing the Underlying ECS

If you need more control, you can access the ECS world:

```typescript
import { createGame } from 'blecsd';
import { addComponent, Velocity } from 'blecsd';

const game = createGame({ width: 80, height: 24 });

const box = game.createBox({ x: 10, y: 5, width: 10, height: 5 });

// Access the underlying world
const world = game.world;

// Add physics component directly
addComponent(world, box, Velocity);
Velocity.x[box] = 5;
Velocity.y[box] = 0;

// Now the box will move via physics system
```

## Next Steps

- **Tutorial**: [Build a Simple Game](../tutorials/simple-game.md)
- **Reference**: [Game API Documentation](../api/game.md)
- **Guides**: [Input Priority](../guides/input-priority.md)
- **Switch**: [Low-Level ECS API](./ecs-api.md) for more control

## Common Patterns

### Collision Detection

```typescript
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

game.onUpdate(() => {
  if (checkCollision(player, enemy)) {
    // Handle collision
  }
});
```

### Score Display

```typescript
let score = 0;
const scoreText = game.createText({ x: 2, y: 1, text: 'Score: 0' });

function addScore(points) {
  score += points;
  game.setText(scoreText, `Score: ${score}`);
}
```

### Pause Menu

```typescript
let paused = false;

game.onKey('escape', () => {
  if (paused) {
    game.resume();
    paused = false;
  } else {
    game.pause();
    paused = true;
  }
});
```

## Summary

The Game API provides:

- ✅ Simple `game.createBox()` style element creation
- ✅ Easy `game.onKey()` input handling
- ✅ Built-in `game.onUpdate()` game loop
- ✅ Automatic rendering and cleanup
- ❌ Limited flexibility compared to ECS API

**Perfect for**: Games, real-time apps, prototypes, beginners

**Not ideal for**: Complex TUI frameworks, tools, maximum control

For more control, see the [ECS API Getting Started](./ecs-api.md).
