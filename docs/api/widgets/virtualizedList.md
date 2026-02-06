# VirtualizedList Widget

The VirtualizedList widget provides high-performance rendering for large datasets. It uses virtualization to only render visible lines plus a configurable overscan buffer, enabling smooth handling of millions of lines.

## Import

```typescript
import {
  createVirtualizedList,
  isVirtualizedList,
  handleVirtualizedListKey,
  handleVirtualizedListWheel,
} from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld } from 'blecsd';
import { createVirtualizedList } from 'blecsd';

const world = createWorld();

const list = createVirtualizedList(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  lines: ['Line 1', 'Line 2', 'Line 3'],
  mouse: true,
  keys: true,
});

// Add more content
list.appendLine('New line');
list.appendLines(['Another', 'Few', 'Lines']);

// Enable auto-scroll for streaming
list.follow(true);
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | **required** | Width in columns |
| `height` | `number` | **required** | Height in rows |
| `lines` | `string[]` | `[]` | Initial lines |
| `mouse` | `boolean` | `true` | Enable mouse scrolling |
| `keys` | `boolean` | `true` | Enable keyboard navigation |
| `style` | `VirtualizedListStyle` | - | Style configuration |
| `border` | `BorderConfig` | - | Border configuration |
| `overscan` | `number` | `5` | Lines to render outside viewport |
| `maxLines` | `number` | `0` | Maximum lines to keep (0 = unlimited) |

### VirtualizedListStyle Interface

```typescript
interface VirtualizedListStyle {
  fg?: number;               // Foreground color
  bg?: number;               // Background color
  selectedFg?: number;       // Selected line foreground
  selectedBg?: number;       // Selected line background
  cursorFg?: number;         // Cursor line foreground
  cursorBg?: number;         // Cursor line background
  showLineNumbers?: boolean; // Show line numbers
  lineNumberWidth?: number;  // Width for line numbers
}
```

## Keyboard Bindings

When using `handleVirtualizedListKey`:

| Key | Action |
|-----|--------|
| `Up` / `k` | Move cursor up |
| `Down` / `j` | Move cursor down |
| `Shift+Up/Down` | Move cursor by 5 lines |
| `PageUp` | Scroll up one page |
| `PageDown` | Scroll down one page |
| `Home` | Scroll to top |
| `End` | Scroll to bottom |
| `Ctrl+Home` | Go to first line |
| `Ctrl+End` | Go to last line |
| `g` | Jump to first line |
| `G` | Jump to last line |
| `Enter` | Select current cursor position |

## Methods

### Visibility

```typescript
list.show();   // Show the list
list.hide();   // Hide the list
```

### Position

```typescript
list.setPosition(x, y);          // Set position
list.setDimensions(width, height); // Set dimensions
```

### Content

```typescript
list.setLines(lines);      // Replace all content
list.appendLine(line);     // Append single line
list.appendLines(lines);   // Append multiple lines
list.getLineCount();       // Get total line count
list.getLine(index);       // Get line at index
list.clear();              // Clear all content
```

### Scrolling

```typescript
list.scrollToLine(100);    // Scroll to line (centers it)
list.scrollToTop();        // Scroll to beginning
list.scrollToBottom();     // Scroll to end
list.scrollBy(10);         // Scroll by lines (+/-)
list.scrollPage(1);        // Scroll by pages (+/-)
list.getScrollInfo();      // Get scroll position info
```

### Selection

```typescript
list.select(50);           // Select a line
list.getSelected();        // Get selected line index
list.clearSelection();     // Clear selection
```

### Cursor Navigation

```typescript
list.cursorUp(5);          // Move cursor up
list.cursorDown(5);        // Move cursor down
list.setCursor(100);       // Set cursor to line
list.getCursor();          // Get cursor position
```

### Follow Mode

```typescript
list.follow(true);         // Enable auto-scroll on append
list.follow(false);        // Disable auto-scroll
list.isFollowing();        // Check follow mode state
```

### Style

```typescript
list.setStyle({
  fg: 0xccccccff,
  selectedBg: 0x0066ccff,
  showLineNumbers: true,
});
```

### Lifecycle

```typescript
list.refresh();   // Mark dirty for re-render
list.destroy();   // Remove entity and cleanup
```

## Input Handlers

### Keyboard Handler

<!-- blecsd-doccheck:ignore -->
```typescript
import { handleVirtualizedListKey } from 'blecsd';

