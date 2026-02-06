# Camera Components API

ECS component for viewport control, target following, and coordinate conversion.

## Overview

The Camera component manages a 2D viewport into a larger world space. It supports smooth target following with dead zones, world-space bounds clamping, and coordinate conversion between world and screen space.

## Import

```typescript
import {
  Camera,
  setCamera,
  getCamera,
  hasCamera,
  removeCamera,
  setCameraTarget,
  getCameraTarget,
  isFollowingTarget,
  setCameraDeadZone,
  setCameraBounds,
  clearCameraBounds,
  isCameraBounded,
  setCameraPosition,
  getCameraPosition,
  moveCameraBy,
  centerCameraOn,
  worldToScreen,
  screenToWorld,
  isInView,
  isAreaInView,
  updateCameraFollow,
} from 'blecsd';
```

## Component Data Layout

```typescript
const Camera = {
  x:            Float32Array,  // Camera X position (world coordinates)
  y:            Float32Array,  // Camera Y position (world coordinates)
  width:        Uint16Array,   // Viewport width in cells
  height:       Uint16Array,   // Viewport height in cells
  followTarget: Uint32Array,   // Entity to follow (0 = none)
  smoothing:    Float32Array,  // Follow smoothing (0 = instant, 1 = max)
  deadZoneX:    Float32Array,  // Dead zone X size
  deadZoneY:    Float32Array,  // Dead zone Y size
  bounded:      Uint8Array,    // 0 = unbounded, 1 = bounded
  minX:         Float32Array,  // Min X bound
  maxX:         Float32Array,  // Max X bound
  minY:         Float32Array,  // Min Y bound
  maxY:         Float32Array,  // Max Y bound
};
```

## Core Functions

### setCamera

Creates or updates a camera on an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setCamera } from 'blecsd';

setCamera(world, cameraEntity, {
  width: 80,
  height: 24,
  x: 0,
  y: 0,
  smoothing: 0.1,
});
```

**Options:**
- `x`, `y` - Camera position (default: `0`)
- `width` - Viewport width (default: `80`)
- `height` - Viewport height (default: `24`)
- `followTarget` - Entity to follow (default: none)
- `smoothing` - Follow smoothing 0-1 (default: `0`)
- `deadZoneX`, `deadZoneY` - Dead zone size (default: `0`)

### getCamera

Returns a snapshot of camera state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getCamera } from 'blecsd';

const cam = getCamera(world, cameraEntity);
if (cam) {
  console.log(`Camera at (${cam.x}, ${cam.y}), viewport ${cam.width}x${cam.height}`);
}
```

**Returns:** `CameraData | undefined`

### hasCamera / removeCamera

<!-- blecsd-doccheck:ignore -->
```typescript
import { hasCamera, removeCamera } from 'blecsd';

if (hasCamera(world, entity)) {
  removeCamera(world, entity);
}
```

## Target Following

### setCameraTarget

Sets the entity for the camera to follow with optional smoothing.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setCameraTarget } from 'blecsd';

setCameraTarget(world, camera, player, 0.1); // Follow with smooth interpolation
setCameraTarget(world, camera, 0);            // Stop following
```

### getCameraTarget / isFollowingTarget

<!-- blecsd-doccheck:ignore -->
```typescript
import { getCameraTarget, isFollowingTarget } from 'blecsd';

const target = getCameraTarget(world, camera); // Entity ID or 0
const following = isFollowingTarget(world, camera); // boolean
```

### setCameraDeadZone

Sets the dead zone. The camera only moves when the target exits this zone around the viewport center.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setCameraDeadZone } from 'blecsd';

setCameraDeadZone(world, camera, 10, 5);
```

### updateCameraFollow

Updates camera position to follow its target. Call each frame.

<!-- blecsd-doccheck:ignore -->
```typescript
import { updateCameraFollow } from 'blecsd';

updateCameraFollow(world, camera, deltaTime);
```

## Bounds

### setCameraBounds / clearCameraBounds / isCameraBounded

Restrict the camera to a rectangular area.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setCameraBounds, clearCameraBounds, isCameraBounded } from 'blecsd';

setCameraBounds(world, camera, {
  minX: 0, maxX: 200,
  minY: 0, maxY: 100,
});

if (isCameraBounded(world, camera)) {
  clearCameraBounds(world, camera);
}
```

## Position

### setCameraPosition / getCameraPosition / moveCameraBy / centerCameraOn

<!-- blecsd-doccheck:ignore -->
```typescript
import { setCameraPosition, getCameraPosition, moveCameraBy, centerCameraOn } from 'blecsd';

setCameraPosition(world, camera, 50, 25);
moveCameraBy(world, camera, 10, 0);     // Relative move
centerCameraOn(world, camera, 100, 50); // Center on a world position

const pos = getCameraPosition(world, camera);
// pos: { x: number, y: number } | undefined
```

## Coordinate Conversion

### worldToScreen / screenToWorld

<!-- blecsd-doccheck:ignore -->
```typescript
import { worldToScreen, screenToWorld } from 'blecsd';

const screen = worldToScreen(world, camera, worldX, worldY);
if (screen) {
  // Draw at screen.x, screen.y
}

const worldPos = screenToWorld(world, camera, mouseX, mouseY);
if (worldPos) {
  // Handle click at worldPos.x, worldPos.y
}
```

### isInView / isAreaInView

<!-- blecsd-doccheck:ignore -->
```typescript
import { isInView, isAreaInView } from 'blecsd';

if (isInView(world, camera, enemy.x, enemy.y)) {
  // Point is visible
}

if (isAreaInView(world, camera, rect.x, rect.y, rect.w, rect.h)) {
  // Rectangle overlaps viewport
}
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { setCamera, setCameraTarget, setCameraBounds, updateCameraFollow } from 'blecsd';

const world = createWorld();
const camera = addEntity(world);
const player = addEntity(world);

// Create viewport
setCamera(world, camera, { width: 80, height: 24 });

// Follow player with smoothing and bounds
setCameraTarget(world, camera, player, 0.15);
setCameraBounds(world, camera, { minX: 0, maxX: 200, minY: 0, maxY: 100 });

// Each frame
updateCameraFollow(world, camera, deltaTime);
```

## Types

### CameraData

```typescript
interface CameraData {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly followTarget: number;
  readonly smoothing: number;
  readonly deadZoneX: number;
  readonly deadZoneY: number;
  readonly bounded: boolean;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
```

### CameraBounds

```typescript
interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}
```
