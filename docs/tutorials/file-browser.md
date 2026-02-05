# Tutorial: File Browser

**Difficulty:** Intermediate
**Time:** 45 minutes
**Concepts:** Virtualized lists, Tree widget, keyboard shortcuts, file system

In this tutorial, you'll build a dual-pane file browser similar to Midnight Commander, demonstrating blECSd's virtualized list rendering and tree navigation.

## What You'll Build

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

## Prerequisites

- Completed the [Todo List Tutorial](./todo-list.md)
- Understanding of async/await
- Basic file system concepts

## Step 1: Project Setup

Create `file-browser.ts`:

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerLayoutSystem,
  registerRenderSystem,
  registerInputSystem,
  createProgram,
  createVirtualizedList,
  createPanel,
  createText,
  setPosition,
  setDimensions,
  setContent,
  scrollViewport,
} from 'blecsd';
import * as fs from 'fs';
import * as path from 'path';

const world = createWorld();
const scheduler = createScheduler();

// Register systems
registerInputSystem(scheduler);
registerLayoutSystem(scheduler);
registerRenderSystem(scheduler);

const program = createProgram({
  input: process.stdin,
  output: process.stdout,
});

program.alternateBuffer();
program.enableMouse();
program.hideCursor();
```

## Step 2: File Entry Interface

```typescript
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

interface AppState {
  currentPath: string;
  entries: FileEntry[];
  selectedIndex: number;
  previewContent: string;
}

const state: AppState = {
  currentPath: process.cwd(),
  entries: [],
  selectedIndex: 0,
  previewContent: '',
};
```

## Step 3: File System Functions

```typescript
async function loadDirectory(dirPath: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  // Add parent directory entry
  if (dirPath !== '/') {
    entries.push({
      name: '..',
      path: path.dirname(dirPath),
      isDirectory: true,
      size: 0,
      modified: new Date(),
    });
  }

  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      // Skip hidden files (optional)
      if (item.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, item.name);
      let stats: fs.Stats | null = null;

      try {
        stats = await fs.promises.stat(fullPath);
      } catch {
        // Skip inaccessible files
        continue;
      }

      entries.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      });
    }

    // Sort: directories first, then alphabetically
    entries.sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error reading directory:', error);
  }

  return entries;
}

