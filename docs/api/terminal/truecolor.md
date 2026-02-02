# Truecolor (24-bit) Support

First-class 24-bit RGB color support with automatic downgrade for terminals without truecolor capability.

## Overview

The truecolor module provides a unified interface for color output that automatically adapts to terminal capabilities. It creates `Color` objects that contain representations for all color depths, enabling seamless fallback.

```typescript
import { createTruecolorSupport, rgb, fg, isTruecolor } from 'blecsd';

// Create colors
const red = rgb(255, 0, 0);
const blue = rgb(0, 0, 255);

// Use in terminal output (auto-downgrades if needed)
process.stdout.write(fg(red) + 'Red text' + '\x1b[0m');

// Check support
if (isTruecolor()) {
  console.log('24-bit color supported!');
}
```

---

## Color Depth Levels

```typescript
import { ColorDepthLevel } from 'blecsd';

ColorDepthLevel.MONO        // 1 - Monochrome (no color)
ColorDepthLevel.BASIC_8     // 8 - 8 basic colors
ColorDepthLevel.STANDARD_16 // 16 - 16 colors (8 + bright)
ColorDepthLevel.PALETTE_256 // 256 - 256 color palette
ColorDepthLevel.TRUECOLOR   // 16777216 - 24-bit (16.7M colors)
```

---

## createTruecolorSupport

Creates a TruecolorSupport instance.

```typescript
import { createTruecolorSupport } from 'blecsd';

// Default (auto-detects capabilities)
const truecolor = createTruecolorSupport();

// Force specific color depth
const limited = createTruecolorSupport({
  forceDepth: 256,  // Force 256-color mode
});

// For testing
const mock = createTruecolorSupport({
  forceDepth: 16777216,  // Force truecolor
});
```

**Parameters:**
- `config` - Configuration options
  - `forceDepth` - Force a specific color depth
  - `capabilities` - Custom capability provider
  - `dithering` - Enable dithering for gradients

**Returns:** `TruecolorSupport`

---

## TruecolorSupport Methods

### rgb

Creates a Color from RGB components.

```typescript
const red = truecolor.rgb(255, 0, 0);
const green = truecolor.rgb(0, 255, 0);
const custom = truecolor.rgb(128, 64, 32);
```

### rgba

Creates a Color with alpha.

```typescript
const semiRed = truecolor.rgba(255, 0, 0, 0.5);
```

### fromHex

Creates a Color from a hex string.

```typescript
const red = truecolor.fromHex('#ff0000');
const blue = truecolor.fromHex('#00f');
const semiRed = truecolor.fromHex('#ff000080');
```

### from

Creates a Color from any supported value.

```typescript
truecolor.from('#ff0000');            // Hex
truecolor.from({ r: 255, g: 0, b: 0 }); // RGB object
truecolor.from(0xff0000);             // Truecolor number
```

### withOpacity

Creates a Color with modified alpha.

```typescript
const red = truecolor.rgb(255, 0, 0);
const semiRed = truecolor.withOpacity(red, 0.5);
```

### fg

Gets the SGR foreground sequence, automatically downgraded.

```typescript
const red = truecolor.rgb(255, 0, 0);
process.stdout.write(truecolor.fg(red) + 'Red text');
```

Returns:
- Truecolor: `\x1b[38;2;R;G;Bm`
- 256: `\x1b[38;5;Nm`
- 16: `\x1b[3Nm` or `\x1b[9Nm`
- 8: `\x1b[3Nm`
- Mono: empty string

### bg

Gets the SGR background sequence, automatically downgraded.

```typescript
const red = truecolor.rgb(255, 0, 0);
process.stdout.write(truecolor.bg(red) + 'Red background');
```

### getDepth

Gets the current color depth.

```typescript
const depth = truecolor.getDepth();
if (depth >= ColorDepthLevel.PALETTE_256) {
  // Use 256-color features
}
```

### isTruecolorSupported

Checks if 24-bit color is supported.

```typescript
if (truecolor.isTruecolorSupported()) {
  // Use full RGB colors
}
```

### setDepth / resetDepth

Forces or resets color depth.

```typescript
// Force 256-color mode
truecolor.setDepth(ColorDepthLevel.PALETTE_256);

// Reset to auto-detection
truecolor.resetDepth();
```

### gradient

Creates a gradient between two colors.

```typescript
const from = truecolor.rgb(255, 0, 0);  // Red
const to = truecolor.rgb(0, 0, 255);    // Blue
const gradient = truecolor.gradient(from, to, 10);

// Use gradient colors
for (const color of gradient) {
  process.stdout.write(truecolor.fg(color) + '█');
}
```

### blend

Blends two colors.

```typescript
const red = truecolor.rgb(255, 0, 0);
const blue = truecolor.rgb(0, 0, 255);

const purple = truecolor.blend(red, blue);       // 50% blend
const mostlyRed = truecolor.blend(red, blue, 0.25);
const mostlyBlue = truecolor.blend(red, blue, 0.75);
```

---

## Convenience Functions

Module-level functions use the default TruecolorSupport instance.

### rgb / rgba

```typescript
import { rgb, rgba } from 'blecsd';

const red = rgb(255, 0, 0);
const semiRed = rgba(255, 0, 0, 0.5);
```

