# Position Component

Position tracks an entity's location in the terminal grid, including X/Y coordinates, Z-index for layering, and whether positioning is absolute or relative to parent.

## Position Component

The Position component stores coordinates using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Position } from 'blecsd';

// Component arrays
Position.x        // Float32Array - X coordinate in terminal cells
Position.y        // Float32Array - Y coordinate in terminal cells
Position.z        // Uint16Array  - Z-index for layering (0-65535)
Position.absolute // Uint8Array   - 0 = relative to parent, 1 = absolute
```

---

## Functions

### hasPosition

Checks if an entity has a Position component.

```typescript
import { createWorld, hasPosition, setPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

hasPosition(world, eid); // false

setPosition(world, eid, 10, 5);
hasPosition(world, eid); // true
```

---

### setPosition

Sets the position of an entity. Adds the Position component if not present.

```typescript
import { createWorld, setPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

// Set x, y coordinates
setPosition(world, eid, 10, 5);

// Set x, y, and z-index
setPosition(world, eid, 10, 5, 100);

// Returns entity ID for chaining
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `x` - X coordinate
- `y` - Y coordinate
- `z` - Z-index for layering (default: 0)

**Returns:** The entity ID for chaining

---

### getPosition

Gets the position data of an entity.

```typescript
import { createWorld, setPosition, getPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

getPosition(world, eid); // undefined (no position)

setPosition(world, eid, 10, 5, 50);

const pos = getPosition(world, eid);
// pos = {
//   x: 10,
//   y: 5,
//   z: 50,
//   absolute: false
// }
```

**Returns:** `PositionData | undefined`

---

### setAbsolute

Sets whether the entity uses absolute screen positioning.

```typescript
import { createWorld, setPosition, setAbsolute, isAbsolute } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);

// Make entity use absolute screen coordinates
setAbsolute(world, eid, true);
isAbsolute(world, eid); // true

// Switch back to relative positioning
setAbsolute(world, eid, false);
isAbsolute(world, eid); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `absolute` - true for absolute, false for relative to parent

**Returns:** The entity ID for chaining

---

### isAbsolute

Checks if an entity uses absolute positioning.

```typescript
import { createWorld, setPosition, setAbsolute, isAbsolute } from 'blecsd';

const world = createWorld();
const eid = 1;

isAbsolute(world, eid); // false (no position)

setPosition(world, eid, 10, 5);
isAbsolute(world, eid); // false (default is relative)

setAbsolute(world, eid, true);
isAbsolute(world, eid); // true
```

---

### moveBy

Moves an entity by a delta amount.

```typescript
import { createWorld, setPosition, getPosition, moveBy } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);

// Move 3 cells right, 2 cells down
moveBy(world, eid, 3, 2);

const pos = getPosition(world, eid);
// pos.x = 13, pos.y = 7

// Move left and up with negative values
moveBy(world, eid, -1, -1);
// pos.x = 12, pos.y = 6
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `dx` - Delta X (added to current x)
- `dy` - Delta Y (added to current y)

**Returns:** The entity ID for chaining

---

### setZIndex

Sets the z-index of an entity for layering.

```typescript
import { createWorld, setPosition, setZIndex, getPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);

// Bring entity to front
setZIndex(world, eid, 1000);

const pos = getPosition(world, eid);
// pos.z = 1000
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `z` - Z-index (0-65535, higher values render on top)

**Returns:** The entity ID for chaining

---

## Types

### PositionData

Data returned by getPosition.

```typescript
interface PositionData {
  readonly x: number;        // X coordinate in terminal cells
  readonly y: number;        // Y coordinate in terminal cells
  readonly z: number;        // Z-index for layering
  readonly absolute: boolean; // true = absolute, false = relative
}
```

---

## See Also

- [Dimensions Component](./dimensions.md) - Entity width and height
- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
