# @blecsd/3d

Terminal 3D rendering for blECSd - rasterizer, math, OBJ loader, and multiple backends.

## Installation

```bash
pnpm add @blecsd/3d
```

## Overview

@blecsd/3d provides a complete 3D rendering pipeline for terminal applications. It includes a software rasterizer, 3D math utilities, mesh loading (OBJ format), and multiple rendering backends optimized for different terminal capabilities.

## Quick Start

```typescript
import { createWorld } from 'blecsd';
import {
  createCamera3D,
  createMesh,
  createTransform3D,
  loadObjFile,
  BrailleBackend,
  Viewport3D
} from '@blecsd/3d';

const world = createWorld();

// Create a camera
const camera = createCamera3D(world, {
  fov: 60,
  near: 0.1,
  far: 100
});

// Load a 3D model
const mesh = loadObjFile('model.obj');
const entity = createMesh(world, mesh);

// Create a transform and position the mesh
const transform = createTransform3D(world, entity);
transform.position.z = -5;

// Create a viewport with braille backend for high-density rendering
const viewport = new Viewport3D(world, {
  width: 80,
  height: 24,
  backend: new BrailleBackend()
});

// Render the scene
viewport.render();
```

## Namespace Imports

The @blecsd/3d package provides namespace objects that group related functions for API discoverability. These frozen objects make it easy to explore available functions via IDE autocomplete:

```typescript
import { vec3, mat4, projection } from '@blecsd/3d';

// Vector operations
const v1 = vec3.create(1, 0, 0);
const v2 = vec3.create(0, 1, 0);
const sum = vec3.add(v1, v2);
const normalized = vec3.normalize(sum);

// Matrix operations
const m = mat4.identity();
const translated = mat4.translate(m, 0, 0, -5);
const rotated = mat4.rotateY(translated, Math.PI / 4);

// Projection matrices
const proj = projection.perspective({ fov: Math.PI / 3, aspect: 16/9, near: 0.1, far: 100 });
const view = projection.lookAt(vec3.create(0, 0, 5), vec3.create(0, 0, 0), vec3.create(0, 1, 0));
```

### Available Namespaces

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `vec3` | 3D vector operations | `create`, `add`, `sub`, `scale`, `dot`, `cross`, `normalize`, `length`, `distance` |
| `mat4` | 4x4 matrix operations | `identity`, `multiply`, `translate`, `rotateX`, `rotateY`, `rotateZ`, `scale`, `invert` |
| `projection` | Camera and projection matrices | `perspective`, `orthographic`, `lookAt`, `viewportTransform`, `projectVertex`, `buildMVP` |
| `clipping` | Frustum culling and line clipping | `extractFrustumPlanes`, `isPointInFrustum`, `isSphereInFrustum`, `clipLine` |
| `pixelBuffer` | Pixel framebuffer operations | `create`, `clear`, `setPixel`, `getPixel`, `fill`, `blit` |
| `raster` | Rasterization functions | `drawLine`, `drawTriangle`, `fillTriangle`, `scanline` |
| `transform3d` | 3D transform component helpers | `create`, `setPosition`, `setRotation`, `setScale`, `getMatrix` |
| `camera3d` | Camera component helpers | `create`, `setFOV`, `setNearFar`, `getProjection`, `getView` |
| `mesh` | Mesh component helpers | `create`, `setVertices`, `setIndices`, `getBounds` |
| `backends` | Rendering backend management | `createBraille`, `createHalfblock`, `createSextant`, `createSixel`, `createKitty` |

## Subpath Imports

For tree-shakeable imports, use subpath exports to import only the functions you need:

```typescript
// Import specific math functions
import { vec3Add, vec3Cross, vec3Normalize } from '@blecsd/3d/math';

// Import specific backends
import { BrailleBackend, SixelBackend } from '@blecsd/3d/backends';

// Import components
import { Transform3D, Camera3D, Mesh } from '@blecsd/3d/components';

// Import loaders
import { loadObjFile } from '@blecsd/3d/loaders';
```

Available subpath exports:
- `@blecsd/3d/math` - Math utilities and primitives
- `@blecsd/3d/backends` - Rendering backends
- `@blecsd/3d/components` - ECS components
- `@blecsd/3d/loaders` - Model loaders
- `@blecsd/3d/rasterizer` - Rasterization functions
- `@blecsd/3d/systems` - ECS systems
- `@blecsd/3d/widgets` - Viewport widget
- `@blecsd/3d/schemas` - Zod schemas
- `@blecsd/3d/stores` - State stores

## API

### Backends

| Backend | Description |
|---------|-------------|
| `BrailleBackend` | High-density rendering using Braille characters (8 pixels per cell) |
| `HalfblockBackend` | Medium-density rendering using half-block characters |
| `SextantBackend` | 6-pixel per cell rendering using sextant characters |
| `SixelBackend` | True pixel graphics using Sixel protocol |
| `KittyBackend` | True pixel graphics using Kitty graphics protocol |

### Components

- `Transform3D` - 3D position, rotation, scale
- `Camera3D` - Camera projection and view settings
- `Material3D` - Material properties (color, shading)
- `Mesh` - 3D geometry data
- `Viewport3D` - Render target configuration
- `Animation3D` - Animation state and playback

### Math Utilities

- Vector operations (`vec3`, `vec4`)
- Matrix operations (4x4 matrices)
- Projection (perspective, orthographic)
- Clipping (frustum, near/far plane)

### Mesh Loaders

- `loadObjFile(path)` - Load OBJ format 3D models
- Primitive generators: `createCube()`, `createSphere()`, `createPlane()`, `createCylinder()`

### Systems

- Scene graph system (transform hierarchy)
- Projection system (world to screen space)
- Rasterization system (triangle rendering)
- Viewport output system (backend rendering)
- Animation system (keyframe playback)

## Requirements

- blecsd (peer dependency)
- Node.js 18+

## License

MIT
