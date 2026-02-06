# Animation Components API

ECS components for sprite animation playback, timing, and frame sequencing.

## Overview

The animation module provides two layers:
- **Animation store** - Registers named animation definitions (frame sequences with per-frame durations)
- **Animation component** - Per-entity playback state (current frame, speed, direction, looping)

Animation definitions are stored in a global registry. Each entity references a definition by ID and tracks its own playback position.

## Import

```typescript
import {
  Animation,
  registerAnimation,
  getAnimation,
  getAnimationByName,
  playAnimation,
  playAnimationByName,
  stopAnimation,
  pauseAnimation,
  resumeAnimation,
  getAnimationData,
  isAnimationPlaying,
  hasAnimation,
  setAnimationSpeed,
  setAnimationLoop,
  setAnimationDirection,
  removeAnimation,
  updateAnimationEntity,
  AnimationDirection,
} from 'blecsd';
```

## Animation Store

### registerAnimation

Registers a new animation definition and returns its numeric ID.

```typescript
import { registerAnimation } from 'blecsd';

const walkId = registerAnimation({
  name: 'walk',
  frames: [
    { frameIndex: 0, duration: 0.1 },
    { frameIndex: 1, duration: 0.1 },
    { frameIndex: 2, duration: 0.1 },
    { frameIndex: 3, duration: 0.1 },
  ],
});
```

**Options:**
- `name` - Human-readable name for lookup
- `frames` - Array of `{ frameIndex: number, duration: number }` (duration in seconds)

### getAnimation / getAnimationByName

Retrieve a registered animation by ID or name.

```typescript
import { getAnimation, getAnimationByName } from 'blecsd';

const anim = getAnimation(walkId);
const same = getAnimationByName('walk');
console.log(anim?.totalDuration); // 0.4
```

**Returns:** `AnimationDefinition | undefined`

### unregisterAnimation

Removes a registered animation.

```typescript
import { unregisterAnimation } from 'blecsd';

unregisterAnimation(walkId); // returns true if found
```

## Animation Component

### Component Data Layout

```typescript
const Animation = {
  animationId:      Uint32Array,   // Reference to animation definition
  playing:          Uint8Array,    // 0=stopped, 1=playing
  loop:             Uint8Array,    // 0=play once, 1=loop
  speed:            Float32Array,  // Playback speed multiplier (1.0 = normal)
  elapsed:          Float32Array,  // Time elapsed in current frame (seconds)
  currentFrameIndex: Uint16Array,  // Current position in frames array
  direction:        Int8Array,     // 1=forward, -1=reverse
};
```

### AnimationDirection

```typescript
import { AnimationDirection } from 'blecsd';

AnimationDirection.FORWARD  // 1
AnimationDirection.REVERSE  // -1
```

### playAnimation

Starts an animation on an entity. Adds the Animation component if not present.

```typescript
import { playAnimation } from 'blecsd';

playAnimation(world, entity, walkId, {
  loop: true,       // default: true
  speed: 1.5,       // default: 1.0
  direction: AnimationDirection.FORWARD, // default
  startFrame: 0,    // default: 0 (or last frame if reverse)
});
```

**Returns:** Entity ID for chaining, or `undefined` if animation not found.

### playAnimationByName

Same as `playAnimation` but looks up the animation by name.

```typescript
import { playAnimationByName } from 'blecsd';

playAnimationByName(world, entity, 'walk', { loop: true });
```

### stopAnimation / pauseAnimation / resumeAnimation

```typescript
import { stopAnimation, pauseAnimation, resumeAnimation } from 'blecsd';

pauseAnimation(world, entity);  // Pauses without resetting position
resumeAnimation(world, entity); // Continues from where paused
stopAnimation(world, entity);   // Stops and resets to frame 0
```

### getAnimationData

Returns a snapshot of the entity's animation state.

```typescript
import { getAnimationData } from 'blecsd';

const anim = getAnimationData(world, entity);
if (anim?.playing) {
  console.log(`Frame ${anim.currentFrameIndex}, elapsed: ${anim.elapsed}s`);
}
```

**Returns:** `AnimationData | undefined`

### isAnimationPlaying / hasAnimation

```typescript
import { isAnimationPlaying, hasAnimation } from 'blecsd';

if (hasAnimation(world, entity) && isAnimationPlaying(world, entity)) {
  // Animation is active
}
```

### setAnimationSpeed / setAnimationLoop / setAnimationDirection

Modify playback properties on a running animation.

```typescript
import { setAnimationSpeed, setAnimationLoop, setAnimationDirection, AnimationDirection } from 'blecsd';

setAnimationSpeed(world, entity, 2.0);
setAnimationLoop(world, entity, false);
setAnimationDirection(world, entity, AnimationDirection.REVERSE);
```

### removeAnimation

Removes the Animation component and resets all fields to defaults.

```typescript
import { removeAnimation } from 'blecsd';

removeAnimation(world, entity);
```

### updateAnimationEntity

Advances animation state for a single entity by delta time. Typically called by the animation system, but can be used manually.

```typescript
import { updateAnimationEntity } from 'blecsd';

const completed = updateAnimationEntity(world, entity, 0.016);
if (completed) {
  console.log('Non-looping animation finished');
}
```

**Returns:** `true` if a non-looping animation completed this frame.

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  registerSprite,
  setSprite,
  registerAnimation,
  playAnimation,
  updateAnimationEntity,
} from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Register sprite sheet
const spriteId = registerSprite({
  name: 'hero',
  frames: [
    [[{ char: '@' }]],
    [[{ char: 'O' }]],
    [[{ char: '@' }]],
    [[{ char: 'o' }]],
  ],
});
setSprite(world, entity, spriteId);

// Register and play animation
const idleId = registerAnimation({
  name: 'idle',
  frames: [
    { frameIndex: 0, duration: 0.5 },
    { frameIndex: 1, duration: 0.5 },
    { frameIndex: 2, duration: 0.5 },
    { frameIndex: 3, duration: 0.5 },
  ],
});

playAnimation(world, entity, idleId, { loop: true });

// In your update loop
updateAnimationEntity(world, entity, deltaTime);
```

## Types

### AnimationFrame

```typescript
interface AnimationFrame {
  frameIndex: number;
  duration: number;
}
```

### AnimationDefinition

```typescript
interface AnimationDefinition {
  readonly id: number;
  readonly name: string;
  readonly frames: readonly AnimationFrame[];
  readonly totalDuration: number;
}
```

### AnimationData

```typescript
interface AnimationData {
  readonly animationId: number;
  readonly playing: boolean;
  readonly loop: boolean;
  readonly speed: number;
  readonly elapsed: number;
  readonly currentFrameIndex: number;
  readonly direction: AnimationDirection;
}
```

### PlayAnimationOptions

```typescript
interface PlayAnimationOptions {
  loop?: boolean;
  speed?: number;
  direction?: AnimationDirection;
  startFrame?: number;
}
```
