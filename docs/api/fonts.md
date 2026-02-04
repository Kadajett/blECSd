# Bitmap Fonts

Bitmap fonts power ASCII-art text rendering such as the BigText widget. blECSd ships with built-in Terminus fonts and utilities for loading, inspecting, and rendering characters.

## Overview

```typescript
import { loadFont, renderChar } from 'blecsd/widgets/fonts';

const font = loadFont('terminus-14-bold');
const lines = renderChar(font, 'A', { fillChar: '█', emptyChar: ' ' });

lines.forEach((line) => console.log(line));
```

---

## Built-in Fonts

| Name | Size | Weight | Cell Size |
|------|------|--------|-----------|
| `terminus-14-bold` | 14 | bold | 8x14 |
| `terminus-14-normal` | 14 | normal | 8x14 |

---

## Functions

### loadFont

Loads a built-in bitmap font by name.

```typescript
import { loadFont } from 'blecsd/widgets/fonts';

const font = loadFont('terminus-14-normal');
console.log(font.charWidth, font.charHeight); // 8, 14
```

**Parameters:**
- `name` - Font identifier

**Returns:** `BitmapFont`

---

### getCharBitmap

Gets the bitmap data for a specific character.

```typescript
import { getCharBitmap, loadFont } from 'blecsd/widgets/fonts';

const font = loadFont('terminus-14-bold');
const bitmap = getCharBitmap(font, 'A');

if (bitmap) {
  console.log(bitmap.width, bitmap.height);
}
```

**Parameters:**
- `font` - Bitmap font to use
- `char` - Single character to look up

**Returns:** `CharBitmap | undefined`

---

### renderChar

Renders a character to an array of strings using block characters.

```typescript
import { loadFont, renderChar } from 'blecsd/widgets/fonts';

const font = loadFont('terminus-14-bold');
const lines = renderChar(font, 'A', { fillChar: '#', emptyChar: '.' });

lines.forEach((line) => console.log(line));
```

**Parameters:**
- `font` - Bitmap font to use
- `char` - Character to render
- `options` - Rendering options

**Returns:** `readonly string[]`

---

## Types

### BitmapFont

Holds font metadata and the character map. Each character entry is keyed by Unicode code point.

### CharBitmap

Per-character bitmap data with dimensions and rows of 0/1 values.

### RenderCharOptions

- `fillChar` - Character used to draw filled pixels
- `emptyChar` - Character used to draw empty pixels

---

## Validation

The built-in font JSON files are validated against `BitmapFontSchema` in tests to ensure consistent structure at build time.
