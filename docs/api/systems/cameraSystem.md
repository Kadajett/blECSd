# Camera System

The camera system updates camera positions to follow target entities. It supports smooth following with configurable smoothing and dead zones.

## Import

```typescript
import {
  cameraSystem,
  createCameraSystem,
  registerCameraSystem,
  queryCameras,
  updateCameras,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCamera, setCameraTarget, setPosition } from 'blecsd/components';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerCameraSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register the camera system
registerCameraSystem(scheduler);

// Create a player
const player = addEntity(world);
setPosition(world, player, 40, 12);

// Create camera that follows the player
const camera = addEntity(world);
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.1,
});
setCameraTarget(world, camera, player);

// Camera will smoothly follow player
```

## Recommended Phase

Register in the **UPDATE** phase, after movement and collision:

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { cameraSystem } from 'blecsd/systems';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, cameraSystem, 20);
// Priority 20 ensures it runs after movement (0) and collision (10)
```

## System Behavior

Each frame, the camera system:

1. Reads delta time from the scheduler
2. Queries all entities with Camera component
3. For each camera with a follow target:
   - Gets the target's position
   - Calculates the ideal camera position
   - Applies dead zone (if configured)
   - Smoothly interpolates to the target position
   - Updates the camera's Position component

## Functions

### System Registration

```typescript
import { createWorld } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { cameraSystem, createCameraSystem, registerCameraSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register with scheduler (convenience function)
registerCameraSystem(scheduler);
// Default priority: 20 (after movement and collision)

// Or create and register manually
const system = createCameraSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system, 20);

// Or use the system directly
cameraSystem(world);
```

### Query Functions

```typescript
import { createWorld } from 'blecsd/core';
import { queryCameras } from 'blecsd/systems';

const world = createWorld();

// Query all cameras
const cameras = queryCameras(world);
// Returns: number[] (entity IDs)
console.log('camera count:', cameras.length);
```

### Manual Updates

```typescript
import { createWorld } from 'blecsd/core';
import { updateCameras } from 'blecsd/systems';

const world = createWorld();

// Update cameras outside the system
updateCameras(world, 0.016);
```

## Camera Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `viewportWidth` | `number` | Required | Camera viewport width |
| `viewportHeight` | `number` | Required | Camera viewport height |
| `smoothing` | `number` | `1.0` | Smoothing factor (0-1, lower = smoother) |
| `deadZoneX` | `number` | `0` | Horizontal dead zone size |
| `deadZoneY` | `number` | `0` | Vertical dead zone size |
| `followTarget` | `Entity` | `null` | Entity to follow |
| `offsetX` | `number` | `0` | Horizontal offset from target |
| `offsetY` | `number` | `0` | Vertical offset from target |

## Smoothing

The smoothing factor controls how quickly the camera catches up to its target:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCamera } from 'blecsd/components';

const world = createWorld();
const camera = addEntity(world);

// Instant following (no smoothing)
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 1.0,
});

// Smooth following
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.1, // Takes ~10 frames to catch up
});

// Very smooth (cinematic)
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.02, // Slow, smooth pan
});
```

## Dead Zone

Dead zones prevent camera movement until the target moves past a threshold:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCamera } from 'blecsd/components';

const world = createWorld();
const camera = addEntity(world);

// Camera with dead zone
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  deadZoneX: 10, // Target can move 10 units before camera follows horizontally
  deadZoneY: 5,  // Target can move 5 units before camera follows vertically
});
```

## Example: Side-Scroller Camera

```typescript
import { setCamera, setCameraTarget, setPosition, setVelocity } from 'blecsd/components';
import { createWorld, addEntity, createScheduler } from 'blecsd/core';
import { registerCameraSystem, registerMovementSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

registerMovementSystem(scheduler);
registerCameraSystem(scheduler);

// Create player
const player = addEntity(world);
setPosition(world, player, 10, 12);
setVelocity(world, player, { x: 0, y: 0, maxSpeed: 10, friction: 0.9 });

// Create camera
const camera = addEntity(world);
setCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.15,
  deadZoneX: 15,  // Player can move freely in center
  deadZoneY: 5,
  offsetX: 20,    // Camera looks ahead of player
});
setCameraTarget(world, camera, player);

