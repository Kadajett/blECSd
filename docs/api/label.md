# Label Component

Labels are text annotations attached to entities, typically displayed at a specific position relative to the element (top-left, top-center, etc.).

## LabelPosition Enum

Defines where the label is positioned relative to the element.

```typescript
import { LabelPosition } from 'blecsd';

// Available positions
LabelPosition.TopLeft      // 0 - Label at top-left corner
LabelPosition.TopCenter    // 1 - Label centered at top
LabelPosition.TopRight     // 2 - Label at top-right corner
LabelPosition.BottomLeft   // 3 - Label at bottom-left corner
LabelPosition.BottomCenter // 4 - Label centered at bottom
LabelPosition.BottomRight  // 5 - Label at bottom-right corner
LabelPosition.Left         // 6 - Label at left side, vertically centered
LabelPosition.Right        // 7 - Label at right side, vertically centered
```

---

## Label Component

The Label component stores label metadata using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Label } from 'blecsd';

// Component arrays
Label.labelId   // Uint32Array - Reference to label text in the label store
Label.position  // Uint8Array  - Label position (LabelPosition enum)
Label.offsetX   // Int8Array   - Horizontal offset from calculated position
Label.offsetY   // Int8Array   - Vertical offset from calculated position
```

---

## Functions

### hasLabel

Checks if an entity has a Label component.

```typescript
import { addEntity, createWorld, hasLabel, setLabel } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

hasLabel(world, eid); // false

setLabel(world, eid, 'Username');
hasLabel(world, eid); // true
```

---

### setLabel

Sets or updates a label on an entity.

```typescript
import { addEntity, createWorld, setLabel, LabelPosition } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Set a simple label
setLabel(world, eid, 'Username');

// Set a label with position and offset
setLabel(world, eid, 'Email', {
  position: LabelPosition.TopCenter,
  offsetX: 1,
  offsetY: -1,
});

// Update existing label text (preserves position/offset)
setLabel(world, eid, 'New Label');
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `text` - The label text
- `options` - Optional configuration
  - `position` - Label position (LabelPosition enum)
  - `offsetX` - Horizontal offset from calculated position
  - `offsetY` - Vertical offset from calculated position

**Returns:** The entity ID for chaining

---

### getLabelText

Gets the label text for an entity.

```typescript
import { addEntity, createWorld, setLabel, getLabelText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getLabelText(world, eid); // '' (no label)

setLabel(world, eid, 'Username');
getLabelText(world, eid); // 'Username'
```

---

### getLabel

Gets full label data for an entity.

```typescript
import { addEntity, createWorld, setLabel, getLabel, LabelPosition } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getLabel(world, eid); // null (no label)

setLabel(world, eid, 'Password', {
  position: LabelPosition.TopRight,
  offsetX: 1,
  offsetY: -2,
});

const label = getLabel(world, eid);
// label = {
//   text: 'Password',
//   position: LabelPosition.TopRight,
//   offsetX: 1,
//   offsetY: -2
// }
```

**Returns:** `LabelData | null`

---

### getLabelPosition

Gets the label position for an entity.

```typescript
import { addEntity, createWorld, setLabel, getLabelPosition, LabelPosition } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

getLabelPosition(world, eid); // LabelPosition.TopLeft (default)

setLabel(world, eid, 'Field', { position: LabelPosition.BottomCenter });
getLabelPosition(world, eid); // LabelPosition.BottomCenter
```

---

### setLabelPosition

Sets the label position for an entity.

```typescript
import { addEntity, createWorld, setLabel, setLabelPosition, LabelPosition } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setLabel(world, eid, 'Name');
setLabelPosition(world, eid, LabelPosition.Right);

// Returns entity ID for chaining
```

**Note:** Does nothing if entity has no label.

---

### setLabelOffset

Sets the label offset for an entity.

```typescript
import { addEntity, createWorld, setLabel, setLabelOffset } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setLabel(world, eid, 'Title');
setLabelOffset(world, eid, 2, -1); // offsetX = 2, offsetY = -1

// Returns entity ID for chaining
```

**Note:** Does nothing if entity has no label.

---

### removeLabel

Removes the label from an entity.

```typescript
import { addEntity, createWorld, setLabel, removeLabel, hasLabel } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setLabel(world, eid, 'Temporary');
hasLabel(world, eid); // true

removeLabel(world, eid);
hasLabel(world, eid); // false

// Returns entity ID for chaining
```

---

### hasLabelText

Checks if an entity has a non-empty label.

```typescript
import { addEntity, createWorld, setLabel, hasLabelText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

hasLabelText(world, eid); // false (no label)

setLabel(world, eid, 'Hello');
hasLabelText(world, eid); // true

setLabel(world, eid, '');
hasLabelText(world, eid); // false (empty label)
```

---

### resetLabelStore

Resets the label store. Primarily used for testing.

<!-- blecsd-doccheck:ignore -->

```typescript
import { resetLabelStore } from 'blecsd';

beforeEach(() => {
  resetLabelStore();
});
```

---

## Types

### LabelOptions

Options for setting a label.

```typescript
interface LabelOptions {
  position?: LabelPosition;  // Label position relative to element
  offsetX?: number;          // Horizontal offset from calculated position
  offsetY?: number;          // Vertical offset from calculated position
}
```

### LabelData

Data returned by getLabel.

```typescript
interface LabelData {
  text: string;              // Label text content
  position: LabelPosition;   // Label position
  offsetX: number;           // Horizontal offset
  offsetY: number;           // Vertical offset
}
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
