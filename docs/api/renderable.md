# Renderable Component

The Renderable component provides visual styling for entities, including colors, text decorations, and visibility control. It uses packed 32-bit RGBA colors for efficient storage and includes utility functions for color conversion.

## Color Utility Functions

### packColor

Packs RGBA color components into a single 32-bit integer.

```typescript
import { packColor } from 'blecsd';

// Pack opaque red
const red = packColor(255, 0, 0);

// Pack semi-transparent blue
const semiTransparentBlue = packColor(0, 0, 255, 128);

// Pack white with full alpha (default)
const white = packColor(255, 255, 255);
```

**Parameters:**
- `r` - Red component (0-255)
- `g` - Green component (0-255)
- `b` - Blue component (0-255)
- `a` - Alpha component (0-255, default: 255)

**Returns:** Packed 32-bit color value

---

### unpackColor

Unpacks a 32-bit color value into RGBA components.

```typescript
import { unpackColor, packColor } from 'blecsd';

const red = packColor(255, 0, 0);
const { r, g, b, a } = unpackColor(red);
// r = 255, g = 0, b = 0, a = 255
```

**Parameters:**
- `color` - Packed 32-bit color value

**Returns:** Object with `r`, `g`, `b`, `a` components (0-255 each)

---

### hexToColor

Converts a hex color string to a packed 32-bit color.

```typescript
import { hexToColor } from 'blecsd';

// Standard 6-character hex
const red = hexToColor('#ff0000');

// With alpha (8 characters)
const semiTransparent = hexToColor('#ff000080');

// Short form (3 characters)
const white = hexToColor('#fff');

// Short form with alpha (4 characters)
const semiWhite = hexToColor('#fff8');
```

**Parameters:**
- `hex` - Hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)

**Returns:** Packed 32-bit color value

---

### colorToHex

Converts a packed 32-bit color to a hex string.

```typescript
import { colorToHex, packColor } from 'blecsd';

const red = packColor(255, 0, 0);

// Without alpha
const hex = colorToHex(red); // '#ff0000'

// With alpha
const hexAlpha = colorToHex(red, true); // '#ff0000ff'
```

**Parameters:**
- `color` - Packed 32-bit color value
- `includeAlpha` - Whether to include alpha in output (default: false)

**Returns:** Hex color string

---

## Color Constants

### DEFAULT_FG

Default foreground color (white, fully opaque).

```typescript
import { DEFAULT_FG, unpackColor } from 'blecsd';

const { r, g, b, a } = unpackColor(DEFAULT_FG);
// r = 255, g = 255, b = 255, a = 255
```

---

### DEFAULT_BG

Default background color (black, fully transparent).

```typescript
import { DEFAULT_BG, unpackColor } from 'blecsd';

const { r, g, b, a } = unpackColor(DEFAULT_BG);
// r = 0, g = 0, b = 0, a = 0
```

---

## Renderable Component

The Renderable component store uses bitecs SoA (Structure of Arrays) pattern for performance.

```typescript
import { Renderable } from 'blecsd';

// Component arrays
Renderable.visible     // Uint8Array  - 0=hidden, 1=visible
Renderable.dirty       // Uint8Array  - 0=clean, 1=needs redraw
Renderable.fg          // Uint32Array - Foreground color (packed RGBA)
Renderable.bg          // Uint32Array - Background color (packed RGBA)
Renderable.bold        // Uint8Array  - Bold text flag
Renderable.underline   // Uint8Array  - Underlined text flag
Renderable.blink       // Uint8Array  - Blinking text flag
Renderable.inverse     // Uint8Array  - Inverse colors flag
Renderable.transparent // Uint8Array  - Transparent background flag
```

---

## Functions

### hasRenderable

Checks if an entity has a Renderable component.

```typescript
import { createWorld, hasRenderable, setStyle } from 'blecsd';

const world = createWorld();
const eid = 1;

hasRenderable(world, eid); // false

setStyle(world, eid, { fg: '#ff0000' });
hasRenderable(world, eid); // true
```

---

### setStyle

Sets the visual style of an entity. Adds the Renderable component if not already present.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Set style with hex colors
setStyle(world, entity, {
  fg: '#ff0000',
  bg: '#000000',
  bold: true,
});

