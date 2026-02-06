# Image Widget

Renders bitmap images in the terminal using ANSI escape sequences (256-color, ASCII art, braille) or stores bitmaps for external image protocols (w3m, iTerm2, Kitty, Sixel).

## Overview

```typescript
import { createImage } from 'blecsd';

const world = createWorld();

const bitmap = {
  width: 2,
  height: 2,
  data: new Uint8Array([
    255, 0, 0, 255,  255, 0, 0, 255,
    255, 0, 0, 255,  255, 0, 0, 255,
  ]),
};

const image = createImage(world, {
  x: 5,
  y: 2,
  type: 'ansi',
  renderMode: 'color',
  bitmap,
});
```

---

## Configuration

### ImageConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | bitmap width | Width in terminal columns |
| `height` | `number` | bitmap height | Height in terminal rows |
| `type` | `'ansi' \| 'overlay'` | `'ansi'` | Rendering type |
| `bitmap` | `Bitmap` | - | Initial bitmap data |
| `renderMode` | `'color' \| 'ascii' \| 'braille'` | `'color'` | ANSI render mode |
| `dither` | `boolean` | `false` | Enable dithering in color mode |
| `visible` | `boolean` | `true` | Whether to show initially |

### ImageType

- `'ansi'` - Renders bitmap as ANSI escape sequences using 256-color palette
- `'overlay'` - Stores bitmap for external overlay protocols (w3m, iTerm2, Kitty, Sixel)

### RenderMode

- `'color'` - 256-color half-block characters
- `'ascii'` - ASCII art using brightness mapping
- `'braille'` - Braille character rendering

### Bitmap

```typescript
interface Bitmap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;  // RGBA pixels, 4 bytes per pixel
}
```

### Zod Schema

```typescript
import { ImageConfigSchema } from 'blecsd';

const result = ImageConfigSchema.safeParse({
  type: 'ansi',
  width: 40,
  renderMode: 'color',
});
```

---

## Factory Function

### createImage

Creates an Image widget.

```typescript
import { createImage } from 'blecsd';

const image = createImage(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 20,
  type: 'ansi',
  renderMode: 'color',
  bitmap: myBitmap,
});
```

**Parameters:**
- `world: World` - The ECS world
- `config?: ImageConfig` - Widget configuration

**Returns:** `ImageWidget`

---

## ImageWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide / isVisible

```typescript
show(): ImageWidget
hide(): ImageWidget
isVisible(): boolean
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): ImageWidget
```

Moves the image by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): ImageWidget
```

Sets the absolute position.

### getPosition

```typescript
getPosition(): { x: number; y: number }
```

Gets the current position.

### setImage

```typescript
setImage(bitmap: Bitmap): ImageWidget
```

Sets the bitmap to render. Automatically re-renders the ANSI content.

```typescript
image.setImage({
  width: 4,
  height: 4,
  data: new Uint8Array(4 * 4 * 4), // 4x4 RGBA
});
```

### getImage

```typescript
getImage(): Bitmap | undefined
```

Gets the current bitmap data.

### getType

```typescript
getType(): ImageType
```

Returns `'ansi'` or `'overlay'`.

### getCellMap

```typescript
getCellMap(): CellMap | undefined
```

Gets the last rendered CellMap (ANSI mode only). Useful for advanced rendering integration.

### setRenderMode

```typescript
setRenderMode(mode: RenderMode): ImageWidget
```

Changes the ANSI render mode and re-renders.

```typescript
image.setRenderMode('braille');
```

### getRenderMode

```typescript
getRenderMode(): RenderMode
```

Gets the current render mode.

### render

```typescript
render(): string
```

Renders the current bitmap to an ANSI string. Returns an empty string if no bitmap is set.

```typescript
const ansiOutput = image.render();
process.stdout.write(ansiOutput);
```

### destroy

```typescript
destroy(): void
```

Destroys the image widget and removes the entity from the world.

---

## Utility Functions

### isImage

```typescript
import { isImage } from 'blecsd';

if (isImage(world, entity)) {
  // Entity is an image widget
}
```

### getImageBitmap

```typescript
import { getImageBitmap } from 'blecsd';

const bitmap = getImageBitmap(entity);
if (bitmap) {
  console.log(`Image: ${bitmap.width}x${bitmap.height}`);
}
```

### getImageCellMap

```typescript
import { getImageCellMap } from 'blecsd';

const cellMap = getImageCellMap(entity);
if (cellMap) {
  console.log(`Cells: ${cellMap.width}x${cellMap.height}`);
}
```

---

## Examples

### Render Modes

```typescript
import { createImage } from 'blecsd';

const image = createImage(world, {
  bitmap: myBitmap,
  type: 'ansi',
});

// Switch between render modes
image.setRenderMode('color');    // 256-color half-blocks
image.setRenderMode('ascii');    // ASCII art
image.setRenderMode('braille');  // Braille characters
```

### Overlay Mode for External Protocols

```typescript
import { createImage, getImageBitmap } from 'blecsd';

const image = createImage(world, {
  x: 0,
  y: 0,
  type: 'overlay',
  bitmap: myBitmap,
});

// Bitmap is stored but not rendered to ANSI.
// Your rendering system can retrieve it for Kitty/iTerm2/Sixel output.
const bitmap = getImageBitmap(image.eid);
```

### Dynamic Image Updates

```typescript
import { createImage } from 'blecsd';

const image = createImage(world, {
  x: 0,
  y: 0,
  width: 40,
  height: 20,
  type: 'ansi',
});

// Update the image dynamically
function updateFrame(bitmap) {
  image.setImage(bitmap).show();
}
```

---

## See Also

- [Video Widget](./video.md) - Video playback in the terminal
- [Viewport3D](./viewport3d.md) - 3D rendering viewport
