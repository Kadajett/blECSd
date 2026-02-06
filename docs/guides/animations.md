# Physics-Based Animations

Modern UIs use physics-based animations for natural, responsive interactions. blECSd provides the same animation primitives used by iOS, Android, and web frameworks, adapted for terminal applications.

## Why Physics in UIs?

Physics-based animations feel more natural than linear tweens:

- **Momentum**: Elements continue moving after user interaction ends
- **Springs**: Elements bounce and settle naturally
- **Friction**: Movement slows down gradually
- **Responsiveness**: Animations can be interrupted and redirected

Think of iOS's bounce scroll, Material Design's ripples, or macOS's rubber-banding. These patterns work in terminal UIs too.

## Velocity Component

The Velocity component enables smooth movement:

<!-- blecsd-doccheck:ignore -->
```typescript
import { setPosition, setVelocity, getVelocity } from 'blecsd';

const panel = addEntity(world);
setPosition(world, panel, 10, 5);
setVelocity(world, panel, 0, 0);  // Initially stationary
```

## Momentum Scrolling

Lists and content areas can scroll with momentum:

```typescript
interface ScrollState {
  velocity: number;
  friction: number;
}

const scrollStates = new Map<number, ScrollState>();

// On scroll wheel or drag
function onScroll(entity: number, delta: number): void {
  const state = scrollStates.get(entity) ?? { velocity: 0, friction: 0.95 };
  state.velocity += delta * 2;  // Add momentum
  scrollStates.set(entity, state);
}

// Animation system
function momentumScrollSystem(world: World, deltaTime: number): World {
  for (const [eid, state] of scrollStates) {
    if (Math.abs(state.velocity) < 0.1) {
      state.velocity = 0;
      continue;
    }

    // Apply velocity
    scrollBy(world, eid, 0, state.velocity * deltaTime);

    // Apply friction
    state.velocity *= state.friction;
  }
  return world;
}
```

## Spring Animations

Springs create bouncy, natural movement:

```typescript
interface Spring {
  target: number;      // Where we want to be
  current: number;     // Where we are
  velocity: number;    // How fast we're moving
  stiffness: number;   // Spring strength (higher = faster)
  damping: number;     // Friction (higher = less bounce)
}

function updateSpring(spring: Spring, deltaTime: number): void {
  // Spring force = -stiffness * displacement
  const displacement = spring.current - spring.target;
  const springForce = -spring.stiffness * displacement;

  // Damping force = -damping * velocity
  const dampingForce = -spring.damping * spring.velocity;

  // Acceleration
  const acceleration = springForce + dampingForce;

  // Update velocity and position
  spring.velocity += acceleration * deltaTime;
  spring.current += spring.velocity * deltaTime;
}

// Usage: animate panel sliding in
const slideSpring: Spring = {
  target: 0,        // Final X position
  current: -40,     // Start off-screen
  velocity: 0,
  stiffness: 200,
  damping: 20,
};

function slideInSystem(world: World, delta: number): World {
  updateSpring(slideSpring, delta / 1000);
  setPosition(world, sidePanel, Math.round(slideSpring.current), 0);
  return world;
}
```

## Easing Functions

For simpler animations, use easing:

```typescript
const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};
```

## Tween System

Animate properties over time:

```typescript
interface Tween {
  entity: number;
  property: 'x' | 'y' | 'opacity';
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: (t: number) => number;
  onComplete?: () => void;
}

const activeTweens: Tween[] = [];

function animate(config: Omit<Tween, 'elapsed'>): void {
  activeTweens.push({ ...config, elapsed: 0 });
}

function tweenSystem(world: World, delta: number): World {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const tween = activeTweens[i];
    tween.elapsed += delta;

    const progress = Math.min(tween.elapsed / tween.duration, 1);
    const easedProgress = tween.easing(progress);
    const value = tween.from + (tween.to - tween.from) * easedProgress;

    // Apply value
    if (tween.property === 'x') {
      const pos = getPosition(world, tween.entity);
      if (pos) setPosition(world, tween.entity, value, pos.y);
    } else if (tween.property === 'y') {
      const pos = getPosition(world, tween.entity);
      if (pos) setPosition(world, tween.entity, pos.x, value);
    }

    // Remove completed tweens
    if (progress >= 1) {
      tween.onComplete?.();
      activeTweens.splice(i, 1);
    }
  }
  return world;
}

// Usage
animate({
  entity: modal,
  property: 'y',
  from: -20,
  to: 5,
  duration: 300,
  easing: easings.easeOut,
  onComplete: () => focus(world, modal),
});
```

