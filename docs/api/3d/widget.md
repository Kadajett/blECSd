# Viewport3D Widget

High-level widget factory for 3D rendering. Wraps the component and system layers into a convenient API.

**Import:** `import { createViewport3D } from 'blecsd'`

## createViewport3D

```typescript
function createViewport3D(
  world: World,
  entity: Entity,
  config: Viewport3DWidgetConfig,
): Viewport3DWidget
```

Creates a 3D viewport widget on an entity. Automatically creates a camera entity, sets up components, and provides chainable methods for scene management.

```typescript
import { addEntity, createWorld } from 'bitecs';
import { type Entity, type World, createViewport3D } from 'blecsd';

const world = createWorld() as World;
const vpEntity = addEntity(world) as Entity;

const viewport = createViewport3D(world, vpEntity, {
  left: 2, top: 1, width: 60, height: 20,
  fov: Math.PI / 3,
  backend: 'braille',
});
```

## Configuration

### Viewport3DWidgetConfigSchema

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `left` | `number` | `0` | Terminal column offset |
| `top` | `number` | `0` | Terminal row offset |
| `width` | `number` | `80` | Width in terminal cells |
| `height` | `number` | `24` | Height in terminal cells |
| `fov` | `number` | `PI/3` | Camera field of view (radians, max PI) |
| `near` | `number` | `0.1` | Near clipping plane |
| `far` | `number` | `100` | Far clipping plane |
| `projectionMode` | `string` | `'perspective'` | `'perspective'` or `'orthographic'` |
| `backend` | `string` | `'auto'` | `'auto'`, `'braille'`, `'halfblock'`, `'sixel'`, or `'kitty'` |
| `label` | `string` | - | Optional viewport label |

**Refinement:** `near` must be less than `far`.

## Viewport3DWidget Interface

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `entity` | `Entity` | The viewport entity ID |
| `cameraEntity` | `Entity` | The auto-created camera entity ID |

### Methods

All methods return the widget for chaining unless otherwise noted.

#### `addMesh(meshId, transform?, material?): Entity`

Add a mesh to the scene. Returns the new mesh entity ID.

```typescript
const cubeId = three.createCubeMesh({ size: 1 });
const meshEid = viewport.addMesh(cubeId,
  { tz: -5 },
  { renderMode: 'wireframe', wireColor: 0x00FF88 },
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `meshId` | `number` | Registered mesh ID |
| `transform` | `Transform3DConfig` | Optional position/rotation/scale |
| `material` | `Material3DConfig` | Optional appearance |

#### `removeMesh(meshEid): Viewport3DWidget`

Remove a mesh entity from the scene.

```typescript
viewport.removeMesh(meshEid);
```

#### `setCameraPosition(x, y, z): Viewport3DWidget`

Set the camera position.

```typescript
viewport.setCameraPosition(0, 2, 10);
```

#### `setCameraRotation(rx, ry, rz): Viewport3DWidget`

Set the camera rotation in Euler angles (radians).

```typescript
viewport.setCameraRotation(-0.3, Math.PI / 4, 0);
```

#### `setFov(fov): Viewport3DWidget`

Update the camera field of view.

```typescript
viewport.setFov(Math.PI / 4);
```

#### `resize(width, height): Viewport3DWidget`

Resize the viewport. Recomputes pixel dimensions based on the backend's cell size.

```typescript
viewport.resize(40, 12);
```

#### `show(): Viewport3DWidget`

Make the viewport visible.

#### `hide(): Viewport3DWidget`

Hide the viewport.

#### `destroy(): void`

Remove all entities and clean up stores. Call when the viewport is no longer needed.

```typescript
viewport.destroy();
```

## Full Example

```typescript
import { addEntity, createWorld } from 'bitecs';
import { type Entity, type World, three, createViewport3D } from 'blecsd';

const world = createWorld() as World;
const vpEntity = addEntity(world) as Entity;

const viewport = createViewport3D(world, vpEntity, {
  left: 2, top: 1, width: 70, height: 24,
  fov: Math.PI / 3,
  backend: 'braille',
});

// Load a mesh
const sphereId = three.createSphereMesh({ radius: 1.5, widthSegments: 24 });
const meshEid = viewport.addMesh(sphereId,
  { tz: -5 },
  { renderMode: 'wireframe', wireColor: 0x00FFAA },
);

// Add rotation animation
three.setAnimation3D(world, meshEid, { rotateSpeed: { y: 0.8 } });

// Position camera
viewport.setCameraPosition(0, 0, 0);

// Frame loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Manually rotate (alternative to animation system)
  three.Transform3D.ry[meshEid] = (three.Transform3D.ry[meshEid] as number) + 0.8 * dt;
  three.Transform3D.dirty[meshEid] = 1;

  // Run pipeline
  three.sceneGraphSystem(world);
  three.projectionSystem(world);
  three.rasterSystem(world);
  three.viewportOutputSystem(world);

  // Get output
  const output = three.outputStore.get(vpEntity);
  if (output?.encoded.cells) {
    let ansi = '';
    for (const cell of output.encoded.cells) {
      ansi += `\x1B[${cell.y + 1};${cell.x + 1}H`;
      if (cell.char !== '\u2800') {
        const r = (cell.fg >> 16) & 0xff;
        const g = (cell.fg >> 8) & 0xff;
        const b = cell.fg & 0xff;
        ansi += `\x1B[38;2;${r};${g};${b}m${cell.char}\x1B[0m`;
      } else {
        ansi += ' ';
      }
    }
    process.stdout.write(ansi);
  }
}, 33);

// Cleanup on exit
process.on('SIGINT', () => {
  viewport.destroy();
  process.exit(0);
});
```

## Widget Registry

The Viewport3D widget is registered in the WidgetRegistry under:
- **Name:** `viewport3d`
- **Aliases:** `3d`, `viewport`
- **Tags:** `display`, `3d`, `rendering`
