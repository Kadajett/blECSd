# Standalone Component Examples

This guide demonstrates blECSd's **library-first design** - showing how components, systems, and utilities can be used independently without the built-in update loop or framework scaffolding.

## Library vs Framework

**blECSd is a library, not a framework.**

- ✅ Use any component in your own ECS world
- ✅ Call systems manually when you need them
- ✅ Mix blECSd with other libraries
- ✅ Control the game loop yourself
- ✅ Use only the parts you need

## Example 1: Components Without Any Loop

Components are just data. Use them in your own world with zero framework overhead:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { Position, setPosition, getPosition } from 'blecsd';
import { Velocity, setVelocity } from 'blecsd';
import { Dimensions, setDimensions } from 'blecsd';

// Your world, your control
const world = createWorld();

// Create entities
const player = addEntity(world);
const enemy = addEntity(world);

// Use components directly - no loop needed
setPosition(world, player, 10, 20);
setVelocity(world, player, 2, 0);
setDimensions(world, player, 5, 5);

setPosition(world, enemy, 50, 20);
setDimensions(world, enemy, 3, 3);

// Read component data anytime
const playerPos = getPosition(world, player);
console.log(`Player at (${playerPos.x}, ${playerPos.y})`);

// Directly access component arrays (SoA)
console.log(`Enemy width: ${Dimensions.width[enemy]}`);
```

**Key point:** No update loop, no scheduler, no framework - just data.

## Example 2: Manual System Calls

Systems are pure functions. Call them when you want, not when a framework dictates:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, setVelocity } from 'blecsd';
import { movementSystem } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setPosition(world, eid, 0, 0);
setVelocity(world, eid, 10, 5);

console.log('Before:', Position.x[eid], Position.y[eid]);  // 0, 0

// Call the system manually
movementSystem(world);

console.log('After:', Position.x[eid], Position.y[eid]);   // 10, 5

// Call it again
movementSystem(world);

console.log('Again:', Position.x[eid], Position.y[eid]);   // 20, 10
```

**Key point:** You control when systems run.

## Example 3: Custom Game Loop

Use blECSd components with your own game loop implementation:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, setVelocity, Position, Velocity } from 'blecsd';

const world = createWorld();
const ball = addEntity(world);

setPosition(world, ball, 50, 50);
setVelocity(world, ball, 2, -3);

// Your custom game loop - not blECSd's
let running = true;
let lastTime = Date.now();

function customGameLoop(): void {
  if (!running) return;

  const now = Date.now();
  const deltaMs = now - lastTime;
  lastTime = now;

  // Apply velocity manually (not using movementSystem)
  const vx = Velocity.x[ball] ?? 0;
  const vy = Velocity.y[ball] ?? 0;

  Position.x[ball] = (Position.x[ball] ?? 0) + vx;
  Position.y[ball] = (Position.y[ball] ?? 0) + vy;

  // Bounce off walls
  if (Position.x[ball] <= 0 || Position.x[ball] >= 100) {
    Velocity.x[ball] = -vx;
  }
  if (Position.y[ball] <= 0 || Position.y[ball] >= 50) {
    Velocity.y[ball] = -vy;
  }

  console.log(`Ball: (${Position.x[ball]}, ${Position.y[ball]})`);

  // Schedule next frame with YOUR timer
  setTimeout(customGameLoop, 16);
}

customGameLoop();

// Stop after 2 seconds
setTimeout(() => { running = false; }, 2000);
```

**Key point:** blECSd provides the data structures, you provide the loop.

## Example 4: Mix blECSd with React

Use blECSd's ECS for game state while React handles UI:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, Position } from 'blecsd';
import { useState, useEffect } from 'react';

const world = createWorld();
const player = addEntity(world);
setPosition(world, player, 0, 0);

function GameComponent(): JSX.Element {
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Poll ECS state from React
    const interval = setInterval(() => {
      setPlayerPos({
        x: Position.x[player] ?? 0,
        y: Position.y[player] ?? 0,
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const movePlayer = (dx: number, dy: number) => {
    // Update ECS world from React event
    Position.x[player] = (Position.x[player] ?? 0) + dx;
    Position.y[player] = (Position.y[player] ?? 0) + dy;
  };

  return (
    <div>
      <p>Player: ({playerPos.x}, {playerPos.y})</p>
      <button onClick={() => movePlayer(1, 0)}>Move Right</button>
      <button onClick={() => movePlayer(-1, 0)}>Move Left</button>
    </div>
  );
}
```

**Key point:** blECSd and React coexist - no framework conflicts.

