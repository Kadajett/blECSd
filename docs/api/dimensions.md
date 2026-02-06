# Dimensions Component

The Dimensions component defines entity sizing in the terminal grid, supporting fixed values, percentages, and auto-sizing based on content.

## AUTO_DIMENSION Constant

Special value indicating that a dimension should be calculated based on content.

```typescript
import { AUTO_DIMENSION } from 'blecsd';

// AUTO_DIMENSION = -1
// Used internally to represent 'auto' sizing
```

---

## Dimensions Component

The Dimensions component store using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Dimensions } from 'blecsd';

// Component arrays
Dimensions.width     // Float32Array - Width in terminal cells (or encoded percentage)
Dimensions.height    // Float32Array - Height in terminal cells (or encoded percentage)
Dimensions.minWidth  // Float32Array - Minimum width constraint
Dimensions.minHeight // Float32Array - Minimum height constraint
Dimensions.maxWidth  // Float32Array - Maximum width constraint
Dimensions.maxHeight // Float32Array - Maximum height constraint
Dimensions.shrink    // Uint8Array   - 0 = fixed size, 1 = shrink to content
```

### Percentage Encoding

Percentages are stored as negative values to distinguish them from fixed values:
- `-2` = 0%
- `-52` = 50%
- `-102` = 100%

Use `encodePercentage()` and `decodePercentage()` for conversion.

---

## Functions

### encodePercentage

Encodes a percentage value for storage in typed arrays.

```typescript
import { encodePercentage } from 'blecsd';

const encoded = encodePercentage(50);  // Returns -52
const zero = encodePercentage(0);      // Returns -2
const full = encodePercentage(100);    // Returns -102
```

**Parameters:**
- `percent` - Percentage value (0-100)

**Returns:** Encoded value for storage (negative number)

---

### decodePercentage

Decodes a percentage value from typed array storage.

```typescript
import { decodePercentage } from 'blecsd';

const percent = decodePercentage(-52);   // Returns 50
const zero = decodePercentage(-2);       // Returns 0
const notPercent = decodePercentage(100); // Returns null (not a percentage)
```

**Parameters:**
- `value` - Encoded value from storage

**Returns:** Percentage value (0-100) or `null` if not a percentage

---

### isPercentage

Checks if a value represents an encoded percentage.

```typescript
import { isPercentage, encodePercentage } from 'blecsd';

