# File Manager Example

A terminal file manager demonstrating blECSd's architecture for handling large datasets with smooth UX.

## Features

- **Virtualized rendering**: Only visible rows get entities, handles 10,000+ files smoothly
- **Two-pane layout**: File list (60%) + preview panel (40%)
- **Full keyboard navigation**: vim-style keys + standard arrows
- **Mouse support**: Click, double-click, scroll wheel, ctrl/shift-click for selection
- **File preview**: Text preview for code/text files, hex dump for binary
- **Hidden files toggle**: Press `.` or `Ctrl+H`
- **Sorting**: Click column headers or press `s`/`S`
- **Filtering**: Press `/` to filter files

## Quick Start

```bash
# From the blessed root directory
pnpm install
pnpm build

# Run the file manager
cd examples/file-manager
pnpm start

# Or specify a directory
pnpm start /path/to/directory
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Page Down` | Move down one page |
| `Page Up` | Move up one page |
| `g` / `Home` | Go to first |
| `G` / `End` | Go to last |
| `Enter` / `l` | Open file/directory |
| `Backspace` / `h` | Go up one level |
| `Space` | Toggle selection |
| `Ctrl+A` | Select all |
| `/` | Start filter |
| `Escape` | Cancel filter |
| `s` | Cycle sort (name → size → date) |
| `S` | Reverse sort direction |
| `.` / `Ctrl+H` | Toggle hidden files |
| `f` | Cycle size format (B → KB → MB → human) |
| `Tab` | Switch focus between list and preview |
| `[` / `]` | Scroll preview |
| `~` | Go to home directory |
| `Ctrl+R` | Refresh |
| `q` / `Ctrl+C` | Quit |

## Mouse Controls

| Action | Effect |
|--------|--------|
| Click row | Select file |
| Double-click | Open file/directory |
| Scroll wheel | Scroll list |
| Ctrl+Click | Toggle multi-select |
| Shift+Click | Range select |
| Click column header | Sort by column |

## Architecture

This example demonstrates blECSd's recommended patterns:

### Data ≠ Entities

```
FileEntry[] (10,000 items)     ← Plain TypeScript array
        ↓
   FileStore                   ← Manages sorting/filtering
        ↓
VirtualListSystem              ← Maps visible indices to entities
        ↓
~50 Row Entities               ← Only viewport + buffer gets entities
```

### Key Patterns

1. **Library-first design**: The file manager uses blECSd components standalone
2. **Virtualized lists**: Only create entities for visible rows
3. **Data outside ECS**: Complex data (file entries, preview content) stored in plain classes
4. **Input priority**: All keyboard/mouse input is processed immediately

### File Structure

```
examples/file-manager/
├── index.ts                   # Entry point
├── app.ts                     # Main application class
├── config.ts                  # User preferences
├── data/                      # Data layer
│   ├── fileEntry.ts           # FileEntry interface
│   ├── fileStore.ts           # Data management
│   ├── filesystem.ts          # Real fs operations
│   └── preview.ts             # File preview loading
├── components/                # ECS components
│   ├── selection.ts           # Selection state
│   ├── virtualList.ts         # Viewport tracking
│   ├── fileRow.ts             # Row data binding
│   └── preview.ts             # Preview pane state
├── systems/                   # ECS systems
│   ├── virtualListSystem.ts   # Updates visible rows
│   ├── selectionSystem.ts     # Selection changes
│   ├── navigationSystem.ts    # Directory traversal
│   ├── previewSystem.ts       # Preview updates
│   └── renderSystem.ts        # Renders to terminal
├── ui/                        # UI utilities
│   ├── icons.ts               # File icons
│   └── layout.ts              # Entity hierarchy
└── input/                     # Input handling
    ├── keyBindings.ts         # Key → action maps
    ├── mouseBindings.ts       # Mouse → action maps
    └── handlers.ts            # Action implementations
```

## Performance

- Handles directories with 10,000+ files at 60fps
- Virtualized rendering: only ~50 entities regardless of file count
- Debounced preview loading: doesn't load preview until selection settles
- Dirty tracking: only re-renders changed rows

## Extending

To add new features:

1. **New keyboard action**: Add to `keyBindings.ts`, implement in `handlers.ts`
2. **New file operation**: Add to `navigationSystem.ts`
3. **New display mode**: Add to `config.ts`, update `renderSystem.ts`
4. **New component**: Follow patterns in `components/` directory
