# Component Validation Example

This document shows how to use the `validateEntity` utility to provide clear error messages when required components are missing.

## Basic Usage

```typescript
import { createWorld, addEntity, validateEntity, Position, Velocity } from 'blecsd';

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
import { validateEntity, Position, Dimensions, Renderable } from 'blecsd';

export function createBox(world: World, entity: Entity, config: BoxConfig) {
  // Validate that required components exist before proceeding
  validateEntity(world, entity, [Position, Dimensions, Renderable], 'createBox');

  // ... rest of widget setup
}
```

## In Systems

```typescript
import { validateEntity, Position, Velocity } from 'blecsd';

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
import { registerComponentName, registerBuiltinComponentNames } from 'blecsd';

// Register all built-in components
registerBuiltinComponentNames();

// Or register custom components individually
import { MyCustomComponent } from './components/myCustom';
registerComponentName(MyCustomComponent, 'MyCustomComponent');
```

## Non-Throwing Validation

Use `isEntityValid` for cases where you want to check without throwing:

```typescript
import { isEntityValid, Position, Velocity } from 'blecsd';

if (!isEntityValid(world, entity, [Position, Velocity])) {
  console.warn(`Entity ${entity} is missing required components, skipping...`);
  continue;
}
```
