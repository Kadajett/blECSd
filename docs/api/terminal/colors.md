# Color System

The blECSd color system provides comprehensive color handling for terminal applications, including:

- **256-color palette** with type-safe indices
- **Color conversions** between RGB, HSL, Hex, and truecolor formats
- **Color matching** to find the nearest palette color
- **Color names** for easy color specification
- **Color blending** and mixing utilities
- **Color reduction** for low-color terminals

## Quick Start

```typescript
import {
  COLORS,
  hexToRgb,
  rgbToColor256,
  matchColorCached,
  sgrFgRgb,
  nameToColor,
  blend,
} from 'blecsd/terminal';

// Use named ANSI colors
const fg = COLORS.RED;  // 9

// Convert hex to RGB
const rgb = hexToRgb('#ff6600');  // { r: 255, g: 102, b: 0 }

// Find nearest 256-color match
const color256 = rgbToColor256(rgb);

// Generate SGR escape sequence for truecolor
const escape = `\x1b[${sgrFgRgb(rgb)}m`;  // '\x1b[38;2;255;102;0m'

// Use color names
const blue = nameToColor('blue');  // 4

// Blend two colors
const purple = blend(COLORS.RED, COLORS.BLUE, 0.5);

console.log(fg, color256, escape, blue, purple);
```

## Types

### Color256

Branded type for 256-color palette indices (0-255).

```typescript
type Color256 = number & { readonly __brand: 'Color256' };
```

### RGB / RGBA

RGB color representation with values from 0-255.

```typescript
interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface RGBA extends RGB {
  readonly a: number;  // 0-1
}
```

### HSL / HSLA

HSL color representation.

```typescript
interface HSL {
  readonly h: number;  // 0-360
  readonly s: number;  // 0-100
  readonly l: number;  // 0-100
}

interface HSLA extends HSL {
  readonly a: number;  // 0-1
}
```

### ColorDepth

Supported color depth levels.

```typescript
type ColorDepth = 'truecolor' | '256' | '16' | '8' | '2';
```

## Palette

### COLORS / ANSI

Named constants for standard ANSI colors.

```typescript
import { COLORS, ANSI } from 'blecsd/terminal';

COLORS.BLACK;     // 0
COLORS.RED;       // 9 (bright red)
COLORS.WHITE;     // 15

ANSI.DARK_RED;    // 1
ANSI.BRIGHT_RED;  // 9
```

### PALETTE_RGB / PALETTE_HEX

Complete 256-color palette as RGB or hex values.

```typescript
import { PALETTE_RGB, PALETTE_HEX } from 'blecsd/terminal';

PALETTE_RGB[9];   // { r: 255, g: 0, b: 0 }
PALETTE_HEX[9];   // '#ff0000'
```

### getRGB / getHex

Get color values from palette index.

```typescript
import { getRGB, getHex, asColor256 } from 'blecsd/terminal';

const color = asColor256(196);
getRGB(color);  // { r: 255, g: 0, b: 0 }
getHex(color);  // '#ff0000'
```

### Type Guards

```typescript
import { isColor256, asColor256, isRGB } from 'blecsd/terminal';

const value = 196;
if (isColor256(value)) {
  // value is Color256
}

const color = asColor256(196);  // Throws if invalid

const obj = { r: 255, g: 0, b: 0 };
if (isRGB(obj)) {
  // obj is RGB
}
```

## Conversions

### Hex Conversions

```typescript
import { hexToRgb, rgbToHex, rgbaToHex } from 'blecsd/terminal';

hexToRgb('#ff0000');     // { r: 255, g: 0, b: 0 }
hexToRgb('#f00');        // { r: 255, g: 0, b: 0 }
hexToRgb('#ff000080');   // { r: 255, g: 0, b: 0, a: 0.5 }

rgbToHex({ r: 255, g: 0, b: 0 });               // '#ff0000'
rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 });      // '#ff000080'
```

### HSL Conversions

```typescript
import { rgbToHsl, hslToRgb, rgbaToHsla, hslaToRgba } from 'blecsd/terminal';

rgbToHsl({ r: 255, g: 0, b: 0 });  // { h: 0, s: 100, l: 50 }
hslToRgb({ h: 120, s: 100, l: 50 });  // { r: 0, g: 255, b: 0 }
```

### 256-Color Conversions

```typescript
import { rgbToColor256, color256ToRgb, hexToColor256, color256ToHex } from 'blecsd/terminal';

rgbToColor256({ r: 255, g: 0, b: 0 });  // 9 (nearest match)
color256ToRgb(9);  // { r: 255, g: 0, b: 0 }

hexToColor256('#ff0000');  // 9
color256ToHex(9);          // '#ff0000'
```

### Truecolor Conversions

```typescript
import { rgbToTruecolor, truecolorToRgb, hexToTruecolor, truecolorToHex } from 'blecsd/terminal';

// Pack RGB into 24-bit integer
rgbToTruecolor({ r: 255, g: 0, b: 0 });  // 0xff0000

// Unpack 24-bit integer to RGB
truecolorToRgb(0xff0000);  // { r: 255, g: 0, b: 0 }

hexToTruecolor('#ff0000');  // 0xff0000
truecolorToHex(0xff0000);   // '#ff0000'
```

### Unified Parsing

```typescript
import { parseColor, toColor256, toTruecolor, toHex } from 'blecsd/terminal';

// Parse any color format to RGB
parseColor('#ff0000');              // { r: 255, g: 0, b: 0 }
parseColor({ r: 255, g: 0, b: 0 }); // { r: 255, g: 0, b: 0 }
parseColor(9);                       // { r: 255, g: 0, b: 0 }
parseColor(0xff0000);                // { r: 255, g: 0, b: 0 }

// Convert any format to specific output
toColor256('#ff0000');  // 9
toTruecolor('#ff0000'); // 0xff0000
toHex(9);               // '#ff0000'
```

## SGR Helpers

Generate ANSI SGR escape sequence parameters.

```typescript
import { sgrFg256, sgrBg256, sgrFgRgb, sgrBgRgb } from 'blecsd/terminal';

// 256-color mode
const fg256 = `\x1b[${sgrFg256(196)}m`;  // '\x1b[38;5;196m'
const bg256 = `\x1b[${sgrBg256(196)}m`;  // '\x1b[48;5;196m'

// Truecolor mode
const fgRgb = `\x1b[${sgrFgRgb({ r: 255, g: 0, b: 0 })}m`;  // '\x1b[38;2;255;0;0m'
const bgRgb = `\x1b[${sgrBgRgb(0xff0000)}m`;                 // '\x1b[48;2;255;0;0m'
```

## Color Matching

### matchColor

Find the nearest palette color for an RGB value.

```typescript
import { matchColor } from 'blecsd/terminal';

// Default Euclidean distance
const match = matchColor({ r: 200, g: 50, b: 100 });
console.log(match);
```

### Cached Matching

```typescript
import { matchColorCached } from 'blecsd/terminal';

// First call computes and caches
const c1 = matchColorCached({ r: 200, g: 50, b: 100 });

// Second call returns cached result
const c2 = matchColorCached({ r: 200, g: 50, b: 100 });

console.log(c1, c2);
```

### Specialized Matchers

```typescript
import { matchColor, matchColorCached } from 'blecsd/terminal';

// Match to full palette
const red = matchColor({ r: 255, g: 0, b: 0 });  // nearest Color256 to red

// Cached match for repeated calls
const gray = matchColorCached({ r: 128, g: 128, b: 128 });

console.log(red, gray);
```

## Color Names

### Basic Names

```typescript
import { nameToColor, CSS_COLORS } from 'blecsd/terminal';

// Convert name to color
const red = nameToColor('red');        // 1
const brightRed = nameToColor('brightred');  // 9

// RGB values for CSS colors
const coralRgb = CSS_COLORS['coral'];  // { r: 255, g: 127, b: 80 }

console.log(red, brightRed, coralRgb);
```

### CSS Color Names

```typescript
import { CSS_COLORS, matchColor, hexToRgb } from 'blecsd/terminal';

// CSS/X11 color names via CSS_COLORS lookup
const coral = CSS_COLORS['coral'];         // { r: 255, g: 127, b: 80 }
const hotpink = CSS_COLORS['hotpink'];     // { r: 255, g: 105, b: 180 }
const steelblue = CSS_COLORS['steelblue']; // { r: 70, g: 130, b: 180 }

// Find nearest 256-color
const corals = coral ? matchColor(coral) : undefined;

// List all CSS color names
const names = Object.keys(CSS_COLORS);  // ['coral', 'salmon', ...]
console.log(corals, names.length);
```

## Color Blending

### Basic Blending

```typescript
import { mix, blend, COLORS } from 'blecsd/terminal';

// Mix RGB colors
mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });      // 50% red, 50% blue
mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.25); // 75% red, 25% blue

// Blend Color256 values
blend(COLORS.RED, COLORS.BLUE);      // Nearest Color256 to mix
blend(COLORS.RED, COLORS.BLUE, 0.3); // 70% red, 30% blue
```

### Lightening / Darkening

```typescript
import { lighten, darken, lighten256, darken256, COLORS } from 'blecsd/terminal';

// Lighten RGB
lighten({ r: 100, g: 50, b: 50 }, 0.5);  // Move 50% toward white

// Darken RGB
darken({ r: 200, g: 150, b: 150 }, 0.5);  // Move 50% toward black

// Lighten/darken Color256
lighten256(COLORS.RED, 0.3);  // Nearest lighter color
darken256(COLORS.RED, 0.3);   // Nearest darker color
```

### Saturation

```typescript
import { saturate, desaturate, grayscale } from 'blecsd/terminal';

// Increase saturation
saturate({ r: 180, g: 150, b: 150 }, 0.5);

// Decrease saturation
desaturate({ r: 255, g: 0, b: 0 }, 0.5);  // More muted red

// Convert to grayscale
grayscale({ r: 255, g: 0, b: 0 });  // { r: 77, g: 77, b: 77 }
```

### Alpha Blending

```typescript
import { blendWithAlpha, blendAlpha } from 'blecsd/terminal';

// Blend RGBA over RGB
blendWithAlpha(
  { r: 255, g: 0, b: 0, a: 0.5 },  // 50% red
  { r: 0, g: 0, b: 255 }           // Blue background
);  // Purple result

// Blend two RGBA colors
blendAlpha(
  { r: 255, g: 0, b: 0, a: 0.5 },
  { r: 0, g: 0, b: 255, a: 0.5 }
);
```

### Hue Operations

```typescript
import { rotateHue, complement, invert } from 'blecsd/terminal';

// Rotate hue
rotateHue({ r: 255, g: 0, b: 0 }, 120);  // Red -> Green

// Get complementary color (hue + 180)
complement({ r: 255, g: 0, b: 0 });  // Cyan

// Invert color
invert({ r: 255, g: 0, b: 0 });  // { r: 0, g: 255, b: 255 }
```

### Gradients

```typescript
import { gradient, gradient256, COLORS } from 'blecsd/terminal';

// RGB gradient
const rgbGrad = gradient(
  { r: 255, g: 0, b: 0 },  // Red
  { r: 0, g: 0, b: 255 },  // Blue
  5                         // 5 steps
);  // [red, redPurple, purple, bluePurple, blue]

// Color256 gradient
const grad256 = gradient256(COLORS.RED, COLORS.BLUE, 5);
```

### Contrast and Accessibility

```typescript
import { luminance, contrastRatio, isReadable } from 'blecsd/terminal';

// Relative luminance (0-1)
luminance({ r: 0, g: 0, b: 0 });    // 0 (black)
luminance({ r: 255, g: 255, b: 255 }); // 1 (white)

// Contrast ratio (1-21)
contrastRatio(
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 }
);  // 21 (maximum)

// WCAG accessibility check
const textColor = { r: 0, g: 0, b: 0 };
const bgColor = { r: 255, g: 255, b: 255 };
isReadable(textColor, bgColor);        // Default: 4.5:1 (AA normal)
isReadable(textColor, bgColor, 3);     // Large text: 3:1
isReadable(textColor, bgColor, 7);     // AAA normal: 7:1
```

## Color Reduction

### Reduce to Lower Color Depths

```typescript
import { matchColor, color256ToRgb } from 'blecsd/terminal';

// Find nearest 16-color equivalent by matching to a limited palette
const rgb196 = color256ToRgb(196);  // Get RGB for color 196
const nearest = matchColor(rgb196);  // Match to full 256-color palette
console.log(nearest);
```

### RGB Reduction

```typescript
import { hexToRgb, rgbToColor256, matchColor } from 'blecsd/terminal';

// Convert hex to RGB then to 256-color
const rgb = hexToRgb('#ff0000');  // { r: 255, g: 0, b: 0 }
const color256 = rgbToColor256(rgb);

// Match to nearest color
const nearest = matchColor(rgb);
console.log(color256, nearest);
```

### Color Depth Detection

For detecting color depth capabilities, use the detection functions:

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

const features = detectFeatures(getDefaultXtermData());
// features.trueColor: boolean
// features.color256: boolean
// features.colors: number
console.log(features);
```

## Zod Schemas

All types have corresponding Zod schemas for runtime validation.

```typescript
import {
  Color256Schema,
  RGBSchema,
  RGBASchema,
  HSLSchema,
  HSLASchema,
  HexColorSchema,
} from 'blecsd/terminal';
import type { Color256 } from 'blecsd/terminal';

// Validate and transform
const result = Color256Schema.safeParse(196);
if (result.success) {
  const color: Color256 = result.data;
  console.log(color);
}

// Validate RGB
RGBSchema.parse({ r: 255, g: 0, b: 0 });

// Validate hex
HexColorSchema.parse('#ff0000');
HexColorSchema.parse('#f00');     // 3-digit
HexColorSchema.parse('#ff000080'); // With alpha
```

## See Also

- [Renderable Component](../renderable.md) - Using colors with entity rendering
- [ANSI Sequences](../ansi.md) - Low-level terminal escape sequences
