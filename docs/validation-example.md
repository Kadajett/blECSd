# Component Validation Example

This document shows how to use the `validateEntity` utility to provide clear error messages when required components are missing.

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { validateEntity } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// This will throw EntityValidationError with a helpful message
try {
  validateEntity(world, entity, [Position, Velocity], 'movementSystem');
} catch (error) {
  console.error(error.message);
  // "Entity 0 is missing required components for movementSystem: Position, Velocity.
  //  Did you forget to call addComponent(world, 0, Position)?"
}
```

## In Widget Factories

```typescript
import { validateEntity } from 'blecsd/core';
import { Position, Dimensions, Renderable } from 'blecsd/components';

export function createBox(world: World, entity: Entity, config: BoxConfig) {
  // Validate that required components exist before proceeding
  validateEntity(world, entity, [Position, Dimensions, Renderable], 'createBox');

  // ... rest of widget setup
}
```

## In Systems

```typescript
import { validateEntity, query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

export function movementSystem(world: World) {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    // Optional: validate in development/debug mode
    if (process.env.NODE_ENV === 'development') {
      validateEntity(world, eid, [Position, Velocity], 'movementSystem');
    }

    // Process entity...
  }
}
```

## Registering Component Names

For better error messages, register component names during initialization:

```typescript
import { registerComponentName } from 'blecsd/core';
import { registerBuiltinComponentNames, Position } from 'blecsd/components';

// Register all built-in components
registerBuiltinComponentNames();

// Or register individual components with custom names
registerComponentName(Position, 'Position');
```

## Non-Throwing Validation

Use `isEntityValid` for cases where you want to check without throwing:

```typescript
import { createWorld } from 'blecsd/core';
import { isEntityValid, query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const world = createWorld();
const entities = query(world, [Position]);

for (const entity of entities) {
  if (!isEntityValid(world, entity, [Position, Velocity])) {
    console.warn(`Entity ${entity} is missing required components, skipping...`);
    continue;
  }
  // Process entity
}
```
