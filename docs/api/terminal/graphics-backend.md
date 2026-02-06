# Graphics Backend

Pluggable terminal graphics backend system for image rendering. Provides a unified interface for different terminal graphics protocols (Kitty, iTerm2, Sixel, ANSI art, ASCII) with automatic backend selection and a fallback chain.

## Quick Start

```typescript
import {
  createGraphicsManager,
  registerBackend,
  renderImage,
  clearImage,
  getActiveBackend,
  selectBackend,
} from 'blecsd';

// Create a graphics manager
const manager = createGraphicsManager();

// Register backends (see protocol-specific docs)
registerBackend(manager, kittyBackend);
registerBackend(manager, sixelBackend);

// Render an image (uses the best available backend)
const output = renderImage(manager, imageData, { x: 10, y: 5 });
process.stdout.write(output);

// Clear
process.stdout.write(clearImage(manager, 1));
```

## Types

### BackendName

```typescript
type BackendName = 'kitty' | 'iterm2' | 'sixel' | 'ansi' | 'ascii';
```

### GraphicsCapabilities

```typescript
interface GraphicsCapabilities {
  readonly staticImages: boolean;
  readonly animation: boolean;
  readonly alphaChannel: boolean;
  readonly maxWidth: number | null;    // null = unlimited
  readonly maxHeight: number | null;   // null = unlimited
}
```

### ImageData

```typescript
interface ImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  readonly format: 'rgba' | 'rgb' | 'png';
}
```

### RenderOptions

```typescript
interface RenderOptions {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly id?: number;
  readonly preserveAspectRatio?: boolean;
}
```

### GraphicsBackend

A backend that can render images to the terminal.

```typescript
interface GraphicsBackend {
  readonly name: BackendName;
  readonly capabilities: GraphicsCapabilities;
  readonly render: (image: ImageData, options: RenderOptions) => string;
  readonly clear: (id?: number) => string;
  readonly isSupported: () => boolean;
}
```

### GraphicsManagerConfig

```typescript
interface GraphicsManagerConfig {
  readonly preferenceOrder?: readonly BackendName[];
  readonly backends?: readonly GraphicsBackend[];
}
```

### GraphicsManagerState

```typescript
interface GraphicsManagerState {
  readonly backends: Map<BackendName, GraphicsBackend>;
  activeBackend: GraphicsBackend | undefined;
  readonly preferenceOrder: readonly BackendName[];
}
```

## Constants

### DEFAULT_FALLBACK_CHAIN

Default backend preference order (highest fidelity first).

```typescript
const DEFAULT_FALLBACK_CHAIN: readonly BackendName[] = [
  'kitty', 'iterm2', 'sixel', 'ansi', 'ascii',
];
```

## Functions

### selectBackend

Selects the best available backend from a list of registered backends.

```typescript
function selectBackend(
  backends: ReadonlyMap<BackendName, GraphicsBackend>,
  preferenceOrder?: readonly BackendName[],
): GraphicsBackend | undefined
```

```typescript
import { selectBackend } from 'blecsd';

const backend = selectBackend(registeredBackends);
if (backend) {
  const output = backend.render(imageData, { x: 0, y: 0 });
}
```

### createGraphicsManager

Creates a graphics manager state.

```typescript
function createGraphicsManager(config?: GraphicsManagerConfig): GraphicsManagerState
```

```typescript
import { createGraphicsManager, registerBackend } from 'blecsd';

const manager = createGraphicsManager();
registerBackend(manager, ansiBackend);
```

### registerBackend

Registers a graphics backend with the manager.

```typescript
function registerBackend(manager: GraphicsManagerState, backend: GraphicsBackend): void
```

### getActiveBackend

Gets the active graphics backend, selecting the best one if needed.

```typescript
function getActiveBackend(manager: GraphicsManagerState): GraphicsBackend | undefined
```

### renderImage

Renders an image using the active backend.

```typescript
function renderImage(
  manager: GraphicsManagerState,
  image: ImageData,
  options: RenderOptions,
): string
```

```typescript
import { renderImage } from 'blecsd';

const output = renderImage(manager, imageData, { x: 10, y: 5 });
process.stdout.write(output);
```

### clearImage

Clears an image (or all images) using the active backend.

```typescript
function clearImage(manager: GraphicsManagerState, id?: number): string
```

### refreshBackend

Re-selects the active backend. Call after terminal resize or when capabilities change.

```typescript
function refreshBackend(manager: GraphicsManagerState): GraphicsBackend | undefined
```

### getBackendCapabilities

Gets the capabilities of the active backend.

```typescript
function getBackendCapabilities(manager: GraphicsManagerState): GraphicsCapabilities | undefined
```

## Zod Schemas

```typescript
import {
  GraphicsCapabilitiesSchema,
  ImageDataSchema,
  RenderOptionsSchema,
  GraphicsManagerConfigSchema,
} from 'blecsd';

const result = RenderOptionsSchema.safeParse({ x: 0, y: 0 });
```

## See Also

- [Graphics Kitty](./graphics-kitty.md) - Kitty graphics protocol backend
- [Graphics Sixel](./graphics-sixel.md) - Sixel graphics protocol backend
- [Graphics iTerm2](./graphics-iterm2.md) - iTerm2 inline images backend
