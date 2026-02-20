# ScrollableBox Widget

The ScrollableBox widget is a container that supports scrolling content. It combines Box functionality with scrollable content support, enabling keyboard and mouse-based scrolling with configurable scrollbars.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createScrollableBox,
  isScrollableBox,
  isMouseScrollEnabled,
  isKeysScrollEnabled,
  ScrollableBoxConfigSchema,
} from 'blecsd/widgets';

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
// Basic scrollable box
const scrollBoxA = createScrollableBox(world, addEntity(world));

// Full configuration
const styledScrollBox = createScrollableBox(world, addEntity(world), {
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
console.log(scrollBoxA.eid);
console.log(styledScrollBox.eid);
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
const sbA = createScrollableBox(world, addEntity(world));
console.log(sbA.eid); // Entity ID number
sbA.destroy();
```

### Visibility Methods

#### show

Shows the scrollable box.

```typescript
const sbB = createScrollableBox(world, addEntity(world));
sbB.show();
sbB.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### hide

Hides the scrollable box.

```typescript
const sbC = createScrollableBox(world, addEntity(world));
sbC.hide();
sbC.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
const sbD = createScrollableBox(world, addEntity(world));
sbD.setPosition(20, 15);
sbD.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### move

Moves the scrollable box by a relative amount.

```typescript
const sbE = createScrollableBox(world, addEntity(world));
sbE.move(5, -3); // Move right 5, up 3
sbE.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content.

```typescript
const sbF = createScrollableBox(world, addEntity(world));
sbF.setContent('New content');
sbF.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const sbG = createScrollableBox(world, addEntity(world));
const sbContent = sbG.getContent();
console.log(sbContent);
sbG.destroy();
```

**Returns:** `string`

---

### Scroll Methods

#### scrollTo

Scrolls to an absolute position.

```typescript
const sbH = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
sbH.scrollTo(0, 100); // Scroll to Y=100
sbH.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### scrollBy

Scrolls by a delta amount.

```typescript
const sbI = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
sbI.scrollBy(0, 10); // Scroll down 10 units
sbI.scrollBy(0, -5); // Scroll up 5 units
sbI.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### setScrollPerc

Sets scroll position by percentage (0-100).

```typescript
const sbJ = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
sbJ.setScrollPerc(0, 50);  // Scroll to 50% vertically
sbJ.setScrollPerc(0, 100); // Scroll to bottom
sbJ.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### getScrollPerc

Gets the current scroll percentage.

```typescript
const sbK = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
const perc = sbK.getScrollPerc();
console.log(perc);
sbK.destroy();
```

**Returns:** `ScrollPercentage`

#### getScroll

Gets the current scroll position.

```typescript
const sbL = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
const scroll = sbL.getScroll();
console.log(scroll);
sbL.destroy();
```

**Returns:** `ScrollPosition`

#### setScrollSize

Sets the total scrollable content size.

```typescript
const sbM = createScrollableBox(world, addEntity(world));
sbM.setScrollSize(200, 500);
sbM.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### setViewport

Sets the viewport (visible area) size.

```typescript
const sbN = createScrollableBox(world, addEntity(world));
sbN.setViewport(80, 20);
sbN.destroy();
```

**Returns:** `ScrollableBoxWidget` for chaining

#### getScrollable

Gets the full scrollable data.

```typescript
const sbO = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
const scrollable = sbO.getScrollable();
console.log(scrollable);
sbO.destroy();
```

**Returns:** `ScrollableData | undefined`

---

### Quick Scroll Methods

#### scrollToTop / scrollToBottom / scrollToLeft / scrollToRight

```typescript
const sbP = createScrollableBox(world, addEntity(world), { scrollHeight: 200 });
sbP.scrollToTop();
sbP.scrollToBottom();
sbP.scrollToLeft();
sbP.scrollToRight();
sbP.destroy();
```

---

### Scroll Query Methods

#### canScroll / canScrollX / canScrollY

```typescript
const sbQ = createScrollableBox(world, addEntity(world), { scrollHeight: 200, height: 20 });
const canS = sbQ.canScroll();
const canSX = sbQ.canScrollX();
const canSY = sbQ.canScrollY();
console.log(canS, canSX, canSY);
sbQ.destroy();
```

#### isAtTop / isAtBottom / isAtLeft / isAtRight

```typescript
const sbR = createScrollableBox(world, addEntity(world));
const atTop = sbR.isAtTop();
const atBottom = sbR.isAtBottom();
const atLeft = sbR.isAtLeft();
const atRight = sbR.isAtRight();
console.log(atTop, atBottom, atLeft, atRight);
sbR.destroy();
```

---

### Focus Methods

#### focus / blur / isFocused

```typescript
const sbS = createScrollableBox(world, addEntity(world));
sbS.focus();
sbS.blur();
const sbFocused = sbS.isFocused();
console.log(sbFocused);
sbS.destroy();
```

---

### Children Methods

#### append / getChildren

```typescript
const sbT = createScrollableBox(world, addEntity(world));
const childEid = addEntity(world);
sbT.append(childEid);
const sbChildren = sbT.getChildren();
console.log(sbChildren.length);
sbT.destroy();
```

---

### Lifecycle Methods

#### destroy

```typescript
const sbU = createScrollableBox(world, addEntity(world));
sbU.destroy();
```

---

## Helper Functions

### isScrollableBox

```typescript
const sbV = createScrollableBox(world, addEntity(world));
if (isScrollableBox(world, sbV.eid)) {
  // Handle scrollable-box-specific logic
}
sbV.destroy();
```

### isMouseScrollEnabled

```typescript
const sbW = createScrollableBox(world, addEntity(world), { mouse: true });
if (isMouseScrollEnabled(world, sbW.eid)) {
  // Mouse scroll is enabled
}
sbW.destroy();
```

### isKeysScrollEnabled

```typescript
const sbX = createScrollableBox(world, addEntity(world), { keys: true });
if (isKeysScrollEnabled(world, sbX.eid)) {
  // Keyboard scroll is enabled
}
sbX.destroy();
```

---

## Types

### ScrollableBoxConfig

Configuration for creating a scrollable box widget.

```typescript
interface ScrollableBoxConfig {
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly border?: { type?: string; fg?: string | number };
  readonly padding?: number;
  readonly content?: string;
  readonly scrollbar?: boolean | { mode?: string; fg?: string | number };
  readonly alwaysScroll?: boolean;
  readonly mouse?: boolean;
  readonly keys?: boolean;
  readonly scrollWidth?: number;
  readonly scrollHeight?: number;
  readonly scrollX?: number;
  readonly scrollY?: number;
}
```

### ScrollbarMode

```typescript
type ScrollbarMode = 'auto' | 'visible' | 'hidden';
```

---

## Zod Schemas

```typescript
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
const basicScrollBox = createScrollableBox(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  scrollHeight: 100,
  border: { type: 'line' },
});
console.log(basicScrollBox.eid);
```

### Log Viewer with Auto-Scroll

```typescript
const logViewer = createScrollableBox(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 20,
  scrollbar: { mode: 'auto' },
  alwaysScroll: true,
});

function addLog(message: string) {
  const currentContent = logViewer.getContent();
  const newContent = currentContent ? `${currentContent}\n${message}` : message;
  logViewer.setContent(newContent);
  logViewer.scrollToBottom();
}
addLog('Server started');
addLog('Listening on port 3000');
```

### Keyboard Navigation

```typescript
const navBox = createScrollableBox(world, addEntity(world), {
  width: 60,
  height: 20,
  scrollHeight: 200,
  keys: true,
});

function onKeyPress(key: string) {
  if (!isKeysScrollEnabled(world, navBox.eid)) return;
  switch (key) {
    case 'up': navBox.scrollBy(0, -1); break;
    case 'down': navBox.scrollBy(0, 1); break;
    case 'home': navBox.scrollToTop(); break;
    case 'end': navBox.scrollToBottom(); break;
  }
}
onKeyPress('down');
```

### Method Chaining

```typescript
const chainedScrollBox = createScrollableBox(world, addEntity(world), { left: 0, top: 0 })
  .setPosition(10, 10)
  .setScrollSize(100, 500)
  .setViewport(80, 20)
  .setContent('Scrollable content here...')
  .scrollTo(0, 100)
  .focus()
  .show();
console.log(chainedScrollBox.eid);
```

---

## See Also

- [Box Widget](./box.md) - Non-scrollable container
- [Scrollable Component](../scrollable.md) - Underlying scroll component
- [Position Component](../position.md) - Entity positioning
- [Dimensions Component](../dimensions.md) - Widget sizing
