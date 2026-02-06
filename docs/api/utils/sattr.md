# Style Attributes (sattr)

Style attribute encoding for terminal rendering. Converts style objects to binary attribute codes for efficient rendering and comparison.

## Overview

The `sattr` module provides utilities for encoding text styles (colors and attributes like bold, underline) into a compact format. This is used by the rendering system to efficiently compare and apply styles.

## Types

### StyleAttr

Encoded style containing colors and attribute flags.

```typescript
interface StyleAttr {
  readonly fg: number;    // Foreground color (packed RGBA)
  readonly bg: number;    // Background color (packed RGBA)
  readonly attrs: number; // Attribute flags
}
```

### StyleInput

Input for creating style attributes.

```typescript
interface StyleInput {
  fg?: number;
  bg?: number;
  bold?: boolean;
  underline?: boolean;
  blink?: boolean;
  inverse?: boolean;
  invisible?: boolean;
  dim?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
}
```

### AttrFlags

Bit flags for text attributes.

```typescript
enum AttrFlags {
  NONE = 0,
  BOLD = 1,
  UNDERLINE = 2,
  BLINK = 4,
  INVERSE = 8,
  INVISIBLE = 16,
  DIM = 32,
  ITALIC = 64,
  STRIKETHROUGH = 128,
}
```

---

## Functions

### sattr

Creates a style attribute from a style input.

```typescript
import { sattr, AttrFlags } from 'blecsd';

// Simple style
const red = sattr({ fg: 0xffff0000 });

// With attributes
const boldRed = sattr({ fg: 0xffff0000, bold: true });
console.log(boldRed.attrs & AttrFlags.BOLD); // 1 (truthy)

// With custom defaults
const custom = sattr({ bold: true }, 0xaabbccdd, 0x11223344);
```

**Parameters:**
- `style` - Style input with colors and boolean flags
- `defaultFg` - Default foreground color (default: white)
- `defaultBg` - Default background color (default: transparent black)

**Returns:** `StyleAttr`

---

### sattrFromStyleData

Converts a StyleData object (from getStyle) to StyleAttr.

```typescript
import { sattrFromStyleData, getStyle } from 'blecsd';

const style = getStyle(world, entity);
if (style) {
  const attr = sattrFromStyleData(style);
}
```

---

### sattrEqual

Compares two style attributes for equality.

```typescript
import { sattr, sattrEqual } from 'blecsd';

const a = sattr({ fg: 0xffff0000, bold: true });
const b = sattr({ fg: 0xffff0000, bold: true });
console.log(sattrEqual(a, b)); // true

const c = sattr({ fg: 0xff00ff00 });
console.log(sattrEqual(a, c)); // false
```

---

### sattrMerge

Merges two style attributes, with overlay overriding base.

```typescript
import { sattr, sattrMerge, AttrFlags } from 'blecsd';

const base = sattr({ fg: 0xffff0000, bold: true });
const overlay = { attrs: AttrFlags.UNDERLINE };
const merged = sattrMerge(base, overlay);
// merged has red fg with underline (not bold)
```

---

### sattrHasFlag / sattrAddFlag / sattrRemoveFlag

Manipulate attribute flags.

```typescript
import { sattr, sattrHasFlag, sattrAddFlag, sattrRemoveFlag, AttrFlags } from 'blecsd';

const attr = sattr({ bold: true });

console.log(sattrHasFlag(attr, AttrFlags.BOLD)); // true

const withUnderline = sattrAddFlag(attr, AttrFlags.UNDERLINE);
const withoutBold = sattrRemoveFlag(attr, AttrFlags.BOLD);
```

---

### sattrInvert

Creates a copy with fg and bg swapped.

```typescript
import { sattr, sattrInvert } from 'blecsd';

const attr = sattr({ fg: 0xffff0000, bg: 0xff0000ff });
const inverted = sattrInvert(attr);
// inverted.fg = 0xff0000ff, inverted.bg = 0xffff0000
```

---

### sattrEmpty

Creates a default style attribute.

```typescript
import { sattrEmpty } from 'blecsd';

const empty = sattrEmpty();
// white fg, transparent bg, no flags
```

---

### sattrCopy

Creates a shallow copy of a style attribute.

```typescript
import { sattr, sattrCopy } from 'blecsd';

const original = sattr({ fg: 0xffff0000, bold: true });
const copy = sattrCopy(original);
```

---

### styleToAttrs / attrsToStyle

Convert between boolean style properties and packed flags.

```typescript
import { styleToAttrs, attrsToStyle, AttrFlags } from 'blecsd';

const flags = styleToAttrs({ bold: true, underline: true });
// flags = AttrFlags.BOLD | AttrFlags.UNDERLINE

const style = attrsToStyle(flags);
// style = { bold: true, underline: true, blink: false, ... }
```

---

### encodeStyleAttr / decodeStyleAttr

Encode/decode style attributes to/from BigInt for compact storage.

```typescript
import { sattr, encodeStyleAttr, decodeStyleAttr } from 'blecsd';

const attr = sattr({ fg: 0xffff0000, bold: true });
const encoded = encodeStyleAttr(attr); // BigInt
const decoded = decodeStyleAttr(encoded);
// decoded equals attr
```

---

## Examples

### Style Comparison for Rendering

<!-- blecsd-doccheck:ignore -->
```typescript
import { sattr, sattrEqual, sattrFromStyleData, getStyle } from 'blecsd';

let currentStyle = sattrEmpty();

function renderCell(world, entity) {
  const style = getStyle(world, entity);
  if (!style) return;

  const newStyle = sattrFromStyleData(style);

  // Only emit escape codes if style changed
  if (!sattrEqual(currentStyle, newStyle)) {
    emitStyleCodes(newStyle);
    currentStyle = newStyle;
  }

  // Render character...
}
```

### Building Composite Styles

```typescript
import { sattr, sattrMerge, AttrFlags } from 'blecsd';

// Base style from theme
const baseStyle = sattr({ fg: 0xffcccccc, bg: 0xff222222 });

// Highlight style
const highlightOverlay = { fg: 0xffffffff, attrs: AttrFlags.BOLD };

// Combine them
const highlighted = sattrMerge(baseStyle, highlightOverlay);
```

---

## See Also

- [Renderable Component](../renderable.md) - Visual styling component
- [Box Utilities](./box.md) - Box rendering
