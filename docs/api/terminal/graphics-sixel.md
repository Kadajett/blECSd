# Graphics Sixel

Implements the DEC sixel protocol (DCS q ... ST) for displaying images in terminals that support sixel graphics. Encodes raw pixel data as sixel escape sequences with palette quantization and RLE compression.

Sixel images are encoded in 6-pixel-tall horizontal bands using a color-indexed palette (up to 256 colors). Each band column is a single character whose 6 low bits indicate which of the 6 rows contain a given color.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createSixelGraphicsBackend,
  encodeSixelImage,
  isSixelSupported,
  createGraphicsManager,
  registerBackend,
} from 'blecsd';

// Register the sixel backend
const manager = createGraphicsManager();
registerBackend(manager, createSixelGraphicsBackend({ maxColors: 256 }));

// Encode and display an image directly
const seq = encodeSixelImage(imageData, 256, true);
process.stdout.write(seq);
```

## Constants

<!-- blecsd-doccheck:ignore -->
```typescript
import { DCS_START, SIXEL_ST, SIXEL_BACKEND_NAME, DEFAULT_MAX_COLORS } from 'blecsd';

DCS_START;         // '\x1bPq' - DCS introducer
SIXEL_ST;          // '\x1b\\' - String terminator
SIXEL_BACKEND_NAME; // 'sixel'
DEFAULT_MAX_COLORS; // 256
```

## Types

### SixelBackendConfig

```typescript
interface SixelBackendConfig {
  readonly maxColors?: number;    // Max palette colors, 2-256 (default: 256)
  readonly rleEnabled?: boolean;  // Enable RLE compression (default: true)
}
```

### SixelEnvChecker

```typescript
interface SixelEnvChecker {
  readonly getEnv: (name: string) => string | undefined;
}
```

## Functions

### Pixel Helpers

#### bytesPerPixel

```typescript
function bytesPerPixel(format: 'rgba' | 'rgb' | 'png'): number
```

#### getPixelRGBA

Extracts RGBA values from image data at a pixel index.

```typescript
function getPixelRGBA(data: Uint8Array, index: number, bpp: number): [number, number, number, number]
```

### Color Quantization

#### packRGB

Packs RGB into a single 24-bit integer.

```typescript
function packRGB(r: number, g: number, b: number): number
```

#### countImageColors

Counts color occurrences in image data, skipping transparent pixels.

```typescript
function countImageColors(data: Uint8Array, pixelCount: number, bpp: number): Map<number, number>
```

#### buildPalette

Builds a palette from color counts sorted by popularity.

```typescript
function buildPalette(
  colorCounts: Map<number, number>,
  maxColors: number,
): { paletteFlat: Uint8Array; paletteCount: number }
```

#### findNearestColor

Finds the nearest palette index for an RGB color using squared distance.

```typescript
function findNearestColor(
  r: number, g: number, b: number,
  paletteFlat: Uint8Array, paletteCount: number,
): number
```

#### mapPixelsToPalette

Maps all pixels to their nearest palette index.

```typescript
function mapPixelsToPalette(
  data: Uint8Array, pixelCount: number, bpp: number,
  paletteFlat: Uint8Array, paletteCount: number,
): Uint8Array
```

### Sixel Encoding

#### buildPaletteHeader

Builds the sixel palette header string.

```typescript
function buildPaletteHeader(paletteFlat: Uint8Array, paletteCount: number): string
```

#### buildSixelColumn

Builds a sixel bit pattern for one column across all rows in a band.

```typescript
function buildSixelColumn(
  indexMap: Uint8Array, colorIdx: number, bandY: number,
  maxRow: number, width: number, x: number,
): number
```

#### rleEncodeBand

Run-length encodes a band of sixel values. Uses `!<count><char>` for runs of 3 or more identical values.

```typescript
function rleEncodeBand(sixelValues: Uint8Array, width: number): { encoded: string; hasPixels: boolean }
```

#### rawEncodeBand

Raw-encodes a band of sixel values (no RLE compression).

```typescript
function rawEncodeBand(sixelValues: Uint8Array, width: number): { encoded: string; hasPixels: boolean }
```

#### encodeSixelData

Encodes a complete sixel image from pixel index map data. Processes in 6-pixel-tall bands.

```typescript
function encodeSixelData(
  indexMap: Uint8Array, paletteCount: number,
  width: number, height: number, rleEnabled: boolean,
): string
```

#### encodeSixelImage

Encodes image data as a complete sixel escape sequence (palette quantization + encoding + DCS framing).

```typescript
function encodeSixelImage(image: ImageData, maxColors: number, rleEnabled: boolean): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { encodeSixelImage } from 'blecsd';

const seq = encodeSixelImage(imageData, 256, true);
process.stdout.write(seq);
```

### Rendering

#### renderSixelImage

Renders image data as a positioned sixel escape sequence.

```typescript
function renderSixelImage(
  image: ImageData, options: RenderOptions,
  maxColors: number, rleEnabled: boolean,
): string
```

#### clearSixelImage

Clears a sixel image area by overwriting with spaces (sixel has no dedicated clear command).

```typescript
function clearSixelImage(options?: { x: number; y: number; width: number; height: number }): string
```

### Detection

#### isSixelSupported

Checks if the current terminal likely supports sixel graphics.

```typescript
function isSixelSupported(env?: SixelEnvChecker): boolean
```

Detected terminals: xterm (with XTERM_VERSION), mlterm, foot, contour, WezTerm, and any TERM containing "sixel".

### Backend Factory

#### createSixelGraphicsBackend

Creates a sixel graphics backend for use with the graphics manager.

```typescript
function createSixelGraphicsBackend(
  config?: SixelBackendConfig,
  envChecker?: SixelEnvChecker,
): GraphicsBackend
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSixelGraphicsBackend, createGraphicsManager, registerBackend } from 'blecsd';

const manager = createGraphicsManager();
registerBackend(manager, createSixelGraphicsBackend({ maxColors: 64 }));
```

## Zod Schema

<!-- blecsd-doccheck:ignore -->
```typescript
import { SixelBackendConfigSchema } from 'blecsd';

SixelBackendConfigSchema.safeParse({ maxColors: 64 }); // Validated config
```

## See Also

- [Graphics Backend](./graphics-backend.md) - Pluggable graphics backend system
- [Graphics Kitty](./graphics-kitty.md) - Kitty graphics protocol
- [Graphics iTerm2](./graphics-iterm2.md) - iTerm2 inline images
