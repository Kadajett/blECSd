# Graphics Kitty

Implements the Kitty terminal graphics protocol for high-fidelity raster image display with animation support. Uses APC escape sequences (`ESC _G ... ESC \`) for image transmission, placement, and deletion.

See the [Kitty graphics protocol specification](https://sw.kovidgoyal.net/kitty/graphics-protocol/) for the full protocol reference.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createKittyBackend,
  buildTransmitAndDisplay,
  buildDeleteAll,
  buildDeleteById,
  buildQuery,
  isKittySupported,
  createGraphicsManager,
  registerBackend,
} from 'blecsd';

// Register the Kitty backend
const manager = createGraphicsManager();
registerBackend(manager, createKittyBackend());

// Transmit and display an image
const output = buildTransmitAndDisplay(
  { width: 100, height: 50, data: pngBytes, format: 'png' },
  { x: 0, y: 0, width: 40, height: 20 },
);
process.stdout.write(output);

// Delete all images
process.stdout.write(buildDeleteAll());
```

## Constants

<!-- blecsd-doccheck:ignore -->
```typescript
import { APC_PREFIX, KITTY_ST, MAX_CHUNK_SIZE, KITTY_BACKEND_NAME } from 'blecsd';

APC_PREFIX;       // '\x1b_G' - APC escape prefix
KITTY_ST;         // '\x1b\\' - String terminator
MAX_CHUNK_SIZE;   // 4096 - Max base64 payload per chunk
KITTY_BACKEND_NAME; // 'kitty'
```

## Types

### KittyAction

```typescript
type KittyAction = 'T' | 't' | 'p' | 'd' | 'q' | 'f' | 'a';
// T=transmit+display, t=transmit, p=place, d=delete, q=query, f=frame, a=animate
```

### KittyFormat

```typescript
type KittyFormat = 24 | 32 | 100;
// 24=RGB, 32=RGBA, 100=PNG
```

### KittyTransmission

```typescript
type KittyTransmission = 'd' | 'f' | 't' | 's';
// d=direct inline, f=file path, t=temp file, s=shared memory
```

### KittyDeleteMode

```typescript
type KittyDeleteMode = 'a' | 'A' | 'i' | 'I' | 'c' | 'C' | 'x' | 'X' | 'y' | 'Y' | 'z' | 'Z';
// Lowercase: delete placements only. Uppercase: delete placements AND data.
```

### KittyQuiet

```typescript
type KittyQuiet = 0 | 1 | 2;
// 0=all responses, 1=suppress OK, 2=suppress all
```

### KittyControlData

Control key-value pairs for a Kitty graphics command.

```typescript
interface KittyControlData {
  readonly a?: KittyAction;
  readonly f?: KittyFormat;
  readonly t?: KittyTransmission;
  readonly o?: 'z';             // Compression
  readonly m?: 0 | 1;           // More data flag
  readonly s?: number;           // Source width
  readonly v?: number;           // Source height
  readonly i?: number;           // Image ID
  readonly p?: number;           // Placement ID
  readonly q?: KittyQuiet;
  readonly x?: number;           // Source X offset
  readonly y?: number;           // Source Y offset
  readonly w?: number;           // Source rect width
  readonly h?: number;           // Source rect height
  readonly X?: number;           // Cell X offset
  readonly Y?: number;           // Cell Y offset
  readonly c?: number;           // Display columns
  readonly r?: number;           // Display rows
  readonly z?: number;           // Z-index
  readonly C?: 0 | 1;           // Cursor movement policy
  readonly d?: KittyDeleteMode;
}
```

### KittyImageConfig

```typescript
interface KittyImageConfig {
  readonly imageId?: number;
  readonly placementId?: number;
  readonly quiet?: KittyQuiet;
  readonly zIndex?: number;
  readonly holdCursor?: boolean;
}
```

### KittyFrameConfig

```typescript
interface KittyFrameConfig {
  readonly imageId: number;
  readonly frameNumber?: number;
  readonly backgroundFrame?: number;
  readonly duration?: number;    // ms
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}
```

## Functions

### Encoding

#### kittyEncodeBase64

Encodes binary data to base64.

```typescript
function kittyEncodeBase64(data: Uint8Array): string
```

#### serializeControlData

Serializes control data key-value pairs into a comma-separated string.

```typescript
function serializeControlData(ctrl: KittyControlData): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { serializeControlData } from 'blecsd';

serializeControlData({ a: 'T', f: 100, i: 1 }); // 'a=T,f=100,i=1'
```

#### imageFormatToKitty

Maps an ImageData format string to the Kitty format code.

```typescript
function imageFormatToKitty(format: 'rgba' | 'rgb' | 'png'): KittyFormat
```

### Sequence Building

#### buildKittySequence

Builds a single Kitty graphics APC escape sequence.

```typescript
function buildKittySequence(ctrl: KittyControlData, payload?: string): string
```

#### chunkBase64

Splits base64 data into chunks of at most `MAX_CHUNK_SIZE` bytes.

```typescript
function chunkBase64(base64Data: string): string[]
```

#### buildChunkedSequences

Builds chunked sequences for transmitting large image data.

```typescript
function buildChunkedSequences(ctrl: KittyControlData, base64Data: string): string[]
```

#### kittyCursorPosition

Builds a CUP (Cursor Position) escape sequence (0-based input, 1-based output).

```typescript
function kittyCursorPosition(x: number, y: number): string
```

### Transmit and Display

#### buildTransmitAndDisplay

Builds escape sequences to transmit and display an image. Handles chunking automatically.

```typescript
function buildTransmitAndDisplay(
  image: ImageData,
  options: RenderOptions,
  config?: KittyImageConfig,
): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { buildTransmitAndDisplay } from 'blecsd';

const output = buildTransmitAndDisplay(
  { width: 100, height: 50, data: pngBytes, format: 'png' },
  { x: 0, y: 0, width: 40, height: 20 },
);
process.stdout.write(output);
```

#### buildTransmitOnly

Transmits image data without displaying it. The image is stored in terminal memory for later placement.

```typescript
function buildTransmitOnly(image: ImageData, imageId: number, quiet?: KittyQuiet): string
```

#### buildPlacement

Places a previously transmitted image.

```typescript
function buildPlacement(imageId: number, options: RenderOptions, config?: KittyImageConfig): string
```

### Deletion

#### buildDeleteAll

Deletes all image placements and data.

```typescript
function buildDeleteAll(): string
```

#### buildDeleteById

Deletes a specific image by ID.

```typescript
function buildDeleteById(imageId: number, freeData?: boolean): string
```

#### buildDeleteAtCursor

Deletes all images at the cursor position.

```typescript
function buildDeleteAtCursor(freeData?: boolean): string
```

### Animation

#### buildAnimationFrame

Transmits an animation frame.

```typescript
function buildAnimationFrame(frameData: Uint8Array, config: KittyFrameConfig): string
```

#### buildAnimationControl

Controls animation playback.

```typescript
function buildAnimationControl(imageId: number, action: 'start' | 'stop', loops?: number): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { buildAnimationControl } from 'blecsd';

process.stdout.write(buildAnimationControl(1, 'start'));  // Infinite loop
process.stdout.write(buildAnimationControl(1, 'stop'));
```

### Query and Detection

#### buildQuery

Builds an escape sequence to query Kitty graphics protocol support.

```typescript
function buildQuery(): string
```

#### isKittySupported

Checks if the current terminal supports the Kitty graphics protocol.

```typescript
function isKittySupported(env?: KittyEnvChecker): boolean
```

### Convenience

#### renderKittyImage / clearKittyImage

```typescript
function renderKittyImage(image: ImageData, options: RenderOptions): string
function clearKittyImage(id?: number): string
```

### Backend Factory

#### createKittyBackend

Creates a Kitty graphics backend for use with the graphics manager.

```typescript
function createKittyBackend(envChecker?: KittyEnvChecker): GraphicsBackend
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createKittyBackend, createGraphicsManager, registerBackend } from 'blecsd';

const manager = createGraphicsManager();
registerBackend(manager, createKittyBackend());
```

## Zod Schemas

<!-- blecsd-doccheck:ignore -->
```typescript
import { KittyImageConfigSchema, KittyFrameConfigSchema } from 'blecsd';

KittyImageConfigSchema.safeParse({ imageId: 1 });
KittyFrameConfigSchema.safeParse({ imageId: 1, duration: 100 });
```

## See Also

- [Graphics Backend](./graphics-backend.md) - Pluggable graphics backend system
- [Graphics Sixel](./graphics-sixel.md) - Sixel graphics protocol
- [Graphics iTerm2](./graphics-iterm2.md) - iTerm2 inline images
