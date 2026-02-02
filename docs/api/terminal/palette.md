# Color Palette

256-color palette definitions, types, and utilities for terminal rendering.

## Overview

The color palette module provides:
- Type-safe 256-color palette indices
- RGB, RGBA, HSL, HSLA color types
- Pre-built palette arrays (hex and RGB)
- Utilities for working with the 6x6x6 color cube and grayscale ramp
- Zod schemas for validation

## Types

### Color256

Branded type for 256-color palette indices (0-255).

```typescript
import type { Color256 } from 'blecsd';

// Type-safe color index
const red: Color256 = 9 as Color256;
```

### RGB / RGBA

RGB color with optional alpha channel.

```typescript
import type { RGB, RGBA } from 'blecsd';

const red: RGB = { r: 255, g: 0, b: 0 };
const semiRed: RGBA = { r: 255, g: 0, b: 0, a: 0.5 };
```

### HSL / HSLA

HSL color with optional alpha channel.

```typescript
import type { HSL, HSLA } from 'blecsd';

const red: HSL = { h: 0, s: 100, l: 50 };
const semiRed: HSLA = { h: 0, s: 100, l: 50, a: 0.5 };
```

---

## Palette Arrays

### PALETTE_RGB

Complete 256-color palette as RGB values.

- Indices 0-15: Standard ANSI colors
- Indices 16-231: 6x6x6 color cube
- Indices 232-255: 24-step grayscale

```typescript
import { PALETTE_RGB } from 'blecsd';

const red = PALETTE_RGB[9];   // { r: 255, g: 0, b: 0 }
const gray = PALETTE_RGB[240]; // Grayscale value
```

### PALETTE_HEX

Complete 256-color palette as hex strings.

```typescript
import { PALETTE_HEX } from 'blecsd';

const red = PALETTE_HEX[9];   // '#ff0000'
const white = PALETTE_HEX[15]; // '#ffffff'
```

---

## Schemas

### Color256Schema

Validates and transforms numbers to Color256.

```typescript
import { Color256Schema } from 'blecsd';

const result = Color256Schema.safeParse(196);
if (result.success) {
  const color: Color256 = result.data;
}
```

### RGBSchema / RGBASchema

Validates RGB and RGBA objects.

```typescript
import { RGBSchema, RGBASchema } from 'blecsd';

RGBSchema.parse({ r: 255, g: 0, b: 0 });
RGBASchema.parse({ r: 255, g: 0, b: 0, a: 0.5 });
```

### HSLSchema / HSLASchema

Validates HSL and HSLA objects.

```typescript
import { HSLSchema, HSLASchema } from 'blecsd';

HSLSchema.parse({ h: 0, s: 100, l: 50 });
HSLASchema.parse({ h: 0, s: 100, l: 50, a: 0.5 });
```

### HexColorSchema

Validates hex color strings (#RGB, #RRGGBB, #RRGGBBAA).

```typescript
import { HexColorSchema } from 'blecsd';

HexColorSchema.parse('#ff0000');   // Valid
HexColorSchema.parse('#f00');      // Valid (shorthand)
HexColorSchema.parse('#ff000080'); // Valid (with alpha)
```

---

## Type Guards

### isColor256

Checks if a value is a valid Color256.

```typescript
import { isColor256 } from 'blecsd';

if (isColor256(userInput)) {
  // userInput is typed as Color256
}
```

### asColor256

Converts a number to Color256, throwing if invalid.

```typescript
import { asColor256 } from 'blecsd';

const color = asColor256(196); // Returns 196 as Color256
asColor256(256); // Throws Error
```

### isRGB

Checks if a value is a valid RGB object.

```typescript
import { isRGB } from 'blecsd';

if (isRGB(value)) {
  console.log(value.r, value.g, value.b);
}
```

---

## Palette Access

### getRGB

Get the RGB value for a palette index.

```typescript
import { getRGB, asColor256 } from 'blecsd';

const color = asColor256(196);
const rgb = getRGB(color);
console.log(rgb); // { r: 255, g: 0, b: 95 }
```

### getHex

Get the hex string for a palette index.

```typescript
import { getHex, asColor256 } from 'blecsd';

const color = asColor256(196);
const hex = getHex(color);
console.log(hex); // '#ff005f'
```

---

## Color Cube Utilities

### COLOR_CUBE_LEVELS

The 6 intensity levels used in the color cube.

```typescript
import { COLOR_CUBE_LEVELS } from 'blecsd';

console.log(COLOR_CUBE_LEVELS); // [0, 95, 135, 175, 215, 255]
```

### colorCubeIndex

Get the palette index for given R, G, B levels (0-5 each).

```typescript
import { colorCubeIndex } from 'blecsd';

const brightRed = colorCubeIndex(5, 0, 0);  // 196
const purple = colorCubeIndex(3, 0, 3);     // Some purple
```

### grayscaleIndex

Get the palette index for a grayscale step (0-23).

```typescript
import { grayscaleIndex } from 'blecsd';

const darkGray = grayscaleIndex(5);   // 237
const lightGray = grayscaleIndex(20); // 252
```

---

## Range Checks

### isStandardColor

Check if a color is in the standard range (0-15).

```typescript
import { isStandardColor, asColor256 } from 'blecsd';

isStandardColor(asColor256(9));  // true (red)
isStandardColor(asColor256(196)); // false
```

### isColorCube

Check if a color is in the color cube range (16-231).

```typescript
import { isColorCube, asColor256 } from 'blecsd';

isColorCube(asColor256(196)); // true
isColorCube(asColor256(9));   // false
```

### isGrayscale

Check if a color is in the grayscale range (232-255).

```typescript
import { isGrayscale, asColor256 } from 'blecsd';

isGrayscale(asColor256(240)); // true
isGrayscale(asColor256(196)); // false
```

---

## Color Constants

### COLORS

Named constants for the 16 standard ANSI colors.

```typescript
import { COLORS } from 'blecsd';

const fg = COLORS.RED;
const bg = COLORS.BLACK;
```

Available colors:
- `BLACK`, `MAROON`, `GREEN`, `OLIVE`, `NAVY`, `PURPLE`, `TEAL`, `SILVER`
- `GRAY`, `RED`, `LIME`, `YELLOW`, `BLUE`, `FUCHSIA`, `CYAN`, `WHITE`

### ANSI

Extended color constants with common aliases.

```typescript
import { ANSI } from 'blecsd';

ANSI.DARK_GRAY;     // 8
ANSI.BRIGHT_RED;    // 9
ANSI.BRIGHT_GREEN;  // 10
ANSI.BRIGHT_BLUE;   // 12
ANSI.BRIGHT_MAGENTA; // 13
ANSI.BRIGHT_CYAN;   // 14
```

---

## Examples

### Creating a Color Scheme

```typescript
import { COLORS, colorCubeIndex, grayscaleIndex } from 'blecsd';

const theme = {
  fg: COLORS.WHITE,
  bg: COLORS.BLACK,
  accent: colorCubeIndex(5, 2, 0), // Orange
  border: grayscaleIndex(10),       // Medium gray
};
```

### Validating User Input

```typescript
import { Color256Schema, isColor256 } from 'blecsd';

function setColor(input: unknown) {
  const result = Color256Schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  throw new Error('Invalid color');
}
```

---

## See Also

- [Color Conversion](./conversion.md) - Converting between color formats
- [Color Matching](./matching.md) - Finding nearest palette colors
