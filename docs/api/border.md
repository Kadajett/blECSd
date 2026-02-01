# Border Component

Borders define visual outlines around entities using box-drawing characters, background colors, or custom character sets. Each side (left, top, right, bottom) can be individually enabled or disabled.

## BorderType Enum

Defines the type of border rendering.

```typescript
import { BorderType } from 'blecsd';

// Available border types
BorderType.None       // 0 - No border (hidden)
BorderType.Line       // 1 - Line border using box-drawing characters
BorderType.Background // 2 - Background color border
BorderType.Custom     // 3 - Custom characters border
```

---

## Border Charsets

Preset character sets for common border styles. All charsets implement the `BorderCharset` interface.

### BORDER_SINGLE

Single line border characters.

```typescript
import { BORDER_SINGLE } from 'blecsd';

// Characters: ┌ ┐ └ ┘ ─ │
```

### BORDER_DOUBLE

Double line border characters.

```typescript
import { BORDER_DOUBLE } from 'blecsd';

// Characters: ╔ ╗ ╚ ╝ ═ ║
```

### BORDER_ROUNDED

Rounded corner border characters.

```typescript
import { BORDER_ROUNDED } from 'blecsd';

// Characters: ╭ ╮ ╰ ╯ ─ │
```

### BORDER_BOLD

Bold/thick border characters.

```typescript
import { BORDER_BOLD } from 'blecsd';

// Characters: ┏ ┓ ┗ ┛ ━ ┃
```

### BORDER_ASCII

ASCII-only border characters (for terminals without Unicode support).

```typescript
import { BORDER_ASCII } from 'blecsd';

// Characters: + + + + - |
```

---

## Default Colors

```typescript
import { DEFAULT_BORDER_FG, DEFAULT_BORDER_BG } from 'blecsd';

DEFAULT_BORDER_FG // 0xffffffff - White (fully opaque)
DEFAULT_BORDER_BG // 0x00000000 - Transparent
```

---

## Border Component

The Border component stores border configuration using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Border } from 'blecsd';

// Component arrays
Border.type           // Uint8Array  - Border type (BorderType enum)
Border.left           // Uint8Array  - Left side enabled (0=no, 1=yes)
Border.top            // Uint8Array  - Top side enabled (0=no, 1=yes)
Border.right          // Uint8Array  - Right side enabled (0=no, 1=yes)
Border.bottom         // Uint8Array  - Bottom side enabled (0=no, 1=yes)
Border.fg             // Uint32Array - Foreground color (packed RGBA)
Border.bg             // Uint32Array - Background color (packed RGBA)
Border.charTopLeft    // Uint32Array - Top-left corner (Unicode codepoint)
Border.charTopRight   // Uint32Array - Top-right corner (Unicode codepoint)
Border.charBottomLeft // Uint32Array - Bottom-left corner (Unicode codepoint)
Border.charBottomRight// Uint32Array - Bottom-right corner (Unicode codepoint)
Border.charHorizontal // Uint32Array - Horizontal edge (Unicode codepoint)
Border.charVertical   // Uint32Array - Vertical edge (Unicode codepoint)
```

---

## Functions

### setBorder

Sets or updates the border configuration on an entity. Adds the Border component if not present.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setBorder, BorderType, BORDER_DOUBLE } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Set a line border with default single-line characters
setBorder(world, eid, { type: BorderType.Line });

// Set a double-line border with custom color
setBorder(world, eid, {
  type: BorderType.Line,
  chars: BORDER_DOUBLE,
  fg: '#ff0000',
});

// Enable only top and bottom borders
setBorder(world, eid, {
  type: BorderType.Line,
  left: false,
  right: false,
});

// Set a background-style border
setBorder(world, eid, {
  type: BorderType.Background,
  bg: '#333333',
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Border configuration options
  - `type` - Border type (BorderType enum)
  - `left` - Enable left side (default: true)
  - `top` - Enable top side (default: true)
  - `right` - Enable right side (default: true)
  - `bottom` - Enable bottom side (default: true)
  - `fg` - Foreground color (hex string or packed number)
  - `bg` - Background color (hex string or packed number)
  - `chars` - Border character set (BorderCharset)

**Returns:** The entity ID for chaining

---

### setBorderChars

Sets the border characters on an entity. Adds the Border component if not present.

```typescript
import { setBorderChars, BORDER_ROUNDED, BORDER_BOLD } from 'blecsd';

