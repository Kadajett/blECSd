# ScrollableText Widget

The ScrollableText widget is a thin wrapper over ScrollableBox optimized for read-only scrollable text content. It automatically enables scrolling (`alwaysScroll: true`) and is ideal for logs, help text, documentation, and other scrollable text displays.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a scrollable text area for logs
const logView = createScrollableText(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  content: 'Log entry 1\nLog entry 2\nLog entry 3\n...',
  scrollbar: { mode: 'visible' },
});

// Scroll to bottom to see latest logs
logView.scrollToBottom();
```

---

## Factory Function

### createScrollableText

Creates a new ScrollableText widget with the specified configuration.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic scrollable text
const textView = createScrollableText(world, eid, {
  width: 60,
  height: 20,
  content: 'Your scrollable content here...',
});

// Log viewer with scrollbar
const logViewer = createScrollableText(world, addEntity(world), {
  width: 80,
  height: 24,
  border: { type: 'line' },
  scrollbar: { mode: 'visible' },
  keysScroll: true,
  mouseScroll: true,
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see ScrollableTextConfig)

**Returns:** `ScrollableTextWidget` interface

**Note:** The `alwaysScroll` option is automatically set to `true` and cannot be overridden.

---

## ScrollableTextWidget Interface

The ScrollableText widget provides the same API as ScrollableBox.

### Properties

#### eid

The underlying entity ID.

```typescript
const text = createScrollableText(world, eid);
console.log(text.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the widget.

```typescript
text.show();
```

**Returns:** `ScrollableTextWidget` for chaining

#### hide

Hides the widget.

```typescript
text.hide();
```

**Returns:** `ScrollableTextWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
text.setPosition(20, 15);
```

**Returns:** `ScrollableTextWidget` for chaining

#### move

Moves the widget by a relative amount.

```typescript
text.move(5, -3);
```

**Returns:** `ScrollableTextWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content.

```typescript
text.setContent('New log entries...');
```

**Returns:** `ScrollableTextWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const content = text.getContent();
```

**Returns:** `string`

---

### Scroll Methods

#### scrollTo

Scrolls to an absolute position.

```typescript
text.scrollTo(0, 100); // Scroll to x=0, y=100
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollBy

Scrolls by a relative amount.

```typescript
text.scrollBy(0, 10); // Scroll down 10 lines
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToTop

Scrolls to the top.

```typescript
text.scrollToTop();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToBottom

Scrolls to the bottom.

```typescript
text.scrollToBottom();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToLeft

Scrolls to the left edge.

```typescript
text.scrollToLeft();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToRight

Scrolls to the right edge.

```typescript
text.scrollToRight();
```

**Returns:** `ScrollableTextWidget` for chaining

#### setScrollPerc

Sets scroll position by percentage.

```typescript
text.setScrollPerc(0, 50); // Scroll to 50% vertically
```

**Returns:** `ScrollableTextWidget` for chaining

#### getScroll

Gets the current scroll position.

```typescript
const scroll = text.getScroll();
console.log(scroll.x, scroll.y);
```

**Returns:** `ScrollPosition`

#### getScrollPerc

Gets the current scroll position as percentages.

```typescript
const perc = text.getScrollPerc();
console.log(perc.x, perc.y); // 0-100
```

**Returns:** `ScrollPercentage`

---

### Scroll State Methods

#### isAtTop

Checks if scrolled to the top.

```typescript
if (text.isAtTop()) {
  console.log('At top');
}
```

**Returns:** `boolean`

#### isAtBottom

Checks if scrolled to the bottom.

```typescript
if (text.isAtBottom()) {
  console.log('At bottom');
}
```

**Returns:** `boolean`

#### isAtLeft

Checks if scrolled to the left edge.

```typescript
if (text.isAtLeft()) {
  console.log('At left');
}
```

**Returns:** `boolean`

#### isAtRight

Checks if scrolled to the right edge.

```typescript
if (text.isAtRight()) {
  console.log('At right');
}
```

**Returns:** `boolean`

---

### Focus Methods

#### focus

Focuses the widget.

```typescript
text.focus();
```

**Returns:** `ScrollableTextWidget` for chaining

#### blur

Removes focus from the widget.

```typescript
text.blur();
```

**Returns:** `ScrollableTextWidget` for chaining

#### isFocused

Checks if the widget is currently focused.

```typescript
const focused = text.isFocused();
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const childEid = addEntity(world);
text.append(childEid);
```

**Returns:** `ScrollableTextWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const children = text.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
text.destroy();
```

---

## Helper Functions

### isScrollableText

Checks if an entity is a scrollable text widget.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isScrollableText } from 'blecsd';

