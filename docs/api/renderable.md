# Renderable Component

The Renderable component controls how entities appear visually: colors, text decorations, and visibility. Entities without Renderable are invisible to the rendering system.

## How do I work with colors?

### packColor

Converts RGBA values (0-255 each) into a single 32-bit integer for efficient storage.

```typescript
import { packColor } from 'blecsd';

const red = packColor(255, 0, 0);
// Returns: 4278190335 (0xFFFF0000)

const semiTransparentBlue = packColor(0, 0, 255, 128);
// Returns: 2164195583 (0x800000FF)

const white = packColor(255, 255, 255);
// Returns: 4294967295 (0xFFFFFFFF)
```

**Parameters:** `r` (red, 0-255), `g` (green, 0-255), `b` (blue, 0-255), `a` (alpha, 0-255, default: 255)

**Returns:** Packed 32-bit color value

---

### unpackColor

Extracts RGBA components from a packed color.

```typescript
import { unpackColor, packColor } from 'blecsd';

const red = packColor(255, 0, 0);
const { r, g, b, a } = unpackColor(red);
// r=255, g=0, b=0, a=255
```

**Returns:** `{ r: number, g: number, b: number, a: number }`

---

### hexToColor

Converts hex color strings to packed 32-bit colors.

```typescript
import { hexToColor } from 'blecsd';

hexToColor('#ff0000');    // Red, returns 4278190335
hexToColor('#ff000080');  // Red, 50% transparent
hexToColor('#fff');       // Short form white
hexToColor('#fff8');      // Short form white, semi-transparent
```

**Supported formats:** `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`

**Returns:** Packed 32-bit color value

---

### colorToHex

Converts packed colors back to hex strings.

```typescript
import { colorToHex, packColor } from 'blecsd';

const red = packColor(255, 0, 0);
colorToHex(red);        // '#ff0000'
colorToHex(red, true);  // '#ff0000ff' (with alpha)
```

**Parameters:** `color` (packed 32-bit value), `includeAlpha` (default: false)

**Returns:** Hex color string

---

## Color Constants

```typescript
import { DEFAULT_FG, DEFAULT_BG, unpackColor } from 'blecsd';

DEFAULT_FG  // White, fully opaque (0xFFFFFFFF)
DEFAULT_BG  // Black, fully transparent (0x00000000)
```

---

## Component Structure

```typescript
import { Renderable } from 'blecsd';

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

## How do I check if an entity is renderable?

### hasRenderable

```typescript
import { createWorld, hasRenderable, setStyle } from 'blecsd';

const world = createWorld();
const eid = 1;

hasRenderable(world, eid);            // false
setStyle(world, eid, { fg: '#ff0000' });
hasRenderable(world, eid);            // true
```

---

## How do I style an entity?

### setStyle

Sets colors and text decorations. Adds the Renderable component if not present.

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
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `style` (StyleOptions)

**Returns:** Entity ID for chaining

---

### getStyle

Returns style data or `undefined` if no Renderable component.

```typescript
import { createWorld, setStyle, getStyle, colorToHex } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, {
  fg: '#ff0000',
  bg: '#0000ff',
  bold: true,
});

const style = getStyle(world, eid);
// {
//   fg: 4278190335,      // Packed red
//   bg: 4278190335,      // Packed blue
//   bold: true,
//   underline: false,
//   blink: false,
//   inverse: false,
//   transparent: false,
// }

console.log(colorToHex(style.fg));  // '#ff0000'
```

**Returns:** `StyleData | undefined`

---

### getRenderable

Returns full renderable data including visibility and dirty state.

```typescript
import { createWorld, setStyle, getRenderable } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#00ff00' });

