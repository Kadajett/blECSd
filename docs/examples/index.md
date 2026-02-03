# Examples Gallery

Working examples demonstrating blECSd patterns and capabilities.

## File Manager

**Location:** `examples/file-manager/`

A full-featured terminal file manager demonstrating blECSd's architecture for handling large datasets with smooth UX.

```
┌─ /home/user/projects ─────────┬─ Preview ──────────────────┐
│ ..                            │ # README.md                │
│ 📁 node_modules/              │                            │
│ 📁 src/                       │ A terminal UI library      │
│ 📄 package.json               │ built with ECS.            │
│ > 📄 README.md                │                            │
│ 📄 tsconfig.json              │ ## Installation            │
│                               │                            │
│                               │ ```bash                    │
│                               │ npm install blecsd         │
│                               │ ```                        │
├───────────────────────────────┴────────────────────────────┤
│ 5 items | 1.2 KB selected | [Enter] Open [Tab] Preview    │
└────────────────────────────────────────────────────────────┘
```

### Features

- **Tabbed explorer**: Multiple directories open at once with fast tab switching
- **Virtualized rendering**: Only visible rows get entities, handles 10,000+ files smoothly
- **Preview panel**: File list (60%) + preview panel (40%)
- **Full keyboard navigation**: vim-style keys + standard arrows
- **Mouse support**: Click, double-click, scroll wheel, ctrl/shift-click for selection
- **File preview**: Text preview for code/text files, hex dump for binary
- **Incremental syntax highlighting**: Uses blECSd highlight cache for fast previews
- **Hidden files toggle**: Press `.` or `Ctrl+H`
- **Sorting**: Click column headers or press `s`/`S`
- **Filtering**: Press `/` to filter files

### Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| Virtualized Lists | Only visible rows are rendered as entities |
| Data Outside ECS | File entries stored in plain TypeScript classes |
| Input Priority | All keyboard/mouse input processed immediately |
| Dirty Tracking | Only re-renders changed rows |
| Component Composition | Selection, viewport, and file data as separate components |

### Running the Example

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

### Keyboard Controls

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Page Down` / `Page Up` | Page navigation |
| `g` / `G` | Go to first / last |
| `Enter` / `l` | Open file/directory |
| `Backspace` / `h` | Go up one level |
| `Space` | Toggle selection |
| `/` | Start filter |
| `s` / `S` | Sort / reverse sort |
| `.` | Toggle hidden files |
| `t` / `w` | New tab / close tab |
| `Ctrl+Tab` | Cycle tabs |
| `Tab` | Switch focus (list/preview) |
| `q` | Quit |

### Architecture Overview

```
FileEntry[] (10,000 items)     ← Plain TypeScript array
        ↓
   FileStore                   ← Manages sorting/filtering
        ↓
List component (virtualized)   ← Maps visible indices to loaded items
        ↓
~50 Visible rows               ← Only viewport + buffer gets items
```

---

## Creating Your Own Examples

When building applications with blECSd, follow these patterns:

### 1. Library-First Design

Use blECSd components standalone in your own bitecs world:

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setPosition, setRenderable } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);
setPosition(world, eid, 10, 5);
```

### 2. Data Outside ECS

Keep complex data in plain TypeScript, use ECS for UI state:

```typescript
// Data layer (plain TypeScript)
interface Item {
  id: string;
  name: string;
  data: ComplexData;
}

const items: Item[] = loadItems();

// ECS layer (UI state only)
const Selection = defineComponent({ index: Types.ui32 });
const Viewport = defineComponent({ start: Types.ui32, count: Types.ui32 });
```

### 3. Virtualized Rendering

For large datasets, only create entities for visible items:

```typescript
function updateVisibleItems(world: World, items: Item[], viewport: ViewportState) {
  const { start, count } = viewport;
  const visible = items.slice(start, start + count);

  // Create/update entities only for visible items
  visible.forEach((item, i) => {
    const eid = getOrCreateEntity(world, start + i);
    setContent(world, eid, item.name);
  });
}
```

### 4. Input Priority

Process input immediately, before other systems:

```typescript
const scheduler = createScheduler();

// INPUT phase runs first (cannot be reordered)
scheduler.add(LoopPhase.INPUT, inputSystem);
scheduler.add(LoopPhase.UPDATE, updateSystem);
scheduler.add(LoopPhase.RENDER, renderSystem);
```

---

## Example Ideas

Looking to build something? Here are some ideas that work well with blECSd:

| Project | Key Concepts |
|---------|--------------|
| **Todo App** | Forms, state management, keyboard navigation |
| **Dashboard** | Layouts, progress bars, auto-refresh |
| **Log Viewer** | Virtualized scrollback, filtering, search |
| **Git TUI** | Tree widget, diff rendering, keyboard shortcuts |
| **Music Player** | Progress bar, lists, keyboard controls |
| **System Monitor** | Real-time updates, multiple panels, charts |
| **Text Editor** | Virtualized text, cursor management, syntax highlighting |
| **Game (Roguelike)** | Animation, collision, state machines, tiles |

See the [Tutorials](../tutorials/) for step-by-step guides building some of these.

---

## Contributing Examples

Want to add an example? See the [Contributing Guide](../contributing/CONTRIBUTING.md) for:

- Example structure requirements
- Documentation standards
- Testing expectations
