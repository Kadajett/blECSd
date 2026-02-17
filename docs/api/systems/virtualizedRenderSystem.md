# Virtualized Render System

The virtualized render system efficiently renders large content by only drawing visible lines. It achieves 60fps scroll performance with 10M+ lines by skipping off-screen content.

## Import

```typescript
import {
  type LineRenderConfig,
  type VirtualizedRenderContext,
  virtualizedRenderSystem,
  createVirtualizedRenderSystem,
  setVirtualizedRenderBuffer,
  getVirtualizedRenderBuffer,
  clearVirtualizedRenderBuffer,
  registerLineStore,
  getLineStore,
  unregisterLineStore,
  updateLineStore,
  setLineRenderConfig,
  getLineRenderConfig,
  clearLineRenderConfig,
  cleanupVirtualizedRenderSystem,
  cleanupEntityResources,
  LineRenderConfigSchema,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { virtualizedRenderSystem, setVirtualizedRenderBuffer, registerLineStore } from 'blecsd/systems';
import { setVirtualViewport, setPosition, setDimensions } from 'blecsd/components';
import { createLineStoreFromLines } from 'blecsd/utils';
import { createDoubleBuffer } from 'blecsd/terminal';

const world = createWorld();
const scheduler = createScheduler();

// Set up the render buffer
const doubleBuffer = createDoubleBuffer(80, 24);
setVirtualizedRenderBuffer(doubleBuffer);

// Create virtualized entity
const viewer = addEntity(world);
setPosition(world, viewer, 0, 0);
setDimensions(world, viewer, 80, 24);
setVirtualViewport(world, viewer, {
  totalLineCount: 1000000,
  visibleLineCount: 24,
});

// Associate content with entity
const largeLogContent = Array.from({ length: 1000000 }, (_, i) => `Log line ${i}`);
const lineStore = createLineStoreFromLines(largeLogContent);
registerLineStore(world, viewer, lineStore);

// Register system
scheduler.registerSystem(LoopPhase.RENDER, virtualizedRenderSystem);
```

## Recommended Phase

Register in the **RENDER** phase:

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { virtualizedRenderSystem } from 'blecsd/systems';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.RENDER, virtualizedRenderSystem);
```

## System Behavior

Each frame, the virtualized render system:

1. Checks if a render buffer is set
2. Queries all entities with VirtualViewport, Position, and Renderable
3. Filters to visible, dirty entities
4. Gets visible line range from viewport
5. Retrieves only visible lines from line store
6. Renders to screen buffer with styling
7. Marks entities as clean

## Buffer Management

```typescript
import { createDoubleBuffer } from 'blecsd/terminal';
import { setVirtualizedRenderBuffer, getVirtualizedRenderBuffer, clearVirtualizedRenderBuffer } from 'blecsd/systems';

// Set the double buffer (required before rendering)
const db = createDoubleBuffer(80, 24);
setVirtualizedRenderBuffer(db);

// Get current buffer
const buffer = getVirtualizedRenderBuffer();
void buffer;

// Clear buffer reference
clearVirtualizedRenderBuffer();
```

## Line Store Management

Line stores hold the actual content for virtualized rendering:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createLineStoreFromLines } from 'blecsd/utils';
import { registerLineStore, getLineStore, updateLineStore, unregisterLineStore } from 'blecsd/systems';

const world = createWorld();
const entity = addEntity(world);
const content = ['Line 1', 'Line 2', 'Line 3'];
const newContent = ['Updated line 1', 'Updated line 2'];

// Register a line store for an entity
const store = createLineStoreFromLines(content);
registerLineStore(world, entity, store);

// Get the line store for an entity
const currentStore = getLineStore(world, entity);
void currentStore;

// Update content (e.g., for streaming)
const newStore = createLineStoreFromLines(newContent);
updateLineStore(world, entity, newStore);

// Remove line store
unregisterLineStore(world, entity);
```

