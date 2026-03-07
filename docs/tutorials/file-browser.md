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

## Complete Implementation

Create `file-browser.ts` with the following code:

```typescript
import { createWorld, addEntity, createScreenEntity } from 'blecsd/core';
import { createRenderPipeline, onShutdown } from 'blecsd';
import { setDimensions } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { type KeyEvent, createProgram } from 'blecsd/terminal';
import {
  createVirtualizedList, createPanel, createText, createScrollableText,
  setPanelTitle,
} from 'blecsd/widgets';
import { setContent, setParent } from 'blecsd/components';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types and State
// =============================================================================

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

// =============================================================================
// File System Functions
// =============================================================================

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
    const dirItems = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of dirItems) {
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
      const dirContents = await fs.promises.readdir(entry.path);
      return `Directory: ${entry.name}\n\n${dirContents.length} items`;
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

// =============================================================================
// ECS Setup
// =============================================================================

const world = createWorld();
const scheduler = createScheduler();

// Register systems
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);

const program = createProgram({
  useAlternateScreen: true,
  hideCursor: true,
});
program.init();

// Initialize render pipeline
const { cols, rows } = createRenderPipeline(process.stdout);
createScreenEntity(world, { width: cols, height: rows });
const shutdown = onShutdown(world, { program });

// =============================================================================
// UI Layout
// =============================================================================

const columns = process.stdout.columns ?? 80;
const screenRows = process.stdout.rows ?? 24;

// Calculate layout
const leftWidth = Math.floor(columns * 0.4);
const rightWidth = columns - leftWidth;
const contentHeight = screenRows - 3; // Leave room for status bar

// Left panel - file list
const fileListPanel = createPanel(world, addEntity(world), {
  title: state.currentPath,
  x: 0,
  y: 0,
  width: leftWidth,
  height: contentHeight,
  border: { type: 'line', ch: 'single' },
}).eid;

// Virtualized file list (handles 1000s of files efficiently)
const fileList = createVirtualizedList(world, {
  x: 1,
  y: 1,
  width: leftWidth - 2,
  height: contentHeight - 2,
  lines: [], // Start with empty list
});
setParent(world, fileList.eid, fileListPanel);

// Right panel - preview
const previewPanel = createPanel(world, addEntity(world), {
  title: 'Preview',
  x: leftWidth,
  y: 0,
  width: rightWidth,
  height: contentHeight,
  border: { type: 'line', ch: 'single' },
}).eid;

// Preview text (scrollable)
const previewText = createScrollableText(world, addEntity(world), {
  x: 1,
  y: 1,
  width: rightWidth - 2,
  height: contentHeight - 2,
  content: '',
});
setParent(world, previewText.eid, previewPanel);

// Status bar
const statusBar = createText(world, addEntity(world), {
  x: 0,
  y: screenRows - 1,
  content: '',
  fg: 0x000000ff,
  bg: 0xccccccff,
}).eid;
setDimensions(world, statusBar, columns, 1);

// =============================================================================
// UI Update Functions
// =============================================================================

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
  // Format entries as strings for the virtualized list
  const lines = (state.entries || []).map((entry) =>
    formatFileEntry(entry, leftWidth - 2)
  );

  // Update the virtualized list via its API
  fileList.setLines(lines);

  // Set the selected line
  if (state.entries && state.entries.length > 0) {
    fileList.select(state.selectedIndex);
  }
}

function updateStatusBar(): void {
  const selectedEntry = state.entries[state.selectedIndex];
  const itemCount = state.entries.length;
  const selectedSize = selectedEntry ? formatSize(selectedEntry.size) : '';

  const status = `${itemCount} items | ${selectedSize} | [Enter] Open [Tab] Preview [q] Quit`;
  setContent(world, statusBar, status.padEnd(columns));
}

function updateTitle(): void {
  setPanelTitle(world, fileListPanel, state.currentPath);
}

async function navigateTo(newPath: string): Promise<void> {
  state.currentPath = newPath;
  state.entries = (await loadDirectory(newPath)) || [];
  state.selectedIndex = 0;

  updateTitle();
  updateFileList();
  updateStatusBar();
  await updatePreview();
}

async function updatePreview(): Promise<void> {
  const previewEntry = state.entries[state.selectedIndex];
  if (previewEntry) {
    state.previewContent = await loadPreview(previewEntry);
    setContent(world, previewText.eid, state.previewContent);
  }
}

// =============================================================================
// Keyboard Navigation
// =============================================================================

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
    case 'right': {
      // Open directory or file
      const openEntry = state.entries[state.selectedIndex];
      if (openEntry?.isDirectory) {
        await navigateTo(openEntry.path);
      }
      break;
    }

    case 'h':
    case 'left':
    case 'backspace': {
      // Go to parent directory
      const parentDir = path.dirname(state.currentPath);
      if (parentDir !== state.currentPath) {
        await navigateTo(parentDir);
      }
      break;
    }

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
      shutdown();
      break;
  }
}

// =============================================================================
// Main Loop
// =============================================================================

// Input handling via createProgram
program.on('key', async (key: KeyEvent) => {
  await handleKey(key);
  scheduler.run(world, 0);
});

// Handle window resize
program.on('resize', () => {
  scheduler.run(world, 0);
});

// Initial load
(async () => {
  state.entries = (await loadDirectory(state.currentPath)) || [];
  updateFileList();
  updateStatusBar();
  await updatePreview();
  scheduler.run(world, 0);
})();
```

## Running the App

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

## Key Concepts Explained

### Virtualized List

The `createVirtualizedList` widget efficiently renders large file lists by only rendering visible lines:

<!-- blecsd-doccheck:ignore -->
```typescript
const fileList = createVirtualizedList(world, {
  x: 1,
  y: 1,
  width: 40,
  height: 20,
  lines: [], // Initial empty list
});

// Update content via widget API
fileList.setLines(['Item 1', 'Item 2', 'Item 3']);

// Set selected line
fileList.select(0);
```

### Async File Operations

The browser loads directories and previews asynchronously to avoid blocking the UI:

<!-- blecsd-doccheck:ignore -->
```typescript
async function loadDirectory(dirPath: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  const dirItems = await fs.promises.readdir(dirPath, { withFileTypes: true });
  // ... process items
  return entries;
}

// Usage
const entries = await loadDirectory('/home/user');
```

### Panel Layout

The dual-pane layout uses calculated widths to split the screen:

<!-- blecsd-doccheck:ignore -->
```typescript
const leftWidth = Math.floor(columns * 0.4);  // 40% for file list
const rightWidth = columns - leftWidth;        // 60% for preview

const fileListPanel = createPanel(world, addEntity(world), {
  x: 0,
  y: 0,
  width: leftWidth,
  height: contentHeight,
  border: { type: 'line', ch: 'single' },
});

const previewPanel = createPanel(world, addEntity(world), {
  x: leftWidth,  // Starts where file list ends
  y: 0,
  width: rightWidth,
  height: contentHeight,
  border: { type: 'line', ch: 'single' },
});
```

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
