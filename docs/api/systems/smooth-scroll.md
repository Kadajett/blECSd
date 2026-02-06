# Smooth Scroll System API

Physics-based smooth scrolling system with momentum, friction, and overscroll bounce.

## Overview

The smooth scroll system handles:
- Velocity-based momentum scrolling
- Configurable friction for natural deceleration
- Spring-based overscroll bounce (iOS-style)
- Smooth animated scroll-to-target
- Immediate scroll position setting
- User scroll tracking (drag start/end)
- Per-entity scroll state management

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createSmoothScrollSystem,
  getScrollState,
  applyScrollImpulse,
  LoopPhase,
} from 'blecsd';

// Initialize scroll state for an entity
const state = getScrollState(entity, contentWidth, contentHeight, 80, 24);

// Apply scroll impulse (e.g., from mouse wheel)
applyScrollImpulse(entity, 0, -3);

// Create and register the system
const scrollSystem = createSmoothScrollSystem({ friction: 0.92 });
scheduler.registerSystem(LoopPhase.ANIMATION, scrollSystem);
```

## Types

### ScrollPhysicsConfig

```typescript
interface ScrollPhysicsConfig {
  /** Friction coefficient (0-1, lower = more momentum, default: 0.92) */
  readonly friction: number;
  /** Minimum velocity before stopping (default: 0.1) */
  readonly minVelocity: number;
  /** Maximum velocity (default: 200) */
  readonly maxVelocity: number;
  /** Velocity multiplier for input (default: 1) */
  readonly sensitivity: number;
  /** Spring stiffness for overscroll bounce (default: 0.3) */
  readonly springStiffness: number;
  /** Spring damping for overscroll bounce (default: 0.8) */
  readonly springDamping: number;
  /** Maximum overscroll distance (default: 50) */
  readonly maxOverscroll: number;
  /** Whether to enable momentum scrolling (default: true) */
  readonly enableMomentum: boolean;
  /** Whether to enable overscroll bounce (default: true) */
  readonly enableBounce: boolean;
}
```

### ScrollAnimationState

Scroll animation state for a single entity.

```typescript
interface ScrollAnimationState {
  scrollX: number;
  scrollY: number;
  velocityX: number;
  velocityY: number;
  contentWidth: number;
  contentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  isAnimating: boolean;
  isUserScrolling: boolean;
  targetX: number | null;
  targetY: number | null;
}
```

### ScrollEvent

```typescript
interface ScrollEvent {
  readonly eid: Entity;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly isMomentum: boolean;
}
```

## Functions

### createSmoothScrollSystem

Creates a smooth scroll system that updates all active scroll animations each frame.

```typescript
function createSmoothScrollSystem(physics?: Partial<ScrollPhysicsConfig>): System
```

**Parameters:**
- `physics` - Optional physics configuration overrides

**Returns:** A `System` function for the ANIMATION phase.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSmoothScrollSystem, LoopPhase } from 'blecsd';

const scrollSystem = createSmoothScrollSystem({
  friction: 0.92,
  enableMomentum: true,
  enableBounce: true,
});

scheduler.registerSystem(LoopPhase.ANIMATION, scrollSystem);
```

### getScrollState

Creates or gets scroll animation state for an entity. Updates content/viewport dimensions on subsequent calls.

```typescript
function getScrollState(
  eid: Entity,
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): ScrollAnimationState
```

### removeScrollState

Removes scroll state for an entity.

```typescript
function removeScrollState(eid: Entity): void
```

### applyScrollImpulse

Applies a scroll impulse (e.g., from mouse wheel or keyboard). Adds to the current velocity and starts animation.

```typescript
function applyScrollImpulse(
  eid: Entity,
  deltaX: number,
  deltaY: number,
  physics?: Partial<ScrollPhysicsConfig>,
): void
```

```typescript
import { applyScrollImpulse } from 'blecsd';

// Mouse wheel scroll
applyScrollImpulse(entity, 0, -3);

// Page down
applyScrollImpulse(entity, 0, 24);
```

### smoothScrollTo

Smoothly scrolls to a target position with animation.

```typescript
function smoothScrollTo(
  eid: Entity,
  targetX: number | null,
  targetY: number | null,
): void
```

```typescript
import { smoothScrollTo } from 'blecsd';

// Scroll to top
smoothScrollTo(entity, null, 0);

// Scroll to specific position
smoothScrollTo(entity, 0, 500);
```

### setScrollImmediate

Sets scroll position immediately without animation.

```typescript
function setScrollImmediate(eid: Entity, x: number, y: number): void
```

### startUserScroll

Marks the start of user scrolling (e.g., mouse drag). Resets velocity.

```typescript
function startUserScroll(eid: Entity): void
```

### endUserScroll

Marks the end of user scrolling, enabling momentum with the given release velocity.

```typescript
function endUserScroll(eid: Entity, velocityX: number, velocityY: number): void
```

### updateScrollPhysics

Updates scroll physics for a single entity. Handles scroll-to-target, velocity, friction, and bounce.

```typescript
function updateScrollPhysics(
  state: ScrollAnimationState,
  dt: number,
  physics?: Partial<ScrollPhysicsConfig>,
): boolean
```

**Returns:** `true` if the scroll position changed.

### isScrolling

Checks if an entity has an active scroll animation.

```typescript
function isScrolling(eid: Entity): boolean
```

### getScrollPosition

Gets the current scroll position of an entity.

```typescript
function getScrollPosition(eid: Entity): { x: number; y: number } | null
```

### clearAllScrollStates

Clears all scroll states. Primarily for testing.

```typescript
function clearAllScrollStates(): void
```

## Usage Example

Complete scrollable content area with momentum:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createSmoothScrollSystem,
  getScrollState,
  applyScrollImpulse,
  smoothScrollTo,
  startUserScroll,
  endUserScroll,
  isScrolling,
  getScrollPosition,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Create scroll system with custom physics
const scrollSystem = createSmoothScrollSystem({
  friction: 0.95,
  enableMomentum: true,
  enableBounce: true,
  springStiffness: 0.3,
  maxOverscroll: 30,
});

scheduler.registerSystem(LoopPhase.ANIMATION, scrollSystem);

// Create a scrollable text area
const textArea = addEntity(world);
const scrollState = getScrollState(textArea, 80, 500, 80, 24);

// Handle mouse wheel
function onMouseWheel(delta: number) {
  applyScrollImpulse(textArea, 0, delta * 3);
}

// Handle drag scrolling
let lastDragY = 0;
function onDragStart(y: number) {
  startUserScroll(textArea);
  lastDragY = y;
}

function onDragMove(y: number) {
  const dy = y - lastDragY;
  scrollState.scrollY -= dy;
  lastDragY = y;
}

function onDragEnd(velocityY: number) {
  endUserScroll(textArea, 0, velocityY);
}

// Scroll to top on Home key
function onHomeKey() {
  smoothScrollTo(textArea, null, 0);
}

// In render loop, use scroll position
const pos = getScrollPosition(textArea);
if (pos) {
  // Render content offset by pos.x, pos.y
}
```