if (isScrollableText(world, entity)) {
  // Handle scrollable text logic
}
```

**Returns:** `boolean`

---

## Types

### ScrollableTextConfig

Configuration for creating a scrollable text widget. Inherits all options from ScrollableBoxConfig except `alwaysScroll` (which is forced to `true`).

```typescript
interface ScrollableTextConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly border?: BorderConfig;
  readonly padding?: PaddingConfig;

  // Content
  readonly content?: string;
  readonly align?: Align;
  readonly valign?: VAlign;

  // Scroll content size
  readonly contentWidth?: number;
  readonly contentHeight?: number;

  // Scrollbar configuration
  readonly scrollbar?: ScrollbarConfig;

  // Input handling
  readonly keysScroll?: boolean;
  readonly mouseScroll?: boolean;
}
```

### ScrollableTextWidget

The scrollable text widget interface. Same as ScrollableBoxWidget.

```typescript
type ScrollableTextWidget = ScrollableBoxWidget;
```

---

## Examples

### Log Viewer

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();

const logViewer = createScrollableText(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  border: { type: 'line' },
  scrollbar: { mode: 'visible' },
  keysScroll: true,
});

// Add log entries
function appendLog(message: string) {
  const current = logViewer.getContent();
  const timestamp = new Date().toISOString();
  logViewer.setContent(`${current}[${timestamp}] ${message}\n`);
  logViewer.scrollToBottom();
}

appendLog('Application started');
appendLog('Loading configuration...');
appendLog('Ready');
```

### Help Text Display

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();

const helpText = `
KEYBOARD SHORTCUTS
==================

Navigation:
  Arrow keys    Move cursor
  Page Up/Down  Scroll by page
  Home/End      Go to start/end

Editing:
  Enter         New line
  Backspace     Delete character
  Ctrl+S        Save file

For more help, visit https://example.com/docs
`;

const helpView = createScrollableText(world, addEntity(world), {
  left: 10,
  top: 5,
  width: 60,
  height: 15,
  content: helpText.trim(),
  border: { type: 'line', ch: 'rounded' },
  padding: 1,
});
```

### Auto-Scrolling Terminal Output

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();

const terminal = createScrollableText(world, addEntity(world), {
  width: 80,
  height: 24,
  fg: '#00ff00',
  bg: '#000000',
  border: { type: 'line', fg: '#00ff00' },
});

// Simulate terminal output with auto-scroll
function output(line: string) {
  const current = terminal.getContent();
  terminal.setContent(current + line + '\n');

  // Auto-scroll to bottom for new content
  terminal.scrollToBottom();
}

output('$ ls -la');
output('total 32');
output('drwxr-xr-x  5 user user 4096 Jan 1 12:00 .');
output('drwxr-xr-x 10 user user 4096 Jan 1 11:00 ..');
```

### Method Chaining

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createScrollableText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const text = createScrollableText(world, eid, {
  left: 0,
  top: 0,
  width: 60,
  height: 20,
  contentHeight: 100,
})
  .setContent('Line 1\nLine 2\nLine 3\n...')
  .setPosition(10, 5)
  .scrollToBottom()
  .show();
```

---

## See Also

- [ScrollableBox Widget](./scrollableBox.md) - Base scrollable container
- [Text Widget](./text.md) - Non-scrollable text display
- [Box Widget](./box.md) - Basic container