// Set style with packed colors
setStyle(world, entity, {
  fg: 0xffff0000,
  underline: true,
});

// Partial updates (only specified fields change)
setStyle(world, entity, { blink: true });

// Returns entity ID for chaining
setStyle(world, entity, { inverse: true })
  .someOtherOperation();
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `style` - Style options to apply (StyleOptions)

**Returns:** The entity ID for chaining

---

### getStyle

Gets the style data of an entity.

```typescript
import { createWorld, setStyle, getStyle, colorToHex } from 'blecsd';

const world = createWorld();
const eid = 1;

getStyle(world, eid); // undefined (no component)

setStyle(world, eid, {
  fg: '#ff0000',
  bg: '#0000ff',
  bold: true,
  underline: false,
});

const style = getStyle(world, eid);
// style = {
//   fg: 0xffff0000,       // Packed red
//   bg: 0xff0000ff,       // Packed blue
//   bold: true,
//   underline: false,
//   blink: false,
//   inverse: false,
//   transparent: false,
// }

console.log(`FG: ${colorToHex(style.fg)}, Bold: ${style.bold}`);
// "FG: #ff0000, Bold: true"
```

**Returns:** `StyleData | undefined`

---

### getRenderable

Gets the full renderable data of an entity, including visibility and dirty state.

```typescript
import { createWorld, setStyle, getRenderable } from 'blecsd';

const world = createWorld();
const eid = 1;

getRenderable(world, eid); // undefined (no component)

setStyle(world, eid, { fg: '#00ff00' });

const data = getRenderable(world, eid);
// data = {
//   visible: true,
//   dirty: true,
//   fg: 0xff00ff00,
//   bg: 0x00000000,
//   bold: false,
//   underline: false,
//   blink: false,
//   inverse: false,
//   transparent: false,
// }
```

**Returns:** `RenderableData | undefined`

---

### markDirty

Marks an entity as needing redraw. Adds the Renderable component if not already present.

```typescript
import { createWorld, markDirty, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

// After changing entity state, mark for redraw
markDirty(world, eid);
isDirty(world, eid); // true

// Returns entity ID for chaining
```

---

### markClean

Marks an entity as clean (no redraw needed).

```typescript
import { createWorld, setStyle, markClean, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
isDirty(world, eid); // true (setStyle marks dirty)

markClean(world, eid);
isDirty(world, eid); // false

// Returns entity ID for chaining
```

**Note:** Does nothing if entity has no Renderable component.

---

### isDirty

Checks if an entity needs redraw.

```typescript
import { createWorld, setStyle, markClean, markDirty, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

isDirty(world, eid); // false (no component)

setStyle(world, eid, { fg: '#ff0000' });
isDirty(world, eid); // true

markClean(world, eid);
isDirty(world, eid); // false

markDirty(world, eid);
isDirty(world, eid); // true
```

**Returns:** `true` if dirty, `false` otherwise

---

### setVisible

Sets visibility of an entity. Adds the Renderable component if not already present.

```typescript
import { createWorld, setVisible, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setVisible(world, eid, false); // Hide entity
isVisible(world, eid); // false

setVisible(world, eid, true);  // Show entity
isVisible(world, eid); // true

// Returns entity ID for chaining
```

**Note:** Automatically marks the entity dirty when visibility changes.

---

### isVisible

Checks if an entity is visible.

```typescript
import { createWorld, setStyle, isVisible, hide } from 'blecsd';

const world = createWorld();
const eid = 1;

isVisible(world, eid); // false (no component)

setStyle(world, eid, { fg: '#ff0000' });
isVisible(world, eid); // true (default is visible)

hide(world, eid);
isVisible(world, eid); // false
```

**Returns:** `true` if visible, `false` otherwise

---

### show

Shows an entity (sets visible to true). Shorthand for `setVisible(world, eid, true)`.

```typescript
import { createWorld, setStyle, hide, show, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
hide(world, eid);
isVisible(world, eid); // false

show(world, eid);
isVisible(world, eid); // true

// Returns entity ID for chaining
```

---

### hide

Hides an entity (sets visible to false). Shorthand for `setVisible(world, eid, false)`.

```typescript
import { createWorld, setStyle, hide, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
isVisible(world, eid); // true

hide(world, eid);
isVisible(world, eid); // false

// Returns entity ID for chaining
```