## Line Render Configuration

Configure how lines are rendered:

```typescript
interface LineRenderConfig {
  /** Foreground color for normal lines */
  fg: number;
  /** Background color for normal lines */
  bg: number;
  /** Foreground color for selected line */
  selectedFg: number;
  /** Background color for selected line */
  selectedBg: number;
  /** Foreground color for cursor line */
  cursorFg: number;
  /** Background color for cursor line */
  cursorBg: number;
  /** Whether to show line numbers */
  showLineNumbers: boolean;
  /** Width reserved for line numbers */
  lineNumberWidth: number;
  /** Text attributes (bold, underline, etc.) */
  attrs: number;
}
```

### Setting Configuration

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setLineRenderConfig, getLineRenderConfig, clearLineRenderConfig } from 'blecsd/systems';

const world = createWorld();
const viewer = addEntity(world);

// Basic styling
setLineRenderConfig(world, viewer, {
  fg: 0xffffffff,
  bg: 0x000000ff,
});

// With line numbers
setLineRenderConfig(world, viewer, {
  showLineNumbers: true,
  lineNumberWidth: 5,
});

// Selection highlighting
setLineRenderConfig(world, viewer, {
  selectedFg: 0x000000ff,
  selectedBg: 0x0088ffff,
  cursorFg: 0x000000ff,
  cursorBg: 0x00ff00ff,
});

// Get current config
const config = getLineRenderConfig(world, viewer);
void config;

// Clear config (use defaults)
clearLineRenderConfig(world, viewer);
```

### Default Configuration

| Property | Default |
|----------|---------|
| `fg` | `0xffffffff` (white) |
| `bg` | `0x000000ff` (black) |
| `selectedFg` | `0x000000ff` (black) |
| `selectedBg` | `0xffffffff` (white) |
| `cursorFg` | `0x000000ff` (black) |
| `cursorBg` | `0x00ff00ff` (green) |
| `showLineNumbers` | `false` |
| `lineNumberWidth` | `0` |
| `attrs` | `Attr.NONE` |

## Zod Schema Validation

Line render config is validated with Zod:

```typescript
import { LineRenderConfigSchema } from 'blecsd/systems';

// Validate config
const config = LineRenderConfigSchema.parse({
  fg: 0xffffffff,
  bg: 0x000000ff,
  showLineNumbers: true,
  lineNumberWidth: 5,
});
```

## Example: Log Viewer

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setVirtualViewport, scrollByLines, scrollToTop, scrollToBottom } from 'blecsd/components';
import {
  setVirtualizedRenderBuffer,
  registerLineStore,
  setLineRenderConfig,
  updateLineStore,
} from 'blecsd/systems';
import { createLineStoreFromLines } from 'blecsd/utils';
import { createDoubleBuffer } from 'blecsd/terminal';

const world = createWorld();

setVirtualizedRenderBuffer(createDoubleBuffer(80, 24));

// Create log viewer
const logViewer = addEntity(world);
setPosition(world, logViewer, 0, 0);
setDimensions(world, logViewer, 80, 20);
setVirtualViewport(world, logViewer, {
  totalLineCount: 0,
  visibleLineCount: 20,
});

// Configure appearance
setLineRenderConfig(world, logViewer, {
  fg: 0xccccccff,
  bg: 0x1a1a1aff,
  showLineNumbers: true,
  lineNumberWidth: 6,
  cursorBg: 0x333333ff,
});

// Initialize with empty store first
registerLineStore(world, logViewer, createLineStoreFromLines([]));

// Stream logs
let logLines: string[] = [];
const followMode = true;

const appendLog = (line: string): void => {
  logLines.push(line);
  updateLineStore(world, logViewer, createLineStoreFromLines(logLines));

  // Auto-scroll to bottom if following
  if (followMode) {
    scrollToBottom(world, logViewer);
  }
};

// Handle keyboard
const onKeyPress = (key: string): void => {
  switch (key) {
    case 'up': scrollByLines(world, logViewer, -1); break;
    case 'down': scrollByLines(world, logViewer, 1); break;
    case 'pageup': scrollByLines(world, logViewer, -20); break;
    case 'pagedown': scrollByLines(world, logViewer, 20); break;
    case 'g': scrollToTop(world, logViewer); break;
    case 'G': scrollToBottom(world, logViewer); break;
  }
};

appendLog('Application started');
onKeyPress('down');
```

