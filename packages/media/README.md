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
