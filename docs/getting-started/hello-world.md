# Hello World

Build your first blECSd program in 10 lines of code.

## Prerequisites

- [Installation](./installation.md) complete

## The Code

Create a file called `hello.ts`:

```typescript
import { createGame } from 'blecsd';

const game = createGame({ title: 'Hello World' });

game.createBox({
  x: 'center',
  y: 'center',
  width: 30,
  height: 5,
  content: 'Hello, Terminal!',
  border: 'line',
});

game.onKey('q', () => game.quit());
game.start();
```

Run it:

```bash
npx tsx hello.ts
```

You should see a centered box with "Hello, Terminal!" inside. Press `q` to quit.

## What's Happening

Let's break down each part:

### 1. Create the Game

```typescript
const game = createGame({ title: 'Hello World' });
```

`createGame()` initializes the terminal and creates a game instance. The `title` appears in your terminal's title bar.

### 2. Create a Widget

```typescript
game.createBox({
  x: 'center',
  y: 'center',
  width: 30,
  height: 5,
  content: 'Hello, Terminal!',
  border: 'line',
});
```

`createBox()` creates a rectangular widget. Position can be:
- Numbers (`x: 10`)
- Percentages (`x: '50%'`)
- Keywords (`x: 'center'`, `x: 'left'`, `x: 'right'`)

### 3. Handle Input

```typescript
game.onKey('q', () => game.quit());
```

`onKey()` registers a key handler. When the user presses `q`, the game quits.

### 4. Start the Game Loop

```typescript
game.start();
```

`start()` begins the game loop. Input is processed, the screen is rendered, and your game runs at 60fps.

## Adding Interactivity

Let's make the box moveable:

```typescript
import { createGame } from 'blecsd';

const game = createGame({ title: 'Move the Box' });

const box = game.createBox({
  x: 'center',
  y: 'center',
  width: 10,
  height: 5,
  content: 'Move me!',
  border: 'line',
});

game.onKey(['up', 'w'], () => box.move(0, -1));
game.onKey(['down', 's'], () => box.move(0, 1));
game.onKey(['left', 'a'], () => box.move(-1, 0));
game.onKey(['right', 'd'], () => box.move(1, 0));
game.onKey('q', () => game.quit());

game.start();
```

Now you can move the box with arrow keys or WASD. Press `q` to quit.

## Adding Color

blECSd supports full truecolor styling:

```typescript
import { createGame, style } from 'blecsd';

const game = createGame({ title: 'Colorful Box' });

game.createBox({
  x: 'center',
  y: 'center',
  width: 30,
  height: 5,
  content: 'Colorful!',
  border: 'line',
  style: style({
    fg: '#ffffff',
    bg: '#3498db',
    border: {
      fg: '#e74c3c',
    },
  }),
});

game.onKey('q', () => game.quit());
game.start();
```

## Common Mistakes

### Forgetting to call `start()`

Nothing will appear if you don't call `game.start()`. The game loop must be running for rendering to happen.

### Using `console.log()`

`console.log()` writes to stdout and corrupts the terminal display. Use `game.createLog()` or `game.createText()` for debug output.

### Blocking the event loop

blECSd runs at 60fps. Long-running synchronous operations block input and rendering. Use async functions or break work into smaller chunks.

## Next Steps

- [Core Concepts](./concepts.md) - Understand ECS and the game loop
- [First Game](./first-game.md) - Build Snake step by step
- [Input Handling Guide](../guides/input-handling.md) - Deep dive on input
