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
