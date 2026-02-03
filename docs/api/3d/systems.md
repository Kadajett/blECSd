# Systems Module

ECS systems that form the 3D rendering pipeline. Each system is a pure function `(world: World) => World`.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/systems'`

## Pipeline Overview

```
animation3DSystem         mouseInteraction3DSystem
(rotate/orbit entities)   (apply mouse to camera)
         |                        |
         v                        v
    sceneGraphSystem
    (compute world matrices)
              |
              v
       projectionSystem
       (3D -> 2D screen coords)
              |
              v
         rasterSystem
         (draw to PixelFramebuffer)
              |
              v
      viewportOutputSystem
      (encode for terminal)
```

## animation3DSystem

Applies continuous rotation and orbital movement to entities with both `Animation3D` and `Transform3D` components.

**Phase:** ANIMATION (before sceneGraphSystem)

**Behavior:**
- Reads `getDeltaTime()` from the scheduler
- Adds `rotateSpeed * dt` to Transform3D rotation
- If orbit enabled: updates orbit angle and computes XZ circle position
- Marks Transform3D as dirty

```typescript
three.animation3DSystem(world);
```

## mouseInteraction3DSystem

Processes accumulated mouse drag and scroll input to rotate and zoom cameras.

**Phase:** ANIMATION (before sceneGraphSystem)

**Behavior:**
- Reads accumulated input from `mouseInputStore`
- For each viewport with input, looks up the camera entity
- Applies drag to yaw/pitch (with gimbal lock prevention)
- Applies scroll to distance (clamped by zoomMin/zoomMax)
- Converts spherical coordinates to Cartesian camera position
- Sets camera rotation to look at origin
- Clears mouseInputStore after processing

```typescript
// Feed input before running the system
three.feedMouseDrag(viewportEid, deltaX, deltaY);
three.feedMouseScroll(viewportEid, scrollTicks);

// Run system
three.mouseInteraction3DSystem(world);
```

## sceneGraphSystem

Computes world matrices from Transform3D local transforms and parent hierarchy.

**Phase:** UPDATE

**Behavior:**
- Queries all entities with Transform3D where `dirty === 1`
- Builds local matrix from translation, rotation (Euler XYZ), and scale
- If entity has a parent, multiplies by parent's world matrix
- Stores result in `Transform3D.worldMatrix`
- Clears dirty flag

```typescript
three.sceneGraphSystem(world);
```

## projectionSystem

Projects mesh vertices from 3D world space to 2D screen coordinates.

**Phase:** RENDER

**Side-car stores:**
- `projectionStore: Map<Entity, ViewportProjection>` - Per-viewport projection results

**Behavior:**
- For each Viewport3D entity, builds view matrix from its camera
- Builds projection matrix from Camera3D parameters
- For each entity with Mesh + Transform3D in the scene:
  - Transforms vertices by world matrix
  - Projects through view-projection matrix
  - Performs perspective divide
  - Maps NDC to screen pixel coordinates
- Stores projected vertices in `projectionStore`

```typescript
three.projectionSystem(world);

// Access projected data
const projection = three.projectionStore.get(viewportEid);
```

### ProjectedVertex

```typescript
interface ProjectedVertex {
  readonly sx: number;  // Screen X
  readonly sy: number;  // Screen Y
  readonly depth: number;
}
```

### ViewportProjection

```typescript
interface ViewportProjection {
  readonly meshes: Map<Entity, MeshProjection>;
}
```

## rasterSystem

Draws wireframe edges and/or filled triangles to a PixelFramebuffer.

**Phase:** RENDER (after projectionSystem)

**Side-car stores:**
- `framebufferStore: Map<Entity, PixelFramebuffer>` - Per-viewport pixel buffer

**Behavior:**
- For each viewport, creates (or reuses) a PixelFramebuffer
- Reads projected vertices from projectionStore
- Based on Material3D.renderMode:
  - `wireframe`: Draws edges using Bresenham (or AA) line drawing
  - `filled`: Fills triangles using scanline rasterizer with depth buffer
  - `both`: Fills triangles then overlays wireframe
- Applies backface culling if enabled
- Applies flat shading if enabled

```typescript
three.rasterSystem(world);

// Access framebuffer
const fb = three.framebufferStore.get(viewportEid);
```

## viewportOutputSystem

Encodes the PixelFramebuffer using the appropriate backend for terminal output.

**Phase:** RENDER (after rasterSystem)

**Side-car stores:**
- `outputStore: Map<Entity, ViewportOutput>` - Per-viewport encoded output
- `backendStore: Map<Entity, RendererBackend>` - Cached backend instances

**Behavior:**
- For each viewport, gets the framebuffer from framebufferStore
- Resolves (or creates/caches) the backend from Viewport3D.backendType
- Calls `backend.encode(framebuffer, screenX, screenY)`
- Stores the encoded result in outputStore

```typescript
three.viewportOutputSystem(world);

// Read output for rendering
const output = three.outputStore.get(viewportEid);
if (output?.encoded.cells) {
  for (const cell of output.encoded.cells) {
    // Write cell.char at (cell.x, cell.y) with color cell.fg
  }
}
if (output?.encoded.escape) {
  process.stdout.write(output.encoded.escape);
}
```

### ViewportOutput

```typescript
interface ViewportOutput {
  readonly viewportEid: Entity;
  readonly screenX: number;
  readonly screenY: number;
  readonly backendType: BackendType;
  readonly encoded: EncodedOutput;
}
```

## Store Cleanup

Each store provides a clear function for cleanup:

```typescript
three.clearProjectionStore();
three.clearFramebufferStore();
three.clearOutputStore();
three.clearBackendStore();
three.clearMouseInputStore();
```