async function loadPreview(entry: FileEntry): Promise<string> {
  if (entry.isDirectory) {
    try {
      const items = await fs.promises.readdir(entry.path);
      return `Directory: ${entry.name}\n\n${items.length} items`;
    } catch {
      return 'Cannot read directory';
    }
  }

  // Only preview text files under 100KB
  if (entry.size > 100 * 1024) {
    return `File too large to preview\n\nSize: ${formatSize(entry.size)}`;
  }

  try {
    const content = await fs.promises.readFile(entry.path, 'utf-8');
    return content.slice(0, 5000); // Limit preview length
  } catch {
    return 'Cannot read file';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

## Step 4: Create UI Layout

```typescript
const { columns, rows } = process.stdout;

// Calculate layout
const leftWidth = Math.floor(columns * 0.4);
const rightWidth = columns - leftWidth;
const contentHeight = rows - 3; // Leave room for status bar

// Left panel - file list
const fileListPanel = createPanel(world, {
  title: state.currentPath,
  x: 0,
  y: 0,
  width: leftWidth,
  height: contentHeight,
  border: 'single',
});

// Virtualized file list (handles 1000s of files efficiently)
const fileList = createVirtualizedList(world, {
  x: 1,
  y: 1,
  width: leftWidth - 2,
  height: contentHeight - 2,
  items: [],
  selectedIndex: 0,
});
setParent(world, fileList, fileListPanel);

// Right panel - preview
const previewPanel = createPanel(world, {
  title: 'Preview',
  x: leftWidth,
  y: 0,
  width: rightWidth,
  height: contentHeight,
  border: 'single',
});

// Preview text (scrollable)
const previewText = createScrollableText(world, {
  x: 1,
  y: 1,
  width: rightWidth - 2,
  height: contentHeight - 2,
  content: '',
});
setParent(world, previewText, previewPanel);

// Status bar
const statusBar = createText(world, {
  x: 0,
  y: rows - 1,
  content: '',
  fg: 0x000000ff,
  bg: 0xccccccff,
});
setDimensions(world, statusBar, columns, 1);
```

## Step 5: Format File List Items

```typescript
function formatFileEntry(entry: FileEntry, width: number): string {
  const icon = entry.isDirectory ? '📁' : '📄';
  const name = entry.name;
  const size = entry.isDirectory ? '' : formatSize(entry.size);

  // Calculate available space for name
  const sizeWidth = 10;
  const iconWidth = 3;
  const nameWidth = width - iconWidth - sizeWidth - 2;

  // Truncate name if needed
  const displayName = name.length > nameWidth
    ? name.slice(0, nameWidth - 1) + '…'
    : name.padEnd(nameWidth);

  return `${icon} ${displayName} ${size.padStart(sizeWidth)}`;
}

function updateFileList(): void {
  const items = state.entries.map((entry, index) => ({
    content: formatFileEntry(entry, leftWidth - 2),
    selected: index === state.selectedIndex,
  }));

  setVirtualizedListItems(world, fileList, items);
  setVirtualizedListSelectedIndex(world, fileList, state.selectedIndex);
}

function updateStatusBar(): void {
  const entry = state.entries[state.selectedIndex];
  const itemCount = state.entries.length;
  const selectedSize = entry ? formatSize(entry.size) : '';

  const status = `${itemCount} items | ${selectedSize} | [Enter] Open [Tab] Preview [q] Quit`;
  setContent(world, statusBar, status.padEnd(columns));
}

function updateTitle(): void {
  setPanelTitle(world, fileListPanel, state.currentPath);
}
```

## Step 6: Handle Navigation

```typescript
import { parseKeyBuffer, type KeyEvent } from 'blecsd';

async function handleKey(key: KeyEvent): Promise<void> {
  switch (key.name) {
    case 'j':
    case 'down':
      // Move selection down
      if (state.selectedIndex < state.entries.length - 1) {
        state.selectedIndex++;
        updateFileList();
        updateStatusBar();
        await updatePreview();
      }
      break;

    case 'k':
    case 'up':
      // Move selection up
      if (state.selectedIndex > 0) {
        state.selectedIndex--;
        updateFileList();
        updateStatusBar();
        await updatePreview();
      }
      break;

    case 'pagedown':
      // Page down
      state.selectedIndex = Math.min(
        state.selectedIndex + 10,
        state.entries.length - 1
      );
      updateFileList();
      updateStatusBar();
      await updatePreview();
      break;

    case 'pageup':
      // Page up
      state.selectedIndex = Math.max(state.selectedIndex - 10, 0);
      updateFileList();
      updateStatusBar();
      await updatePreview();
      break;

    case 'enter':
    case 'l':
    case 'right':
      // Open directory or file
      const entry = state.entries[state.selectedIndex];
      if (entry?.isDirectory) {
        await navigateTo(entry.path);
      } else if (entry) {
        // Open file with default editor (optional)
        // spawn('code', [entry.path]);
      }
      break;

    case 'h':
    case 'left':
    case 'backspace':
      // Go to parent directory
      const parentPath = path.dirname(state.currentPath);
      if (parentPath !== state.currentPath) {
        await navigateTo(parentPath);
      }
      break;

    case 'g':
      // Go to top
      state.selectedIndex = 0;
      updateFileList();
      updateStatusBar();
      await updatePreview();
      break;

    case 'G':
      // Go to bottom
      state.selectedIndex = state.entries.length - 1;
      updateFileList();
      updateStatusBar();
      await updatePreview();
      break;

    case 'q':
      cleanup();
      process.exit(0);
      break;
  }
}

async function navigateTo(newPath: string): Promise<void> {
  state.currentPath = newPath;
  state.entries = await loadDirectory(newPath);
  state.selectedIndex = 0;

  updateTitle();
  updateFileList();
  updateStatusBar();
  await updatePreview();
}

async function updatePreview(): Promise<void> {
  const entry = state.entries[state.selectedIndex];
  if (entry) {
    state.previewContent = await loadPreview(entry);
    setContent(world, previewText, state.previewContent);
  }
}
```

## Step 7: Main Loop

```typescript
process.stdin.setRawMode(true);
process.stdin.on('data', async (data) => {
  const key = parseKeyBuffer(data);
  await handleKey(key);
  scheduler.run(world, 0);
});

// Handle window resize
process.stdout.on('resize', () => {
  // Recalculate layout
  const { columns, rows } = process.stdout;
  // Update component dimensions...
  scheduler.run(world, 0);
});

function cleanup(): void {
  program.showCursor();
  program.disableMouse();
  program.normalBuffer();
  process.stdin.setRawMode(false);
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Initial load
(async () => {
  state.entries = await loadDirectory(state.currentPath);
  updateFileList();
  updateStatusBar();
  await updatePreview();
  scheduler.run(world, 0);
})();
```

## Step 8: Run the App

```bash
npx tsx file-browser.ts
```

## Keyboard Shortcuts Summary

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Enter` / `l` | Open directory |
| `h` / `←` / `Backspace` | Parent directory |
| `g` | Go to top |
| `G` | Go to bottom |
| `PageUp` / `PageDown` | Page navigation |
| `q` | Quit |

## Exercises

1. **Add file operations:** Copy, move, delete files
2. **Add search:** Filter files by name
3. **Add dual pane:** Two independent file lists
4. **Add bookmarks:** Save favorite directories
5. **Add file type icons:** Different icons for file types

## What You Learned

- Using VirtualizedList for large datasets
- Async file system operations
- Complex keyboard navigation
- Dynamic content updates
- Panel and layout composition

## Next Steps

- [Dashboard Tutorial](./dashboard.md) - Build a system monitoring dashboard
- [VirtualizedList Reference](../api/widgets/virtualizedList.md) - Full API
- [Tree Widget Reference](../api/widgets/tree.md) - Hierarchical navigation
