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
  reduceTo16,
} from 'blecsd';

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

// Reduce for low-color terminals
const reduced = reduceTo16(196);  // Nearest 16-color
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
import { COLORS, ANSI } from 'blecsd';

COLORS.BLACK;     // 0
COLORS.RED;       // 9 (bright red)
COLORS.WHITE;     // 15

ANSI.DARK_RED;    // 1
ANSI.BRIGHT_RED;  // 9
```

### PALETTE_RGB / PALETTE_HEX

Complete 256-color palette as RGB or hex values.

```typescript
import { PALETTE_RGB, PALETTE_HEX } from 'blecsd';

PALETTE_RGB[9];   // { r: 255, g: 0, b: 0 }
PALETTE_HEX[9];   // '#ff0000'
```

### getRGB / getHex

Get color values from palette index.

```typescript
import { getRGB, getHex, asColor256 } from 'blecsd';

const color = asColor256(196);
getRGB(color);  // { r: 255, g: 0, b: 0 }
getHex(color);  // '#ff0000'
```

### Type Guards

```typescript
import { isColor256, asColor256, isRGB } from 'blecsd';

if (isColor256(value)) {
  // value is Color256
}

const color = asColor256(196);  // Throws if invalid

if (isRGB(obj)) {
  // obj is RGB
}
```

## Conversions

### Hex Conversions

```typescript
import { hexToRgb, rgbToHex, rgbaToHex } from 'blecsd';

hexToRgb('#ff0000');     // { r: 255, g: 0, b: 0 }
hexToRgb('#f00');        // { r: 255, g: 0, b: 0 }
hexToRgb('#ff000080');   // { r: 255, g: 0, b: 0, a: 0.5 }

rgbToHex({ r: 255, g: 0, b: 0 });               // '#ff0000'
rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 });      // '#ff000080'
```

### HSL Conversions

```typescript
import { rgbToHsl, hslToRgb, rgbaToHsla, hslaToRgba } from 'blecsd';

rgbToHsl({ r: 255, g: 0, b: 0 });  // { h: 0, s: 100, l: 50 }
hslToRgb({ h: 120, s: 100, l: 50 });  // { r: 0, g: 255, b: 0 }
```

### 256-Color Conversions

```typescript
import { rgbToColor256, color256ToRgb, hexToColor256, color256ToHex } from 'blecsd';

rgbToColor256({ r: 255, g: 0, b: 0 });  // 9 (nearest match)
color256ToRgb(9);  // { r: 255, g: 0, b: 0 }

hexToColor256('#ff0000');  // 9
color256ToHex(9);          // '#ff0000'
```

### Truecolor Conversions

```typescript
import { rgbToTruecolor, truecolorToRgb, hexToTruecolor, truecolorToHex } from 'blecsd';

// Pack RGB into 24-bit integer
rgbToTruecolor({ r: 255, g: 0, b: 0 });  // 0xff0000

// Unpack 24-bit integer to RGB
truecolorToRgb(0xff0000);  // { r: 255, g: 0, b: 0 }

hexToTruecolor('#ff0000');  // 0xff0000
truecolorToHex(0xff0000);   // '#ff0000'
```

### Unified Parsing

```typescript
import { parseColor, toColor256, toTruecolor, toHex } from 'blecsd';

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
import { sgrFg256, sgrBg256, sgrFgRgb, sgrBgRgb } from 'blecsd';

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
import { matchColor, weightedDistance, redMeanDistance } from 'blecsd';

// Default Euclidean distance
matchColor({ r: 200, g: 50, b: 100 });

// Perceptually weighted distance
matchColor({ r: 200, g: 50, b: 100 }, { distance: weightedDistance });

// Red-mean distance (better for reds)
matchColor({ r: 200, g: 50, b: 100 }, { distance: redMeanDistance });
```

### Cached Matching

```typescript
import { matchColorCached, clearColorCache, getColorCacheSize } from 'blecsd';

// First call computes and caches
const c1 = matchColorCached({ r: 200, g: 50, b: 100 });

