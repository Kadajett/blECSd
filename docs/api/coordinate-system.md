# Coordinate System

This document explains blECSd's coordinate system, including origin point, axis directions, coordinate spaces, and how dimensions interact with borders and padding.

## Origin and Axes

### Top-Left Origin

**(0, 0) is the top-left corner** of the screen or parent container.

```
(0,0) ────────────► X increases right
  │
  │
  │
  ▼
  Y increases down
```

- **X axis**: Increases to the right
- **Y axis**: Increases downward
- **All coordinates are 0-indexed**

### Example

```typescript
import { createWorld, createBoxEntity } from 'blecsd';

const world = createWorld();

// Box at top-left corner
const box1 = createBoxEntity(world, {
  x: 0,     // Left edge
  y: 0,     // Top edge
  width: 10,
  height: 5,
});

// Box offset from top-left
const box2 = createBoxEntity(world, {
  x: 5,     // 5 units from left
  y: 3,     // 3 units from top
  width: 20,
  height: 10,
});
```

## Coordinate Spaces

blECSd uses two coordinate systems: **Screen Space** (absolute) and **Local Space** (relative to parent).

### Screen Space (Absolute)

Screen space coordinates are relative to the terminal's top-left (0, 0).

```typescript
// Screen is always at (0, 0) in screen space
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
});

// Box at absolute position (10, 5)
const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 10,
});
```

### Local Space (Relative to Parent)

When an entity has a parent, its coordinates are relative to the parent's top-left corner.

```typescript
// Parent at screen position (10, 5)
const parent = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 50,
  height: 20,
});

// Child at local position (5, 2)
// Screen position: (10 + 5, 5 + 2) = (15, 7)
const child = createBoxEntity(world, {
  parent,
  x: 5,    // 5 units from parent's left edge
  y: 2,    // 2 units from parent's top edge
  width: 20,
  height: 5,
});
```

### Coordinate Conversion

Use helper functions to convert between coordinate spaces:

```typescript
import { screenToLocal, localToScreen } from 'blecsd';

// Convert mouse click to local coordinates
const mouseX = 25;
const mouseY = 10;
const localPos = screenToLocal(world, parent, mouseX, mouseY);
console.log(`Local: (${localPos.x}, ${localPos.y})`);

// Convert entity's local position to screen space
const screenPos = localToScreen(world, child);
console.log(`Screen: (${screenPos.x}, ${screenPos.y})`);
```

## Dimensions and Borders

### Outer vs Inner Dimensions

**Dimensions are outer dimensions** - they include borders and padding.

```
┌────────────┐  ← width = 14 (total outer width)
│  Content   │
│            │
└────────────┘

Border:   1 char left + 1 char right = 2 chars
Content:  14 - 2 = 12 chars wide
```

### Example: Box with Border

```typescript
import { createBoxEntity, BorderType, getInnerDimensions } from 'blecsd';

const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 20,   // Outer width (includes border)
  height: 10,  // Outer height (includes border)
  border: {
    type: BorderType.Line,  // 1 char per side
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Get content area size (excludes border)
const inner = getInnerDimensions(world, box);
console.log(inner.width);   // 18 (20 - 2)
console.log(inner.height);  // 8  (10 - 2)
```

### Borders and Padding Stacking

Borders and padding both reduce the content area:

```
┌──────────────────┐  ← width = 20
│ P                │  ← padding.top = 1
│ P Content Area   │
│ P                │
└──────────────────┘  ← padding.bottom = 1
 ↑                ↑
 padding.left=2   padding.right=2

Border:      1 left + 1 right = 2
Padding:     2 left + 2 right = 4
Total lost:  2 + 4 = 6

Content width:  20 - 6 = 14
Content height: 10 - 4 = 6  (1 top + 1 bottom border, 1 top + 1 bottom padding)
```

**Example**:

```typescript
const box = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 20,
  height: 10,
  border: {
    type: BorderType.Line,  // 1 char per side
  },
  padding: {
    left: 2,
    right: 2,
    top: 1,
    bottom: 1,
  },
});

const inner = getInnerDimensions(world, box);
console.log(inner.width);   // 14 (20 - 1 - 1 - 2 - 2)
console.log(inner.height);  // 6  (10 - 1 - 1 - 1 - 1)
```

## Z-Index and Layering

Entities can be layered using the `z` coordinate:

```typescript
// Background layer
const background = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  z: 0,  // Bottom layer
});

// Content layer
const content = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 60,
  height: 14,
  z: 10,  // Middle layer
});

// Overlay layer
const overlay = createBoxEntity(world, {
  x: 20,
  y: 10,
  width: 40,
  height: 8,
  z: 20,  // Top layer (drawn last)
});
```

**Rendering order**:
- Lower `z` values are drawn first (background)
- Higher `z` values are drawn last (foreground)
- Entities with the same `z` are drawn in creation order

## Absolute vs Relative Positioning

### Relative Positioning (Default)

