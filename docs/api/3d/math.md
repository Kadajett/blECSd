# Math Module

Pure math functions for the 3D projection pipeline. All operations work on `Float32Array` typed arrays for performance.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/math'`

## Vec3

3D vector operations. Vectors are stored as `Float32Array(3)`.

### Functions

#### `vec3Create(x?, y?, z?): Float32Array`
Create a new Vec3. Defaults to `(0, 0, 0)`.

```typescript
const v = three.vec3Create(1, 2, 3);
```

#### `vec3Add(out, a, b): Float32Array`
Add two vectors: `out = a + b`.

#### `vec3Sub(out, a, b): Float32Array`
Subtract: `out = a - b`.

#### `vec3Scale(out, a, scalar): Float32Array`
Scale: `out = a * scalar`.

#### `vec3Dot(a, b): number`
Dot product.

#### `vec3Cross(out, a, b): Float32Array`
Cross product: `out = a x b`.

#### `vec3Normalize(out, a): Float32Array`
Normalize to unit length.

#### `vec3Length(a): number`
Euclidean length.

#### `vec3Lerp(out, a, b, t): Float32Array`
Linear interpolation between `a` and `b` at parameter `t`.

#### `vec3Negate(out, a): Float32Array`
Negate: `out = -a`.

### Zod Schemas

- `Vec3Schema` - Validates `[number, number, number]` tuple
- `Vec3InputSchema` - Validates `{ x: number, y: number, z: number }` object

## Mat4

4x4 matrix operations. Matrices are stored as `Float32Array(16)` in column-major order.

### Functions

#### `mat4Identity(out): Float32Array`
Set to identity matrix.

#### `mat4Multiply(out, a, b): Float32Array`
Matrix multiplication: `out = a * b`.

#### `mat4Translate(out, mat, v): Float32Array`
Apply translation by Vec3 `v`.

#### `mat4RotateX(out, mat, rad): Float32Array`
Rotate around X axis by `rad` radians.

#### `mat4RotateY(out, mat, rad): Float32Array`
Rotate around Y axis by `rad` radians.

#### `mat4RotateZ(out, mat, rad): Float32Array`
Rotate around Z axis by `rad` radians.

#### `mat4Scale(out, mat, v): Float32Array`
Scale by Vec3 `v`.

#### `mat4Transpose(out, a): Float32Array`
Transpose matrix.

#### `mat4Invert(out, a): Float32Array | null`
Invert matrix. Returns null if singular.

### Zod Schemas

- `Mat4Schema` - Validates 16-element number array

## Projection

Camera projection functions.

### Functions

#### `perspectiveMatrix(out, fov, aspect, near, far): Float32Array`
Build a perspective projection matrix.

```typescript
const proj = three.perspectiveMatrix(
  new Float32Array(16), Math.PI / 3, 16/9, 0.1, 100
);
```

#### `orthographicMatrix(out, left, right, bottom, top, near, far): Float32Array`
Build an orthographic projection matrix.

#### `lookAt(out, eye, target, up): Float32Array`
Build a view matrix looking from `eye` toward `target` with `up` vector.

#### `viewportTransform(x, y, width, height): (ndc: Float32Array) => { sx: number; sy: number }`
Returns a function that transforms NDC coordinates to screen pixel coordinates.

### Zod Schemas

- `PerspectiveConfigSchema` - `{ fov, aspect, near, far }`
- `OrthographicConfigSchema` - `{ left, right, bottom, top, near, far }`
- `ViewportConfigSchema` - `{ x, y, width, height }`
- `EulerAnglesSchema` - `{ x, y, z }` in radians

## Clipping

View frustum clipping utilities.

### Functions

#### `cohenSutherlandClip(x0, y0, x1, y1, xmin, ymin, xmax, ymax): ClippedLine | null`
Cohen-Sutherland line clipping against a rectangular region. Returns clipped endpoints or null if fully outside.

#### `isInsideFrustum(vertex, near, far): boolean`
Check if a projected vertex is within the view frustum.

### Zod Schemas

- `ClipRectSchema` - `{ xmin, ymin, xmax, ymax }`
