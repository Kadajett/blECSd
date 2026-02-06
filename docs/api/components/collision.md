# Collision Components API

ECS component for entity collision detection with box and circle colliders, layer/mask filtering, and overlap testing.

## Overview

The Collision module provides a `Collider` component that supports axis-aligned bounding box (AABB) and circle shapes. Colliders use bitmask-based layer/mask filtering to control which entities can collide. Trigger colliders generate events without physics response.

## Import

```typescript
import {
  Collider,
  ColliderType,
  setCollider,
  getCollider,
  hasCollider,
  removeCollider,
  setCollisionLayer,
  setCollisionMask,
  setTrigger,
  isTrigger,
  canLayersCollide,
  getColliderAABB,
  testAABBOverlap,
  testCircleOverlap,
  testCircleAABBOverlap,
  testCollision,
  createCollisionPair,
  collisionPairKey,
  DEFAULT_LAYER,
  DEFAULT_MASK,
} from 'blecsd';
```

## Component Data Layout

```typescript
const Collider = {
  type:      Uint8Array,    // 0=BOX, 1=CIRCLE
  width:     Float32Array,  // Width (or diameter for circles)
  height:    Float32Array,  // Height (ignored for circles)
  offsetX:   Float32Array,  // X offset from entity position
  offsetY:   Float32Array,  // Y offset from entity position
  layer:     Uint16Array,   // Collision layer bitmask
  mask:      Uint16Array,   // Layers to collide with
  isTrigger: Uint8Array,    // 1=trigger, 0=solid
};
```

## Constants

### ColliderType

```typescript
import { ColliderType } from 'blecsd';

ColliderType.BOX    // 0
ColliderType.CIRCLE // 1
```

### DEFAULT_LAYER / DEFAULT_MASK

```typescript
import { DEFAULT_LAYER, DEFAULT_MASK } from 'blecsd';

DEFAULT_LAYER // 1
DEFAULT_MASK  // 0xFFFF (collide with all layers)
```

## Core Functions

### setCollider

Creates or updates a collider on an entity.

```typescript
import { setCollider, ColliderType } from 'blecsd';

// Box collider with layer filtering
setCollider(world, player, {
  type: ColliderType.BOX,
  width: 1,
  height: 2,
  layer: 0b0001,
  mask: 0b0110,
});

// Circle trigger zone
setCollider(world, checkpoint, {
  type: ColliderType.CIRCLE,
  width: 5, // diameter
  isTrigger: true,
});
```

**Options:**
- `type` - `ColliderType.BOX` or `ColliderType.CIRCLE` (default: `BOX`)
- `width` - Width or diameter (default: `1`)
- `height` - Height, ignored for circles (default: `1`)
- `offsetX`, `offsetY` - Offset from position (default: `0`)
- `layer` - Collision layer bitmask (default: `1`)
- `mask` - Collision mask (default: `0xFFFF`)
- `isTrigger` - Trigger only (default: `false`)

### getCollider

Returns collider data for an entity.

```typescript
import { getCollider } from 'blecsd';

const col = getCollider(world, entity);
if (col) {
  console.log(`${col.width}x${col.height}, trigger: ${col.isTrigger}`);
}
```

**Returns:** `ColliderData | undefined`

### hasCollider / removeCollider

```typescript
import { hasCollider, removeCollider } from 'blecsd';

if (hasCollider(world, entity)) {
  removeCollider(world, entity);
}
```

## Layer and Mask

### setCollisionLayer / setCollisionMask

```typescript
import { setCollisionLayer, setCollisionMask } from 'blecsd';

setCollisionLayer(world, entity, 0b0010); // Entity is on layer 2
setCollisionMask(world, entity, 0b0101);  // Collide with layers 1 and 3
```

### canLayersCollide

Checks if two entities can collide based on their layer/mask configuration. Both entities must include the other's layer in their mask.

```typescript
import { canLayersCollide } from 'blecsd';

const canCollide = canLayersCollide(
  1, 6,  // entity A: layer 1, mask 6
  2, 1,  // entity B: layer 2, mask 1
); // true
```

### setTrigger / isTrigger

```typescript
import { setTrigger, isTrigger } from 'blecsd';

setTrigger(world, entity, true);
if (isTrigger(world, entity)) {
  // Event only, no physics response
}
```

## Collision Testing

### getColliderAABB

Gets the axis-aligned bounding box for an entity's collider at a given position.

```typescript
import { getColliderAABB } from 'blecsd';

const bounds = getColliderAABB(entity, posX, posY);
// bounds: { minX, minY, maxX, maxY }
```

### testAABBOverlap / testCircleOverlap / testCircleAABBOverlap

Low-level overlap tests.

```typescript
import { testAABBOverlap, testCircleOverlap, testCircleAABBOverlap } from 'blecsd';

testAABBOverlap(boundsA, boundsB);              // AABB vs AABB
testCircleOverlap(x1, y1, r1, x2, y2, r2);     // Circle vs Circle
testCircleAABBOverlap(cx, cy, radius, aabb);    // Circle vs AABB
```

### testCollision

Tests if two entities' colliders overlap. Handles all shape combinations.

```typescript
import { testCollision } from 'blecsd';

const colliding = testCollision(
  entityA, posAX, posAY,
  entityB, posBX, posBY,
);
```

## Collision Pairs

### createCollisionPair / collisionPairKey

Utility for tracking collision pairs with consistent ordering.

```typescript
import { createCollisionPair, collisionPairKey } from 'blecsd';

const pair = createCollisionPair(entityA, entityB, false);
const key = collisionPairKey(pair); // "1:5" (lower ID first)
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setCollider, ColliderType, testCollision, canLayersCollide } from 'blecsd';

const world = createWorld();
const player = addEntity(world);
const enemy = addEntity(world);

setCollider(world, player, {
  type: ColliderType.BOX,
  width: 1, height: 1,
  layer: 0b0001, mask: 0b0010,
});

setCollider(world, enemy, {
  type: ColliderType.CIRCLE,
  width: 2,
  layer: 0b0010, mask: 0b0001,
});

// Check collision
if (testCollision(player, 10, 5, enemy, 11, 5)) {
  console.log('Hit!');
}
```

## Types

### ColliderData

```typescript
interface ColliderData {
  readonly type: ColliderType;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly layer: number;
  readonly mask: number;
  readonly isTrigger: boolean;
}
```

### AABB

```typescript
interface AABB {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
```

### CollisionPair

```typescript
interface CollisionPair {
  readonly entityA: Entity;
  readonly entityB: Entity;
  readonly isTrigger: boolean;
}
```
