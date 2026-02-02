# Shrink-to-Content

Utilities for calculating minimum sizes needed to fit entity content.

## Overview

Shrink-to-content allows entities to automatically size themselves based on their content, borders, and padding. This is useful for creating dynamic UI elements that adapt to their text content.

## Types

### ShrinkBox

Result of shrink calculations containing width and height.

```typescript
interface ShrinkBox {
  readonly width: number;
  readonly height: number;
}
```

## Functions

### getShrinkWidth

Calculates the minimum width needed to fit an entity's content.

```typescript
import { getShrinkWidth, setContent } from 'blecsd';

setContent(world, entity, 'Hello, World!');
const minWidth = getShrinkWidth(world, entity);
// Returns 13 (content width)

// With border
setBorder(world, entity, { type: 'single' });
const withBorder = getShrinkWidth(world, entity);
// Returns 15 (13 content + 2 border)
```

**Returns:** Minimum width to fit content (including borders and padding), or 0 if no content.

---

### getShrinkHeight

Calculates the minimum height needed to fit an entity's content.

```typescript
import { getShrinkHeight, setContent } from 'blecsd';

setContent(world, entity, 'Line 1\nLine 2\nLine 3');
const minHeight = getShrinkHeight(world, entity);
// Returns 3 (number of lines)

// With optional maxWidth for text wrapping
const wrappedHeight = getShrinkHeight(world, entity, 20);
// Height may increase if content wraps
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `maxWidth` - Optional maximum width for text wrapping

**Returns:** Minimum height to fit content (including borders and padding).

---

### getShrinkBox

Calculates both width and height needed to fit an entity's content.

```typescript
import { getShrinkBox, setContent } from 'blecsd';

setContent(world, entity, 'Hello\nWorld');
const box = getShrinkBox(world, entity);
// box = { width: 5, height: 2 }

console.log(`Need ${box.width}x${box.height} cells`);
```

**Returns:** `ShrinkBox` with calculated dimensions.

---

### applyShrink

Applies shrink-to-content to an entity's dimensions. Only works if shrink is enabled for the entity.

```typescript
import { applyShrink, setShrink, setContent, setDimensions } from 'blecsd';

setContent(world, entity, 'Hello');
setDimensions(world, entity, 100, 100);
setShrink(world, entity, true);

applyShrink(world, entity);
// Entity dimensions are now 5x1 instead of 100x100
```

**Returns:** `true` if shrink was applied, `false` if shrink is not enabled.

---

### calculateShrinkSize

Calculates shrink size without modifying the entity. Useful for preview or layout calculations.

```typescript
import { calculateShrinkSize, setContent, setDimensions } from 'blecsd';

setContent(world, entity, 'Hello');
setDimensions(world, entity, 100, 100);

const size = calculateShrinkSize(world, entity);
if (size) {
  console.log(`Would shrink to ${size.width}x${size.height}`);
}

// Entity dimensions are still 100x100
```

**Returns:** `ShrinkBox | undefined` - Calculated size, or undefined if entity has no dimensions.

---

## Constraints

Shrink calculations respect min/max constraints set on the entity:

```typescript
import { setConstraints, setShrink, applyShrink, setContent } from 'blecsd';

setContent(world, entity, 'Hi'); // Would shrink to 2x1
setDimensions(world, entity, 100, 100);
setConstraints(world, entity, {
  minWidth: 10,
  minHeight: 5,
});
setShrink(world, entity, true);

applyShrink(world, entity);
// Dimensions are 10x5 (respecting minWidth/minHeight)
```

---

## Examples

### Auto-sizing Button

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, setDimensions, setShrink, applyShrink, setPaddingAll, setBorder } from 'blecsd';

const world = createWorld();
const button = addEntity(world);

// Set up button with content, padding, and border
setContent(world, button, 'Click Me');
setPaddingAll(world, button, 1);
setBorder(world, button, { type: 'single' });

// Enable and apply shrink
setDimensions(world, button, 'auto', 'auto');
setShrink(world, button, true);
applyShrink(world, button);

// Button is now sized to fit "Click Me" plus padding and border
// Width: 8 (text) + 2 (padding) + 2 (border) = 12
// Height: 1 (text) + 2 (padding) + 2 (border) = 5
```

### Layout Preview

```typescript
import { calculateShrinkSize, getShrinkBox } from 'blecsd';

// Calculate sizes for layout without modifying entities
const children = getChildren(world, parent);
let totalHeight = 0;
let maxWidth = 0;

for (const child of children) {
  const size = calculateShrinkSize(world, child) ?? getShrinkBox(world, child);
  totalHeight += size.height;
  maxWidth = Math.max(maxWidth, size.width);
}

console.log(`Container needs ${maxWidth}x${totalHeight}`);
```

---

## See Also

- [Dimensions Component](./dimensions.md) - Setting dimensions and constraints
- [Content Component](./content.md) - Setting text content
- [Padding Component](./padding.md) - Adding padding
- [Border Component](./border.md) - Adding borders