By default, positions are relative to the parent:

```typescript
const parent = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 50,
  height: 20,
});

// Relative to parent (default)
const child = createBoxEntity(world, {
  parent,
  x: 5,
  y: 2,  // Screen position: (15, 7)
  width: 20,
  height: 5,
});
```

### Absolute Positioning

Use `absolute: true` to position relative to screen instead of parent:

```typescript
const parent = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 50,
  height: 20,
});

// Absolute positioning ignores parent offset
const child = createBoxEntity(world, {
  parent,
  x: 5,
  y: 2,
  absolute: true,  // Screen position: (5, 2), NOT (15, 7)
  width: 20,
  height: 5,
});
```

Absolute positioning is useful for:
- Modal overlays (centered on screen regardless of parent)
- Fixed UI elements (always at screen edge)
- Tooltips (positioned relative to mouse, not parent)

## Percentage-Based Dimensions

Dimensions can be specified as percentages of the parent:

```typescript
const parent = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
});

// Child takes 50% of parent width, 100% of parent height
const sidebar = createBoxEntity(world, {
  parent,
  x: 0,
  y: 0,
  width: '50%',   // 40 (80 * 0.5)
  height: '100%', // 24 (24 * 1.0)
});

// Responsive content area
const content = createBoxEntity(world, {
  parent,
  x: '50%',    // Start at 50% across (x = 40)
  y: 0,
  width: '50%',   // 40 (remaining width)
  height: '100%', // 24 (full height)
});
```

## Bounding Box Queries

Get an entity's bounding box in screen space:

```typescript
import { getBoundingBox } from 'blecsd';

const box = createBoxEntity(world, {
  parent: someParent,
  x: 5,
  y: 2,
  width: 20,
  height: 10,
});

const bounds = getBoundingBox(world, box);
console.log(bounds.left);   // Screen X (parent.x + 5)
console.log(bounds.top);    // Screen Y (parent.y + 2)
console.log(bounds.right);  // Screen X + width
console.log(bounds.bottom); // Screen Y + height
console.log(bounds.width);  // 20
console.log(bounds.height); // 10
```

## Hit Testing

Check if a point is inside an entity:

```typescript
import { isPointInside } from 'blecsd';

const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 15,
});

// Mouse click at (20, 10)
const hit = isPointInside(world, box, 20, 10);
console.log(hit); // true (inside box)

// Mouse click at (50, 25)
const miss = isPointInside(world, box, 50, 25);
console.log(miss); // false (outside box)
```

## Common Conversions

### Mouse Event to Local Coordinates

```typescript
import { screenToLocal } from 'blecsd';

function handleMouseClick(event: MouseEvent): void {
  const container = getContainerEntity(world);

  // Convert screen coordinates to local
  const local = screenToLocal(world, container, event.x, event.y);

  // Now you can check which child was clicked
  const children = getChildren(world, container);
  for (const child of children) {
    if (isPointInside(world, child, local.x, local.y)) {
      console.log(`Clicked child: ${child}`);
    }
  }
}
```

### Entity Position to Screen Coordinates

```typescript
import { localToScreen } from 'blecsd';

const child = createBoxEntity(world, {
  parent,
  x: 10,
  y: 5,
  width: 20,
  height: 10,
});

// Get absolute screen position
const screenPos = localToScreen(world, child);
console.log(`Screen position: (${screenPos.x}, ${screenPos.y})`);
```

## API Reference

### Helper Functions

#### getInnerDimensions()

Get content area size (excluding border and padding):

```typescript
import { getInnerDimensions } from 'blecsd';

const inner = getInnerDimensions(world, entity);
console.log(inner.width);
console.log(inner.height);
```

#### screenToLocal()

Convert screen coordinates to local (parent-relative) coordinates:

```typescript
import { screenToLocal } from 'blecsd';

const local = screenToLocal(world, entity, screenX, screenY);
console.log(local.x, local.y);
```

#### localToScreen()

Convert local coordinates to screen (absolute) coordinates:

```typescript
import { localToScreen } from 'blecsd';

const screen = localToScreen(world, entity);
console.log(screen.x, screen.y);
```

#### getBoundingBox()

Get entity's bounding box in screen space:

```typescript
import { getBoundingBox } from 'blecsd';

const bounds = getBoundingBox(world, entity);
console.log(bounds.left, bounds.top, bounds.right, bounds.bottom);
console.log(bounds.width, bounds.height);
```

#### isPointInside()

Check if a point is inside an entity:

```typescript
import { isPointInside } from 'blecsd';

const hit = isPointInside(world, entity, x, y);
if (hit) {
  console.log('Point is inside entity');
}
```

## See Also

- [Position Component](./components/position.md) - Position component API
- [Dimensions Component](./components/dimensions.md) - Dimensions component API
- [Hierarchy Component](./components/hierarchy.md) - Parent-child relationships
- [Border Component](./components/border.md) - Border styling
- [Padding Component](./components/padding.md) - Padding configuration
