# Examples

All blECSd examples are maintained in a separate repository for easier setup and independent versioning.

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