// In your input loop
function onKeyDown(event) {
  if (handleVirtualizedListKey(list, event.key, event.ctrl, event.shift)) {
    // Key was handled
    return;
  }
  // Handle other keys
}
```

### Mouse Wheel Handler

<!-- blecsd-doccheck:ignore -->
```typescript
import { handleVirtualizedListWheel } from 'blecsd';

// In your input loop
function onWheel(event) {
  const direction = event.deltaY < 0 ? 'up' : 'down';
  handleVirtualizedListWheel(list, direction, 3);
}
```

## Example: Log Viewer

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld } from 'blecsd';
import { createVirtualizedList, handleVirtualizedListKey } from 'blecsd';
import * as fs from 'fs';

const world = createWorld();

// Create log viewer
const logViewer = createVirtualizedList(world, {
  x: 0,
  y: 0,
  width: 120,
  height: 40,
  style: {
    fg: 0xccccccff,
    bg: 0x1a1a1aff,
    cursorBg: 0x333333ff,
    showLineNumbers: true,
    lineNumberWidth: 6,
  },
  border: {
    type: BorderType.Single,
    fg: 0x666666ff,
  },
  maxLines: 100000,  // Keep last 100k lines
});

// Load initial file
const content = fs.readFileSync('app.log', 'utf8');
logViewer.setLines(content.split('\n'));

// Watch for new lines
fs.watchFile('app.log', () => {
  const newContent = fs.readFileSync('app.log', 'utf8');
  const newLines = newContent.split('\n');
  const existingCount = logViewer.getLineCount();

  if (newLines.length > existingCount) {
    const addedLines = newLines.slice(existingCount);
    logViewer.appendLines(addedLines);
  }
});

// Enable follow mode for real-time viewing
logViewer.follow(true);
```

## Example: Streaming Data

```typescript
const stream = createVirtualizedList(world, {
  x: 0, y: 0,
  width: 80, height: 24,
  maxLines: 10000,  // Rolling buffer
});

stream.follow(true);

// Simulate streaming data
setInterval(() => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] Event received`;
  stream.appendLine(message);
}, 100);

// User can scroll up to pause auto-scroll
// and scroll down to re-enable it
```

## Example: Code Editor Scrollback

```typescript
const editor = createVirtualizedList(world, {
  x: 0, y: 0,
  width: 100, height: 50,
  style: {
    showLineNumbers: true,
    lineNumberWidth: 5,
    fg: 0xd4d4d4ff,
    bg: 0x1e1e1eff,
    cursorBg: 0x264f78ff,
  },
});

// Load source file
const source = fs.readFileSync('src/main.ts', 'utf8');
editor.setLines(source.split('\n'));

// Jump to line
editor.setCursor(150);
editor.scrollToLine(150);
```

## Performance Characteristics

- **Memory**: O(n) for line storage, O(viewport) for rendering
- **Render time**: O(viewport + overscan), independent of total lines
- **Append**: O(1) amortized
- **Scroll**: O(1)
- **Line access**: O(log n) binary search on line offsets

The widget can efficiently handle:
- 10+ million lines
- High-frequency appends (1000+ lines/second)
- Large line widths (tested up to 10KB per line)

## Related

- [List Widget](./list.md) - Simple selectable list
- [ScrollableText Widget](./scrollableText.md) - Basic scrollable text
- [ListTable Widget](./listTable.md) - Tabular data with selection