isPercentage(-52);  // true (encoded 50%)
isPercentage(100);  // false (fixed value)
isPercentage(-1);   // false (AUTO_DIMENSION)
```

**Parameters:**
- `value` - Value to check

**Returns:** `true` if the value is an encoded percentage

---

### setDimensions

Sets the dimensions of an entity. Adds the Dimensions component if not already present.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Fixed size (80 columns x 24 rows)
setDimensions(world, entity, 80, 24);

// Percentage width (50% of container width)
setDimensions(world, entity, '50%', 24);

// Percentage both dimensions
setDimensions(world, entity, '100%', '50%');

// Auto height (calculated from content)
setDimensions(world, entity, 80, 'auto');

// Fully automatic sizing
setDimensions(world, entity, 'auto', 'auto');
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `width` - Width value (number, percentage string like `"50%"`, or `"auto"`)
- `height` - Height value (number, percentage string like `"50%"`, or `"auto"`)

**Returns:** The entity ID for chaining

---

### getDimensions

Gets the dimensions data of an entity.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, getDimensions } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

getDimensions(world, entity); // undefined (no component)

setDimensions(world, entity, 80, 24);
const dims = getDimensions(world, entity);
// dims = {
//   width: 80,
//   height: 24,
//   minWidth: 0,
//   minHeight: 0,
//   maxWidth: Infinity,
//   maxHeight: Infinity,
//   shrink: false
// }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `DimensionsData | undefined`

---

### setConstraints

Sets dimension constraints (min/max) for an entity. Adds the Dimensions component if not already present.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setConstraints, getDimensions } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setDimensions(world, entity, 80, 24);

// Set minimum and maximum size constraints
setConstraints(world, entity, {
  minWidth: 10,
  maxWidth: 100,
  minHeight: 5,
  maxHeight: 50,
});

// Partial constraints (only set what you need)
setConstraints(world, entity, {
  minWidth: 20,
});

const dims = getDimensions(world, entity);
// dims.minWidth = 20, dims.maxWidth = 100 (previous value preserved)
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `constraints` - Object with optional `minWidth`, `minHeight`, `maxWidth`, `maxHeight`

**Returns:** The entity ID for chaining

---

### setShrink

Sets the shrink-to-content flag for an entity. When enabled, the entity will shrink to fit its content.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setShrink, shouldShrink } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setDimensions(world, entity, 80, 24);

// Enable shrink-to-content
setShrink(world, entity, true);
shouldShrink(world, entity); // true

// Disable shrink-to-content
setShrink(world, entity, false);
shouldShrink(world, entity); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `shrink` - `true` to shrink to content, `false` for fixed size

**Returns:** The entity ID for chaining

---

### shouldShrink

Checks if an entity has shrink-to-content enabled.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setShrink, shouldShrink } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

shouldShrink(world, entity); // false (no component)

setDimensions(world, entity, 80, 24);
shouldShrink(world, entity); // false (default)

setShrink(world, entity, true);
shouldShrink(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if shrink is enabled, `false` otherwise

---

### hasDimensions

Checks if an entity has a Dimensions component.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, hasDimensions } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

hasDimensions(world, entity); // false

setDimensions(world, entity, 80, 24);
hasDimensions(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity has Dimensions component

---

### getResolvedWidth

Gets the width of an entity, resolving percentages against a container width.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, getResolvedWidth } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Fixed width
setDimensions(world, entity, 80, 24);
getResolvedWidth(world, entity, 200); // 80

// Percentage width
setDimensions(world, entity, '50%', 24);
getResolvedWidth(world, entity, 200); // 100

// Auto width
setDimensions(world, entity, 'auto', 24);
getResolvedWidth(world, entity, 200); // undefined (needs content calculation)

// No component
getResolvedWidth(world, 999, 200); // undefined
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `containerWidth` - Container width to resolve percentages against

**Returns:** Resolved width value, or `undefined` if no Dimensions component or if width is `'auto'`

---

### getResolvedHeight

Gets the height of an entity, resolving percentages against a container height.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, getResolvedHeight } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Fixed height
setDimensions(world, entity, 80, 24);
getResolvedHeight(world, entity, 100); // 24

// Percentage height
setDimensions(world, entity, 80, '25%');
getResolvedHeight(world, entity, 100); // 25

// Auto height
setDimensions(world, entity, 80, 'auto');
getResolvedHeight(world, entity, 100); // undefined (needs content calculation)

// No component
getResolvedHeight(world, 999, 100); // undefined
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `containerHeight` - Container height to resolve percentages against

**Returns:** Resolved height value, or `undefined` if no Dimensions component or if height is `'auto'`

---

## Types

### DimensionValue

Type for dimension values that can be a number, percentage string, or 'auto'.

```typescript
type DimensionValue = number | `${number}%` | 'auto';

// Examples
const fixed: DimensionValue = 80;
const percent: DimensionValue = '50%';
const auto: DimensionValue = 'auto';
```

### DimensionsData

Data returned by `getDimensions`.

```typescript
interface DimensionsData {
  readonly width: number;     // Raw width value (may be encoded percentage)
  readonly height: number;    // Raw height value (may be encoded percentage)
  readonly minWidth: number;  // Minimum width constraint
  readonly minHeight: number; // Minimum height constraint
  readonly maxWidth: number;  // Maximum width constraint
  readonly maxHeight: number; // Maximum height constraint
  readonly shrink: boolean;   // Whether to shrink to content
}
```

### DimensionConstraints

Options for `setConstraints`.

```typescript
interface DimensionConstraints {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
}
```

---

## Usage Examples

### Creating a Fixed-Size Box

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setConstraints } from 'blecsd';

const world = createWorld();
const box = addEntity(world);

// 40x10 fixed size
setDimensions(world, box, 40, 10);
```

### Creating a Responsive Element

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setConstraints, getResolvedWidth } from 'blecsd';

const world = createWorld();
const panel = addEntity(world);

// 80% width with min/max constraints
setDimensions(world, panel, '80%', 20);
setConstraints(world, panel, {
  minWidth: 40,
  maxWidth: 120,
});

// Resolve against terminal width
const terminalWidth = 100;
const actualWidth = getResolvedWidth(world, panel, terminalWidth); // 80
```

### Creating a Content-Sized Element

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { setDimensions, setShrink } from 'blecsd';

const world = createWorld();
const label = addEntity(world);

// Auto-size to content with minimum constraints
setDimensions(world, label, 'auto', 'auto');
setShrink(world, label, true);
setConstraints(world, label, {
  minWidth: 10,
  minHeight: 1,
});
```

---

## See Also

- [Position Component](./position.md) - Entity positioning
- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
