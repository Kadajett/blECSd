# File Manager Example

A full-featured terminal file manager demonstrating blECSd's architecture for handling large datasets with smooth UX.

**Source:** [blECSd-Examples repository](https://github.com/Kadajett/blECSd-Examples)

## Features

- **Tabbed explorer**: Multiple directories open at once with fast tab switching
- **Virtualized rendering**: Only visible rows get entities, handles 10,000+ files smoothly
- **Preview panel**: File list (60%) + preview panel (40%)
- **Full keyboard navigation**: vim-style keys + standard arrows
- **Mouse support**: Click, double-click, scroll wheel, ctrl/shift-click for selection
- **File preview**: Text preview for code/text files, hex dump for binary
- **Hidden files toggle**: Press `.` or `Ctrl+H`
- **Sorting**: Click column headers or press `s`/`S`
- **Filtering**: Press `/` to filter files

## Quick Start

```bash
# Clone the examples repo
git clone https://github.com/Kadajett/blECSd-Examples.git
cd blECSd-Examples

# Install and run
pnpm install
pnpm start:file-manager

# Or specify a directory
pnpm start:file-manager /path/to/directory
```

## Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| Virtualized Lists | Only visible rows are rendered as entities |
| Input Priority | All keyboard/mouse input processed immediately |
| Dirty Tracking | Only re-renders changed rows |
| Component Composition | Selection, viewport, and file data as separate components |

See the [examples repository](https://github.com/Kadajett/blECSd-Examples) for the full source code and additional examples.
