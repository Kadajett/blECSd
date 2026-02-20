# ScrollableText Widget

The ScrollableText widget is a thin wrapper over ScrollableBox optimized for read-only scrollable text content. It automatically enables scrolling (`alwaysScroll: true`) and is ideal for logs, help text, documentation, and other scrollable text displays.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createScrollableText, isScrollableText } from 'blecsd/widgets';

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
logView.destroy();
```

---

## Factory Function

### createScrollableText

Creates a new ScrollableText widget with the specified configuration.

```typescript
// Basic scrollable text
const textView = createScrollableText(world, addEntity(world), {
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
});
console.log('textView eid:', textView.eid);
console.log('logViewer eid:', logViewer.eid);
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
const stA = createScrollableText(world, addEntity(world));
console.log(stA.eid); // Entity ID number
stA.destroy();
```

### Visibility Methods

#### show

Shows the widget.

```typescript
const stB = createScrollableText(world, addEntity(world));
stB.show();
stB.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### hide

Hides the widget.

```typescript
const stC = createScrollableText(world, addEntity(world));
stC.hide();
stC.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
const stD = createScrollableText(world, addEntity(world));
stD.setPosition(20, 15);
stD.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### move

Moves the widget by a relative amount.

```typescript
const stE = createScrollableText(world, addEntity(world));
stE.move(5, -3);
stE.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content.

```typescript
const stF = createScrollableText(world, addEntity(world));
stF.setContent('New log entries...');
stF.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const stG = createScrollableText(world, addEntity(world));
const content = stG.getContent();
console.log('content:', content);
stG.destroy();
```

**Returns:** `string`

---

### Scroll Methods

#### scrollTo

Scrolls to an absolute position.

```typescript
const stH = createScrollableText(world, addEntity(world));
stH.scrollTo(0, 100); // Scroll to x=0, y=100
stH.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollBy

Scrolls by a relative amount.

```typescript
const stI = createScrollableText(world, addEntity(world));
stI.scrollBy(0, 10); // Scroll down 10 lines
stI.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToTop

Scrolls to the top.

```typescript
const stJ = createScrollableText(world, addEntity(world));
stJ.scrollToTop();
stJ.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToBottom

Scrolls to the bottom.

```typescript
const stK = createScrollableText(world, addEntity(world));
stK.scrollToBottom();
stK.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToLeft

Scrolls to the left edge.

```typescript
const stL = createScrollableText(world, addEntity(world));
stL.scrollToLeft();
stL.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### scrollToRight

Scrolls to the right edge.

```typescript
const stM = createScrollableText(world, addEntity(world));
stM.scrollToRight();
stM.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### setScrollPerc

Sets scroll position by percentage.

```typescript
const stN = createScrollableText(world, addEntity(world));
stN.setScrollPerc(0, 50); // Scroll to 50% vertically
stN.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### getScroll

Gets the current scroll position.

```typescript
const stO = createScrollableText(world, addEntity(world));
const scroll = stO.getScroll();
console.log('scroll position:', scroll.x, scroll.y);
stO.destroy();
```

**Returns:** `ScrollPosition`

#### getScrollPerc

Gets the current scroll position as percentages.

```typescript
const stP = createScrollableText(world, addEntity(world));
const perc = stP.getScrollPerc();
console.log('scroll percent:', perc.x, perc.y);
stP.destroy();
```

**Returns:** `ScrollPercentage`

---

### Scroll State Methods

#### isAtTop

Checks if scrolled to the top.

```typescript
const stQ = createScrollableText(world, addEntity(world));
if (stQ.isAtTop()) {
  console.log('At top');
}
stQ.destroy();
```

**Returns:** `boolean`

#### isAtBottom

Checks if scrolled to the bottom.

```typescript
const stR = createScrollableText(world, addEntity(world));
if (stR.isAtBottom()) {
  console.log('At bottom');
}
stR.destroy();
```

**Returns:** `boolean`

#### isAtLeft

Checks if scrolled to the left edge.

```typescript
const stS = createScrollableText(world, addEntity(world));
if (stS.isAtLeft()) {
  console.log('At left');
}
stS.destroy();
```

**Returns:** `boolean`

#### isAtRight

Checks if scrolled to the right edge.

```typescript
const stT = createScrollableText(world, addEntity(world));
if (stT.isAtRight()) {
  console.log('At right');
}
stT.destroy();
```

**Returns:** `boolean`

---

### Focus Methods

#### focus

Focuses the widget.

```typescript
const stU = createScrollableText(world, addEntity(world));
stU.focus();
stU.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### blur

Removes focus from the widget.