---

### toggle

Toggles visibility of an entity.

```typescript
import { createWorld, setStyle, toggle, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
isVisible(world, eid); // true

toggle(world, eid);
isVisible(world, eid); // false

toggle(world, eid);
isVisible(world, eid); // true

// Returns entity ID for chaining
```

---

### isEffectivelyVisible

Checks if an entity is effectively visible. An entity is effectively visible only if it and all its ancestors are visible.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, setParent, show, hide, isEffectivelyVisible } from 'blecsd';

const world = createWorld();
const parent = addEntity(world);
const child = addEntity(world);

setStyle(world, parent, { fg: '#ff0000' });
setStyle(world, child, { fg: '#00ff00' });
setParent(world, child, parent);

// When parent is hidden, child is not effectively visible
show(world, child);
hide(world, parent);
isEffectivelyVisible(world, child); // false

// When both are visible, child is effectively visible
show(world, parent);
isEffectivelyVisible(world, child); // true
```

**Returns:** `true` if entity and all ancestors are visible

---

### isDetached

Checks if an entity is detached from the root. An entity is detached if it has a hierarchy but no path to a root entity.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, setParent, removeChild, isDetached } from 'blecsd';

const world = createWorld();
const root = addEntity(world);
const child = addEntity(world);

setStyle(world, root, { fg: '#ff0000' });
setStyle(world, child, { fg: '#00ff00' });
setParent(world, child, root);

// Child is attached to root
isDetached(world, child); // false

// After removal, child may be detached
removeChild(world, root, child);
isDetached(world, child); // true (if no other parent)
```

**Returns:** `true` if entity is detached from root

---

## Types

### StyleOptions

Options for setting entity style.

```typescript
interface StyleOptions {
  fg?: string | number;        // Foreground color (hex string or packed)
  bg?: string | number;        // Background color (hex string or packed)
  bold?: boolean;              // Bold text
  underline?: boolean;         // Underlined text
  blink?: boolean;             // Blinking text
  inverse?: boolean;           // Inverse colors
  transparent?: boolean;       // Transparent background
}
```

### StyleData

Data returned by getStyle.

```typescript
interface StyleData {
  readonly fg: number;         // Foreground color (packed)
  readonly bg: number;         // Background color (packed)
  readonly bold: boolean;
  readonly underline: boolean;
  readonly blink: boolean;
  readonly inverse: boolean;
  readonly transparent: boolean;
}
```

### RenderableData

Data returned by getRenderable.

```typescript
interface RenderableData extends StyleData {
  readonly visible: boolean;   // Whether entity is visible
  readonly dirty: boolean;     // Whether entity needs redraw
}
```

---

## Usage Examples

### Basic Styling

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, getStyle, colorToHex } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Style a text entity with red foreground
setStyle(world, entity, {
  fg: '#ff0000',
  bold: true,
});

// Read back the style
const style = getStyle(world, entity);
console.log(colorToHex(style.fg)); // '#ff0000'
console.log(style.bold);           // true
```

### Visibility Control

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, show, hide, isVisible } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setStyle(world, entity, { fg: '#00ff00' });

// Toggle visibility
if (isVisible(world, entity)) {
  hide(world, entity);
} else {
  show(world, entity);
}
```

### Dirty Tracking for Render Optimization

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, isDirty, markClean, markDirty } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setStyle(world, entity, { fg: '#ffffff' });

// In render system
if (isDirty(world, entity)) {
  renderEntity(world, entity);
  markClean(world, entity);
}

// When entity state changes elsewhere
updateEntityPosition(world, entity);
markDirty(world, entity); // Request redraw
```

### Color Conversion Pipeline

```typescript
import { hexToColor, colorToHex, packColor, unpackColor } from 'blecsd';

// From hex to packed
const packed = hexToColor('#ff5500');

// Modify the color
const { r, g, b, a } = unpackColor(packed);
const darker = packColor(
  Math.floor(r * 0.5),
  Math.floor(g * 0.5),
  Math.floor(b * 0.5),
  a
);

// Back to hex
const hex = colorToHex(darker); // '#7f2a00'
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Position Component](./position.md) - Entity positioning
- [Entity Factories](./entities.md) - Creating entities with components