// Second call returns cached result
const c2 = matchColorCached({ r: 200, g: 50, b: 100 });

// Clear cache if needed
clearColorCache();
console.log(getColorCacheSize());  // 0
```

### Specialized Matchers

```typescript
import { matchStandardColor, matchColorCube, matchGrayscale, matchColorSmart } from 'blecsd';

// Match to 16-color palette only
matchStandardColor({ r: 255, g: 0, b: 0 });  // 9

// Match to color cube only (16-231)
matchColorCube({ r: 200, g: 100, b: 50 });

// Match to grayscale only (232-255)
matchGrayscale({ r: 128, g: 128, b: 128 });

// Smart: grayscale for grays, full palette otherwise
matchColorSmart({ r: 128, g: 130, b: 126 });  // Uses grayscale
matchColorSmart({ r: 255, g: 0, b: 0 });      // Uses full palette
```

### Color Similarity

```typescript
import { colorDifference, colorsSimilar, color256Similar } from 'blecsd';

// Perceptual difference (0 = identical, >10 = clearly different)
colorDifference({ r: 255, g: 0, b: 0 }, { r: 250, g: 5, b: 5 });

// Check if colors are similar
colorsSimilar({ r: 255, g: 0, b: 0 }, { r: 250, g: 5, b: 5 });  // true
colorsSimilar({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });   // false

// Compare palette colors
color256Similar(9, 196);  // true (both are reds)
```

## Color Names

### Basic Names

```typescript
import { nameToColor, colorToName, isColorName, isSpecialColor } from 'blecsd';

// Convert name to color
nameToColor('red');        // 1
nameToColor('brightred');  // 9
nameToColor('light-red');  // 9 (compound names supported)
nameToColor('RED');        // 1 (case-insensitive)

// Convert color to name
colorToName(1);   // 'red'
colorToName(9);   // 'brightred'
colorToName(100); // null (no standard name)

// Type guards
isColorName('red');           // true
isSpecialColor('transparent'); // true
```

### CSS Color Names

```typescript
import { cssNameToColor, CSS_COLORS, getCssColorNames } from 'blecsd';

// CSS/X11 color names
cssNameToColor('coral');      // Nearest 256-color
cssNameToColor('hotpink');    // Nearest 256-color
cssNameToColor('steelblue');  // Nearest 256-color

// RGB values for CSS colors
CSS_COLORS.coral;  // { r: 255, g: 127, b: 80 }

// List all CSS color names
getCssColorNames();  // ['coral', 'salmon', ...]
```

## Color Blending

### Basic Blending

```typescript
import { mix, blend, COLORS } from 'blecsd';

// Mix RGB colors
mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });      // 50% red, 50% blue
mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.25); // 75% red, 25% blue

// Blend Color256 values
blend(COLORS.RED, COLORS.BLUE);      // Nearest Color256 to mix
blend(COLORS.RED, COLORS.BLUE, 0.3); // 70% red, 30% blue
```

### Lightening / Darkening

```typescript
import { lighten, darken, lighten256, darken256, COLORS } from 'blecsd';

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
import { saturate, desaturate, grayscale } from 'blecsd';

// Increase saturation
saturate({ r: 180, g: 150, b: 150 }, 0.5);

// Decrease saturation
desaturate({ r: 255, g: 0, b: 0 }, 0.5);  // More muted red

// Convert to grayscale
grayscale({ r: 255, g: 0, b: 0 });  // { r: 77, g: 77, b: 77 }
```

### Alpha Blending

```typescript
import { blendWithAlpha, blendAlpha } from 'blecsd';

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
import { rotateHue, complement, invert } from 'blecsd';

// Rotate hue
rotateHue({ r: 255, g: 0, b: 0 }, 120);  // Red -> Green

// Get complementary color (hue + 180)
complement({ r: 255, g: 0, b: 0 });  // Cyan

