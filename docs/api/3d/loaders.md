# Loaders Module

OBJ file parser and procedural mesh primitives.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/loaders'`

## OBJ Loader

### `loadObjAsMesh(objSource, options?): number`

Parse an OBJ format string and register it as a mesh. Returns the mesh ID.

```typescript
import { readFileSync } from 'fs';

const objSource = readFileSync('model.obj', 'utf-8');
const meshId = three.loadObjAsMesh(objSource, { name: 'my-model' });
```

**Supported OBJ features:**
- `v` - Vertex positions
- `vn` - Vertex normals
- `vt` - Texture coordinates (parsed but not used in rendering)
- `f` - Faces (triangles and quads, automatically triangulated)
- `g` / `o` - Groups and objects (parsed for naming)

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'obj'` | Name for the registered mesh |
| `scale` | `number` | `1.0` | Uniform scale factor |
| `flipYZ` | `boolean` | `false` | Swap Y and Z axes (common for CAD models) |

### Schema: `ObjLoadOptionsSchema`

```typescript
{ name?: string,
  scale?: number,      // default: 1.0, must be positive
  flipYZ?: boolean }   // default: false
```

## Mesh Primitives

Procedurally generated mesh geometry.

### `createCubeMesh(options?): number`

Generate a cube mesh centered at the origin.

```typescript
const cubeId = three.createCubeMesh({ size: 2 });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `number` | `1` | Edge length |

### `createSphereMesh(options?): number`

Generate a UV sphere mesh.

```typescript
const sphereId = three.createSphereMesh({
  radius: 1.5, widthSegments: 24, heightSegments: 12,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `radius` | `number` | `1` | Sphere radius |
| `widthSegments` | `number` | `16` | Horizontal segments |
| `heightSegments` | `number` | `8` | Vertical segments |

### `createPlaneMesh(options?): number`

Generate a flat plane in the XZ plane.

```typescript
const planeId = three.createPlaneMesh({ width: 4, depth: 4 });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `1` | X dimension |
| `depth` | `number` | `1` | Z dimension |
| `widthSegments` | `number` | `1` | Subdivisions in X |
| `depthSegments` | `number` | `1` | Subdivisions in Z |

### `createCylinderMesh(options?): number`

Generate a cylinder along the Y axis.

```typescript
const cylinderId = three.createCylinderMesh({
  radiusTop: 0.5, radiusBottom: 0.5, height: 2, radialSegments: 16,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `radiusTop` | `number` | `1` | Top cap radius |
| `radiusBottom` | `number` | `1` | Bottom cap radius |
| `height` | `number` | `1` | Cylinder height |
| `radialSegments` | `number` | `16` | Around the circumference |
| `heightSegments` | `number` | `1` | Along the height |

### Zod Schemas

- `CubeMeshOptionsSchema`
- `SphereMeshOptionsSchema`
- `PlaneMeshOptionsSchema`
- `CylinderMeshOptionsSchema`
