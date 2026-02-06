# Graphics iTerm2

Implements the iTerm2 inline images protocol (OSC 1337) for displaying images directly in the terminal. Works with iTerm2 and compatible terminals (WezTerm, Konsole, mintty).

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createITerm2Backend,
  buildImageSequence,
  isITerm2Supported,
  createGraphicsManager,
  registerBackend,
} from 'blecsd';

// Register the iTerm2 backend
const manager = createGraphicsManager();
registerBackend(manager, createITerm2Backend());

// Build and display an image directly
const seq = buildImageSequence(pngData, { inline: true });
process.stdout.write(seq);
```

## Constants

<!-- blecsd-doccheck:ignore -->
```typescript
import { OSC_1337_PREFIX, ST, ST_ALT, ITERM2_BACKEND_NAME } from 'blecsd';

OSC_1337_PREFIX;     // '\x1b]1337;File=' - OSC 1337 prefix
ST;                  // '\x07' - String terminator (BEL)
ST_ALT;              // '\x1b\\' - Alternative ST (for tmux)
ITERM2_BACKEND_NAME; // 'iterm2'
```

## Types

### SizeUnit

```typescript
type SizeUnit = 'px' | 'cells' | 'auto' | '%';
```

### ITerm2Size

```typescript
interface ITerm2Size {
  readonly value: number;
  readonly unit: SizeUnit;
}
```

### ITerm2ImageConfig

```typescript
interface ITerm2ImageConfig {
  readonly inline?: boolean;                  // Display inline vs downloadable (default: true)
  readonly name?: string;                     // Image name
  readonly width?: ITerm2Size;
  readonly height?: ITerm2Size;
  readonly preserveAspectRatio?: boolean;     // Default: true
}
```

### ITerm2EnvChecker

```typescript
interface ITerm2EnvChecker {
  readonly getEnv: (name: string) => string | undefined;
}
```

## Functions

### Encoding

#### encodeBase64

Encodes binary data to base64.

```typescript
function encodeBase64(data: Uint8Array): string
```

### Size Formatting

#### formatSize

Formats a size value for the OSC 1337 protocol.

```typescript
function formatSize(size: ITerm2Size): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { formatSize } from 'blecsd';

formatSize({ value: 40, unit: 'cells' }); // '40'
formatSize({ value: 100, unit: 'px' });   // '100px'
formatSize({ value: 50, unit: '%' });     // '50%'
formatSize({ value: 0, unit: 'auto' });   // 'auto'
```

### Sequence Building

#### buildParams

Builds the parameter string for an OSC 1337 image sequence.

```typescript
function buildParams(config: ITerm2ImageConfig, dataSize: number): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { buildParams } from 'blecsd';

const params = buildParams({ inline: true, name: 'test.png' }, 1024);
// 'name=dGVzdC5wbmc=;size=1024;inline=1'
```

#### buildImageSequence

Builds a complete OSC 1337 image sequence.

```typescript
function buildImageSequence(data: Uint8Array, config?: ITerm2ImageConfig): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { buildImageSequence } from 'blecsd';

const seq = buildImageSequence(pngData, { inline: true });
process.stdout.write(seq);
```

### Rendering

#### renderITerm2Image

Renders image data using the iTerm2 protocol with cursor positioning.

```typescript
function renderITerm2Image(image: ImageData, options: RenderOptions): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { renderITerm2Image } from 'blecsd';

const output = renderITerm2Image(
  { width: 100, height: 50, data: pngBytes, format: 'png' },
  { x: 0, y: 0, width: 40, height: 20 },
);
process.stdout.write(output);
```

#### clearITerm2Image

Clears an image area by overwriting with spaces (iTerm2 has no dedicated clear command).

```typescript
function clearITerm2Image(options?: { x: number; y: number; width: number; height: number }): string
```

#### cursorPosition

Builds a cursor positioning escape sequence.

```typescript
function cursorPosition(x: number, y: number): string
```

### Detection

#### isITerm2Supported

Checks if the current terminal supports iTerm2 inline images.

```typescript
function isITerm2Supported(env?: ITerm2EnvChecker): boolean
```

Detected terminals: iTerm.app, WezTerm, mintty (via TERM_PROGRAM or LC_TERMINAL).

### Backend Factory

#### createITerm2Backend

Creates an iTerm2 graphics backend for use with the graphics manager.

```typescript
function createITerm2Backend(envChecker?: ITerm2EnvChecker): GraphicsBackend
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createITerm2Backend, createGraphicsManager, registerBackend } from 'blecsd';

const manager = createGraphicsManager();
registerBackend(manager, createITerm2Backend());
```

## Zod Schemas

<!-- blecsd-doccheck:ignore -->
```typescript
import { ITerm2SizeSchema, ITerm2ImageConfigSchema } from 'blecsd';

ITerm2ImageConfigSchema.safeParse({ inline: true });
```

## See Also

- [Graphics Backend](./graphics-backend.md) - Pluggable graphics backend system
- [Graphics Kitty](./graphics-kitty.md) - Kitty graphics protocol
- [Graphics Sixel](./graphics-sixel.md) - Sixel graphics protocol
