# ScrollableBox Widget

The ScrollableBox widget is a container that supports scrolling content. It combines Box functionality with scrollable content support, enabling keyboard and mouse-based scrolling with configurable scrollbars.

## Overview

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a scrollable container
const scrollBox = createScrollableBox(world, eid, {
  left: 10,
  top: 5,
  width: 40,
  height: 10,
  scrollHeight: 100,  // Content is 100 lines tall
  border: { type: 'line' },
  scrollbar: true,
});

// Scroll down
scrollBox.scrollBy(0, 5);

// Scroll to 50%
scrollBox.setScrollPerc(0, 50);

// Jump to bottom
scrollBox.scrollToBottom();
```

---

## Factory Function

### createScrollableBox

Creates a new ScrollableBox widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic scrollable box
const scrollBox = createScrollableBox(world, eid);

// Full configuration
const styledScrollBox = createScrollableBox(world, eid, {
  left: 5,
  top: 3,
  width: 60,
  height: 20,
  fg: '#ffffff',
  bg: '#000080',
  border: { type: 'line', fg: '#00ff00' },
  padding: 1,
  scrollWidth: 100,
  scrollHeight: 500,
  scrollbar: {
    mode: 'auto',
    fg: '#ffffff',
    bg: '#333333',
  },
  alwaysScroll: false,
  mouse: true,
  keys: true,
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see ScrollableBoxConfig)

**Returns:** `ScrollableBoxWidget` interface

---

## ScrollableBoxWidget Interface

The scrollable box widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const scrollBox = createScrollableBox(world, eid);
console.log(scrollBox.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the scrollable box.

```typescript
scrollBox.show();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### hide

Hides the scrollable box.

```typescript
scrollBox.hide();
```

**Returns:** `ScrollableBoxWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
scrollBox.setPosition(20, 15);
```

**Returns:** `ScrollableBoxWidget` for chaining

#### move

Moves the scrollable box by a relative amount.

```typescript
scrollBox.move(5, -3); // Move right 5, up 3
```

**Returns:** `ScrollableBoxWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content.

```typescript
scrollBox.setContent('New content');
```

**Returns:** `ScrollableBoxWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const content = scrollBox.getContent();
```

**Returns:** `string`

---

### Scroll Methods

#### scrollTo

Scrolls to an absolute position.

```typescript
scrollBox.scrollTo(0, 100); // Scroll to Y=100
```

**Parameters:**
- `x` - Target horizontal scroll position
- `y` - Target vertical scroll position

**Returns:** `ScrollableBoxWidget` for chaining

#### scrollBy

Scrolls by a delta amount.

```typescript
scrollBox.scrollBy(0, 10); // Scroll down 10 units
scrollBox.scrollBy(0, -5); // Scroll up 5 units
```

**Parameters:**
- `dx` - Horizontal scroll delta
- `dy` - Vertical scroll delta

**Returns:** `ScrollableBoxWidget` for chaining

#### setScrollPerc

Sets scroll position by percentage (0-100).

```typescript
scrollBox.setScrollPerc(0, 50); // Scroll to 50% vertically
scrollBox.setScrollPerc(0, 100); // Scroll to bottom
```

**Parameters:**
- `percX` - Horizontal scroll percentage (0-100)
- `percY` - Vertical scroll percentage (0-100)

**Returns:** `ScrollableBoxWidget` for chaining

#### getScrollPerc

Gets the current scroll percentage.

```typescript
const perc = scrollBox.getScrollPerc();
// perc = { x: 0, y: 50 }
```

**Returns:** `ScrollPercentage` - Object with `x` and `y` percentages (0-100)

#### getScroll

Gets the current scroll position.

```typescript
const scroll = scrollBox.getScroll();
// scroll = { x: 0, y: 100 }
```

**Returns:** `ScrollPosition` - Object with `x` and `y` coordinates

#### setScrollSize

Sets the total scrollable content size.

```typescript
scrollBox.setScrollSize(200, 500); // Content is 200x500
```

**Parameters:**
- `width` - Total scrollable content width
- `height` - Total scrollable content height

**Returns:** `ScrollableBoxWidget` for chaining

#### setViewport

Sets the viewport (visible area) size.

```typescript
scrollBox.setViewport(80, 20); // Viewport is 80x20
```

**Parameters:**
- `width` - Viewport width
- `height` - Viewport height

**Returns:** `ScrollableBoxWidget` for chaining

#### getScrollable

Gets the full scrollable data.

```typescript
const data = scrollBox.getScrollable();
// data = { scrollX, scrollY, scrollWidth, scrollHeight, viewportWidth, viewportHeight, ... }
```

**Returns:** `ScrollableData | undefined`

---

### Quick Scroll Methods

#### scrollToTop

Scrolls to the top.

```typescript
scrollBox.scrollToTop();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### scrollToBottom

