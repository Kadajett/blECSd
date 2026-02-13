# File Manager Example

A full-featured terminal file manager demonstrating blECSd's architecture for handling large datasets with smooth UX.

**Source:** [`examples/file-manager/`](https://github.com/Kadajett/blECSd/tree/main/examples/file-manager)

## Screenshot

```
┌─ ~/projects ─── Tab 1 ────────┬─ ~/downloads ─── Tab 2 ───┐
│                               │                           │
├─ /home/user/projects ─────────┼─ Preview ─────────────────┤
│   📁 ..                       │ # README.md               │
│   📁 node_modules/            │                           │
│   📁 src/                     │ A terminal UI library     │
│   📄 package.json             │ built with ECS.           │
│ > 📄 README.md                │                           │
│   📄 tsconfig.json            │ ## Installation           │
│                               │                           │
│                               │ ```bash                   │
│                               │ npm install blecsd        │
│                               │ ```                       │
├───────────────────────────────┴───────────────────────────┤
│ 5 items | 1.2 KB | Name ↑ | [Enter] Open [Tab] Preview   │
└───────────────────────────────────────────────────────────┘
```

## Features

### Navigation

- **Tabbed explorer**: Open multiple directories in tabs, switch with `Ctrl+Tab`
- **Vim-style keys**: `j`/`k` for up/down, `h`/`l` for parent/enter
- **Fast jumping**: `g` to top, `G` to bottom, `~` to home directory
- **Filtering**: Press `/` and type to filter files by name

### File Operations

- **Selection**: `Space` to toggle, `Ctrl+A` to select all
- **Preview**: Automatic text preview with syntax highlighting
- **Hidden files**: Toggle with `.` or `Ctrl+H`

### Sorting

- **By name**: Default alphabetical sort
- **By size**: Press `s` to cycle, shows file sizes
- **By date**: Shows modification dates
- **Reverse**: Press `S` to reverse current sort

### Performance

- **Virtualized rendering**: Only visible rows rendered, handles 10,000+ files
- **Debounced preview**: Preview loads after selection settles
- **Dirty tracking**: Only changed rows re-render
- **60fps**: Smooth scrolling and navigation

## Quick Start

```bash
# From the blECSd project root
pnpm install
pnpm build

# Run with current directory
cd examples/file-manager
pnpm start

# Run with specific path
pnpm start /path/to/directory
```

## Keyboard Reference

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Page Down` | Page down |
| `Page Up` | Page up |
| `g` / `Home` | Go to first |
| `G` / `End` | Go to last |
| `Enter` / `l` | Open file/directory |
| `Backspace` / `h` | Go up one level |
| `~` | Go to home directory |

### Selection & Filtering

| Key | Action |
|-----|--------|
| `Space` | Toggle selection |
| `Ctrl+A` | Select all |
| `/` | Start filter |
| `Escape` | Cancel filter |

### Display

| Key | Action |
|-----|--------|
| `s` | Cycle sort (name → size → date) |
| `S` | Reverse sort direction |
| `.` / `Ctrl+H` | Toggle hidden files |
| `f` | Cycle size format |
| `p` | Toggle preview panel |
| `Tab` | Switch focus (list/preview) |
| `[` / `]` | Scroll preview |

### Tabs

| Key | Action |
|-----|--------|
| `t` | New tab |
| `w` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |

### Other

| Key | Action |
|-----|--------|
| `Ctrl+R` | Refresh |
| `q` / `Ctrl+C` | Quit |

## Mouse Controls

| Action | Effect |
|--------|--------|
| Click row | Select file |
| Double-click | Open file/directory |
| Click tab | Switch tabs |
| Scroll wheel | Scroll list or preview |
| Ctrl+click | Add to selection |
| Shift+click | Range select |

## Architecture

The file manager demonstrates blECSd's recommended patterns for complex applications.

### Data Outside ECS

File entries are stored in plain TypeScript, not as ECS entities:

```typescript
// FileEntry is a plain interface
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

// FileStore manages the data
class FileStore {
  private entries: FileEntry[] = [];
  private sortBy: SortField = 'name';
  private filterText: string = '';

  // Data operations
  sort(field: SortField): void { ... }
  filter(text: string): void { ... }
  getVisible(start: number, count: number): FileEntry[] { ... }
}
```

### Virtualized Rendering

Only visible rows get ECS entities:

```
10,000 FileEntry objects (plain TypeScript)
        ↓
   FileStore (sorting, filtering)
        ↓
   Viewport (start: 45, count: 30)
        ↓
   30 Row entities (ECS, rendered)
```

This keeps entity count constant regardless of directory size.

### Component Composition

UI state is split into focused components:

```typescript
// Selection state
const Selection = defineComponent({
  index: Types.ui32,           // Currently selected
  rangeStart: Types.i32,       // Range selection start (-1 = none)
});

// Viewport tracking
const VirtualList = defineComponent({
  totalItems: Types.ui32,      // Total count
  viewportStart: Types.ui32,   // First visible index
  viewportCount: Types.ui32,   // Visible count
});

// Row-to-data binding
const FileRow = defineComponent({
  dataIndex: Types.ui32,       // Index into FileStore
});
```

### Input Priority

All input is processed immediately in the INPUT phase:

```typescript
const scheduler = createScheduler();

// INPUT runs first, processes all pending events
scheduler.add(LoopPhase.INPUT, inputSystem);

// Then update, layout, render
scheduler.add(LoopPhase.UPDATE, virtualListSystem);
scheduler.add(LoopPhase.LAYOUT, layoutSystem);
scheduler.add(LoopPhase.RENDER, renderSystem);
```

## File Structure

```
examples/file-manager/
├── index.ts                   # Entry point
├── tabbedApp.ts               # Main application
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

## Extending

### Add a Keyboard Action

1. Define the key binding in `input/keyBindings.ts`:

```typescript
export const keyBindings: KeyBinding[] = [
  // Existing bindings...
  { key: 'x', action: 'delete' },
];
```

2. Implement the handler in `input/handlers.ts`:

```typescript
export function handleDelete(state: AppState): void {
  const selected = state.selectedEntries;
  if (selected.length === 0) return;

  // Confirm and delete
  if (confirm(`Delete ${selected.length} files?`)) {
    for (const entry of selected) {
      fs.unlinkSync(entry.path);
    }
    state.fileStore.refresh();
  }
}
```

### Add a Display Mode

1. Add to config in `config.ts`:

```typescript
export interface Config {
  // Existing config...
  showPermissions: boolean;
}
```

2. Update the render in `systems/renderSystem.ts`:

```typescript
function formatRow(entry: FileEntry, config: Config): string {
  let line = formatIcon(entry) + ' ' + entry.name;

  if (config.showPermissions) {
    line = formatPermissions(entry) + ' ' + line;
  }

  return line;
}
```

## Related

- [File Browser Tutorial](../tutorials/file-browser.md): Step-by-step guide building a simpler version
- [VirtualizedList Reference](../api/widgets/virtualizedList.md): API for virtualized rendering
- [Tree Widget Reference](../api/widgets/tree.md): Alternative for hierarchical display