// Invert color
invert({ r: 255, g: 0, b: 0 });  // { r: 0, g: 255, b: 255 }
```

### Gradients

```typescript
import { gradient, gradient256, COLORS } from 'blecsd';

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
import { luminance, contrastRatio, isReadable } from 'blecsd';

// Relative luminance (0-1)
luminance({ r: 0, g: 0, b: 0 });    // 0 (black)
luminance({ r: 255, g: 255, b: 255 }); // 1 (white)

// Contrast ratio (1-21)
contrastRatio(
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 }
);  // 21 (maximum)

// WCAG accessibility check
isReadable(textColor, bgColor);        // Default: 4.5:1 (AA normal)
isReadable(textColor, bgColor, 3);     // Large text: 3:1
isReadable(textColor, bgColor, 7);     // AAA normal: 7:1
```

## Color Reduction

### Reduce to Lower Color Depths

```typescript
import { reduceTo16, reduceTo8, reduceTo2, reduceColor } from 'blecsd';

// Reduce to 16-color ANSI
reduceTo16(196);  // Nearest color 0-15

// Reduce to 8-color basic
reduceTo8(196);   // Nearest color 0-7

// Reduce to monochrome
reduceTo2(196);   // 0 (black) or 15 (white)

// Unified reduction
reduceColor(196, '16');  // Same as reduceTo16
reduceColor(196, '8');   // Same as reduceTo8
reduceColor(196, '2');   // Same as reduceTo2
```

### RGB Reduction

```typescript
import { rgbTo16, rgbTo8, rgbTo2, reduceRgb } from 'blecsd';

// Direct RGB to reduced palette
rgbTo16({ r: 255, g: 0, b: 0 });  // 9 (bright red)
rgbTo8({ r: 255, g: 0, b: 0 });   // 1 (red)
rgbTo2({ r: 255, g: 0, b: 0 });   // 0 or 15 (based on luminance)

// Unified
reduceRgb({ r: 255, g: 0, b: 0 }, '16');
```

### Reduced Palettes

```typescript
import { createReducedPalette, getReducedPaletteRGB } from 'blecsd';

// Get palette indices for a depth
createReducedPalette('16');  // [0, 1, 2, ..., 15]
createReducedPalette('8');   // [0, 1, 2, ..., 7]
createReducedPalette('2');   // [0, 15]

// Get RGB values for reduced palette
getReducedPaletteRGB('16');  // Array of 16 RGB values
```

### Fast Reduction with Caching

```typescript
import { reduceFast, getCachedColorMap } from 'blecsd';

// Pre-computed lookup for fast reduction
reduceFast(196, '16');  // Uses cached map

// Access cached maps directly
const map16 = getCachedColorMap('16');
map16.get(196);  // Pre-computed 16-color equivalent
```

### Color Depth Detection

```typescript
import { getMinimumDepth, isAccurateAtDepth } from 'blecsd';

// What depth is needed for this color?
getMinimumDepth(1);    // '8' (basic ANSI)
getMinimumDepth(9);    // '16' (bright ANSI)
getMinimumDepth(196);  // '256' (color cube)

// Will this color be accurate at this depth?
isAccurateAtDepth(1, '8');     // true
isAccurateAtDepth(9, '8');     // false (needs 16)
isAccurateAtDepth(196, '16');  // false (needs 256)
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
  ColorNameSchema,
} from 'blecsd';

// Validate and transform
const result = Color256Schema.safeParse(196);
if (result.success) {
  const color: Color256 = result.data;
}

// Validate RGB
RGBSchema.parse({ r: 255, g: 0, b: 0 });

// Validate hex
HexColorSchema.parse('#ff0000');
HexColorSchema.parse('#f00');     // 3-digit
HexColorSchema.parse('#ff000080'); // With alpha

// Validate color names
ColorNameSchema.parse('red');
ColorNameSchema.parse('brightred');
```

## See Also

- [Renderable Component](./renderable.md) - Using colors with entity rendering
- [ANSI Sequences](./ansi.md) - Low-level terminal escape sequences