## Example: Code Editor

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setVirtualViewport } from 'blecsd/components';
import { registerLineStore, setLineRenderConfig } from 'blecsd/systems';
import { createLineStoreFromLines } from 'blecsd/utils';

const world = createWorld();

const sourceCode = ['const x = 1;', 'const y = 2;', 'console.log(x + y);'];

// Create editor with syntax highlighting
const editor = addEntity(world);
setPosition(world, editor, 0, 1);
setDimensions(world, editor, 80, 22);
setVirtualViewport(world, editor, {
  totalLineCount: sourceCode.length,
  visibleLineCount: 22,
});

// Line numbers and cursor
setLineRenderConfig(world, editor, {
  fg: 0xd4d4d4ff,
  bg: 0x1e1e1eff,
  showLineNumbers: true,
  lineNumberWidth: 4,
  cursorFg: 0xd4d4d4ff,
  cursorBg: 0x264f78ff, // Blue cursor line
  selectedFg: 0xd4d4d4ff,
  selectedBg: 0x264f78ff,
});

// Register source code content (apply your own highlighting)
registerLineStore(world, editor, createLineStoreFromLines(sourceCode));
```

## Example: Dual Pane File Manager

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setVirtualViewport } from 'blecsd/components';
import { registerLineStore, setLineRenderConfig } from 'blecsd/systems';
import { createLineStoreFromLines } from 'blecsd/utils';

const world = createWorld();

const leftFiles = ['file1.ts', 'file2.ts', 'README.md'];
const rightFiles = ['dist/', 'node_modules/', 'package.json'];

// Left pane
const leftPane = addEntity(world);
setPosition(world, leftPane, 0, 1);
setDimensions(world, leftPane, 39, 22);
setVirtualViewport(world, leftPane, {
  totalLineCount: leftFiles.length,
  visibleLineCount: 22,
});
registerLineStore(world, leftPane, createLineStoreFromLines(leftFiles));
setLineRenderConfig(world, leftPane, {
  cursorBg: 0x0066ccff,
});

// Right pane
const rightPane = addEntity(world);
setPosition(world, rightPane, 41, 1);
setDimensions(world, rightPane, 39, 22);
setVirtualViewport(world, rightPane, {
  totalLineCount: rightFiles.length,
  visibleLineCount: 22,
});
registerLineStore(world, rightPane, createLineStoreFromLines(rightFiles));
setLineRenderConfig(world, rightPane, {
  cursorBg: 0x0066ccff,
});

// Track active pane
let activePane = leftPane;

const switchPane = (): void => {
  activePane = activePane === leftPane ? rightPane : leftPane;
};

switchPane();
```

## Cleanup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { cleanupVirtualizedRenderSystem, cleanupEntityResources } from 'blecsd/systems';

const world = createWorld();
const entity = addEntity(world);

// Clean up all resources
cleanupVirtualizedRenderSystem(world);

// Clean up specific entity
cleanupEntityResources(world, entity);
```

## Performance Considerations

- Only renders visible lines (O(visible) not O(total))
- Skips non-dirty viewports
- Uses dirty region tracking for efficient buffer updates
- Line stores can be efficiently sliced for visible range
- Scrollbar rendered only when content exceeds viewport

## Related

- [VirtualizedList Widget](../widgets/virtualizedList.md) - High-level widget
- [Render System](./render.md) - Standard rendering
- [Output System](./output.md) - Terminal output
