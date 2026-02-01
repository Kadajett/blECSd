# blECSd Terminal Game Library

A modern terminal game library built on TypeScript and ECS architecture.

## Why blECSd?

blECSd makes building terminal games fast and intuitive:

- **Responsive Input** - Input is always processed first, every frame
- **ECS Architecture** - Clean separation of data (components) and logic (systems)
- **Three-Tier API** - Simple for beginners, powerful for experts
- **TypeScript First** - Full type safety with strict mode

## Quick Start

```bash
npm install blecsd
```

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

## Learning Path

1. **[Installation](./getting-started/installation.md)** - Get up and running (5 min)
2. **[Hello World](./getting-started/hello-world.md)** - Your first program (5 min)
3. **[Core Concepts](./getting-started/concepts.md)** - Understand the architecture (15 min)
4. **[First Game](./getting-started/first-game.md)** - Build Snake step by step (30 min)

## Documentation

### Getting Started
- [Installation](./getting-started/installation.md)
- [Hello World](./getting-started/hello-world.md)
- [Core Concepts](./getting-started/concepts.md)
- [First Game (Snake)](./getting-started/first-game.md)

### Tutorials
- [Snake Game](./tutorials/snake.md)
- [Roguelike Basics](./tutorials/roguelike.md)
- [Breakout Clone](./tutorials/breakout.md)
- [Menu Systems](./tutorials/menu-system.md)

### Guides
- [Input Handling](./guides/input-handling.md)
- [Rendering](./guides/rendering.md)
- [ECS Basics](./guides/ecs-basics.md)
- [ECS Advanced](./guides/ecs-advanced.md)
- [Widgets](./guides/widgets.md)
- [Styling](./guides/styling.md)
- [Performance](./guides/performance.md)
- [Migration from Blessed](./guides/migration-blessed.md)

### API Reference
- [API Overview](./api/index.md)
- [Game Class](./api/game.md)
- [Widgets](./api/widgets/)
- [Components](./api/components/)
- [Systems](./api/systems/)
- [Input](./api/input.md)
- [Schemas](./api/schemas.md)

### Terminal I/O (Internal)

#### Core
- [Program Class](./api/program.md) - Main terminal control interface
- [ANSI Escape Codes](./api/ansi.md) - Cursor, style, screen, mouse sequences
- [Terminal Detection](./api/detection.md) - Detect terminal capabilities
- [Terminal Cleanup](./api/cleanup.md) - Global cleanup coordination

#### Rendering
- [Output Buffer](./api/output-buffer.md) - Efficient buffered output
- [Screen Buffer](./api/screen-buffer.md) - Alternate screen buffer management
- [Synchronized Output](./api/sync-output.md) - Flicker-free rendering

#### Features
- [Character Set Handling](./api/charset.md)
- [Window Manipulation](./api/window-ops.md)
- [Hyperlinks](./api/hyperlink.md)
- [Suspend/Resume](./api/suspend.md)
- [Process Utilities](./api/process.md)
- [Debug Logging](./api/debug.md)

#### Advanced (VT400+)
- [Media Copy (Print)](./api/media-copy.md)
- [Rectangular Area Operations](./api/rectangle.md)
- [DEC Locator](./api/locator.md)

#### Utilities
- [Security (Escape Sanitization)](./api/security.md)
- [Tmux Pass-Through](./api/tmux.md)
- [Response Parser](./api/response-parser.md)

## API Tiers

| Tier | Audience | What You Get |
|------|----------|--------------|
| **Simple** | Beginners | `createGame()`, widget methods, `onKey()` |
| **Standard** | Intermediate | Widget factories, input maps, events, styling |
| **Advanced** | Power users | Raw ECS access, custom components/systems |

## Examples

Browse the [examples directory](https://github.com/your-repo/blessed/tree/main/example) for complete, runnable games:

- `hello.ts` - Minimal hello world
- `snake.ts` - Classic snake game (~200 LOC)
- `roguelike.ts` - Basic dungeon crawler (~300 LOC)
- `breakout.ts` - Breakout clone (~400 LOC)

## Contributing

See [Architecture](./contributing/architecture.md) to understand the codebase structure.

## License

MIT
