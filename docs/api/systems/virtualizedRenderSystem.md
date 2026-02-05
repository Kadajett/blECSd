# Virtualized Render System

The virtualized render system efficiently renders large content by only drawing visible lines. It achieves 60fps scroll performance with 10M+ lines by skipping off-screen content.

## Import

```typescript
import {
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
  type LineRenderConfig,
  type VirtualizedRenderContext,
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  virtualizedRenderSystem,
  setVirtualizedRenderBuffer,
  registerLineStore,
  createLineStore,
  createDoubleBuffer,
  attachVirtualViewport,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Set up the render buffer
const doubleBuffer = createDoubleBuffer(80, 24);
setVirtualizedRenderBuffer(doubleBuffer);

// Create virtualized entity
const viewer = addEntity(world);
setPosition(world, viewer, 0, 0);
setDimensions(world, viewer, 80, 24);
attachVirtualViewport(world, viewer, {
  totalLineCount: 1000000,
  visibleLineCount: 24,
});

// Associate content with entity
const lineStore = createLineStore(largeLogContent);
registerLineStore(viewer, lineStore);

// Register system
scheduler.registerSystem(LoopPhase.RENDER, virtualizedRenderSystem);
```

## Recommended Phase

Register in the **RENDER** phase:

```typescript
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
// Set the double buffer (required before rendering)
const db = createDoubleBuffer(80, 24);
setVirtualizedRenderBuffer(db);

// Get current buffer
const buffer = getVirtualizedRenderBuffer();

// Clear buffer reference
clearVirtualizedRenderBuffer();
```

## Line Store Management

Line stores hold the actual content for virtualized rendering:

```typescript
// Register a line store for an entity
const store = createLineStore(content);
registerLineStore(entity, store);

// Get the line store for an entity
const store = getLineStore(entity);

// Update content (e.g., for streaming)
const newStore = createLineStore(newContent);
updateLineStore(entity, newStore);

// Remove line store
unregisterLineStore(entity);
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
// Basic styling
setLineRenderConfig(viewer, {
  fg: 0xffffffff,
  bg: 0x000000ff,
});

// With line numbers
setLineRenderConfig(viewer, {
  showLineNumbers: true,
  lineNumberWidth: 5,
});

// Selection highlighting
setLineRenderConfig(viewer, {
  selectedFg: 0x000000ff,
  selectedBg: 0x0088ffff,
  cursorFg: 0x000000ff,
  cursorBg: 0x00ff00ff,
});

// Get current config
const config = getLineRenderConfig(viewer);

// Clear config (use defaults)
clearLineRenderConfig(viewer);
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
import { LineRenderConfigSchema } from 'blecsd';

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
import {
  virtualizedRenderSystem,
  setVirtualizedRenderBuffer,
  registerLineStore,
  setLineRenderConfig,
  createLineStore,
  attachVirtualViewport,
  scrollViewport,
} from 'blecsd';

const world = createWorld();

// Create log viewer
const logViewer = addEntity(world);
setPosition(world, logViewer, 0, 0);
setDimensions(world, logViewer, 80, 20);
attachVirtualViewport(world, logViewer, {
  totalLineCount: 0,
  visibleLineCount: 20,
});

// Configure appearance
setLineRenderConfig(logViewer, {
  fg: 0xccccccff,
  bg: 0x1a1a1aff,
  showLineNumbers: true,
  lineNumberWidth: 6,
  cursorBg: 0x333333ff,
});

// Stream logs
let logLines: string[] = [];

function appendLog(line: string) {
  logLines.push(line);
  updateLineStore(logViewer, createLineStore(logLines));

  // Update total line count
  setViewportTotalLines(world, logViewer, logLines.length);

  // Auto-scroll to bottom if following
  if (isFollowMode(logViewer)) {
    scrollToBottom(world, logViewer);
  }
}

// Handle keyboard
function onKeyPress(key: string) {
  switch (key) {
    case 'up':
      scrollViewport(world, logViewer, -1);
      break;
    case 'down':
      scrollViewport(world, logViewer, 1);
      break;
    case 'pageup':
      scrollViewport(world, logViewer, -20);
      break;
    case 'pagedown':
      scrollViewport(world, logViewer, 20);
      break;
    case 'g':
      scrollToTop(world, logViewer);
      break;
    case 'G':
      scrollToBottom(world, logViewer);
      break;
  }
}
```

## Example: Code Editor

```typescript
// Create editor with syntax highlighting
const editor = addEntity(world);
setPosition(world, editor, 0, 1);
setDimensions(world, editor, 80, 22);
attachVirtualViewport(world, editor, {
  totalLineCount: sourceCode.length,
  visibleLineCount: 22,
});

// Line numbers and cursor
setLineRenderConfig(editor, {
  fg: 0xd4d4d4ff,
  bg: 0x1e1e1eff,
  showLineNumbers: true,
  lineNumberWidth: 4,
  cursorFg: 0xd4d4d4ff,
  cursorBg: 0x264f78ff, // Blue cursor line
  selectedFg: 0xd4d4d4ff,
  selectedBg: 0x264f78ff,
});

// Syntax highlighted content
const highlightedLines = sourceCode.map(line =>
  applySyntaxHighlighting(line, 'typescript')
);
registerLineStore(editor, createLineStore(highlightedLines));
```

## Example: Dual Pane File Manager

```typescript
// Left pane
const leftPane = addEntity(world);
setPosition(world, leftPane, 0, 1);
setDimensions(world, leftPane, 39, 22);
attachVirtualViewport(world, leftPane, {
  totalLineCount: leftFiles.length,
  visibleLineCount: 22,
});
registerLineStore(leftPane, createLineStore(formatFiles(leftFiles)));
setLineRenderConfig(leftPane, {
  cursorBg: 0x0066ccff,
});

// Right pane
const rightPane = addEntity(world);
setPosition(world, rightPane, 41, 1);
setDimensions(world, rightPane, 39, 22);
attachVirtualViewport(world, rightPane, {
  totalLineCount: rightFiles.length,
  visibleLineCount: 22,
});
registerLineStore(rightPane, createLineStore(formatFiles(rightFiles)));
setLineRenderConfig(rightPane, {
  cursorBg: 0x0066ccff,
});

// Track active pane
let activePane = leftPane;

function switchPane() {
  activePane = activePane === leftPane ? rightPane : leftPane;
}
```

## Cleanup

```typescript
// Clean up all resources
cleanupVirtualizedRenderSystem();

// Clean up specific entity
cleanupEntityResources(entity);
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