```typescript
const stV = createScrollableText(world, addEntity(world));
stV.blur();
stV.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### isFocused

Checks if the widget is currently focused.

```typescript
const stW = createScrollableText(world, addEntity(world));
const focused = stW.isFocused();
console.log('isFocused:', focused);
stW.destroy();
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const stX = createScrollableText(world, addEntity(world));
const childEid = addEntity(world);
stX.append(childEid);
stX.destroy();
```

**Returns:** `ScrollableTextWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const stY = createScrollableText(world, addEntity(world));
const children = stY.getChildren();
console.log('children count:', children.length);
stY.destroy();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
const stZ = createScrollableText(world, addEntity(world));
stZ.destroy();
```

---

## Helper Functions

### isScrollableText

Checks if an entity is a scrollable text widget.

```typescript
const stAA = createScrollableText(world, addEntity(world));
if (isScrollableText(world, stAA.eid)) {
  // Handle scrollable text logic
}
stAA.destroy();
```

**Returns:** `boolean`

---

## Types

### ScrollableTextConfig

Configuration for creating a scrollable text widget. Inherits all options from ScrollableBoxConfig except `alwaysScroll` (which is forced to `true`).

```typescript
interface ScrollableTextConfig {
  // Position
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly border?: { type?: string; fg?: string | number };
  readonly padding?: number;

  // Content
  readonly content?: string;

  // Scroll content size
  readonly scrollWidth?: number;
  readonly scrollHeight?: number;

  // Scrollbar configuration
  readonly scrollbar?: boolean | { mode?: string; fg?: string | number };
}
```

### ScrollableTextWidget

The scrollable text widget interface. Same as ScrollableBoxWidget.

```typescript
type ScrollableTextWidget = {
  readonly eid: number;
  show(): ScrollableTextWidget;
  hide(): ScrollableTextWidget;
  setPosition(x: number, y: number): ScrollableTextWidget;
  move(dx: number, dy: number): ScrollableTextWidget;
  setContent(text: string): ScrollableTextWidget;
  getContent(): string;
  scrollTo(x: number, y: number): ScrollableTextWidget;
  scrollBy(dx: number, dy: number): ScrollableTextWidget;
  scrollToTop(): ScrollableTextWidget;
  scrollToBottom(): ScrollableTextWidget;
  scrollToLeft(): ScrollableTextWidget;
  scrollToRight(): ScrollableTextWidget;
  setScrollPerc(x: number, y: number): ScrollableTextWidget;
  getScroll(): { x: number; y: number };
  getScrollPerc(): { x: number; y: number };
  isAtTop(): boolean;
  isAtBottom(): boolean;
  isAtLeft(): boolean;
  isAtRight(): boolean;
  focus(): ScrollableTextWidget;
  blur(): ScrollableTextWidget;
  isFocused(): boolean;
  append(child: number): ScrollableTextWidget;
  getChildren(): number[];
  destroy(): void;
};
```

---

## Examples

### Log Viewer

```typescript
const logViewerEx = createScrollableText(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  border: { type: 'line' },
  scrollbar: { mode: 'visible' },
});

// Add log entries
function appendLog(message: string) {
  const current = logViewerEx.getContent();
  const timestamp = new Date().toISOString();
  logViewerEx.setContent(`${current}[${timestamp}] ${message}\n`);
  logViewerEx.scrollToBottom();
}

appendLog('Application started');
appendLog('Loading configuration...');
appendLog('Ready');
logViewerEx.destroy();
```

### Help Text Display

```typescript
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
`;

const helpView = createScrollableText(world, addEntity(world), {
  left: 10,
  top: 5,
  width: 60,
  height: 15,
  content: helpText.trim(),
  border: { type: 'line' },
  padding: 1,
});
helpView.destroy();
```

### Auto-Scrolling Terminal Output

```typescript
const terminalView = createScrollableText(world, addEntity(world), {
  width: 80,
  height: 24,
  fg: '#00ff00',
  bg: '#000000',
  border: { type: 'line', fg: '#00ff00' },
});

// Simulate terminal output with auto-scroll
function output(line: string) {
  const current = terminalView.getContent();
  terminalView.setContent(current + line + '\n');

  // Auto-scroll to bottom for new content
  terminalView.scrollToBottom();
}

output('$ ls -la');
output('total 32');
output('drwxr-xr-x  5 user user 4096 Jan 1 12:00 .');
output('drwxr-xr-x 10 user user 4096 Jan 1 11:00 ..');
terminalView.destroy();
```

### Method Chaining

```typescript
const chainedText = createScrollableText(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 60,
  height: 20,
})
  .setContent('Line 1\nLine 2\nLine 3\n...')
  .setPosition(10, 5)
  .scrollToBottom()
  .show();
chainedText.destroy();
```

---

## See Also

- [ScrollableBox Widget](./scrollableBox.md) - Base scrollable container
- [Text Widget](./text.md) - Non-scrollable text display
- [Box Widget](./box.md) - Basic container
