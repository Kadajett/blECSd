# Viewport3D Widget

A 3D rendering viewport that combines camera setup, viewport configuration, and mesh management into a composable ECS widget.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createViewport3D, addEntity, createWorld } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const viewport = createViewport3D(world, eid, {
  left: 5,
  top: 2,
  width: 60,
  height: 20,
  fov: Math.PI / 3,
  backend: 'braille',
});

// Add a mesh to the scene
const cubeId = createCubeMesh();
viewport.addMesh(cubeId, { tz: -5 });
viewport.setCameraPosition(0, 2, 5);
```

---

## Configuration

### Viewport3DWidgetConfig

Configuration is validated by `Viewport3DWidgetConfigSchema` from the 3D subsystem.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `left` | `number` | `0` | Left position in terminal cells |
| `top` | `number` | `0` | Top position in terminal cells |
| `width` | `number` | `60` | Width in terminal cells |
| `height` | `number` | `20` | Height in terminal cells |
| `fov` | `number` | `Math.PI / 3` | Camera field of view in radians |
| `near` | `number` | `0.1` | Near clipping plane |
| `far` | `number` | `1000` | Far clipping plane |
| `projectionMode` | `string` | `'perspective'` | Projection mode |
| `backend` | `BackendType` | `'auto'` | Rendering backend |

### BackendType

- `'auto'` - Automatically selects the best backend (defaults to braille)
- `'braille'` - Renders using braille Unicode characters
- Other backend types as supported by the 3D subsystem

---

## Factory Function

### createViewport3D

Creates a Viewport3D widget attached to an existing entity.

```typescript
import { createViewport3D, addEntity } from 'blecsd';

const eid = addEntity(world);
const viewport = createViewport3D(world, eid, {
  left: 5,
  top: 2,
  width: 60,
  height: 20,
  fov: Math.PI / 3,
  backend: 'auto',
});
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to attach the viewport to
- `config?: Viewport3DWidgetConfig` - Widget configuration

**Returns:** `Viewport3DWidget`

This function:
1. Creates a camera entity with the specified FOV, near/far planes, and aspect ratio
2. Configures the viewport component on the given entity
3. Computes pixel dimensions based on the selected rendering backend
4. Sets up position and dimensions for the UI layout system

---

## Viewport3DWidget Interface

### eid

```typescript
readonly eid: Entity
```

The viewport entity ID.

### cameraEid

```typescript
readonly cameraEid: Entity
```

The camera entity ID, created automatically by the factory.

### addMesh

```typescript
addMesh(meshId: number, transform?: Transform3DConfig, material?: Material3DConfig): Entity
```

Adds a mesh to the viewport scene. Creates a new entity with the mesh component, optional transform, and optional material.

```typescript
const cubeId = createCubeMesh();
const meshEid = viewport.addMesh(cubeId, { tz: -5, ry: 0.5 });
```

**Parameters:**
- `meshId: number` - Mesh ID from the mesh store
- `transform?: Transform3DConfig` - Optional transform (position, rotation, scale)
- `material?: Material3DConfig` - Optional material configuration

**Returns:** `Entity` - The created mesh entity ID

**Throws:** Error if the mesh ID is not found in the mesh store.

### removeMesh

```typescript
removeMesh(meshEid: Entity): void
```

Removes a mesh entity from the viewport scene and the ECS world.

### setCameraPosition

```typescript
setCameraPosition(x: number, y: number, z: number): Viewport3DWidget
```

Sets the camera position in world space.

```typescript
viewport.setCameraPosition(0, 2, 10);
```

### setCameraRotation

```typescript
setCameraRotation(rx: number, ry: number, rz: number): Viewport3DWidget
```

Sets the camera rotation in radians.

```typescript
viewport.setCameraRotation(0, Math.PI / 4, 0);
```

### setFov

```typescript
setFov(fov: number): Viewport3DWidget
```

Sets the camera field of view in radians.

### resize

```typescript
resize(width: number, height: number): Viewport3DWidget
```

Resizes the viewport. Updates the pixel dimensions, camera aspect ratio, and UI dimensions.

### show / hide

```typescript
show(): Viewport3DWidget
hide(): Viewport3DWidget
```

Controls visibility.

### destroy

```typescript
destroy(): void
```

Cleans up all entities associated with this viewport: removes all mesh entities, the camera entity, the viewport entity itself, and clears internal stores (framebuffer, mesh tracking).

---

## Utility Functions

### isViewport3DWidget

```typescript
import { isViewport3DWidget } from 'blecsd';

if (isViewport3DWidget(entity)) {
  // Entity is a Viewport3D widget
}
```

**Parameters:**
- `eid: Entity` - Entity ID

**Returns:** `boolean`

---

## Examples

### Basic 3D Scene

<!-- blecsd-doccheck:ignore -->
```typescript
import { createViewport3D, addEntity, createWorld } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const viewport = createViewport3D(world, eid, {
  width: 60,
  height: 20,
  fov: Math.PI / 3,
});

// Add geometry
const cubeId = createCubeMesh();
const cube = viewport.addMesh(cubeId, { tz: -5 });

// Position camera
viewport.setCameraPosition(0, 2, 0);
viewport.setCameraRotation(-0.2, 0, 0);
```

### Animated Camera

```typescript
const viewport = createViewport3D(world, eid, {
  width: 80,
  height: 30,
});

let angle = 0;

function update() {
  angle += 0.02;
  const radius = 10;
  viewport.setCameraPosition(
    Math.sin(angle) * radius,
    3,
    Math.cos(angle) * radius,
  );
  viewport.setCameraRotation(0, -angle, 0);
}
```

### Multiple Meshes with Materials

```typescript
const viewport = createViewport3D(world, eid, {
  width: 60,
  height: 20,
  backend: 'braille',
});

const cubeId = createCubeMesh();
const sphereId = createSphereMesh();

viewport.addMesh(cubeId, { tx: -3, tz: -8 }, { color: 0xff0000 });
viewport.addMesh(sphereId, { tx: 3, tz: -8 }, { color: 0x00ff00 });

viewport.setCameraPosition(0, 5, 0);
```

---

## See Also

- [Image Widget](./image.md) - 2D bitmap rendering
- [Terminal Widget](./terminal.md) - Terminal emulator
