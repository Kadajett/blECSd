# 3D Rendering Subsystem

The 3D subsystem adds terminal-based 3D rendering to blECSd. It provides a complete pipeline from mesh creation through projection and rasterization to terminal output using multiple rendering backends.

## Quick Start

```typescript
import { addEntity, createWorld } from 'blecsd';
import { type Entity, type World, three, createViewport3D } from 'blecsd';

const world = createWorld() as World;
const vpEntity = addEntity(world) as Entity;

// Create a viewport with a camera
const viewport = createViewport3D(world, vpEntity, {
  left: 2, top: 1, width: 60, height: 20,
  fov: Math.PI / 3,
  backend: 'braille',
});

// Add a mesh
const cubeId = three.createCubeMesh({ size: 1 });
viewport.addMesh(cubeId, { tz: -5 }, { renderMode: 'wireframe', wireColor: 0x00FF88 });

// Each frame: run the pipeline
three.sceneGraphSystem(world);
three.projectionSystem(world);
three.rasterSystem(world);
three.viewportOutputSystem(world);

// Read output
const output = three.outputStore.get(vpEntity);
```

## Architecture

The 3D subsystem has three layers:

```
Math Layer          ECS Layer              Backend Layer
(vec3, mat4,    (Transform3D, Mesh,     (braille, halfblock,
 projection)     Camera3D, Viewport3D)   sextant, sixel, kitty)
      |                |                       |
      +--------+-------+-----------+-----------+
               |                   |
         Systems Layer        PixelFramebuffer
      (sceneGraph, projection,  (intermediate
       raster, viewportOutput)   RGBA buffer)
```

All backends consume the same RGBA pixel framebuffer. The 3D pipeline is identical regardless of backend; only the final encoding step differs.

## System Pipeline

Run these systems in order each frame:

| Phase | System | Purpose |
|-------|--------|---------|
| ANIMATION | `animation3DSystem` | Apply rotation/orbit animations |
| ANIMATION | `mouseInteraction3DSystem` | Apply mouse drag/scroll to camera |
| UPDATE | `sceneGraphSystem` | Compute world matrices from transforms |
| RENDER | `projectionSystem` | Project 3D vertices to 2D screen coordinates |
| RENDER | `rasterSystem` | Draw wireframe/filled geometry to pixel buffer |
| RENDER | `viewportOutputSystem` | Encode pixel buffer for terminal output |

## Backend Comparison

| Backend | Resolution/Cell | Colors | Terminal Support |
|---------|----------------|--------|-----------------|
| Braille | 2x4 dots | 1 fg + 1 bg | Universal (Unicode) |
| Half-block | 1x2 pixels | 2 independent | Universal (Unicode) |
| Sextant | 2x3 dots | 1 fg + 1 bg | Unicode 13+ |
| Sixel | Actual pixels | 256 palette | xterm, mlterm, foot |
| Kitty | Actual pixels | True color + alpha | Kitty terminal |

## Module Reference

- [Math](./math.md) - Vec3, Mat4, projection, clipping
- [Rasterizer](./rasterizer.md) - PixelFramebuffer, line/triangle drawing, shading
- [Backends](./backends.md) - Terminal encoding backends
- [Components](./components.md) - ECS components (Transform3D, Mesh, Camera3D, etc.)
- [Systems](./systems.md) - Pipeline systems
- [Loaders](./loaders.md) - OBJ file parser and mesh primitives
- [Widget](./widget.md) - createViewport3D high-level API
