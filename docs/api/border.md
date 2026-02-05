# Border Component

Borders draw visual outlines around entities using box-drawing characters, background colors, or custom characters. Each side (left, top, right, bottom) can be enabled or disabled independently.

## What border types are available?

### BorderType Enum

```typescript
import { BorderType } from 'blecsd';

BorderType.None       // 0 - No border (hidden)
BorderType.Line       // 1 - Line border using box-drawing characters
BorderType.Background // 2 - Background color border
BorderType.Custom     // 3 - Custom characters border
```

---

## What character sets are available?

### Built-in Charsets

All charsets implement the `BorderCharset` interface.

| Charset | Style | Example |
|---------|-------|---------|
| `BORDER_SINGLE` | Single line | `┌ ┐ └ ┘ ─ │` |
| `BORDER_DOUBLE` | Double line | `╔ ╗ ╚ ╝ ═ ║` |
| `BORDER_ROUNDED` | Rounded corners | `╭ ╮ ╰ ╯ ─ │` |
| `BORDER_BOLD` | Bold/thick | `┏ ┓ ┗ ┛ ━ ┃` |
| `BORDER_ASCII` | ASCII-only | `+ + + + - \|` |

```typescript
import {
  BORDER_SINGLE,
  BORDER_DOUBLE,
  BORDER_ROUNDED,
  BORDER_BOLD,
  BORDER_ASCII,
} from 'blecsd';
```

---

## Default Colors

```typescript
import { DEFAULT_BORDER_FG, DEFAULT_BORDER_BG } from 'blecsd';

DEFAULT_BORDER_FG  // 0xFFFFFFFF - White (fully opaque)
DEFAULT_BORDER_BG  // 0x00000000 - Transparent
```

---

## Component Structure

```typescript
import { Border } from 'blecsd';

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

## How do I add a border to an entity?

### setBorder

Sets or updates border configuration. Adds the Border component if not present.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setBorder, BorderType, BORDER_DOUBLE } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic line border with single-line characters
setBorder(world, eid, { type: BorderType.Line });

// Double-line border with custom color
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

// Background-style border
setBorder(world, eid, {
  type: BorderType.Background,
  bg: '#333333',
});
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `options` (BorderOptions)

**Returns:** Entity ID for chaining

---

### setBorderChars

Sets the border characters on an entity. Adds the Border component if not present.

```typescript
import { setBorderChars, BORDER_ROUNDED, BORDER_BOLD } from 'blecsd';

// Use rounded corners
setBorderChars(world, eid, BORDER_ROUNDED);

// Use bold/thick lines
setBorderChars(world, eid, BORDER_BOLD);

// Custom characters (Unicode codepoints)
setBorderChars(world, eid, {
  topLeft: 0x2554,     // ╔
  topRight: 0x2557,    // ╗
  bottomLeft: 0x255a,  // ╚
  bottomRight: 0x255d, // ╝
  horizontal: 0x2550,  // ═
  vertical: 0x2551,    // ║
});
```

**Returns:** Entity ID for chaining

---

## How do I read border data?

### getBorder

Returns full border configuration or `undefined` if no Border component.

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
// {
//   type: BorderType.Line,
//   left: true,
//   top: true,
//   right: false,
//   bottom: false,
//   fg: 4278255360,
//   bg: 0,
//   charTopLeft: 0x2554,
//   charTopRight: 0x2557,
//   charBottomLeft: 0x255a,
//   charBottomRight: 0x255d,
//   charHorizontal: 0x2550,
//   charVertical: 0x2551,
// }
```

**Returns:** `BorderData | undefined`

---

### getBorderChar

Gets a specific border character (Unicode codepoint).

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
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `position` (`'topLeft'` | `'topRight'` | `'bottomLeft'` | `'bottomRight'` | `'horizontal'` | `'vertical'`)

**Returns:** `number | undefined` (Unicode codepoint)

---

## How do I check if an entity has a border?

### hasBorder

```typescript
import { hasBorder, setBorder, BorderType } from 'blecsd';

hasBorder(world, eid);  // false

setBorder(world, eid, { type: BorderType.Line });
hasBorder(world, eid);  // true
```

### hasBorderVisible

Checks if the entity has a visible border (type is not None and at least one side is enabled).

```typescript
import { hasBorderVisible, setBorder, BorderType } from 'blecsd';

// No border component
hasBorderVisible(world, eid);  // false

// Border type is None
setBorder(world, eid, { type: BorderType.None });
hasBorderVisible(world, eid);  // false

// Border type is Line, all sides enabled
setBorder(world, eid, { type: BorderType.Line });
hasBorderVisible(world, eid);  // true

// All sides disabled
setBorder(world, eid, {
  type: BorderType.Line,
  left: false,
  top: false,
  right: false,
  bottom: false,
});
hasBorderVisible(world, eid);  // false
```

---

## How do I enable or disable all border sides?

### enableAllBorders / disableAllBorders

```typescript
import { setBorder, enableAllBorders, disableAllBorders, BorderType } from 'blecsd';

setBorder(world, eid, {
  type: BorderType.Line,
  left: false,
  top: false,
});

enableAllBorders(world, eid);
// Now left, top, right, bottom are all enabled

disableAllBorders(world, eid);
// Now left, top, right, bottom are all disabled
```

**Returns:** Entity ID for chaining

---

## Types

### BorderCharset

```typescript
interface BorderCharset {
  readonly topLeft: number;     // Unicode codepoint
  readonly topRight: number;
  readonly bottomLeft: number;
  readonly bottomRight: number;
  readonly horizontal: number;
  readonly vertical: number;
}
```

### BorderOptions

```typescript
interface BorderOptions {
  type?: BorderType;
  left?: boolean;              // default: true
  top?: boolean;               // default: true
  right?: boolean;             // default: true
  bottom?: boolean;            // default: true
  fg?: string | number;        // hex string or packed color
  bg?: string | number;
  chars?: BorderCharset;
}
```

### BorderData

```typescript
interface BorderData {
  readonly type: BorderType;
  readonly left: boolean;
  readonly top: boolean;
  readonly right: boolean;
  readonly bottom: boolean;
  readonly fg: number;            // packed RGBA
  readonly bg: number;            // packed RGBA
  readonly charTopLeft: number;
  readonly charTopRight: number;
  readonly charBottomLeft: number;
  readonly charBottomRight: number;
  readonly charHorizontal: number;
  readonly charVertical: number;
}
```

---

## Examples

### Dialog Box

```typescript
import { createWorld, addEntity } from 'blecsd';
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

### Menu with Rounded Corners

```typescript
import { setBorder, BorderType, BORDER_ROUNDED } from 'blecsd';

setBorder(world, menu, {
  type: BorderType.Line,
  chars: BORDER_ROUNDED,
  fg: '#00ff00',
});
```

### Horizontal Divider

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

## Limitations

- **Unicode support**: Box-drawing characters require Unicode support. Use `BORDER_ASCII` for terminals that don't support Unicode.
- **Character width**: Box-drawing characters assume single-width cells. Some terminals or fonts may render them incorrectly.

---

## See Also

- [Position Component](./position.md) - Positioning entities
- [Dimensions Component](./dimensions.md) - Sizing entities (borders affect content area)
