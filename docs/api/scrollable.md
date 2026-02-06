# Scrollable Component

The Scrollable component adds scrolling support to entities, enabling content larger than the visible area to be navigated via scroll position.

## ScrollbarVisibility Enum

Defines the visibility mode for scrollbars.

```typescript
import { ScrollbarVisibility } from 'blecsd';

// Available visibility modes
ScrollbarVisibility.Hidden  // 0 - Scrollbar always hidden
ScrollbarVisibility.Visible // 1 - Scrollbar always visible
ScrollbarVisibility.Auto    // 2 - Scrollbar visible only when content overflows
```

---

## Scrollable Component

The Scrollable component stores scroll state using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Scrollable } from 'blecsd';

// Component arrays
Scrollable.scrollX          // Float32Array - Horizontal scroll offset
Scrollable.scrollY          // Float32Array - Vertical scroll offset
Scrollable.scrollWidth      // Float32Array - Total scrollable content width
Scrollable.scrollHeight     // Float32Array - Total scrollable content height
Scrollable.scrollbarVisible // Uint8Array   - Scrollbar visibility mode (ScrollbarVisibility enum)
Scrollable.trackVisible     // Uint8Array   - Whether scroll track is visible (0=no, 1=yes)
Scrollable.alwaysScroll     // Uint8Array   - Always show scrollbar (0=no, 1=yes)
```

---

## Functions

### hasScrollable

Checks if an entity has a Scrollable component.

```typescript
import { createWorld, addEntity, hasScrollable, setScrollable } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

hasScrollable(world, eid); // false

setScrollable(world, eid, { scrollHeight: 500 });
hasScrollable(world, eid); // true
```

---

### setScrollable

Makes an entity scrollable with the given options. Adds the Scrollable component if not already present.

```typescript
import { createWorld, addEntity, setScrollable, ScrollbarVisibility } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Make entity scrollable with content size
setScrollable(world, eid, {
  scrollWidth: 800,
  scrollHeight: 1000,
  scrollbarVisible: ScrollbarVisibility.Auto,
});