Scrolls to the bottom.

```typescript
scrollBox.scrollToBottom();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### scrollToLeft

Scrolls to the left edge.

```typescript
scrollBox.scrollToLeft();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### scrollToRight

Scrolls to the right edge.

```typescript
scrollBox.scrollToRight();
```

**Returns:** `ScrollableBoxWidget` for chaining

---

### Scroll Query Methods

#### canScroll

Checks if the content can scroll (content exceeds viewport).

```typescript
if (scrollBox.canScroll()) {
  // Content is larger than viewport
}
```

**Returns:** `boolean`

#### canScrollX

Checks if horizontal scrolling is possible.

```typescript
const canScrollHorizontally = scrollBox.canScrollX();
```

**Returns:** `boolean`

#### canScrollY

Checks if vertical scrolling is possible.

```typescript
const canScrollVertically = scrollBox.canScrollY();
```

**Returns:** `boolean`

#### isAtTop

Checks if scrolled to the top.

```typescript
if (scrollBox.isAtTop()) {
  // At the beginning
}
```

**Returns:** `boolean`

#### isAtBottom

Checks if scrolled to the bottom.

```typescript
if (scrollBox.isAtBottom()) {
  // At the end
}
```

**Returns:** `boolean`

#### isAtLeft

Checks if scrolled to the left edge.

```typescript
const atLeft = scrollBox.isAtLeft();
```

**Returns:** `boolean`

#### isAtRight

Checks if scrolled to the right edge.

```typescript
const atRight = scrollBox.isAtRight();
```

**Returns:** `boolean`

---

### Focus Methods

#### focus

Focuses the scrollable box.

```typescript
scrollBox.focus();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### blur

Removes focus.

```typescript
scrollBox.blur();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### isFocused

Checks if currently focused.

```typescript
const focused = scrollBox.isFocused();
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const childEid = addEntity(world);
scrollBox.append(childEid);
```

**Returns:** `ScrollableBoxWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const children = scrollBox.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
scrollBox.destroy();
```

---

## Helper Functions

### isScrollableBox

Checks if an entity is a scrollable box widget.

```typescript
import { isScrollableBox } from 'blecsd';

if (isScrollableBox(world, entity)) {
  // Handle scrollable-box-specific logic
}
```

**Returns:** `boolean`

---

### isMouseScrollEnabled

Checks if mouse scrolling is enabled.

```typescript
import { isMouseScrollEnabled } from 'blecsd';

if (isMouseScrollEnabled(world, entity)) {
  // Mouse scroll is enabled
}
```

**Returns:** `boolean`

---

### isKeysScrollEnabled

Checks if keyboard scrolling is enabled.

```typescript
import { isKeysScrollEnabled } from 'blecsd';

if (isKeysScrollEnabled(world, entity)) {
  // Keyboard scroll is enabled
}
```

**Returns:** `boolean`

---

## Types

### ScrollableBoxConfig

Configuration for creating a scrollable box widget.

```typescript
interface ScrollableBoxConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly right?: PositionValue;
  readonly bottom?: PositionValue;
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

  // Scrolling
  readonly scrollbar?: boolean | ScrollbarConfig;
  readonly alwaysScroll?: boolean;
  readonly mouse?: boolean;      // Default: true
  readonly keys?: boolean;       // Default: true
  readonly scrollWidth?: number;
  readonly scrollHeight?: number;
  readonly scrollX?: number;
  readonly scrollY?: number;
}
```

### ScrollbarConfig

Scrollbar configuration.

```typescript
interface ScrollbarConfig {
  readonly mode?: ScrollbarMode;  // 'auto' | 'visible' | 'hidden'
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly trackChar?: string;
  readonly thumbChar?: string;
}
```

### ScrollbarMode

Scrollbar visibility mode.

```typescript
type ScrollbarMode = 'auto' | 'visible' | 'hidden';
```

### ScrollableBoxWidget

