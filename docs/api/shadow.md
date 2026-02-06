# Shadow Component

The Shadow component provides drop shadow rendering on the right and bottom edges of elements. Supports configurable offset, color, opacity, and character style using the bitecs SoA (Structure of Arrays) pattern.

## Shadow Component

The Shadow component stores shadow configuration using SoA for performance.

```typescript
import { Shadow } from 'blecsd';

// Component arrays
Shadow.enabled     // Uint8Array  - 0=disabled, 1=enabled
Shadow.offsetX     // Int8Array   - Horizontal offset (typically +1)
Shadow.offsetY     // Int8Array   - Vertical offset (typically +1)
Shadow.color       // Uint32Array - Shadow color (packed RGBA)
Shadow.opacity     // Uint8Array  - Shadow opacity (0-255)
Shadow.char        // Uint32Array - Shadow character (Unicode codepoint)
Shadow.blendWithBg // Uint8Array  - Blend with background (0=no, 1=yes)
```

---

## Constants

### Default Values

```typescript
import {
  DEFAULT_SHADOW_OFFSET_X,  // 1 - Right offset
  DEFAULT_SHADOW_OFFSET_Y,  // 1 - Down offset
  DEFAULT_SHADOW_COLOR,     // 0xff333333 - Dark gray
  DEFAULT_SHADOW_OPACITY,   // 128 - 50% transparent
  DEFAULT_SHADOW_CHAR,      // 0x2588 - Full block character
} from 'blecsd';
```

### Shadow Characters

Pre-defined character constants for different shadow styles.

```typescript
import {
  DEFAULT_SHADOW_CHAR,  // Full block
  SHADOW_CHAR_LIGHT,    // Light shade
  SHADOW_CHAR_MEDIUM,   // Medium shade
  SHADOW_CHAR_DARK,     // Dark shade
} from 'blecsd';
```

---

## Functions

### setShadow

Sets the shadow configuration on an entity. Adds the Shadow component if not present.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setShadow } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Enable shadow with default settings
setShadow(world, entity, { enabled: true });

// Custom shadow configuration
setShadow(world, entity, {
  enabled: true,
  offsetX: 2,
  offsetY: 2,
  color: '#000000',
  opacity: 200,
});