// Configure with all options
setScrollable(world, eid, {
  scrollX: 0,
  scrollY: 100,
  scrollWidth: 800,
  scrollHeight: 1000,
  scrollbarVisible: ScrollbarVisibility.Visible,
  trackVisible: true,
  alwaysScroll: false,
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Scrollable configuration options
  - `scrollX` - Initial horizontal scroll offset
  - `scrollY` - Initial vertical scroll offset
  - `scrollWidth` - Total scrollable width
  - `scrollHeight` - Total scrollable height
  - `scrollbarVisible` - Scrollbar visibility mode (ScrollbarVisibility enum)
  - `trackVisible` - Whether scroll track is visible
  - `alwaysScroll` - Always show scrollbar even when not needed

**Returns:** The entity ID for chaining

---

### setScroll

Sets the scroll position of an entity.

```typescript
import { createWorld, addEntity, setScroll, getScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScroll(world, eid, 0, 100);

const scroll = getScroll(world, eid);
// scroll = { x: 0, y: 100 }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `x` - Horizontal scroll offset
- `y` - Vertical scroll offset

**Returns:** The entity ID for chaining

---

### getScroll

Gets the scroll position of an entity.

```typescript
import { createWorld, addEntity, setScroll, getScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getScroll(world, eid); // { x: 0, y: 0 } (no component)

setScroll(world, eid, 50, 200);
const scroll = getScroll(world, eid);
// scroll = { x: 50, y: 200 }
```

**Returns:** `ScrollPosition` - Object with `x` and `y` properties

---

### scrollBy

Scrolls an entity by the given delta values.

```typescript
import { createWorld, addEntity, setScroll, scrollBy, getScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScroll(world, eid, 0, 100);

// Scroll down by 50
scrollBy(world, eid, 0, 50);
getScroll(world, eid); // { x: 0, y: 150 }

// Scroll right by 25
scrollBy(world, eid, 25, 0);
getScroll(world, eid); // { x: 25, y: 150 }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `dx` - Horizontal scroll delta
- `dy` - Vertical scroll delta

**Returns:** The entity ID for chaining

---

### scrollTo

Scrolls an entity to the given position. Alias for `setScroll` for semantic clarity.

```typescript
import { createWorld, addEntity, scrollTo } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

scrollTo(world, eid, 0, 0);   // Scroll to top-left
scrollTo(world, eid, 0, 500); // Scroll to specific position
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `x` - Target horizontal scroll offset
- `y` - Target vertical scroll offset

**Returns:** The entity ID for chaining

---

### getScrollPercentage

Gets the scroll percentage of an entity (0-100 for each axis).

```typescript
import { createWorld, addEntity, setScrollable, setScroll, getScrollPercentage } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScrollable(world, eid, {
  scrollWidth: 1000,
  scrollHeight: 500,
});

setScroll(world, eid, 500, 250);

const percent = getScrollPercentage(world, eid);
// percent = { x: 50, y: 50 }
```

**Returns:** `ScrollPercentage` - Object with `x` and `y` properties (0-100)

---

### getScrollable

Gets the full scrollable data of an entity.

```typescript
import { createWorld, addEntity, setScrollable, getScrollable, ScrollbarVisibility } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getScrollable(world, eid); // undefined (no component)

setScrollable(world, eid, {
  scrollX: 10,
  scrollY: 50,
  scrollWidth: 800,
  scrollHeight: 1000,
  scrollbarVisible: ScrollbarVisibility.Auto,
  trackVisible: true,
  alwaysScroll: false,
});

const data = getScrollable(world, eid);
// data = {
//   scrollX: 10,
//   scrollY: 50,
//   scrollWidth: 800,
//   scrollHeight: 1000,
//   scrollbarVisible: ScrollbarVisibility.Auto,
//   trackVisible: true,
//   alwaysScroll: false
// }
```

**Returns:** `ScrollableData | undefined`

---

### setScrollSize

Sets the scrollable content size.

```typescript
import { createWorld, addEntity, setScrollSize, getScrollable } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScrollSize(world, eid, 800, 1200);

const data = getScrollable(world, eid);
// data.scrollWidth = 800
// data.scrollHeight = 1200
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `width` - Total scrollable width
- `height` - Total scrollable height

**Returns:** The entity ID for chaining

---

### setScrollbarVisibility

Sets the scrollbar visibility mode.

```typescript
import { createWorld, addEntity, setScrollable, setScrollbarVisibility, ScrollbarVisibility } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScrollable(world, eid, { scrollHeight: 500 });

// Always show scrollbar
setScrollbarVisibility(world, eid, ScrollbarVisibility.Visible);

// Hide scrollbar
setScrollbarVisibility(world, eid, ScrollbarVisibility.Hidden);

// Show only when content overflows
setScrollbarVisibility(world, eid, ScrollbarVisibility.Auto);
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `visibility` - Scrollbar visibility mode (ScrollbarVisibility enum)

**Returns:** The entity ID for chaining

---

### scrollToTop

Scrolls an entity to the top (sets scrollY to 0).

```typescript
import { createWorld, addEntity, setScroll, scrollToTop, getScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScroll(world, eid, 50, 300);
scrollToTop(world, eid);

const scroll = getScroll(world, eid);
// scroll = { x: 50, y: 0 }
```

**Returns:** The entity ID for chaining

---

### scrollToBottom

Scrolls an entity to the bottom (sets scrollY to scrollHeight).

```typescript
import { createWorld, addEntity, setScrollable, scrollToBottom, getScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScrollable(world, eid, {
  scrollHeight: 1000,
});

scrollToBottom(world, eid);

const scroll = getScroll(world, eid);
// scroll = { x: 0, y: 1000 }
```

**Returns:** The entity ID for chaining

---

### canScroll

Checks if an entity can scroll (has content larger than zero in either dimension).

```typescript
import { createWorld, addEntity, setScrollable, canScroll } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

canScroll(world, eid); // false (no component)

setScrollable(world, eid, { scrollWidth: 0, scrollHeight: 0 });
canScroll(world, eid); // false (no scrollable area)

setScrollable(world, eid, { scrollHeight: 500 });
canScroll(world, eid); // true
```

**Returns:** `boolean` - true if entity has scrollable content

---

### isAtTop

Checks if an entity is scrolled to the top.

```typescript
import { createWorld, addEntity, setScrollable, setScroll, isAtTop } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

isAtTop(world, eid); // true (no component defaults to top)

setScrollable(world, eid, { scrollHeight: 500 });
isAtTop(world, eid); // true

setScroll(world, eid, 0, 100);
isAtTop(world, eid); // false
```

**Returns:** `boolean` - true if scrollY is 0 or less

---

### isAtBottom

Checks if an entity is scrolled to the bottom.

```typescript
import { createWorld, addEntity, setScrollable, setScroll, scrollToBottom, isAtBottom } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setScrollable(world, eid, { scrollHeight: 500 });

isAtBottom(world, eid); // false

scrollToBottom(world, eid);
isAtBottom(world, eid); // true

setScroll(world, eid, 0, 499);
isAtBottom(world, eid); // false
```

**Returns:** `boolean` - true if scrollY is at or past scrollHeight

---

## Types

### ScrollableOptions

Options for configuring a scrollable entity.

```typescript
interface ScrollableOptions {
  scrollX?: number;                      // Initial horizontal scroll offset
  scrollY?: number;                      // Initial vertical scroll offset
  scrollWidth?: number;                  // Total scrollable width
  scrollHeight?: number;                 // Total scrollable height
  scrollbarVisible?: ScrollbarVisibility; // Scrollbar visibility mode
  trackVisible?: boolean;                // Whether scroll track is visible
  alwaysScroll?: boolean;                // Always show scrollbar
}
```

### ScrollPosition

Scroll position data returned by getScroll.

```typescript
interface ScrollPosition {
  readonly x: number;  // Horizontal scroll offset
  readonly y: number;  // Vertical scroll offset
}
```

### ScrollPercentage

Scroll percentage data returned by getScrollPercentage.

```typescript
interface ScrollPercentage {
  readonly x: number;  // Horizontal scroll percentage (0-100)
  readonly y: number;  // Vertical scroll percentage (0-100)
}
```

### ScrollableData

Full scrollable data returned by getScrollable.

```typescript
interface ScrollableData {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly scrollbarVisible: ScrollbarVisibility;
  readonly trackVisible: boolean;
  readonly alwaysScroll: boolean;
}
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
