# Absolute Positioning API

Position elements relative to screen edges instead of parent containers. Provides blessed-compatible `aleft`, `aright`, `atop`, `abottom` positioning.

## How do I position from the left edge?

### setAbsoluteLeft

Position an element by distance from the left edge of the screen.

```typescript
import { setAbsoluteLeft } from 'blecsd';

// Position 10 cells from left edge of screen
setAbsoluteLeft(world, entity, 10);
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `left` (distance from left edge)

**Returns:** Entity ID for chaining

**Behavior:** Preserves Y coordinate, marks position as absolute

---

## How do I position from the right edge?

### setAbsoluteRight

Position an element by distance from the right edge of the screen.

```typescript
import { setAbsoluteRight } from 'blecsd';

// Position 10 cells from right edge (screen width - 10 - element width)
setAbsoluteRight(world, entity, 10);
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `right` (distance from right edge)

**Returns:** Entity ID for chaining

**Calculation:** `x = screenWidth - right - elementWidth`

---

## How do I position from the top edge?

### setAbsoluteTop

Position an element by distance from the top edge of the screen.

```typescript
import { setAbsoluteTop } from 'blecsd';

// Position 5 cells from top edge of screen
setAbsoluteTop(world, entity, 5);
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `top` (distance from top edge)

**Returns:** Entity ID for chaining

**Behavior:** Preserves X coordinate, marks position as absolute

---

## How do I position from the bottom edge?

### setAbsoluteBottom

Position an element by distance from the bottom edge of the screen.

```typescript
import { setAbsoluteBottom } from 'blecsd';

// Position 5 cells from bottom edge (screen height - 5 - element height)
setAbsoluteBottom(world, entity, 5);
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `bottom` (distance from bottom edge)

**Returns:** Entity ID for chaining

**Calculation:** `y = screenHeight - bottom - elementHeight`

---

## How do I position from multiple edges?

### setAbsoluteEdges

Set position based on multiple edge distances in a single call.

```typescript
import { setAbsoluteEdges } from 'blecsd';

// Position 10 from left, 5 from top
setAbsoluteEdges(world, entity, { left: 10, top: 5 });

// Position 10 from right, 5 from bottom
setAbsoluteEdges(world, entity, { right: 10, bottom: 5 });

// Mix horizontal and vertical
setAbsoluteEdges(world, entity, { left: 10, bottom: 5 });
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `options` (object with optional `left`, `right`, `top`, `bottom`)

**Returns:** Entity ID for chaining

**Priority:** If both `left` and `right` are specified, `left` wins. If both `top` and `bottom` are specified, `top` wins.

---

## How do I read absolute positions?

### getAbsoluteEdges

Get the current edge distances for an absolutely-positioned element.

```typescript
import { getAbsoluteEdges } from 'blecsd';

const edges = getAbsoluteEdges(world, entity);
if (edges) {
  console.log(`Left: ${edges.left}, Right: ${edges.right}`);
  console.log(`Top: ${edges.top}, Bottom: ${edges.bottom}`);
}
```

**Parameters:** `world` (ECS world), `eid` (entity ID)

**Returns:** Object with `{ left, right, top, bottom }` or `undefined` if entity is not absolutely positioned

**Note:** Returns `undefined` for relative (non-absolute) positions

---

## Common Patterns

### Status Bar at Top

```typescript
const statusBar = addEntity(world);
setDimensions(world, statusBar, '100%', 1);
setAbsoluteTop(world, statusBar, 0);
```

### Footer at Bottom

```typescript
const footer = addEntity(world);
setDimensions(world, footer, '100%', 3);
setAbsoluteBottom(world, footer, 0);
```

### Sidebar on Right

```typescript
const sidebar = addEntity(world);
setDimensions(world, sidebar, 30, '100%');
setAbsoluteRight(world, sidebar, 0);
```

### Centered Dialog

```typescript
const dialog = addEntity(world);
setDimensions(world, dialog, 60, 20);

// Position from screen center
const screen = getScreenDimensions(world);
const left = (screen.width - 60) / 2;
const top = (screen.height - 20) / 2;

setAbsoluteEdges(world, dialog, { left, top });
```

### Corner Positions

```typescript
// Top-left corner
setAbsoluteEdges(world, entity, { left: 0, top: 0 });

// Top-right corner
setAbsoluteEdges(world, entity, { right: 0, top: 0 });

// Bottom-left corner
setAbsoluteEdges(world, entity, { left: 0, bottom: 0 });

// Bottom-right corner
setAbsoluteEdges(world, entity, { right: 0, bottom: 0 });
```

### Margins Around Screen

```typescript
const panel = addEntity(world);
setDimensions(world, panel, '100%-4', '100%-4');
setAbsoluteEdges(world, panel, { left: 2, top: 2 });
```

### Chaining

All functions return the entity ID for chaining:

```typescript
setDimensions(world, entity, 40, 10);
setAbsoluteRight(world, entity, 5);
setStyle(world, entity, { bg: 0x0000ffff });
```

---

## blessed.js Compatibility

In blessed.js, elements had `aleft`, `aright`, `atop`, `abottom` properties:

```javascript
// blessed.js
element.aleft = 10;    // Absolute left
element.aright = 10;   // Absolute right
element.atop = 5;      // Absolute top
element.abottom = 5;   // Absolute bottom
```

In blECSd, use functions instead:

```typescript
// blECSd
setAbsoluteLeft(world, entity, 10);
setAbsoluteRight(world, entity, 10);
setAbsoluteTop(world, entity, 5);
setAbsoluteBottom(world, entity, 5);

// Or all at once
setAbsoluteEdges(world, entity, {
  left: 10,
  right: 10,
  top: 5,
  bottom: 5
});
```

The functional approach provides:
- Type safety
- Automatic screen dimension handling
- Explicit absolute positioning mode
- Coordinate preservation

---

## Screen Dimensions

Absolute positioning requires screen dimensions. The system:

1. Looks for a screen entity with Dimensions component
2. Falls back to default 80x24 if no screen exists
3. Recalculates positions when screen size changes

To ensure correct positioning:

```typescript
// Create and size screen first
const screen = addEntity(world);
initScreenComponent(world, screen);
registerScreenSingleton(world, screen);
setDimensions(world, screen, 100, 50);

// Then position elements absolutely
setAbsoluteRight(world, sidebar, 0);
```

---

## Absolute vs Relative

**Absolute positioning:**
- Position relative to screen edges
- Ignores parent position
- Element appears at fixed screen coordinates
- Use for: overlays, modals, status bars, sidebars

**Relative positioning (default):**
- Position relative to parent container
- Inherits parent offset
- Element moves with parent
- Use for: nested layouts, child elements, panels

Set position mode explicitly:

```typescript
import { setAbsolute } from 'blecsd';

setAbsolute(world, entity, true);   // Absolute
setAbsolute(world, entity, false);  // Relative
```

All `setAbsolute*` functions automatically set absolute mode.

---

## Performance Notes

- Edge calculations are O(1) based on screen dimensions
- Position components are updated in-place
- No hierarchy traversal needed for absolute positions
- Screen dimensions are cached and reused

---

## See Also

- [Position Component](../components/position.md) - Core positioning system
- [Positioning](./positioning.md) - Advanced positioning with percentages and keywords
- [Dimensions](../dimensions.md) - Setting element size
- [Layout System](../systems/layout-system.md) - Automatic layout calculations