// Use rounded corners
setBorderChars(world, eid, BORDER_ROUNDED);

// Use bold/thick lines
setBorderChars(world, eid, BORDER_BOLD);

// Custom characters
setBorderChars(world, eid, {
  topLeft: 0x2554,     // ╔
  topRight: 0x2557,    // ╗
  bottomLeft: 0x255a,  // ╚
  bottomRight: 0x255d, // ╝
  horizontal: 0x2550,  // ═
  vertical: 0x2551,    // ║
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `chars` - Border character set (BorderCharset)

**Returns:** The entity ID for chaining

---

### getBorder

Gets the full border data for an entity.

```typescript
import { setBorder, getBorder, BorderType, BORDER_DOUBLE } from 'blecsd';

setBorder(world, eid, {
  type: BorderType.Line,
  chars: BORDER_DOUBLE,
  fg: '#00ff00',
  left: true,
  top: true,
  right: false,
  bottom: false,
});

const border = getBorder(world, eid);
// border = {
//   type: BorderType.Line,
//   left: true,
//   top: true,
//   right: false,
//   bottom: false,
//   fg: 0xff00ff00,
//   bg: 0x00000000,
//   charTopLeft: 0x2554,
//   charTopRight: 0x2557,
//   charBottomLeft: 0x255a,
//   charBottomRight: 0x255d,
//   charHorizontal: 0x2550,
//   charVertical: 0x2551,
// }

// Returns undefined if no Border component
getBorder(world, entityWithoutBorder); // undefined
```

**Returns:** `BorderData | undefined`

---

### hasBorder

Checks if an entity has a Border component.

```typescript
import { hasBorder, setBorder, BorderType } from 'blecsd';

hasBorder(world, eid); // false

setBorder(world, eid, { type: BorderType.Line });
hasBorder(world, eid); // true
```

---

### hasBorderVisible

Checks if an entity has a visible border (type is not None and at least one side is enabled).

```typescript
import { hasBorderVisible, setBorder, BorderType } from 'blecsd';

// No border component
hasBorderVisible(world, eid); // false

// Border type is None
setBorder(world, eid, { type: BorderType.None });
hasBorderVisible(world, eid); // false

// Border type is Line, all sides enabled (default)
setBorder(world, eid, { type: BorderType.Line });
hasBorderVisible(world, eid); // true

// All sides disabled
setBorder(world, eid, {
  type: BorderType.Line,
  left: false,
  top: false,
  right: false,
  bottom: false,
});
hasBorderVisible(world, eid); // false
```

---

### enableAllBorders

Enables all four border sides.

```typescript
import { setBorder, enableAllBorders, disableAllBorders, BorderType } from 'blecsd';

setBorder(world, eid, {
  type: BorderType.Line,
  left: false,
  top: false,
});

enableAllBorders(world, eid);
// Now left, top, right, bottom are all enabled

// Returns entity ID for chaining
```

---

### disableAllBorders

Disables all four border sides.

```typescript
import { setBorder, disableAllBorders, BorderType } from 'blecsd';

setBorder(world, eid, { type: BorderType.Line });
disableAllBorders(world, eid);
// Now left, top, right, bottom are all disabled

// Returns entity ID for chaining
```

---

### getBorderChar

Gets the border character (Unicode codepoint) for a specific position.

```typescript
import { setBorder, setBorderChars, getBorderChar, BorderType, BORDER_DOUBLE } from 'blecsd';

setBorder(world, eid, { type: BorderType.Line });
setBorderChars(world, eid, BORDER_DOUBLE);

getBorderChar(world, eid, 'topLeft');     // 0x2554 (╔)
getBorderChar(world, eid, 'topRight');    // 0x2557 (╗)
getBorderChar(world, eid, 'bottomLeft');  // 0x255a (╚)
getBorderChar(world, eid, 'bottomRight'); // 0x255d (╝)
getBorderChar(world, eid, 'horizontal');  // 0x2550 (═)
getBorderChar(world, eid, 'vertical');    // 0x2551 (║)

// Returns undefined if no Border component
getBorderChar(world, entityWithoutBorder, 'topLeft'); // undefined
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `position` - Position name: `'topLeft'`, `'topRight'`, `'bottomLeft'`, `'bottomRight'`, `'horizontal'`, or `'vertical'`

**Returns:** `number | undefined` (Unicode codepoint)

---

## Types

### BorderCharset

Interface for border character sets.

```typescript
interface BorderCharset {
  readonly topLeft: number;     // Unicode codepoint for top-left corner
  readonly topRight: number;    // Unicode codepoint for top-right corner
  readonly bottomLeft: number;  // Unicode codepoint for bottom-left corner
  readonly bottomRight: number; // Unicode codepoint for bottom-right corner
  readonly horizontal: number;  // Unicode codepoint for horizontal edges
  readonly vertical: number;    // Unicode codepoint for vertical edges
}
```

### BorderOptions

Options for configuring a border.

```typescript
interface BorderOptions {
  type?: BorderType;           // Border type
  left?: boolean;              // Enable left side
  top?: boolean;               // Enable top side
  right?: boolean;             // Enable right side
  bottom?: boolean;            // Enable bottom side
  fg?: string | number;        // Foreground color (hex string or packed number)
  bg?: string | number;        // Background color (hex string or packed number)
  chars?: BorderCharset;       // Border character set
}
```

### BorderData

Data returned by getBorder.

```typescript
interface BorderData {
  readonly type: BorderType;
  readonly left: boolean;
  readonly top: boolean;
  readonly right: boolean;
  readonly bottom: boolean;
  readonly fg: number;            // Packed RGBA color
  readonly bg: number;            // Packed RGBA color
  readonly charTopLeft: number;   // Unicode codepoint
  readonly charTopRight: number;  // Unicode codepoint
  readonly charBottomLeft: number;  // Unicode codepoint
  readonly charBottomRight: number; // Unicode codepoint
  readonly charHorizontal: number;  // Unicode codepoint
  readonly charVertical: number;    // Unicode codepoint
}
```

---

## Examples

### Creating a Dialog Box

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setBorder, BorderType, BORDER_DOUBLE } from 'blecsd';

const world = createWorld();
const dialog = addEntity(world);

setBorder(world, dialog, {
  type: BorderType.Line,
  chars: BORDER_DOUBLE,
  fg: '#ffffff',
  bg: '#000000',
});
```

### Creating a Menu with Rounded Corners

```typescript
import { setBorder, BorderType, BORDER_ROUNDED } from 'blecsd';

setBorder(world, menu, {
  type: BorderType.Line,
  chars: BORDER_ROUNDED,
  fg: '#00ff00',
});
```

### Creating a Horizontal Divider

```typescript
import { setBorder, BorderType } from 'blecsd';

setBorder(world, divider, {
  type: BorderType.Line,
  left: false,
  right: false,
  top: true,
  bottom: false,
  fg: '#666666',
});
```

### ASCII-Only Terminal Support

```typescript
import { setBorder, BorderType, BORDER_ASCII } from 'blecsd';

// For terminals without Unicode support
setBorder(world, element, {
  type: BorderType.Line,
  chars: BORDER_ASCII,
});
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Position Component](./position.md) - Positioning entities
- [Dimensions Component](./dimensions.md) - Sizing entities
