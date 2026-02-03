# Rasterizer Module

Rasterizes projected 2D geometry into an RGBA pixel buffer. The pixel buffer is the common intermediate format consumed by all backends.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/rasterizer'`

## PixelFramebuffer

RGBA pixel buffer with depth testing.

### `createPixelBuffer(width, height): PixelFramebuffer`

Create a new framebuffer.

```typescript
const fb = three.createPixelBuffer(160, 96);
```

### `clearPixelBuffer(fb): void`

Clear all pixels to transparent black and reset depth buffer.

### `getPixel(fb, x, y): { r, g, b, a }`

Read a pixel's RGBA values.

### `setPixel(fb, x, y, r, g, b, a, depth?): void`

Write a pixel with optional depth testing.

### PixelFramebuffer Properties

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Buffer width in pixels |
| `height` | `number` | Buffer height in pixels |
| `data` | `Uint8ClampedArray` | RGBA pixel data (width * height * 4) |
| `depth` | `Float32Array` | Depth buffer (width * height) |

### Zod Schemas

- `PixelBufferConfigSchema` - `{ width: number, height: number }`
- `RGBAColorSchema` - `{ r, g, b, a }` each 0-255

## Line Drawing

### `drawLine(fb, x0, y0, x1, y1, r, g, b, a, depth0?, depth1?): void`

Bresenham line drawing with color and optional depth interpolation.

```typescript
three.drawLine(fb, 10, 10, 50, 30, 255, 0, 0, 255);
```

### `drawLineAA(fb, x0, y0, x1, y1, r, g, b, a): void`

Wu's anti-aliased line drawing for smoother edges.

### Zod Schemas

- `LineEndpointSchema` - `{ x, y, depth? }`

## Triangle Rasterization

### `fillTriangle(fb, v0, v1, v2): void`

Scanline triangle rasterizer with depth buffer support.

```typescript
three.fillTriangle(fb,
  { x: 10, y: 10, depth: 0.5, r: 255, g: 0, b: 0, a: 255 },
  { x: 50, y: 10, depth: 0.5, r: 0, g: 255, b: 0, a: 255 },
  { x: 30, y: 40, depth: 0.5, r: 0, g: 0, b: 255, a: 255 },
);
```

### `fillTriangleFlat(fb, v0, v1, v2): void`

Flat-shaded triangle rasterizer. All three vertices must share the same color.

### Zod Schemas

- `TriangleVertexSchema` - `{ x, y, depth, r, g, b, a }`

## Shading

### `computeFaceNormal(v0, v1, v2): Float32Array`

Compute the face normal from three vertex positions.

### `lambertShade(normal, lightDir, baseColor, intensity): { r, g, b }`

Apply Lambertian (diffuse) shading to a base color given a face normal and light direction.

### Zod Schemas

- `DirectionalLightSchema` - `{ direction: [x, y, z], intensity: number }`
- `AmbientLightSchema` - `{ intensity: number }`