// Camera stays centered on player with some look-ahead
```

## Example: Multi-Camera Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCamera, setCameraTarget } from 'blecsd/components';

const world = createWorld();
const player = addEntity(world);

// Main game camera
const mainCamera = addEntity(world);
setCamera(world, mainCamera, {
  viewportWidth: 60,
  viewportHeight: 20,
  smoothing: 0.1,
});
setCameraTarget(world, mainCamera, player);

// Minimap camera (no smoothing, larger view)
const minimapCamera = addEntity(world);
setCamera(world, minimapCamera, {
  viewportWidth: 200,
  viewportHeight: 100,
  smoothing: 1.0, // Instant
});
setCameraTarget(world, minimapCamera, player);

// Use cameras for different viewports — your render function reads camera position
// via getPosition(world, mainCamera) and getPosition(world, minimapCamera)
console.log('main camera entity:', mainCamera);
console.log('minimap camera entity:', minimapCamera);
```

## Example: Camera Shake

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getPosition, setPosition, setCamera } from 'blecsd/components';

const world = createWorld();
const camera = addEntity(world);
setCamera(world, camera, { viewportWidth: 80, viewportHeight: 24 });
setPosition(world, camera, 40, 12);

let shakeTime = 0;
let shakeMagnitude = 0;

const startCameraShake = (duration: number, magnitude: number): void => {
  shakeTime = duration;
  shakeMagnitude = magnitude;
};

const updateCameraShake = (cam: number, dt: number): void => {
  if (shakeTime > 0) {
    shakeTime -= dt;
    const pos = getPosition(world, cam);

    // Add random offset
    const offsetX = (Math.random() - 0.5) * shakeMagnitude;
    const offsetY = (Math.random() - 0.5) * shakeMagnitude;

    setPosition(world, cam, pos.x + offsetX, pos.y + offsetY);

    // Decay magnitude
    shakeMagnitude *= 0.9;
  }
};

// Trigger camera shake on impact
startCameraShake(0.5, 3);
updateCameraShake(camera, 0.016);
```

## Example: Camera Bounds

```typescript
import { createWorld, addEntity, createScheduler, LoopPhase } from 'blecsd/core';
import { getCamera, getPosition, setPosition, setCamera } from 'blecsd/components';
import { queryCameras } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

const LEVEL_WIDTH = 200;
const LEVEL_HEIGHT = 100;

// Constrain camera to level bounds
const clampCameraToLevel = (cam: number): void => {
  const pos = getPosition(world, cam);
  const camConfig = getCamera(world, cam);

  const halfWidth = camConfig.viewportWidth / 2;
  const halfHeight = camConfig.viewportHeight / 2;

  const clampedX = Math.max(halfWidth, Math.min(pos.x, LEVEL_WIDTH - halfWidth));
  const clampedY = Math.max(halfHeight, Math.min(pos.y, LEVEL_HEIGHT - halfHeight));

  setPosition(world, cam, clampedX, clampedY);
};

// Register a camera for testing
const cam = addEntity(world);
setCamera(world, cam, { viewportWidth: 80, viewportHeight: 24 });
setPosition(world, cam, 100, 50);

// Run after camera system (priority 25 > camera system priority 20)
scheduler.registerSystem(LoopPhase.UPDATE, (w) => {
  const cameras = queryCameras(w);
  for (const c of cameras) {
    clampCameraToLevel(c);
  }
  return w; // Return world is required by the system signature
}, 25);
```

## Performance Considerations

- Camera updates are lightweight (just position lerping)
- Multiple cameras are supported efficiently
- Dead zone calculations add minimal overhead
- Consider caching viewport transforms for rendering

## Related

- [Movement System](./movementSystem.md) - Entity movement
- [Render System](./render.md) - Rendering with camera offset
- [Layout System](./layout.md) - UI layout
