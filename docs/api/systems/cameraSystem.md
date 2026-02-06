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
} from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerCameraSystem,
  attachCamera,
  setCameraFollow,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register the camera system
registerCameraSystem(scheduler);

// Create a player
const player = addEntity(world);
setPosition(world, player, 40, 12);

// Create camera that follows the player
const camera = addEntity(world);
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.1,
});
setCameraFollow(world, camera, player);

// Camera will smoothly follow player
```

## Recommended Phase

Register in the **UPDATE** phase, after movement and collision:

```typescript
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
// Register with scheduler (convenience function)
registerCameraSystem(scheduler, priority?);
// Default priority: 20 (after movement and collision)

// Or create and register manually
const system = createCameraSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system, 20);

// Or use the system directly
cameraSystem(world);
```

### Query Functions

```typescript
// Query all cameras
const cameras = queryCameras(world);
// Returns: number[] (entity IDs)
```

### Manual Updates

```typescript
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
// Instant following (no smoothing)
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 1.0,
});

// Smooth following
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.1, // Takes ~10 frames to catch up
});

// Very smooth (cinematic)
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.02, // Slow, smooth pan
});
```

## Dead Zone

Dead zones prevent camera movement until the target moves past a threshold:

```typescript
// Camera with dead zone
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  deadZoneX: 10, // Target can move 10 units before camera follows horizontally
  deadZoneY: 5,  // Target can move 5 units before camera follows vertically
});
```

## Example: Side-Scroller Camera

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScheduler,
  registerCameraSystem,
  registerMovementSystem,
  attachCamera,
  setCameraFollow,
} from 'blecsd';

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
attachCamera(world, camera, {
  viewportWidth: 80,
  viewportHeight: 24,
  smoothing: 0.15,
  deadZoneX: 15,  // Player can move freely in center
  deadZoneY: 5,
  offsetX: 20,    // Camera looks ahead of player
});
setCameraFollow(world, camera, player);

// Camera stays centered on player with some look-ahead
```

## Example: Multi-Camera Setup

```typescript
// Main game camera
const mainCamera = addEntity(world);
attachCamera(world, mainCamera, {
  viewportWidth: 60,
  viewportHeight: 20,
  smoothing: 0.1,
});
setCameraFollow(world, mainCamera, player);

// Minimap camera (no smoothing, larger view)
const minimapCamera = addEntity(world);
attachCamera(world, minimapCamera, {
  viewportWidth: 200,
  viewportHeight: 100,
  smoothing: 1.0, // Instant
});
setCameraFollow(world, minimapCamera, player);

// Use cameras for different viewports
function render() {
  // Render main view using mainCamera position
  renderWorld(world, mainCamera, 0, 0, 60, 20);

  // Render minimap using minimapCamera position
  renderWorld(world, minimapCamera, 65, 0, 15, 10);
}
```

## Example: Camera Shake

<!-- blecsd-doccheck:ignore -->
```typescript
import { getPosition, setPosition } from 'blecsd';

let shakeTime = 0;
let shakeMagnitude = 0;

function startCameraShake(duration: number, magnitude: number) {
  shakeTime = duration;
  shakeMagnitude = magnitude;
}

function updateCameraShake(camera: number, dt: number) {
  if (shakeTime <= 0) return;

  shakeTime -= dt;
  const pos = getPosition(world, camera);

  // Add random offset
  const offsetX = (Math.random() - 0.5) * shakeMagnitude;
  const offsetY = (Math.random() - 0.5) * shakeMagnitude;

  setPosition(world, camera, pos.x + offsetX, pos.y + offsetY);

  // Decay magnitude
  shakeMagnitude *= 0.9;
}

// Usage
bus.on('collisionStart', ({ entityA }) => {
  if (isExplosion(entityA)) {
    startCameraShake(0.5, 3);
  }
});
```

## Example: Camera Bounds

```typescript
// Constrain camera to level bounds
function clampCameraToLevel(camera: number) {
  const pos = getPosition(world, camera);
  const camConfig = getCamera(world, camera);

  const halfWidth = camConfig.viewportWidth / 2;
  const halfHeight = camConfig.viewportHeight / 2;

  const clampedX = Math.max(halfWidth, Math.min(pos.x, LEVEL_WIDTH - halfWidth));
  const clampedY = Math.max(halfHeight, Math.min(pos.y, LEVEL_HEIGHT - halfHeight));

  setPosition(world, camera, clampedX, clampedY);
}

// Run after camera system
scheduler.registerSystem(LoopPhase.UPDATE, (world) => {
  const cameras = queryCameras(world);
  for (const cam of cameras) {
    clampCameraToLevel(cam);
  }
  return world;
}, 25); // After camera system (priority 20)
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
