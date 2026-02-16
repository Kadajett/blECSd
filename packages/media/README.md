# @blecsd/media

Media rendering for blECSd - GIF/PNG parsers, ANSI rendering, image and video widgets.

## Installation

```bash
pnpm add @blecsd/media
```

## Overview

@blecsd/media provides media rendering capabilities for terminal applications. It includes parsers for GIF and PNG image formats, ANSI-based rendering for terminal display, W3M overlay support for high-quality image rendering, and widgets for displaying images and videos.

## Quick Start

```typescript
import { createWorld } from 'blecsd';
import { parseGIF, parsePNG, createImage, renderToANSI } from '@blecsd/media';
import { readFileSync } from 'fs';

const world = createWorld();

// Load and display a PNG image
const pngData = readFileSync('image.png');
const png = parsePNG(pngData);

const image = createImage(world, {
  x: 0,
  y: 0,
  width: 40,
  height: 20,
  imageData: png
});

// Load and display an animated GIF
const gifData = readFileSync('animation.gif');
const gif = parseGIF(gifData);

const animatedImage = createImage(world, {
  x: 0,
  y: 21,
  width: 40,
  height: 20,
  imageData: gif,
  animate: true
});

// Convert image to ANSI cells for terminal rendering
const cells = renderToANSI(png, {
  width: 40,
  height: 20,
  dithering: true
});
```

## Namespace Imports

The @blecsd/media package provides namespace objects that group related functions for media processing. These frozen objects make it easy to explore available functions via IDE autocomplete:

```typescript
import { gif, png, ansiRender, imageWidget, videoWidget } from '@blecsd/media';

// GIF parsing with nested namespaces
const gifResult = gif.parse.parseGIF(buffer);
if (gifResult.success) {
  const rgba = gif.frame.frameToRGBA(gifResult.data.frames[0]);
  const decompressed = gif.lzw.decompressLZW(data, minCodeSize);
}

// PNG parsing with nested namespaces
const pngResult = png.parse.parsePNG(buffer);
if (pngResult.success) {
  const pixels = png.pixels.extractPixels(pngResult.data);
  const filtered = png.filters.reconstructFilters(scanlines);
}

// ANSI rendering
const bitmap = { width: 100, height: 50, data: new Uint8Array(...) };
const cellMap = ansiRender.renderToAnsi(bitmap, { mode: '256-color' });
const output = ansiRender.cellMapToString(cellMap);

// Image widget operations
const img = imageWidget.create(world, { width: 40, height: 20, imageData: png });
imageWidget.setFrame(eid, 0);
imageWidget.play(eid);

// Video widget operations
const video = videoWidget.create(world, { width: 40, height: 20, frames });
videoWidget.play(eid);
videoWidget.setFPS(eid, 30);
```

### Available Namespaces

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `gif` | GIF image parsing | Nested: `parse` (parseGIF, validateGIFSignature), `lzw` (decompressLZW, createBitReader), `frame` (frameToRGBA, deinterlace) |
| `png` | PNG image parsing | Nested: `parse` (parsePNG, parseChunks, parseIHDR), `filters` (reconstructFilters, paethPredictor), `pixels` (extractPixels, parsePLTE) |
| `ansiRender` | Terminal rendering from bitmaps | `renderToAnsi`, `cellMapToString`, `scaleBitmap`, `rgbTo256Color`, `luminanceToChar` |
| `imageWidget` | Image widget operations | `create`, `setImageData`, `setFrame`, `play`, `pause`, `stop` |
| `videoWidget` | Video widget operations | `create`, `play`, `pause`, `stop`, `setFPS`, `seek` |
| `w3m` | W3M overlay support | `createOverlay`, `showImage`, `hideImage`, `updatePosition` |

## Subpath Imports

For tree-shakeable imports, use subpath exports to import only the functions you need:

```typescript
// Import specific parsers
import { parseGIF, frameToRGBA } from '@blecsd/media/gif';
import { parsePNG, extractPixels } from '@blecsd/media/png';

// Import rendering utilities
import { renderToAnsi, cellMapToString } from '@blecsd/media/render';

// Import widgets
import { createImage } from '@blecsd/media/widgets/image';
import { createVideo } from '@blecsd/media/widgets/video';

// Import W3M overlay
import { createW3MOverlay } from '@blecsd/media/overlay';
```

Available subpath exports:
- `@blecsd/media/gif` - GIF parser and utilities
- `@blecsd/media/png` - PNG parser and utilities
- `@blecsd/media/render` - ANSI rendering functions
- `@blecsd/media/widgets/image` - Image widget
- `@blecsd/media/widgets/video` - Video widget
- `@blecsd/media/overlay` - W3M overlay support

## API

### Image Parsers

| Function | Description |
|----------|-------------|
| `parseGIF(buffer)` | Parse GIF image data with LZW decompression and animation support |
| `parsePNG(buffer)` | Parse PNG image data with filter handling and transparency |

Both parsers return image data structures with:
- `width`, `height` - Image dimensions
- `pixels` - RGBA pixel data
- `frames` - Animation frames (GIF only)
- `delays` - Frame delays in ms (GIF only)

### Rendering

| Function | Description |
|----------|-------------|
| `renderToANSI(imageData, options)` | Convert image to ANSI colored cells for terminal display |

Render options:
- `width`, `height` - Target dimensions
- `dithering?: boolean` - Apply dithering for better color representation
- `background?: number` - Background color (RGBA)
- `mode?: 'block' | 'halfblock' | 'braille'` - Rendering mode

### Widgets

| Widget | Description |
|--------|-------------|
| `createImage(world, config)` | Static or animated image widget |
| `createVideo(world, config)` | Video playback widget with frame-by-frame rendering |

Image widget configuration:
```typescript
{
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: ImageData;
  animate?: boolean;        // Enable animation for GIFs
  loop?: boolean;           // Loop animation
  fps?: number;             // Override frame rate
  border?: BorderConfig;
  style?: StyleConfig;
}
```

Video widget configuration:
```typescript
{
  x: number;
  y: number;
  width: number;
  height: number;
  frames: ImageData[];      // Array of video frames
  fps?: number;             // Playback frame rate (default: 30)
  loop?: boolean;           // Loop playback
  autoplay?: boolean;       // Start playing immediately
  controls?: boolean;       // Show playback controls
}
```

### W3M Overlay Support

For high-quality image rendering in supported terminals:

```typescript
import { createW3MOverlay } from '@blecsd/media';

const overlay = createW3MOverlay(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  imagePath: '/path/to/image.png'
});

// W3M renders the image as an overlay on the terminal
```

### Image Data Format

All parsers and renderers use a standard image data format:

```typescript
interface ImageData {
  width: number;
  height: number;
  pixels: Uint8Array;        // RGBA format (4 bytes per pixel)
  frames?: ImageFrame[];     // For animations
}

interface ImageFrame {
  pixels: Uint8Array;
  delay: number;             // Frame delay in ms
  disposal?: number;         // Frame disposal method
}
```

## Rendering Modes

- `block` - Full cell blocks (2:1 aspect ratio, lower resolution)
- `halfblock` - Half-block characters (1:1 aspect ratio, medium resolution)
- `braille` - Braille patterns (high resolution, 2x4 pixels per cell)

## Supported Formats

### GIF
- Animated and static GIFs
- LZW decompression
- Transparency
- Frame disposal methods
- Loop count

### PNG
- RGB and RGBA color
- Grayscale and indexed color
- Transparency (alpha channel)
- Interlaced images
- PNG filters (sub, up, average, Paeth)

## Requirements

- blecsd (peer dependency)
- Node.js 18+

## License

MIT