## Example 5: Use Only Input Parsing

Use blECSd's terminal input parsing without any ECS:

```typescript
import { parseKeyEvent, parseMouseEvent } from 'blecsd';

// Read raw input
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);

  if (keyEvent) {
    console.log('Key pressed:', {
      name: keyEvent.name,
      ctrl: keyEvent.ctrl,
      meta: keyEvent.meta,
      shift: keyEvent.shift,
    });

    if (keyEvent.name === 'q' && keyEvent.ctrl) {
      console.log('Ctrl+Q pressed, exiting...');
      process.exit(0);
    }
  }

  const mouseEvent = parseMouseEvent(buffer);
  if (mouseEvent) {
    console.log(`Mouse: (${mouseEvent.x}, ${mouseEvent.y}) ${mouseEvent.action}`);
  }
});
```

**Key point:** Use blECSd utilities without ECS or components.

## Example 6: Use Only Rendering

Use blECSd's terminal rendering without ECS:

```typescript
import { createScreenBuffer, setCell, createCell, renderToTerminal } from 'blecsd';

// Create a screen buffer (no ECS)
const buffer = createScreenBuffer(80, 24);

// Draw directly to buffer
const redCell = createCell('X', 0xff0000, 0x000000);
setCell(buffer, 10, 5, redCell);

const blueCell = createCell('O', 0x0000ff, 0x000000);
setCell(buffer, 20, 10, blueCell);

// Render to terminal
renderToTerminal(buffer);
```

**Key point:** Use rendering without any game logic.

## Example 7: Selective System Usage

Pick and choose which systems you need:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, setDimensions } from 'blecsd';
import { layoutSystem } from 'blecsd';
// NOT importing renderSystem or inputSystem - don't need them

const world = createWorld();
const box1 = addEntity(world);
const box2 = addEntity(world);

// Set up constraints
setPosition(world, box1, 0, 0);
setDimensions(world, box1, 50, 20);

setPosition(world, box2, 10, 5);
setDimensions(world, box2, '80%', '50%');  // Relative to parent

// Only use layout system
layoutSystem(world);

// Check computed layout
console.log('Box2 computed size:', ComputedLayout.width[box2]);

// No rendering, no input - just layout computation
```

**Key point:** Use only the systems you need.

## Example 8: Testing Without Framework

Test components in isolation with zero setup:

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, addEntity } from 'blecsd';
import { setPosition, Position } from 'blecsd';

describe('Position component', () => {
  it('stores x and y coordinates', () => {
    const world = createWorld();
    const eid = addEntity(world);

    setPosition(world, eid, 42, 17);

    expect(Position.x[eid]).toBe(42);
    expect(Position.y[eid]).toBe(17);
  });
});
```

**Key point:** No mock framework, no setup complexity - just data.

## Example 9: Custom Rendering Pipeline

Use blECSd's ECS but render with your own code:

```typescript
import { createWorld, addEntity, query } from 'blecsd';
import { Position, Dimensions, setPosition, setDimensions } from 'blecsd';

const world = createWorld();

// Create entities
for (let i = 0; i < 10; i++) {
  const eid = addEntity(world);
  setPosition(world, eid, i * 10, i * 5);
  setDimensions(world, eid, 8, 3);
}

// Custom render - not using blECSd's renderSystem
function customRender(): void {
  const entities = query(world, [Position, Dimensions]);

  console.clear();
  console.log('=== Custom Renderer ===');

  for (const eid of entities) {
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const w = Dimensions.width[eid] ?? 0;
    const h = Dimensions.height[eid] ?? 0;

    console.log(`Entity ${eid}: pos=(${x},${y}) size=${w}x${h}`);
  }
}

customRender();
```

**Key point:** Use ECS for state, bring your own renderer.

## Example 10: Embed in Existing Application

Add blECSd components to an existing Node.js app:

```typescript
import express from 'express';
import { createWorld, addEntity } from 'blecsd';
import { setPosition, Position } from 'blecsd';

const app = express();
const world = createWorld();

// Game state managed by blECSd
const gameEntities = new Map<string, number>();

app.post('/spawn', (req, res) => {
  const eid = addEntity(world);
  setPosition(world, eid, 0, 0);

  const id = `entity-${eid}`;
  gameEntities.set(id, eid);

  res.json({ id, position: { x: 0, y: 0 } });
});

app.get('/entity/:id', (req, res) => {
  const eid = gameEntities.get(req.params.id);
  if (!eid) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    id: req.params.id,
    position: {
      x: Position.x[eid] ?? 0,
      y: Position.y[eid] ?? 0,
    },
  });
});

app.listen(3000);
```

