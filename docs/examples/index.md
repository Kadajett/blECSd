# Examples

blECSd includes a minimal local example for quickly validating the ECS + render + input pipeline end-to-end.

## Local Quick Demo (in this repo)

Run this from the repository root:

```bash
pnpm install
pnpm exec tsx examples/counter-demo.ts
```

Controls:

- Arrow keys: move panel
- `+` / `-`: increment/decrement counter
- `r`: reset counter
- `q` (or `Ctrl+C`): quit

This demo is intentionally small and shows the full happy-path wiring developers usually need first:

1. Create world + screen entity
2. Initialize render/output buffers
3. Create entities with components
4. Run layout → render → output pipeline
5. Handle keyboard input and update ECS state
6. Cleanup terminal state on exit

## Examples Repository

**[github.com/Kadajett/blECSd-Examples](https://github.com/Kadajett/blECSd-Examples)**

The examples repo contains complete, runnable applications including:

| Example | Description |
|---------|-------------|
| File Manager | Terminal file browser with tabs, preview panel, virtualized rendering |
| Multiplexer | tmux-like terminal multiplexer |
| System Monitor | Dashboard with CPU, memory, and process monitoring |
| ANSI Art Viewer | Browse and display classic ANSI art files |
| Telnet Server | Networked terminal UI served over telnet |

## Running Examples

```bash
# Clone the examples repo
git clone https://github.com/Kadajett/blECSd-Examples.git
cd blECSd-Examples

# Install dependencies
pnpm install

# Run any example
pnpm start:file-manager
pnpm start:dashboard
```

See the [examples README](https://github.com/Kadajett/blECSd-Examples#readme) for full setup instructions and the complete list of available examples.

## Key Concepts Demonstrated

The examples cover patterns useful for building terminal applications:

- **Virtualized Rendering** - Efficiently display thousands of items
- **Split Panes** - Resizable multi-panel layouts
- **Keyboard Navigation** - Vim-style and standard arrow key controls
- **Mouse Support** - Click, scroll, drag interactions
- **Dirty Tracking** - Only re-render changed regions
- **Component Composition** - Build complex UIs from simple ECS components