The scrollable box widget interface.

```typescript
interface ScrollableBoxWidget {
  readonly eid: Entity;

  // Visibility
  show(): ScrollableBoxWidget;
  hide(): ScrollableBoxWidget;

  // Position
  move(dx: number, dy: number): ScrollableBoxWidget;
  setPosition(x: number, y: number): ScrollableBoxWidget;

  // Content
  setContent(text: string): ScrollableBoxWidget;
  getContent(): string;

  // Focus
  focus(): ScrollableBoxWidget;
  blur(): ScrollableBoxWidget;
  isFocused(): boolean;

  // Children
  append(child: Entity): ScrollableBoxWidget;
  getChildren(): Entity[];

  // Scrolling
  scrollTo(x: number, y: number): ScrollableBoxWidget;
  scrollBy(dx: number, dy: number): ScrollableBoxWidget;
  setScrollPerc(percX: number, percY: number): ScrollableBoxWidget;
  getScrollPerc(): ScrollPercentage;
  getScroll(): ScrollPosition;
  setScrollSize(width: number, height: number): ScrollableBoxWidget;
  setViewport(width: number, height: number): ScrollableBoxWidget;
  getScrollable(): ScrollableData | undefined;
  scrollToTop(): ScrollableBoxWidget;
  scrollToBottom(): ScrollableBoxWidget;
  scrollToLeft(): ScrollableBoxWidget;
  scrollToRight(): ScrollableBoxWidget;
  canScroll(): boolean;
  canScrollX(): boolean;
  canScrollY(): boolean;
  isAtTop(): boolean;
  isAtBottom(): boolean;
  isAtLeft(): boolean;
  isAtRight(): boolean;

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
import { ScrollableBoxConfigSchema } from 'blecsd';

// Validate configuration
const result = ScrollableBoxConfigSchema.safeParse({
  width: 60,
  height: 20,
  scrollHeight: 200,
  scrollbar: true,
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Basic Scrollable Container

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const scrollBox = createScrollableBox(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  scrollHeight: 100,
  border: { type: 'line' },
});
```

### Log Viewer with Auto-Scroll

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const logViewer = createScrollableBox(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  scrollbar: { mode: 'auto' },
  alwaysScroll: true,
});

// Add log entries
function addLog(message: string) {
  const currentContent = logViewer.getContent();
  const newContent = currentContent ? `${currentContent}\n${message}` : message;
  logViewer.setContent(newContent);

  // Auto-scroll to bottom for new logs
  logViewer.scrollToBottom();
}
```

### Scroll Position Indicator

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const content = createScrollableBox(world, eid, {
  width: 60,
  height: 20,
  scrollHeight: 100,
});

// Display scroll percentage
function updateStatusBar() {
  const perc = content.getScrollPerc();
  console.log(`Scroll position: ${perc.y.toFixed(0)}%`);

  if (content.isAtTop()) {
    console.log('At top');
  } else if (content.isAtBottom()) {
    console.log('At bottom');
  }
}
```

### Keyboard Navigation

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox, isKeysScrollEnabled } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const scrollBox = createScrollableBox(world, eid, {
  width: 60,
  height: 20,
  scrollHeight: 200,
  keys: true,  // Enable keyboard scrolling
});

// Handle keyboard input (in your input handler)
function onKeyPress(key: string) {
  if (!isKeysScrollEnabled(world, scrollBox.eid)) return;

  switch (key) {
    case 'up':
      scrollBox.scrollBy(0, -1);
      break;
    case 'down':
      scrollBox.scrollBy(0, 1);
      break;
    case 'pageup':
      scrollBox.scrollBy(0, -10);
      break;
    case 'pagedown':
      scrollBox.scrollBy(0, 10);
      break;
    case 'home':
      scrollBox.scrollToTop();
      break;
    case 'end':
      scrollBox.scrollToBottom();
      break;
  }
}
```

### Method Chaining

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createScrollableBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const scrollBox = createScrollableBox(world, eid, { left: 0, top: 0 })
  .setPosition(10, 10)
  .setScrollSize(100, 500)
  .setViewport(80, 20)
  .setContent('Scrollable content here...')
  .scrollTo(0, 100)
  .focus()
  .show();
```

---

## See Also

- [Box Widget](./box.md) - Non-scrollable container
- [Scrollable Component](../components/scrollable.md) - Underlying scroll component
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