**Key point:** blECSd fits into existing architectures.

## Example 11: Data Serialization

Use components for state management and serialize to JSON:

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setPosition, Position } from 'blecsd';
import { setVelocity, Velocity } from 'blecsd';

const world = createWorld();
const player = addEntity(world);

setPosition(world, player, 100, 50);
setVelocity(world, player, 5, -2);

// Serialize entity state
function serializeEntity(eid: number): object {
  return {
    position: {
      x: Position.x[eid],
      y: Position.y[eid],
      z: Position.z[eid],
    },
    velocity: {
      x: Velocity.x[eid],
      y: Velocity.y[eid],
    },
  };
}

// Save to file
const savedState = JSON.stringify(serializeEntity(player));
console.log('Saved:', savedState);

// Load from file
function loadEntity(data: any, eid: number): void {
  setPosition(world, eid, data.position.x, data.position.y, data.position.z);
  setVelocity(world, eid, data.velocity.x, data.velocity.y);
}

const loadedData = JSON.parse(savedState);
loadEntity(loadedData, player);
```

**Key point:** Components are data - serialize/deserialize easily.

## Example 12: Gradual Adoption

Start simple, add features incrementally:

```typescript
// Week 1: Just data structures
import { createWorld, addEntity } from 'blecsd';
import { setPosition, Position } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);
setPosition(world, eid, 10, 20);

// Week 2: Add a system
import { movementSystem, setVelocity } from 'blecsd';

setVelocity(world, eid, 1, 0);
movementSystem(world);

// Week 3: Add input parsing
import { parseKeyEvent, queueKeyEvent } from 'blecsd';

process.stdin.on('data', (buf) => {
  const event = parseKeyEvent(buf);
  if (event) queueKeyEvent(event);
});

// Week 4: Add full game loop if needed
import { createScheduler } from 'blecsd';

const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.start();
```

**Key point:** Incremental adoption - no big rewrite required.

## Anti-Patterns to Avoid

### ❌ Don't Rely on Framework Globals

```typescript
// BAD - framework owns the world
import { globalWorld, start } from 'bad-framework';
start();  // Can't control when systems run
```

```typescript
// GOOD - you own the world
import { createWorld } from 'blecsd';
const world = createWorld();  // Your world, your control
```

### ❌ Don't Require the Full Stack

```typescript
// BAD - must use everything
import { FrameworkApp } from 'bad-framework';
const app = new FrameworkApp();  // Forced to use their loop, renderer, etc.
```

```typescript
// GOOD - use only what you need
import { createWorld, setPosition } from 'blecsd';
// Use just components, skip everything else
```

### ❌ Don't Hide System Calls

```typescript
// BAD - systems run implicitly
scene.update();  // What systems ran? In what order? Who knows?
```

```typescript
// GOOD - explicit system calls
import { inputSystem, layoutSystem, renderSystem } from 'blecsd';
inputSystem(world);
layoutSystem(world);
renderSystem(world);
// Clear what runs, when, and why
```

## Benefits of Library-First Design

### 1. **Testability**

No framework setup needed - just test the data:

```typescript
const world = createWorld();
const eid = addEntity(world);
setPosition(world, eid, 5, 10);
expect(Position.x[eid]).toBe(5);
```

### 2. **Flexibility**

Mix with any other library or framework:

- Use blECSd ECS with React UI
- Use blECSd rendering with custom game loop
- Use blECSd input with your own state management

### 3. **Performance**

Pay only for what you use:

- Skip unused systems
- Call systems only when needed
- No framework overhead

### 4. **Learning Curve**

Start simple, grow complex:

- Begin with just components
- Add systems one at a time
- No "all or nothing" commitment

### 5. **Debugging**

Explicit is better than implicit:

- See exactly which systems run
- Control execution order
- No magic behind the scenes

## Summary

blECSd is a **library**, not a framework:

- ✅ Components work standalone (just data)
- ✅ Systems are callable functions (pure, explicit)
- ✅ No required game loop (you control when things run)
- ✅ Mix and match with other libraries
- ✅ Use only what you need
- ✅ Test without mocking the framework
- ✅ Gradual adoption supported

**Core principle:** You control the world, blECSd provides the tools.

## Related Documentation

- [Understanding ECS](../guides/understanding-ecs.md)
- [Testing Guide](../guides/testing.md)
- [Systems API](../api/systems.md)
- [CLAUDE.md - Library-First Design](../../CLAUDE.md#library-first-design-hard-requirement)