## Drag with Inertia

Draggable elements that coast after release:

```typescript
interface DragState {
  dragging: boolean;
  lastX: number;
  lastY: number;
  velocityX: number;
  velocityY: number;
}

const dragStates = new Map<number, DragState>();

function onDragStart(entity: number, x: number, y: number): void {
  dragStates.set(entity, {
    dragging: true,
    lastX: x,
    lastY: y,
    velocityX: 0,
    velocityY: 0,
  });
}

function onDragMove(entity: number, x: number, y: number): void {
  const state = dragStates.get(entity);
  if (!state?.dragging) return;

  // Track velocity
  state.velocityX = x - state.lastX;
  state.velocityY = y - state.lastY;
  state.lastX = x;
  state.lastY = y;

  // Move element
  setPosition(world, entity, x, y);
}

function onDragEnd(entity: number): void {
  const state = dragStates.get(entity);
  if (state) state.dragging = false;
  // Velocity is preserved for inertia system
}

function inertiaSystem(world: World, delta: number): World {
  for (const [eid, state] of dragStates) {
    if (state.dragging) continue;

    const friction = 0.9;
    if (Math.abs(state.velocityX) < 0.1 && Math.abs(state.velocityY) < 0.1) {
      continue;
    }

    const pos = getPosition(world, eid);
    if (pos) {
      setPosition(world, eid, pos.x + state.velocityX, pos.y + state.velocityY);
    }

    state.velocityX *= friction;
    state.velocityY *= friction;
  }
  return world;
}
```

## Bounce/Rubber-Band Effect

When scrolling past bounds:

```typescript
function rubberBandSystem(world: World): World {
  for (const eid of scrollableQuery(world)) {
    const scroll = getScrollPosition(world, eid);
    const bounds = getScrollBounds(world, eid);

    if (!scroll || !bounds) continue;

    // Check if over-scrolled
    if (scroll.y < 0) {
      // Rubber-band back with spring
      const spring = getOrCreateSpring(eid, 'scrollY');
      spring.target = 0;
      spring.current = scroll.y;
      updateSpring(spring, deltaTime);
      scrollTo(world, eid, scroll.x, spring.current);
    } else if (scroll.y > bounds.maxY) {
      const spring = getOrCreateSpring(eid, 'scrollY');
      spring.target = bounds.maxY;
      spring.current = scroll.y;
      updateSpring(spring, deltaTime);
      scrollTo(world, eid, scroll.x, spring.current);
    }
  }
  return world;
}
```

## Particle Effects for Notifications

Subtle particles for visual feedback:

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  char: string;
}

const particles: Particle[] = [];

function spawnNotificationParticles(x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2,
      life: 1,
      char: ['*', '+', '.'][Math.floor(Math.random() * 3)],
    });
  }
}

function particleSystem(delta: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 0.1 * delta;  // Gravity
    p.life -= delta * 0.002;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}
```

## Animation Phase in Scheduler

Register animation systems in the ANIMATION phase:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();

scheduler.add(LoopPhase.ANIMATION, momentumScrollSystem);
scheduler.add(LoopPhase.ANIMATION, springSystem);
scheduler.add(LoopPhase.ANIMATION, tweenSystem);
scheduler.add(LoopPhase.ANIMATION, inertiaSystem);
scheduler.add(LoopPhase.ANIMATION, rubberBandSystem);

scheduler.start(world);
```

## Performance Considerations

- **Skip when settled**: Don't process entities with zero velocity
- **Threshold snapping**: Snap to target when very close (< 0.1)
- **Batch updates**: Update all positions, then mark dirty once
- **Integer rounding**: Terminal cells are integers; round at render time only

## See Also

- [Core Concepts](../getting-started/concepts.md) - Scheduler phases
- [Game Development](./game-development.md) - More animation patterns for games
- [Velocity Component](../api/velocity.md) - Component reference
