# Components Module

SoA (Structure-of-Arrays) ECS components for 3D scene management. Each component stores data in flat typed arrays indexed by entity ID.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/components'`

## Transform3D

Position, rotation, and scale of a 3D entity. Also stores the computed 16-float world matrix and a dirty flag.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `tx, ty, tz` | `Float32Array` | Translation |
| `rx, ry, rz` | `Float32Array` | Rotation (Euler angles, radians) |
| `sx, sy, sz` | `Float32Array` | Scale (defaults to 1.0) |
| `worldMatrix` | `Float32Array(cap*16)` | Computed world matrix |
| `dirty` | `Uint8Array` | 1 = needs recomputation |

### Functions

#### `setTransform3D(world, eid, config): Entity`
Set transform properties. Validates via `Transform3DConfigSchema`.

```typescript
three.setTransform3D(world, eid, { tx: 0, ty: 1, tz: -5, ry: Math.PI / 4 });
```

#### `getTransform3D(world, eid): Transform3DData | undefined`
Read transform data.

#### `setTranslation(world, eid, x, y, z): Entity`
Set position only. Marks dirty.

#### `setRotation(world, eid, rx, ry, rz): Entity`
Set rotation only. Marks dirty.

#### `setScale(world, eid, sx, sy, sz): Entity`
Set scale only. Marks dirty.

#### `getWorldMatrix(eid): Float32Array`
Get the 16-element world matrix subarray view.

#### `markDirty(eid): void`
Mark transform as needing recomputation.

#### `isDirty(eid): boolean`
Check if transform needs recomputation.

### Schema: `Transform3DConfigSchema`

```typescript
{ tx?: number, ty?: number, tz?: number,    // defaults: 0
  rx?: number, ry?: number, rz?: number,    // defaults: 0
  sx?: number, sy?: number, sz?: number }   // defaults: 1
```

## Camera3D

Projection parameters and cached projection/view matrices.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `fov` | `Float32Array` | Field of view (radians) |
| `near, far` | `Float32Array` | Clipping planes |
| `aspect` | `Float32Array` | Aspect ratio |
| `projectionMode` | `Uint8Array` | 0=perspective, 1=orthographic |
| `projMatrix` | `Float32Array(cap*16)` | Cached projection matrix |
| `viewMatrix` | `Float32Array(cap*16)` | Cached view matrix |
| `dirty` | `Uint8Array` | 1 = needs recomputation |

### Functions

#### `setCamera3D(world, eid, config): Entity`

```typescript
three.setCamera3D(world, eid, { fov: Math.PI / 3, near: 0.1, far: 100 });
```

#### `getCamera3D(world, eid): Camera3DData | undefined`

#### `getProjMatrix(eid): Float32Array`
Get the 16-element cached projection matrix.

#### `getViewMatrix(eid): Float32Array`
Get the 16-element cached view matrix.

### Schema: `Camera3DConfigSchema`

```typescript
{ fov?: number,              // default: PI/3, range: (0, PI]
  near?: number,             // default: 0.1
  far?: number,              // default: 100
  aspect?: number,           // default: 16/9
  projectionMode?: 'perspective' | 'orthographic' }  // default: 'perspective'
// Refinement: near < far
```

## Material3D

Rendering appearance: colors, render mode, backface culling, shading.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `wireColor` | `Uint32Array` | Wireframe color (24-bit RGB) |
| `fillColor` | `Uint32Array` | Fill color (24-bit RGB) |
| `renderMode` | `Uint8Array` | 0=wireframe, 1=filled, 2=both |
| `backfaceCull` | `Uint8Array` | 0/1 |
| `flatShading` | `Uint8Array` | 0/1 |
| `antiAlias` | `Uint8Array` | 0/1 |

### Functions

#### `setMaterial3D(world, eid, config): Entity`

```typescript
three.setMaterial3D(world, eid, {
  renderMode: 'wireframe', wireColor: 0x00FF88,
});
```

#### `getMaterial3D(world, eid): Material3DData | undefined`

### Schema: `Material3DConfigSchema`

```typescript
{ wireColor?: number,        // default: 0xFFFFFF, range: [0, 0xFFFFFF]
  fillColor?: number,        // default: 0x808080
  renderMode?: 'wireframe' | 'filled' | 'both',  // default: 'wireframe'
  backfaceCull?: boolean,    // default: true
  flatShading?: boolean,     // default: false
  antiAlias?: boolean }      // default: false
```

## Mesh

Links an entity to mesh geometry data stored in the meshStore side-car.

### Functions

#### `setMesh(world, eid, meshId): Entity`
Assign a registered mesh to an entity.

#### `getMesh(world, eid): number | undefined`
Get the mesh ID assigned to an entity.

