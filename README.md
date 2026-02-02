# blECSd

A terminal game library built on TypeScript and bitECS.

blECSd provides ECS components, input parsing, and terminal I/O for building terminal-based games. It is a library, not a framework: you control the game loop, the world, and how components are used.

## Install

```bash
npm install blecsd
```

## Quick Example

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setPosition, setStyle, createEventBus } from 'blecsd';

// Your world, your control
const world = createWorld();
const player = addEntity(world);

// Add components
setPosition(world, player, 10, 5);
setStyle(world, player, { fg: '#00ff00', bold: true });

// Type-safe events
interface GameEvents {
  'player:move': { x: number; y: number };
}
const events = createEventBus<GameEvents>();
events.on('player:move', (e) => console.log(`Moved to ${e.x}, ${e.y}`));
```

## Components

blECSd provides ECS components that work with any bitECS world:

| Component | Purpose |
|-----------|---------|
| Position | X/Y coordinates and z-index |
| Renderable | Colors, visibility, text styles |
| Dimensions | Width, height, min/max constraints |
| Hierarchy | Parent-child relationships |
| Focusable | Keyboard focus and tab order |
| Interactive | Click, hover, drag states |
| Scrollable | Scroll position and content size |
| Border | Box borders with multiple styles |
| Content | Text content with alignment |
| Padding | Inner spacing |
| Label | Text labels for elements |

Each component has getter/setter functions. See [API Reference](./docs/api/index.md) for details.

## Library Design

blECSd is a library, not a framework:

1. **Components work standalone**: Import them into any bitECS world
2. **No required game loop**: All systems are callable functions
3. **Mix and match**: Use our input parsing with your rendering, or vice versa
4. **You own the world**: Functions take `world` as a parameter; we never hold global state

## Limitations

- **Terminal only**: No browser support. Use a canvas/WebGL library for browser games.
- **No built-in widgets**: blECSd provides primitives, not ready-made UI components. You build menus, dialogs, and forms from components and systems.
- **ECS architecture required**: blECSd is built around bitECS. OOP patterns will fight the library.
- **Terminal-dependent features**: Color support, text decorations, and input capabilities vary by terminal emulator.

For TUI applications (forms, menus, dialogs), consider [Ink](https://github.com/vadimdemedes/ink), [blessed](https://github.com/chjj/blessed), or [Textual](https://textual.textualize.io/) instead.

## Documentation

- [Installation](./docs/getting-started/installation.md): Requirements, terminal compatibility, setup
- [Core Concepts](./docs/getting-started/concepts.md): ECS, scheduler, events
- [API Reference](./docs/api/index.md): Components, queries, terminal I/O

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## License

MIT
