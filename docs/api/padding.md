# Padding Component

Padding controls the internal spacing of elements, defining the space between an element's border and its content.

## Padding Component

The Padding component stores padding values using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Padding } from 'blecsd';

// Component arrays
Padding.left   // Uint8Array - Left padding in cells
Padding.top    // Uint8Array - Top padding in cells
Padding.right  // Uint8Array - Right padding in cells
Padding.bottom // Uint8Array - Bottom padding in cells
```

---

## Functions

### hasPadding

Checks if an entity has a Padding component.

```typescript
import { createWorld, hasPadding, setPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

hasPadding(world, eid); // false

setPadding(world, eid, { left: 1 });
hasPadding(world, eid); // true
```

---

### setPadding

Sets individual padding sides on an entity. Adds the Padding component if not already present.

```typescript
import { createWorld, setPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Set all four sides
setPadding(world, eid, { left: 1, top: 2, right: 1, bottom: 2 });

// Set only specific sides (others remain unchanged)
setPadding(world, eid, { left: 3, right: 3 });

// Returns entity ID for chaining
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Padding configuration
  - `left` - Left padding value
  - `top` - Top padding value
  - `right` - Right padding value
  - `bottom` - Bottom padding value

**Returns:** The entity ID for chaining

---

### setPaddingAll

Sets all padding sides to the same value. Adds the Padding component if not already present.

```typescript
import { createWorld, setPaddingAll, getPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Set uniform padding of 2 on all sides
setPaddingAll(world, eid, 2);

const padding = getPadding(world, eid);
// padding = { left: 2, top: 2, right: 2, bottom: 2 }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `value` - Padding value for all sides

**Returns:** The entity ID for chaining

---

### setPaddingHV

Sets horizontal (left/right) and vertical (top/bottom) padding separately. Adds the Padding component if not already present.

```typescript
import { createWorld, setPaddingHV, getPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Set horizontal=2, vertical=1
setPaddingHV(world, eid, 2, 1);

const padding = getPadding(world, eid);
// padding = { left: 2, top: 1, right: 2, bottom: 1 }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `horizontal` - Left and right padding value
- `vertical` - Top and bottom padding value

**Returns:** The entity ID for chaining

---

### getPadding

Gets the padding data for an entity.

```typescript
import { createWorld, setPadding, getPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getPadding(world, eid); // undefined (no padding)

setPadding(world, eid, { left: 1, top: 2, right: 3, bottom: 4 });

const padding = getPadding(world, eid);
// padding = {
//   left: 1,
//   top: 2,
//   right: 3,
//   bottom: 4
// }
```

**Returns:** `PaddingData | undefined`

---

### getHorizontalPadding

Gets the total horizontal padding (left + right).

```typescript
import { createWorld, setPadding, getHorizontalPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getHorizontalPadding(world, eid); // 0 (no padding)

setPadding(world, eid, { left: 2, right: 3 });
getHorizontalPadding(world, eid); // 5
```

**Returns:** Total horizontal padding or 0 if no Padding component

---

### getVerticalPadding

Gets the total vertical padding (top + bottom).

```typescript
import { createWorld, setPadding, getVerticalPadding } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getVerticalPadding(world, eid); // 0 (no padding)

setPadding(world, eid, { top: 1, bottom: 4 });
getVerticalPadding(world, eid); // 5
```

**Returns:** Total vertical padding or 0 if no Padding component

---

### hasPaddingValue

Checks if an entity has any padding value greater than 0.

```typescript
import { createWorld, setPadding, setPaddingAll, hasPaddingValue } from 'blecsd';
import { addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

hasPaddingValue(world, eid); // false (no padding component)

setPaddingAll(world, eid, 0);
hasPaddingValue(world, eid); // false (all sides are 0)

setPadding(world, eid, { left: 1 });
hasPaddingValue(world, eid); // true (at least one side > 0)
```

**Returns:** `true` if any padding side is greater than 0

---

## Types

### PaddingOptions

Options for setting padding values.

```typescript
interface PaddingOptions {
  left?: number;   // Left padding in cells
  top?: number;    // Top padding in cells
  right?: number;  // Right padding in cells
  bottom?: number; // Bottom padding in cells
}
```

### PaddingData

Data returned by getPadding.

```typescript
interface PaddingData {
  readonly left: number;   // Left padding in cells
  readonly top: number;    // Top padding in cells
  readonly right: number;  // Right padding in cells
  readonly bottom: number; // Bottom padding in cells
}
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
- [Position Component](./position.md) - Element positioning
- [Dimensions Component](./dimensions.md) - Element sizing