#### `registerMesh(meshData): number`
Register mesh data and get a mesh ID.

#### `unregisterMesh(meshId): void`
Remove mesh data.

#### `getMeshData(meshId): MeshData | undefined`
Get the raw mesh data (vertices, faces, normals).

#### `createMeshFromArrays(name, vertices, faces, normals?): number`
Create and register a mesh from vertex/face arrays with automatic triangulation.

```typescript
const meshId = three.createMeshFromArrays('cube',
  [{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, /* ... */],
  [[0, 1, 2, 3], [4, 5, 6, 7], /* ... */],
);
```

### MeshData

```typescript
interface MeshData {
  readonly name: string;
  readonly vertices: Float32Array;   // Flat: [x0, y0, z0, x1, y1, z1, ...]
  readonly faces: Uint32Array;       // Flat: [i0, i1, i2, i3, i4, i5, ...]
  readonly normals?: Float32Array;   // Per-vertex normals
  readonly vertexCount: number;
  readonly faceCount: number;
}
```

## Viewport3D

Defines a rectangular screen region for 3D rendering, linking to a camera and backend.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `left, top` | `Uint16Array` | Screen position (terminal cells) |
| `width, height` | `Uint16Array` | Size (terminal cells) |
| `cameraEntity` | `Uint32Array` | Camera entity to render from |
| `backendType` | `Uint8Array` | 0=auto, 1=braille, 2=halfblock, 3=sixel, 4=kitty |
| `pixelWidth, pixelHeight` | `Uint16Array` | Computed pixel dimensions |

### Functions

#### `setViewport3D(world, eid, config): Entity`

```typescript
three.setViewport3D(world, eid, {
  left: 5, top: 2, width: 60, height: 20,
  cameraEntity: cameraEid,
});
```

#### `getViewport3D(world, eid): Viewport3DData | undefined`

### Schema: `Viewport3DConfigSchema`

```typescript
{ left?: number,             // default: 0
  top?: number,              // default: 0
  width?: number,            // default: 80
  height?: number,           // default: 24
  cameraEntity: number,      // required
  backendType?: 'auto' | 'braille' | 'halfblock' | 'sixel' | 'kitty' }
```

## Animation3D

Continuous rotation and orbital movement parameters.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `rotateSpeedX/Y/Z` | `Float32Array` | Radians per second |
| `orbitCenterX/Y/Z` | `Float32Array` | Orbit center point |
| `orbitSpeed` | `Float32Array` | Orbit radians per second |
| `orbitRadius` | `Float32Array` | Distance from orbit center |
| `orbitAngle` | `Float32Array` | Current orbit angle |
| `orbitEnabled` | `Uint8Array` | 0/1 |

### Functions

#### `setAnimation3D(world, eid, config): Entity`

```typescript
three.setAnimation3D(world, eid, { rotateSpeed: { y: Math.PI } });
```

#### `getAnimation3D(world, eid): Animation3DData | undefined`

### Schema: `Animation3DConfigSchema`

```typescript
{ rotateSpeed?: { x?: number, y?: number, z?: number },  // defaults: 0
  orbitCenter?: [number, number, number],
  orbitSpeed?: number,       // default: 0
  orbitRadius?: number }
```

## MouseInteraction3D

Mouse-based camera rotation and zoom state.

### SoA Fields

| Field | Type | Description |
|-------|------|-------------|
| `rotationSensitivity` | `Float32Array` | Radians per pixel |
| `zoomSensitivity` | `Float32Array` | Units per scroll tick |
| `zoomMin, zoomMax` | `Float32Array` | Zoom distance bounds |
| `invertY` | `Uint8Array` | 0/1 |
| `distance` | `Float32Array` | Current camera distance |
| `yaw, pitch` | `Float32Array` | Current camera angles |

### Functions

#### `enableMouseInteraction(world, eid, config?, initialDistance?): Entity`

```typescript
three.enableMouseInteraction(world, cameraEid, {
  rotationSensitivity: 0.005,
  zoomSensitivity: 1.0,
}, 10);
```

#### `disableMouseInteraction(world, eid): void`

#### `feedMouseDrag(viewportEid, dx, dy): void`
Accumulate mouse drag input for a frame.

#### `feedMouseScroll(viewportEid, delta): void`
Accumulate scroll input for a frame.

#### `clearMouseInputStore(): void`
Clear accumulated input (called automatically by the system).

#### `getMouseInteraction3D(world, eid): MouseInteraction3DData | undefined`

### Schema: `MouseInteraction3DConfigSchema`

```typescript
{ rotationSensitivity?: number,  // default: 0.01
  zoomSensitivity?: number,      // default: 0.5
  zoomMin?: number,              // default: 1
  zoomMax?: number,              // default: 100
  invertY?: boolean }            // default: false
```
