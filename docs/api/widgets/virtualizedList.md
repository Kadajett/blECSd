# VirtualizedList Widget

The VirtualizedList widget provides high-performance rendering for large datasets. It uses virtualization to only render visible lines plus a configurable overscan buffer, enabling smooth handling of millions of lines.

## Import

```typescript
import { createWorld } from 'blecsd/core';
import {
  createVirtualizedList,
  isVirtualizedList,
  handleVirtualizedListKey,
  handleVirtualizedListWheel,
} from 'blecsd/widgets';

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
const x = 5; const y = 2; const width = 80; const height = 24;
list.setPosition(x, y);          // Set position
list.setDimensions(width, height); // Set dimensions
```

### Content

```typescript
list.setLines(['a', 'b', 'c']);  // Replace all content
list.appendLine('line');          // Append single line
list.appendLines(['x', 'y']);     // Append multiple lines
list.getLineCount();              // Get total line count
list.getLine(0);                  // Get line at index
list.clear();                     // Clear all content
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

```typescript
// In your input loop
function onKeyDown(event: { key: string; ctrl: boolean; shift: boolean }) {
  if (handleVirtualizedListKey(list, event.key, event.ctrl, event.shift)) {
    // Key was handled
    return;
  }
  // Handle other keys
}
void onKeyDown;
```

### Mouse Wheel Handler

```typescript
// In your input loop
function onWheel(event: { deltaY: number }) {
  const direction = event.deltaY < 0 ? 'up' : 'down';
  handleVirtualizedListWheel(list, direction, 3);
}
void onWheel;
```

## Example: Log Viewer

```typescript
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
    fg: 0x666666ff,
  },
  maxLines: 100000,  // Keep last 100k lines
});

// Load initial content
const logLines = ['2024-01-01 INFO Server started', '2024-01-01 INFO Listening on :3000'];
logViewer.setLines(logLines);

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

// Append streaming data
const timestamp = new Date().toISOString();
const message = `[${timestamp}] Event received`;
stream.appendLine(message);
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

// Load source lines
const sourceLines = ['function main() {', '  console.log("hello");', '}'];
editor.setLines(sourceLines);

// Jump to line
editor.setCursor(2);
editor.scrollToLine(2);
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
