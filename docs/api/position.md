# Position Component

Position tracks where an entity appears in the terminal grid. Without position data, entities cannot be rendered or participate in layout calculations.

## Component Structure

The Position component uses bitecs SoA (Structure of Arrays) pattern for cache-friendly access:

```typescript
import { Position } from 'blecsd';

Position.x        // Float32Array - X coordinate in terminal cells
Position.y        // Float32Array - Y coordinate in terminal cells
Position.z        // Uint16Array  - Z-index for layering (0-65535)
Position.absolute // Uint8Array   - 0 = relative to parent, 1 = absolute
```

---

## How do I check if an entity has a position?

### hasPosition

```typescript
import { createWorld, hasPosition, setPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

hasPosition(world, eid);        // false
setPosition(world, eid, 10, 5);
hasPosition(world, eid);        // true
```

---

## How do I set an entity's position?

### setPosition

Sets the X, Y, and optional Z coordinates. Adds the Position component if not present.

```typescript
import { createWorld, setPosition, getPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

// Set x=10, y=5
const result = setPosition(world, eid, 10, 5);
// Returns: 1 (the entity ID, for chaining)

// Set x=10, y=5, z=100
setPosition(world, eid, 10, 5, 100);

const pos = getPosition(world, eid);
// { x: 10, y: 5, z: 100, absolute: false }
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `x` (X coordinate), `y` (Y coordinate), `z` (Z-index, default: 0)

**Returns:** Entity ID for chaining

---

## How do I read an entity's position?

### getPosition

Returns position data or `undefined` if the entity has no Position component.

```typescript
import { createWorld, setPosition, getPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

getPosition(world, eid);  // undefined

setPosition(world, eid, 10, 5, 50);

const pos = getPosition(world, eid);
// {
//   x: 10,
//   y: 5,
//   z: 50,
//   absolute: false
// }
```

**Returns:** `PositionData | undefined`

---

## How do I use absolute vs relative positioning?

### setAbsolute

Absolute positioning places the entity relative to the screen origin (0, 0). Relative positioning (the default) places it relative to its parent entity.

```typescript
import { createWorld, setPosition, setAbsolute, isAbsolute } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);
isAbsolute(world, eid);  // false (default is relative)

setAbsolute(world, eid, true);
isAbsolute(world, eid);  // true

setAbsolute(world, eid, false);
isAbsolute(world, eid);  // false
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `absolute` (true for absolute, false for relative)

**Returns:** Entity ID for chaining

### isAbsolute

```typescript
import { createWorld, setPosition, setAbsolute, isAbsolute } from 'blecsd';

const world = createWorld();
const eid = 1;

isAbsolute(world, eid);         // false (no position component)
setPosition(world, eid, 10, 5);
isAbsolute(world, eid);         // false (default)
setAbsolute(world, eid, true);
isAbsolute(world, eid);         // true
```

---

## How do I move an entity by a delta?

### moveBy

Adds delta values to the current position.

```typescript
import { createWorld, setPosition, getPosition, moveBy } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);

moveBy(world, eid, 3, 2);
// Now at x=13, y=7

moveBy(world, eid, -1, -1);
// Now at x=12, y=6
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `dx` (delta X), `dy` (delta Y)

**Returns:** Entity ID for chaining

---

## How do I control layering with z-index?

### setZIndex

Higher z-index values render on top of lower values. Range is 0-65535.

```typescript
import { createWorld, setPosition, setZIndex, getPosition } from 'blecsd';

const world = createWorld();
const eid = 1;

setPosition(world, eid, 10, 5);
setZIndex(world, eid, 1000);

const pos = getPosition(world, eid);
// pos.z = 1000
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `z` (Z-index, 0-65535)

**Returns:** Entity ID for chaining

---

## Types

### PositionData

```typescript
interface PositionData {
  readonly x: number;        // X coordinate in terminal cells
  readonly y: number;        // Y coordinate in terminal cells
  readonly z: number;        // Z-index for layering
  readonly absolute: boolean; // true = absolute, false = relative
}
```

---

## Limitations

- **Z-index range**: Limited to 0-65535 (Uint16). Exceeding this range will wrap around.
- **Float coordinates**: X and Y are stored as Float32, which provides sub-cell precision but may have floating-point rounding at extreme values.

---

## See Also

- [Dimensions Component](./dimensions.md) - Entity width and height
- [Hierarchy Component](./hierarchy.md) - Parent-child relationships affect relative positioning
