# ECS API

ECS primitives wrapper module. This is the only file in the codebase that imports directly from bitecs. All other code must import ECS primitives from `'blecsd'` or from `'../core/ecs'` for internal library code.

## Quick Start

```typescript
import { createWorld, addEntity, addComponent, hasComponent, query, Position, Velocity } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);
addComponent(world, entity, Position);
Position.x[entity] = 100;
Position.y[entity] = 50;

const entities = query(world, [Position, Velocity]);
```

## Entity Operations

### addEntity

Creates a new entity in the world.

```typescript
function addEntity(world: World): Entity;
```

```typescript
import { createWorld, addEntity } from 'blecsd';

const world = createWorld();
const player = addEntity(world);
const enemy = addEntity(world);
```

### removeEntity

Removes an entity and all its components from the world.

```typescript
function removeEntity(world: World, eid: Entity): void;
```

### entityExists

Checks if an entity exists in the world.

```typescript
function entityExists(world: World, eid: Entity): boolean;
```

```typescript
import { entityExists, addEntity, removeEntity } from 'blecsd';

console.log(entityExists(world, entity)); // true
removeEntity(world, entity);
console.log(entityExists(world, entity)); // false
```

### getAllEntities

Gets all entity IDs currently in the world.

```typescript
function getAllEntities(world: World): readonly Entity[];
```

## Component Operations

### addComponent

Adds a component to an entity.

```typescript
function addComponent(world: World, eid: Entity, component: ComponentRef): void;
```

```typescript
import { addComponent, Position } from 'blecsd';

addComponent(world, entity, Position);
Position.x[entity] = 100;
Position.y[entity] = 50;
```

### hasComponent

Checks if an entity has a specific component.

```typescript
function hasComponent(world: World, eid: Entity, component: ComponentRef): boolean;
```

### removeComponent

Removes a component from an entity.

```typescript
function removeComponent(world: World, eid: Entity, component: ComponentRef): void;
```

## Query Operations

### query

Queries the world for entities that have all specified components.

```typescript
function query(world: World, components: QueryTerm[]): QueryResult;
```

```typescript
import { query, Position, Velocity } from 'blecsd';

const movingEntities = query(world, [Position, Velocity]);
for (const eid of movingEntities) {
  Position.x[eid] += Velocity.x[eid];
  Position.y[eid] += Velocity.y[eid];
}
```

## Advanced

### registerComponent

Registers a component with the world. Typically called automatically when components are first used.

```typescript
const registerComponent: (world: World, component: ComponentRef) => void;
```

### withStore

Creates a component with a custom backing store.

```typescript
const withStore: (store: Record<string, TypedArray>) => ComponentRef;
```

```typescript
import { withStore } from 'blecsd';

const CustomPosition = withStore({
  x: new Float32Array(10000),
  y: new Float32Array(10000),
});
```

## Re-exports

This module re-exports for convenience:
- `Entity`, `World` types from `core/types`
- `createWorld`, `resetWorld` from `core/world`
- `ComponentRef`, `QueryResult`, `QueryTerm` types from bitecs

## Usage Example

```typescript
import {
  createWorld,
  addEntity,
  addComponent,
  removeComponent,
  hasComponent,
  removeEntity,
  query,
  entityExists,
  getAllEntities,
} from 'blecsd';

const world = createWorld();

// Create entities with components
const player = addEntity(world);
addComponent(world, player, Position);
addComponent(world, player, Velocity);
Position.x[player] = 0;
Velocity.x[player] = 1;

const wall = addEntity(world);
addComponent(world, wall, Position);
Position.x[wall] = 100;

// Query for moving entities
const movers = query(world, [Position, Velocity]);
for (const eid of movers) {
  Position.x[eid] += Velocity.x[eid];
}

// Check components
if (hasComponent(world, player, Velocity)) {
  removeComponent(world, player, Velocity); // Stop moving
}

// Cleanup
removeEntity(world, player);
console.log(entityExists(world, player)); // false
console.log(getAllEntities(world).length); // 1 (wall remains)
```
