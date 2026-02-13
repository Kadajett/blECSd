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
# From the blECSd project root
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

## Terminal Demo

**Location:** `examples/terminal/`

Interactive demonstration of the Terminal widget's capabilities including ANSI rendering and PTY shell spawning.

```
┌─ Terminal Demo ─────────────────────────────────────────────┐
│ blECSd Terminal Widget Demo                                 │
│                                                             │
│ Press 'c' to show colors, 's' to spawn shell, 'q' to quit  │
│                                                             │
│ ████████████████████████████████████████                   │
│ 256-color palette test                                      │
└─────────────────────────────────────────────────────────────┘
```

### Features

- **Color Test**: 16-color, 256-color palette display
- **Shell Spawning**: Interactive bash/zsh session (requires node-pty)
- **ANSI Rendering**: SGR codes for colors and styles
- **Cursor Control**: Visibility toggle, positioning

### Running

```bash
cd examples/terminal
pnpm dev
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `c` | Show color palette |
| `s` | Spawn interactive shell |
| `q` | Quit |

---

## Multiplexer

**Location:** `examples/multiplexer/`

A tmux-like terminal multiplexer with multiple PTY panes in a 2x2 grid layout.

```
┌─ Shell 1 ───────────────────┬─ Shell 2 ───────────────────┐
│ user@host:~$ ls             │ user@host:~$ htop           │
│ Documents  Downloads        │ [system monitor output]     │
│ user@host:~$ _              │                             │
├─ Shell 3 ───────────────────┼─ Shell 4 ───────────────────┤
│ user@host:~$ vim file.txt   │ user@host:~$ git status     │
│ [vim interface]             │ On branch main              │
│                             │ nothing to commit           │
└─────────────────────────────┴─────────────────────────────┘
 Tab/Click: Focus | Ctrl+N: New | Ctrl+D: Close | Ctrl+Q: Quit
```

### Features

- **2x2 Grid Layout**: Four terminal panes with independent shells
- **Focus Management**: Tab cycling, Shift+Tab reverse, click-to-focus
- **Dynamic Panes**: Create new panes (Ctrl+N), close panes (Ctrl+D)
- **Visual Focus**: Active pane highlighted with distinct border
- **Full PTY Support**: Each pane runs an independent shell process

### Running

```bash
cd examples/multiplexer
pnpm dev
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `Tab` | Focus next pane |
| `Shift+Tab` | Focus previous pane |
| `Ctrl+N` | Create new pane |
| `Ctrl+D` | Close focused pane |
| `Ctrl+Q` | Quit |
| Mouse click | Focus clicked pane |

---

## System Monitor

**Location:** `examples/system-monitor/`

An htop-inspired system monitoring dashboard with real-time CPU, memory, and process information.

```
┌─ CPU ──────────────────────────────────────────────────────┐
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  45%        │
│ Load: 2.34 1.89 1.56                                       │
├─ Memory ───────────────────────────────────────────────────┤
│ ██████████████████████████░░░░░░░░░░░░░░░░░░░  62%        │
│ Used: 10.2 GB / 16.0 GB                                    │
├─ Processes ────────────────────────────────────────────────┤
│ PID    USER    CPU%   MEM%   COMMAND                       │
│ 1234   root    15.2   2.1    node server.js                │
│ 5678   user     8.4   4.3    chrome                        │
│ 9012   user     3.1   1.8    code                          │
└────────────────────────────────────────────────────────────┘
```

### Features

- **CPU Monitoring**: Load average with sparkline history graph
- **Memory Usage**: Used/total with percentage bar
- **Process List**: Top processes by CPU usage
- **Real-time Updates**: Auto-refresh every second
- **Braille Sparklines**: High-resolution graphs using braille characters

### Running

```bash
cd examples/system-monitor
pnpm dev
```

### Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| Real-time Updates | setInterval with dirty tracking |
| Braille Graphics | Sparkline charts for CPU history |
| Progress Bars | Visual percentage display |
| Process Listing | os module integration |

---

## ANSI Art Viewer

**Location:** `examples/ansi-viewer/`

Browse and display classic BBS-era ANSI art with proper CP437 encoding support.

```
┌────────────────────────────────────────────────────┬───────────────────────┐
│                                                    │      Art List         │
│                                                    │ ─────────────────────│
│                  ANSI Art Display                  │ > ACiD Logo           │
│                                                    │   iCE Logo            │
│                 (Terminal Widget)                  │   Blade               │
│                                                    │   Fire                │
│                                                    │   Darkside            │
│                                                    │                       │
│                                                    │  10 items             │
└────────────────────────────────────────────────────┴───────────────────────┘
 ↑↓:Navigate  Enter:View  /:Search  s:Slideshow  r:Shuffle  h:Toggle List  q:Quit
```

### Features

- **Art Catalog**: Browse curated collection from textfiles.com
- **CP437 Encoding**: Proper IBM PC character set conversion
- **Search**: Filter by name, author, or group
- **Slideshow Mode**: Auto-advance through catalog
- **Split View**: Art display with navigable list

### Running

```bash
cd examples/ansi-viewer
pnpm dev
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `j` / `↓` | Navigate down |
| `k` / `↑` | Navigate up |
| `Enter` | View selected art |
| `/` | Search mode |
| `s` | Toggle slideshow |
| `r` | Shuffle catalog |
| `h` | Toggle list visibility |
| `q` | Quit |

### Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| Terminal Widget | ANSI art rendering |
| CP437 Encoding | `encoding.bufferToString()` for legacy files |
| Async Fetching | Load art from remote URLs |
| Split Layout | Two-panel interface |

---

## Telnet Server

**Location:** `examples/telnet-server/`

Serve blECSd UIs to remote clients over telnet. Each connection gets an isolated session.

```
╔═══════════════════════════════════════════════════════════╗
║   blECSd Telnet Server Example                            ║
║   Server listening on port 2300                           ║
║   Connect with:  telnet localhost 2300                    ║
╚═══════════════════════════════════════════════════════════╝
```

### Features

- **Multi-client Support**: Isolated sessions per connection
- **Telnet Protocol**: NAWS (window size), TTYPE (terminal type)
- **Demo UI**: Menu navigation, color test, box drawing
- **Client Stats**: View all connected sessions
- **Clean Disconnect**: Graceful session cleanup

### Running

```bash
cd examples/telnet-server
pnpm dev

# Connect from another terminal
telnet localhost 2300
```

### Demo Menu

1. **System Info**: Server version, client ID, terminal info
2. **Client Stats**: List of all connected clients
3. **Color Test**: 16-color, 256-color, grayscale
4. **Box Drawing**: Unicode box and block characters
5. **Quit**: Disconnect

### Key Concepts Demonstrated

| Concept | How It's Used |
|---------|---------------|
| Custom I/O Streams | Socket as Program input/output |
| Session Isolation | Separate World per client |
| Protocol Handling | Telnet option negotiation |
| Remote UI | Network-accessible terminal apps |

### Security Note

Telnet is unencrypted. Use only on trusted networks. For production, consider SSH tunnels.

---

## Creating Your Own Examples

When building applications with blECSd, follow these patterns:

### 1. Library-First Design

Use blECSd components standalone in your own bitecs world:

```typescript
import { createWorld, addEntity } from 'blecsd';
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