// Use a different shadow character
setShadow(world, entity, {
  enabled: true,
  char: 0x2591, // Light shade
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Shadow configuration options
  - `enabled` - Enable or disable shadow
  - `offsetX` - Horizontal offset (default: 1)
  - `offsetY` - Vertical offset (default: 1)
  - `color` - Shadow color (hex string or packed number)
  - `opacity` - Shadow opacity (0-255, default: 128)
  - `char` - Shadow character (Unicode codepoint)
  - `blendWithBg` - Whether to blend with background

**Returns:** The entity ID for chaining

---

### getShadow

Gets the shadow data of an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setShadow, getShadow } from 'blecsd';

setShadow(world, entity, {
  enabled: true,
  offsetX: 2,
  offsetY: 2,
  color: '#000000',
  opacity: 200,
});

const shadow = getShadow(world, entity);
// shadow = {
//   enabled: true,
//   offsetX: 2,
//   offsetY: 2,
//   color: 0xff000000,
//   opacity: 200,
//   char: 0x2588,
//   blendWithBg: true,
// }

// Returns undefined if no Shadow component
getShadow(world, entityWithoutShadow); // undefined
```

**Returns:** `ShadowData | undefined`

---

### hasShadow

Checks if an entity has a Shadow component.

```typescript
import { hasShadow, setShadow } from 'blecsd';

hasShadow(world, entity); // false

setShadow(world, entity, { enabled: true });
hasShadow(world, entity); // true
```

---

### isShadowEnabled

Checks if an entity has shadow enabled.

```typescript
import { isShadowEnabled, setShadow, disableShadow } from 'blecsd';

// No shadow component
isShadowEnabled(world, entity); // false

// Shadow enabled
setShadow(world, entity, { enabled: true });
isShadowEnabled(world, entity); // true

// Shadow disabled
disableShadow(world, entity);
isShadowEnabled(world, entity); // false
```

---

### enableShadow

Enables the shadow for an entity. Adds the Shadow component if needed.

```typescript
import { enableShadow } from 'blecsd';

enableShadow(world, entity);
```

**Returns:** The entity ID for chaining

---

### disableShadow

Disables the shadow for an entity.

```typescript
import { disableShadow } from 'blecsd';

disableShadow(world, entity);
```

**Returns:** The entity ID for chaining

---

### toggleShadow

Toggles the shadow for an entity.

```typescript
import { toggleShadow, isShadowEnabled } from 'blecsd';

isShadowEnabled(world, entity); // false
toggleShadow(world, entity);
isShadowEnabled(world, entity); // true
toggleShadow(world, entity);
isShadowEnabled(world, entity); // false
```

**Returns:** The entity ID for chaining

---

### setShadowOffset

Sets the shadow offset.

```typescript
import { setShadowOffset } from 'blecsd';

// Standard drop shadow (right and down)
setShadowOffset(world, entity, 1, 1);

// Larger shadow
setShadowOffset(world, entity, 2, 2);
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `x` - Horizontal offset
- `y` - Vertical offset

**Returns:** The entity ID for chaining

---

### getShadowOffset

Gets the shadow offset.

```typescript
import { setShadowOffset, getShadowOffset } from 'blecsd';

setShadowOffset(world, entity, 2, 3);

const offset = getShadowOffset(world, entity);
// offset = { x: 2, y: 3 }
```

**Returns:** `{ x: number; y: number } | undefined`

---

### setShadowColor

Sets the shadow color.

```typescript
import { setShadowColor } from 'blecsd';

// Using hex string
setShadowColor(world, entity, '#000000');

// Using packed RGBA
setShadowColor(world, entity, 0xff333333);
```

**Returns:** The entity ID for chaining

---

### getShadowColor

Gets the shadow color.

```typescript
import { getShadowColor } from 'blecsd';

const color = getShadowColor(world, entity); // Packed RGBA number
```

**Returns:** `number | undefined`

---

### setShadowOpacity

Sets the shadow opacity.

```typescript
import { setShadowOpacity } from 'blecsd';

setShadowOpacity(world, entity, 128); // 50% opacity
setShadowOpacity(world, entity, 255); // Full opacity
setShadowOpacity(world, entity, 64);  // 25% opacity
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `opacity` - Opacity value (0-255)

**Returns:** The entity ID for chaining

---

### getShadowOpacity

Gets the shadow opacity.

```typescript
import { getShadowOpacity } from 'blecsd';

const opacity = getShadowOpacity(world, entity); // 0-255
```

**Returns:** `number | undefined`

---

### setShadowChar

Sets the shadow character.

```typescript
import { setShadowChar, SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM } from 'blecsd';

// Use light shade character
setShadowChar(world, entity, SHADOW_CHAR_LIGHT);

// Use medium shade character
setShadowChar(world, entity, SHADOW_CHAR_MEDIUM);
```

**Returns:** The entity ID for chaining

---

### getShadowChar

Gets the shadow character.

```typescript
import { getShadowChar } from 'blecsd';

const char = getShadowChar(world, entity); // Unicode codepoint
```

**Returns:** `number | undefined`

---

### setShadowBlend

Sets whether shadow should blend with background.

```typescript
import { setShadowBlend } from 'blecsd';

setShadowBlend(world, entity, true);  // Enable blending
setShadowBlend(world, entity, false); // Disable blending
```

**Returns:** The entity ID for chaining

---

### isShadowBlending

Checks if shadow blends with background.

```typescript
import { isShadowBlending } from 'blecsd';

const blending = isShadowBlending(world, entity); // boolean
```

---

### removeShadow

Removes the shadow component from an entity.

```typescript
import { removeShadow, hasShadow } from 'blecsd';

removeShadow(world, entity);
hasShadow(world, entity); // false
```

**Returns:** The entity ID for chaining

---

### calculateShadowPositions

Calculates shadow render positions for an element. Returns positions for right edge, bottom edge, and corner shadows.

```typescript
import { calculateShadowPositions, getShadow } from 'blecsd';

const shadow = getShadow(world, entity);
if (shadow?.enabled) {
  const positions = calculateShadowPositions(
    10,               // element X
    5,                // element Y
    20,               // element width
    10,               // element height
    shadow.offsetX,
    shadow.offsetY
  );

  for (const pos of positions) {
    // Render shadow character at pos.x, pos.y
    // pos.type is 'right', 'bottom', or 'corner'
  }
}
```

**Parameters:**
- `x` - Element X position
- `y` - Element Y position
- `width` - Element width
- `height` - Element height
- `offsetX` - Shadow X offset
- `offsetY` - Shadow Y offset

**Returns:** `ShadowPosition[]` - Array of positions with `x`, `y`, and `type`

---

### blendShadowColor

Blends a shadow color with a background color based on opacity.

```typescript
import { blendShadowColor } from 'blecsd';

// Blend black shadow with white background at 50% opacity
const blended = blendShadowColor(0xff000000, 0xffffffff, 128);
// Returns a gray color
```

**Parameters:**
- `shadowColor` - Shadow color (packed RGBA)
- `bgColor` - Background color (packed RGBA)
- `opacity` - Shadow opacity (0-255)

**Returns:** Blended color (packed RGBA)

---

## Types

### ShadowOptions

Options for configuring a shadow.

```typescript
interface ShadowOptions {
  enabled?: boolean;          // Enable or disable shadow
  offsetX?: number;           // Horizontal offset
  offsetY?: number;           // Vertical offset
  color?: string | number;    // Shadow color
  opacity?: number;           // Shadow opacity (0-255)
  char?: number;              // Shadow character (Unicode codepoint)
  blendWithBg?: boolean;      // Blend with background
}
```

### ShadowData

Data returned by getShadow.

```typescript
interface ShadowData {
  readonly enabled: boolean;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly color: number;      // Packed RGBA
  readonly opacity: number;
  readonly char: number;       // Unicode codepoint
  readonly blendWithBg: boolean;
}
```

### ShadowPosition

Shadow position with type information.

```typescript
interface ShadowPosition {
  readonly x: number;
  readonly y: number;
  readonly type: 'right' | 'bottom' | 'corner';
}
```

---

## Examples

### Creating a Dialog with Drop Shadow

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, setDimensions, setShadow } from 'blecsd';

const world = createWorld();
const dialog = addEntity(world);

setPosition(world, dialog, 10, 5);
setDimensions(world, dialog, 40, 15);
setShadow(world, dialog, {
  enabled: true,
  offsetX: 2,
  offsetY: 1,
  color: '#000000',
  opacity: 180,
});
```

### Using Different Shadow Styles

```typescript
import { setShadow, SHADOW_CHAR_LIGHT, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_DARK } from 'blecsd';

// Light, subtle shadow
setShadow(world, entity, {
  enabled: true,
  char: SHADOW_CHAR_LIGHT,
  opacity: 100,
});

// Medium shadow
setShadow(world, entity, {
  enabled: true,
  char: SHADOW_CHAR_MEDIUM,
  opacity: 150,
});

// Bold, dark shadow
setShadow(world, entity, {
  enabled: true,
  char: SHADOW_CHAR_DARK,
  opacity: 220,
});
```

### Rendering Shadows

```typescript
import { calculateShadowPositions, getShadow, blendShadowColor } from 'blecsd';

function renderEntityShadow(world, entity, screen) {
  const shadow = getShadow(world, entity);
  if (!shadow?.enabled) return;

  const pos = getPosition(world, entity);
  const dim = getDimensions(world, entity);

  const positions = calculateShadowPositions(
    pos.x, pos.y,
    dim.width, dim.height,
    shadow.offsetX, shadow.offsetY
  );

  for (const p of positions) {
    const bgColor = screen.getBackground(p.x, p.y);
    const finalColor = shadow.blendWithBg
      ? blendShadowColor(shadow.color, bgColor, shadow.opacity)
      : shadow.color;

    screen.setCell(p.x, p.y, {
      char: String.fromCodePoint(shadow.char),
      fg: finalColor,
    });
  }
}
```

---

## See Also

- [Position Component](./position.md) - Entity positioning
- [Dimensions Component](./dimensions.md) - Entity sizing
- [Border Component](./border.md) - Element borders