const data = getRenderable(world, eid);
// {
//   visible: true,
//   dirty: true,
//   fg: ...,
//   bg: ...,
//   bold: false,
//   underline: false,
//   blink: false,
//   inverse: false,
//   transparent: false,
// }
```

**Returns:** `RenderableData | undefined`

---

## How do I track which entities need redrawing?

### markDirty

Marks an entity as needing redraw. Adds Renderable if not present.

```typescript
import { createWorld, markDirty, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

markDirty(world, eid);
isDirty(world, eid);  // true
```

**Returns:** Entity ID for chaining

---

### markClean

Clears the dirty flag after rendering.

```typescript
import { createWorld, setStyle, markClean, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
isDirty(world, eid);  // true (setStyle marks dirty)

markClean(world, eid);
isDirty(world, eid);  // false
```

**Returns:** Entity ID for chaining

---

### isDirty

```typescript
import { createWorld, setStyle, markClean, markDirty, isDirty } from 'blecsd';

const world = createWorld();
const eid = 1;

isDirty(world, eid);  // false (no component)

setStyle(world, eid, { fg: '#ff0000' });
isDirty(world, eid);  // true

markClean(world, eid);
isDirty(world, eid);  // false
```

---

## How do I control visibility?

### setVisible

```typescript
import { createWorld, setVisible, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setVisible(world, eid, false);
isVisible(world, eid);  // false

setVisible(world, eid, true);
isVisible(world, eid);  // true
```

Automatically marks the entity dirty when visibility changes.

**Returns:** Entity ID for chaining

---

### show / hide / toggle

Convenience functions for visibility control.

```typescript
import { createWorld, setStyle, show, hide, toggle, isVisible } from 'blecsd';

const world = createWorld();
const eid = 1;

setStyle(world, eid, { fg: '#ff0000' });
isVisible(world, eid);  // true

hide(world, eid);
isVisible(world, eid);  // false

show(world, eid);
isVisible(world, eid);  // true

toggle(world, eid);
isVisible(world, eid);  // false
```

---

### isEffectivelyVisible

Checks if an entity and all its ancestors are visible. An entity with a hidden parent is not effectively visible.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, setParent, show, hide, isEffectivelyVisible } from 'blecsd';

const world = createWorld();
const parent = addEntity(world);
const child = addEntity(world);

setStyle(world, parent, { fg: '#ff0000' });
setStyle(world, child, { fg: '#00ff00' });
setParent(world, child, parent);

show(world, child);
hide(world, parent);
isEffectivelyVisible(world, child);  // false (parent hidden)

show(world, parent);
isEffectivelyVisible(world, child);  // true
```

---

### isDetached

Checks if an entity has a hierarchy but no path to a root.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setStyle, setParent, removeChild, isDetached } from 'blecsd';

const world = createWorld();
const root = addEntity(world);
const child = addEntity(world);

setStyle(world, root, { fg: '#ff0000' });
setStyle(world, child, { fg: '#00ff00' });
setParent(world, child, root);

isDetached(world, child);  // false

removeChild(world, root, child);
isDetached(world, child);  // true (if no other parent)
```

---

## Types

### StyleOptions

```typescript
interface StyleOptions {
  fg?: string | number;        // Foreground color (hex or packed)
  bg?: string | number;        // Background color (hex or packed)
  bold?: boolean;
  underline?: boolean;
  blink?: boolean;
  inverse?: boolean;
  transparent?: boolean;
}
```

### StyleData

```typescript
interface StyleData {
  readonly fg: number;
  readonly bg: number;
  readonly bold: boolean;
  readonly underline: boolean;
  readonly blink: boolean;
  readonly inverse: boolean;
  readonly transparent: boolean;
}
```

### RenderableData

```typescript
interface RenderableData extends StyleData {
  readonly visible: boolean;
  readonly dirty: boolean;
}
```

---

## Limitations

- **Blink support**: Blinking text is terminal-dependent and may not work in all terminals
- **Truecolor requirement**: 24-bit colors require truecolor support; without it, colors are approximated to 256 colors
- **Text decoration stacking**: Some terminals don't support combining bold + underline + blink simultaneously

---

## See Also

- [Position Component](./position.md) - Entity positioning
- [Queries](./queries.md) - Finding visible/dirty entities
