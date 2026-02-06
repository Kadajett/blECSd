# World API

ECS World creation and management. Wraps bitecs world primitives.

## Quick Start

```typescript
import { createWorld, resetWorld } from 'blecsd';

const world = createWorld();
// ... use world for entities and components ...
resetWorld(world); // Clear everything for new game
```

## Functions

### createWorld

Creates a new ECS world for the game.

```typescript
function createWorld(): World;
```

**Returns:** A new World instance.

```typescript
import { createWorld } from 'blecsd';

const world = createWorld();
```

### resetWorld

Resets an existing world, removing all entities and resetting component data. Useful for level reloading or game restart.

```typescript
function resetWorld(world: World): void;
```

**Parameters:**
- `world` - The world to reset

```typescript
import { createWorld, resetWorld } from 'blecsd';

const world = createWorld();
// ... game runs ...
resetWorld(world); // Clear everything for new game
```

## Usage Example

```typescript
import { createWorld, resetWorld, addEntity, addComponent, Position } from 'blecsd';

// Create a world for each game session
const world = createWorld();

// Populate with entities
const player = addEntity(world);
addComponent(world, player, Position);

// When restarting:
resetWorld(world);
// All entities are gone, component data is cleared
// The world can now be reused for a new session
```
