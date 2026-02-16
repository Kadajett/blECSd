# @blecsd/game

Game loop and createGame API for blECSd terminal games.

## Installation

```bash
pnpm add @blecsd/game
```

## Overview

@blecsd/game provides a high-level game creation API that wraps blECSd's ECS implementation with an intuitive interface. It includes a configurable game loop with fixed timestep support, input handling with action mappings, and convenient widget creation methods.

## Quick Start

```typescript
import { createGame } from '@blecsd/game';

const game = createGame({
  title: 'My Game',
  width: 80,
  height: 24,
  targetFPS: 60
});

// Create UI elements
const box = game.createBox({
  x: 5,
  y: 2,
  width: 20,
  height: 10,
  border: { type: 1 }
});

const text = game.createText({
  x: 6,
  y: 3,
  text: 'Hello World!'
});

// Handle input
game.onKey('q', () => game.quit());
game.onKey('space', () => {
  console.log('Space pressed!');
});

// Game loop
let playerX = 10;
game.onUpdate((dt) => {
  if (game.isKeyDown('left')) playerX -= 10 * dt;
  if (game.isKeyDown('right')) playerX += 10 * dt;
});

// Start the game
game.start();
```

## API Style

The @blecsd/game package uses a direct API without namespace objects. The `Game` interface returned by `createGame()` provides all methods directly:

```typescript
import { createGame } from '@blecsd/game';

const game = createGame(config);

// All methods are on the game instance
game.createBox({ ... });
game.createText({ ... });
game.onKey('space', handler);
game.onUpdate(updateFn);
game.start();
```

This design keeps the game creation API simple and focused, since the API surface is intentionally small and user-facing. For advanced ECS operations, you can access the underlying world:

```typescript
import { addComponent, Position } from 'blecsd';

// Access the underlying ECS world
const entity = game.createBox({ x: 10, y: 5 });
addComponent(game.world, entity, Position);
Position.x[entity] = 20;
```

## API

### Game Creation

```typescript
createGame(config?: GameConfig): Game
```

Configuration options:

- `title?: string` - Game title (displayed in terminal title bar)
- `width?: number` - Terminal width (default: 80)
- `height?: number` - Terminal height (default: 24)
- `targetFPS?: number` - Target frame rate (default: 60)
- `mouse?: boolean` - Enable mouse input (default: true)
- `alternateScreen?: boolean` - Use alternate screen buffer (default: true)
- `hideCursor?: boolean` - Hide the cursor (default: true)
- `fixedTimestep?: object` - Configure fixed timestep for physics (optional)

### Widget Creation

All widget creation methods accept configuration objects:

- `createBox(config?)` - Create a bordered box
- `createText(config?)` - Create a text label
- `createButton(config?)` - Create a clickable button
- `createInput(config?)` - Create a text input field
- `createTextarea(config?)` - Create a multi-line text input
- `createTextbox(config?)` - Create a scrollable text box
- `createCheckbox(config?)` - Create a checkbox
- `createRadioButton(config?)` - Create a radio button
- `createRadioSet(config?)` - Create a radio button group
- `createSelect(config?)` - Create a dropdown menu
- `createSlider(config?)` - Create a slider control
- `createProgressBar(config?)` - Create a progress bar
- `createList(config?)` - Create a scrollable list
- `createForm(config?)` - Create a form with multiple inputs

### Input Handling

```typescript
// Key handlers
game.onKey('q', (event) => { /* ... */ });
game.onAnyKey((event) => { /* ... */ });

// Mouse handlers
game.onMouse((event) => {
  console.log(`Click at ${event.x}, ${event.y}`);
});

// Input state
game.isKeyDown('space'); // Check if key is held
game.isActionActive('jump'); // Check custom action

// Define action mappings
game.defineActions([
  { action: 'jump', keys: ['space', 'w'] },
  { action: 'shoot', keys: ['f'], mouseButtons: ['left'] }
]);
```

### Game Loop Hooks

```typescript
// Variable timestep update
game.onUpdate((deltaTime) => {
  // Update game state
});

// Fixed timestep update (requires fixedTimestep config)
game.onFixedUpdate((deltaTime, tick) => {
  // Physics simulation
});

// Render callback with interpolation
game.onRender((alpha) => {
  // Smooth rendering between physics steps
});
```

### Lifecycle Methods

- `game.start()` - Start the game loop
- `game.stop()` - Stop the game loop
- `game.pause()` - Pause the game (input still processed)
- `game.resume()` - Resume from pause
- `game.quit()` - Stop and clean up
- `game.getStats()` - Get FPS and performance stats
- `game.isRunning()` - Check if game is running
- `game.isPaused()` - Check if game is paused

### Advanced Usage

Access the underlying ECS world for advanced operations:

```typescript
import { addComponent, Position } from 'blecsd';

const entity = game.createBox({ x: 10, y: 5 });

// Direct ECS manipulation
addComponent(game.world, entity, Position);
Position.x[entity] = 20;
```

## Fixed Timestep Configuration

For deterministic physics simulation:

```typescript
const game = createGame({
  fixedTimestep: {
    tickRate: 60,              // Physics ticks per second
    maxUpdatesPerFrame: 5,      // Prevent spiral of death
    interpolate: true           // Smooth rendering between ticks
  }
});

game.onFixedUpdate((dt, tick) => {
  // Deterministic physics update
  simulatePhysics(dt);
});

game.onRender((alpha) => {
  // Interpolate rendering between physics states
  const x = lerp(prevX, currX, alpha);
  renderAt(x, y);
});
```

## Requirements

- blecsd (peer dependency)
- Node.js 18+

## License

MIT