### hex

```typescript
import { hex } from 'blecsd';

const red = hex('#ff0000');
const blue = hex('#00f');
```

### color

```typescript
import { color } from 'blecsd';

const c1 = color('#ff0000');
const c2 = color({ r: 255, g: 0, b: 0 });
const c3 = color(0xff0000);
```

### fg / bg

```typescript
import { rgb, fg, bg } from 'blecsd';

const red = rgb(255, 0, 0);
process.stdout.write(fg(red) + 'Red text' + '\x1b[0m');
process.stdout.write(bg(red) + 'Red background' + '\x1b[0m');
```

### isTruecolor

```typescript
import { isTruecolor } from 'blecsd';

if (isTruecolor()) {
  console.log('24-bit color supported!');
}
```

### getColorDepthLevel

```typescript
import { getColorDepthLevel, ColorDepthLevel } from 'blecsd';

const depth = getColorDepthLevel();
console.log(`Color depth: ${depth}`);
```

---

## Types

### Color

Color representation with all depth variants.

```typescript
interface Color {
  /** 24-bit packed RGB value */
  readonly rgb: number;
  /** RGB components */
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** Optional alpha (0-1) */
  readonly a?: number;
  /** Nearest 256-color palette index */
  readonly color256: Color256;
  /** Nearest 16-color index */
  readonly color16: number;
  /** Nearest 8-color index */
  readonly color8: number;
}
```

### TruecolorConfig

```typescript
interface TruecolorConfig {
  readonly forceDepth?: ColorDepthLevelValue;
  readonly capabilities?: TerminalCapabilities;
  readonly dithering?: boolean;
}
```

### TruecolorSupport

```typescript
interface TruecolorSupport {
  rgb(r: number, g: number, b: number): Color;
  rgba(r: number, g: number, b: number, a: number): Color;
  fromHex(hex: string): Color;
  from(value: ColorValue): Color;
  withOpacity(color: Color, opacity: number): Color;
  fg(color: Color): string;
  bg(color: Color): string;
  getDepth(): ColorDepthLevelValue;
  isTruecolorSupported(): boolean;
  setDepth(depth: ColorDepthLevelValue): void;
  resetDepth(): void;
  gradient(from: Color, to: Color, steps: number): Color[];
  blend(color1: Color, color2: Color, ratio?: number): Color;
}
```

---

## Examples

### Basic Usage

```typescript
import { rgb, fg, bg } from 'blecsd';

const red = rgb(255, 0, 0);
const blue = rgb(0, 0, 255);

// Output colored text
console.log(fg(red) + 'Red text' + '\x1b[0m');
console.log(bg(blue) + 'Blue background' + '\x1b[0m');
```

### Gradient Progress Bar

```typescript
import { createTruecolorSupport } from 'blecsd';

const truecolor = createTruecolorSupport();

function renderProgressBar(percent: number) {
  const width = 50;
  const filled = Math.round(width * percent / 100);

  const start = truecolor.rgb(255, 0, 0);  // Red
  const end = truecolor.rgb(0, 255, 0);    // Green
  const gradient = truecolor.gradient(start, end, width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    const color = gradient[i];
    if (i < filled) {
      bar += truecolor.fg(color) + '█';
    } else {
      bar += truecolor.fg(color) + '░';
    }
  }

  console.log(bar + '\x1b[0m ' + percent + '%');
}

renderProgressBar(75);
```

### Forced Color Depth

```typescript
import { createTruecolorSupport, ColorDepthLevel } from 'blecsd';

// For testing 256-color fallback
const truecolor = createTruecolorSupport({
  forceDepth: ColorDepthLevel.PALETTE_256,
});

const color = truecolor.rgb(128, 64, 192);
console.log(truecolor.fg(color));  // Will use 38;5;N format
```

### Color Blending UI

```typescript
import { createTruecolorSupport } from 'blecsd';

const truecolor = createTruecolorSupport();

const primary = truecolor.fromHex('#3498db');
const secondary = truecolor.fromHex('#e74c3c');

// Create button states
const normal = primary;
const hover = truecolor.blend(primary, truecolor.rgb(255, 255, 255), 0.2);
const pressed = truecolor.blend(primary, truecolor.rgb(0, 0, 0), 0.2);

console.log(truecolor.bg(normal) + '  Normal  ' + '\x1b[0m');
console.log(truecolor.bg(hover) + '  Hover   ' + '\x1b[0m');
console.log(truecolor.bg(pressed) + '  Pressed ' + '\x1b[0m');
```

---

## Capability Detection Ladder

The module uses the following detection order:

1. **Truecolor**
   - `COLORTERM=truecolor` or `COLORTERM=24bit`
   - Capability negotiation result
   - Known truecolor terminals (Kitty, iTerm2, etc.)

2. **256 Colors**
   - `TERM` contains `256color`

3. **16 Colors**
   - `TERM` contains `xterm`, `vt100`, `screen`

4. **8 Colors**
   - Any non-dumb terminal

5. **Mono**
   - `TERM=dumb` or no `TERM`

---

## See Also

- [Color Conversion](./colors.md) - Color format conversions
- [Color Matching](./colors.md#match) - Finding nearest palette colors
- [Capabilities](../capabilities.md) - Terminal capability negotiation
