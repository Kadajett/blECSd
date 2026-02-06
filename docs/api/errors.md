# Error Handling

BlECSd provides a comprehensive typed error system designed for both traditional try/catch patterns and functional Result-based error handling. The system uses discriminated unions for type-safe error handling without classes.

## Overview

```typescript
import {
  // Error creation
  createValidationError,
  createEntityError,
  createTerminalError,

  // Error codes
  ValidationErrorCode,
  EntityErrorCode,

  // Type guards
  isValidationError,
  isEntityError,

  // Result type
  ok,
  err,
  isOk,
  unwrapOr,

  // Native interop
  toNativeError,
  fromNativeError,
} from 'blecsd';
```

---

## Error Types

BlECSd errors are plain data objects with a discriminated `kind` field. This follows the library's functional programming principles (no classes).

### BlECSdError Union

```typescript
type BlECSdError =
  | ValidationError   // Input/config validation failures
  | TerminalError     // Terminal I/O and capability failures
  | SystemError       // ECS system and game loop failures
  | EntityError       // ECS entity management failures
  | ComponentError    // ECS component failures
  | InputError        // Input handling failures
  | RenderError       // Rendering failures
  | ConfigError       // Configuration failures
  | InternalError;    // Library bugs (should never happen)
```

### Error Structure

All errors share a common structure:

```typescript
interface BlECSdErrorBase<K, C> {
  readonly kind: K;        // Discriminant ('validation', 'entity', etc.)
  readonly code: C;        // Specific error code
  readonly message: string; // Human-readable message
  readonly timestamp: number; // When the error occurred
  readonly cause?: Error;  // Original error (if wrapping)
  readonly context?: ErrorContext; // Additional debug info
}

interface ErrorContext {
  readonly entityId?: number;
  readonly componentName?: string;
  readonly systemName?: string;
  readonly filePath?: string;
  readonly functionName?: string;
  readonly data?: Record<string, unknown>;
  readonly zodIssues?: ZodIssue[]; // For validation errors
}
```

---

## Error Codes

Each error kind has specific error codes for programmatic handling.

### ValidationErrorCode

```typescript
import { ValidationErrorCode } from 'blecsd';

ValidationErrorCode.INVALID_INPUT          // Generic validation failure
ValidationErrorCode.INVALID_HEX_COLOR      // Invalid hex color format
ValidationErrorCode.INVALID_DIMENSION      // Invalid dimension value
ValidationErrorCode.SCHEMA_VALIDATION_FAILED // Zod schema failed
ValidationErrorCode.REQUIRED_FIELD_MISSING // Required field missing
ValidationErrorCode.VALUE_OUT_OF_RANGE     // Value out of range
```

### EntityErrorCode

```typescript
import { EntityErrorCode } from 'blecsd';

EntityErrorCode.NOT_FOUND           // Entity not found
EntityErrorCode.ALREADY_EXISTS      // Entity already exists
EntityErrorCode.INVALID_ID          // Invalid entity ID
EntityErrorCode.MISSING_COMPONENT   // Missing required component
EntityErrorCode.HIERARCHY_ERROR     // Parent/child error
```

### ComponentErrorCode

```typescript
import { ComponentErrorCode } from 'blecsd';

ComponentErrorCode.NOT_FOUND             // Component not on entity
ComponentErrorCode.ALREADY_EXISTS        // Component already exists
ComponentErrorCode.INVALID_DATA          // Invalid component data
ComponentErrorCode.STORE_NOT_INITIALIZED // Store not ready
```

### SystemErrorCode

```typescript
import { SystemErrorCode } from 'blecsd';

SystemErrorCode.LOOP_ALREADY_RUNNING    // Game loop running
SystemErrorCode.LOOP_NOT_RUNNING        // Game loop not running
SystemErrorCode.SYSTEM_EXECUTION_FAILED // System threw error
SystemErrorCode.PHASE_NOT_FOUND         // Unknown phase
```

### TerminalErrorCode

```typescript
import { TerminalErrorCode } from 'blecsd';

TerminalErrorCode.NOT_INITIALIZED        // Terminal not ready
TerminalErrorCode.TERMINFO_NOT_FOUND     // Missing terminfo
TerminalErrorCode.CAPABILITY_NOT_SUPPORTED // Feature unavailable
TerminalErrorCode.WRITE_FAILED           // Output failed
```

### InputErrorCode

```typescript
import { InputErrorCode } from 'blecsd';

InputErrorCode.INVALID_KEY_SEQUENCE   // Bad key input
InputErrorCode.INVALID_MOUSE_EVENT    // Bad mouse input
InputErrorCode.BUFFER_OVERFLOW        // Too many events queued
```

### RenderErrorCode

```typescript
import { RenderErrorCode } from 'blecsd';

RenderErrorCode.BUFFER_NOT_INITIALIZED // Screen buffer not ready
RenderErrorCode.INVALID_COORDINATES    // Out of bounds
RenderErrorCode.CYCLE_TIMEOUT          // Render took too long
```

### ConfigErrorCode

```typescript
import { ConfigErrorCode } from 'blecsd';

ConfigErrorCode.INVALID_GAME_CONFIG   // Bad game config
ConfigErrorCode.INVALID_WIDGET_CONFIG // Bad widget config
ConfigErrorCode.MISSING_REQUIRED      // Missing required option
```

---

## Creating Errors

Use factory functions to create errors:

### createValidationError

```typescript
import { createValidationError, ValidationErrorCode } from 'blecsd';

const error = createValidationError(
  ValidationErrorCode.INVALID_HEX_COLOR,
  'Color must be a valid hex string like #ff0000',
  {
    context: {
      data: { input: 'not-a-color' },
      functionName: 'parseColor',
    },
  }
);
```

### createEntityError

```typescript
import { createEntityError, EntityErrorCode } from 'blecsd';

const error = createEntityError(
  EntityErrorCode.NOT_FOUND,
  'Entity 42 does not exist',
  {
    context: {
      entityId: 42,
      functionName: 'getPosition',
    },
  }
);
```

### createComponentError

```typescript
import { createComponentError, ComponentErrorCode } from 'blecsd';

const error = createComponentError(
  ComponentErrorCode.MISSING_COMPONENT,
  'Entity 10 does not have Position component',
  {
    context: {
      entityId: 10,
      componentName: 'Position',
    },
  }
);
```

### All Factory Functions

```typescript
createValidationError(code, message, options?)
createTerminalError(code, message, options?)
createSystemError(code, message, options?)
createEntityError(code, message, options?)
createComponentError(code, message, options?)
createInputError(code, message, options?)
createRenderError(code, message, options?)
createConfigError(code, message, options?)
createInternalError(code, message, options?)
```

---

## Type Guards

Use type guards to narrow error types:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  isValidationError,
  isEntityError,
  isComponentError,
  isSystemError,
  isTerminalError,
  isInputError,
  isRenderError,
  isConfigError,
  isInternalError,
  isBlECSdError,
  isErrorKind,
} from 'blecsd';

function handleError(error: BlECSdError) {
  if (isValidationError(error)) {
    // error is ValidationError
    console.log('Validation failed:', error.context?.zodIssues);
  } else if (isEntityError(error)) {
    // error is EntityError
    console.log('Entity error:', error.context?.entityId);
  }
}

// Check by kind string
if (isErrorKind(error, 'validation')) {
  // error.kind === 'validation'
}
```

### Additional Guards

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  hasContext,
  hasCause,
  hasZodIssues,
  hasErrorCode,
  hasBlECSdErrorShape,
} from 'blecsd';

if (hasContext(error)) {
  console.log(error.context.entityId);
}

if (hasZodIssues(error)) {
  error.context.zodIssues.forEach(issue => {
    console.log(issue.path, issue.message);
  });
}
```

---

## Native Error Interop

Convert between BlECSd errors and native JavaScript Errors:

### toNativeError

Convert a BlECSd error to a throwable Error:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createValidationError, ValidationErrorCode, toNativeError } from 'blecsd';

const blError = createValidationError(
  ValidationErrorCode.INVALID_INPUT,
  'Invalid input provided'
);

// Convert to native Error for throw/catch
throw toNativeError(blError);
```

### fromNativeError

Extract BlECSd error data from a caught native Error:

```typescript
import { toNativeError, fromNativeError, isValidationError } from 'blecsd';

try {
  throw toNativeError(blError);
} catch (e) {
  const extracted = fromNativeError(e);
  if (extracted && isValidationError(extracted)) {
    console.log('Validation error:', extracted.code);
  }
}
```

### wrapError

Wrap any error as a BlECSd error:

```typescript
import { wrapError } from 'blecsd';

try {
  JSON.parse('invalid json');
} catch (e) {
  const wrapped = wrapError(e, 'config', 'CONFIG_ERROR');
  // wrapped is a ConfigError with the original error as cause
}
```

---

## Result Type

For functional error handling without exceptions, use the Result type (inspired by Rust):

### Creating Results

```typescript
import { ok, err, Result } from 'blecsd';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

const result = divide(10, 2);
// result: { ok: true, value: 5 }

const failed = divide(10, 0);
// failed: { ok: false, error: 'Division by zero' }
```

### Checking Results

<!-- blecsd-doccheck:ignore -->
```typescript
import { isOk, isErr } from 'blecsd';

if (isOk(result)) {
  console.log('Value:', result.value);
}

if (isErr(result)) {
  console.log('Error:', result.error);
}
```

### Unwrapping Values

<!-- blecsd-doccheck:ignore -->
```typescript
import { unwrap, unwrapOr, unwrapOrElse } from 'blecsd';

// Throws if Err
const value = unwrap(result);

// Returns default if Err
const safeValue = unwrapOr(result, 0);

// Computes default from error if Err
const computed = unwrapOrElse(result, (error) => {
  console.error(error);
  return -1;
});
```

### Transforming Results

```typescript
import { map, mapError, flatMap, ok, err, Result } from 'blecsd';

// Map over Ok value
const doubled = map(ok(5), x => x * 2);
// doubled: { ok: true, value: 10 }

// Map over Err value
const mapped = mapError(err('oops'), e => new Error(e));
// mapped: { ok: false, error: Error('oops') }

// Chain Result-returning functions
function sqrt(x: number): Result<number, string> {
  return x >= 0 ? ok(Math.sqrt(x)) : err('negative');
}

const chained = flatMap(ok(16), sqrt);
// chained: { ok: true, value: 4 }
```

---

## Practical Examples

### Validating Widget Config

```typescript
import {
  createValidationError,
  ValidationErrorCode,
  Result,
  ok,
  err,
} from 'blecsd';

interface BoxConfig {
  width: number;
  height: number;
}

function validateBoxConfig(config: unknown): Result<BoxConfig> {
  if (typeof config !== 'object' || config === null) {
    return err(createValidationError(
      ValidationErrorCode.INVALID_INPUT,
      'Config must be an object'
    ));
  }

  const { width, height } = config as Record<string, unknown>;

  if (typeof width !== 'number' || width <= 0) {
    return err(createValidationError(
      ValidationErrorCode.VALUE_OUT_OF_RANGE,
      'width must be a positive number',
      { context: { data: { width } } }
    ));
  }

  if (typeof height !== 'number' || height <= 0) {
    return err(createValidationError(
      ValidationErrorCode.VALUE_OUT_OF_RANGE,
      'height must be a positive number',
      { context: { data: { height } } }
    ));
  }

  return ok({ width, height });
}
```

### Handling Entity Operations

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createEntityError,
  EntityErrorCode,
  toNativeError,
  isEntityError,
} from 'blecsd';

function getEntityPosition(world: World, eid: number) {
  if (!entityExists(world, eid)) {
    throw toNativeError(createEntityError(
      EntityErrorCode.NOT_FOUND,
      `Entity ${eid} does not exist`,
      { context: { entityId: eid } }
    ));
  }

  if (!hasPosition(world, eid)) {
    throw toNativeError(createEntityError(
      EntityErrorCode.MISSING_COMPONENT,
      `Entity ${eid} has no Position component`,
      { context: { entityId: eid, componentName: 'Position' } }
    ));
  }

  return getPosition(world, eid);
}

// Usage
try {
  const pos = getEntityPosition(world, 999);
} catch (e) {
  const error = fromNativeError(e);
  if (error && isEntityError(error)) {
    switch (error.code) {
      case EntityErrorCode.NOT_FOUND:
        console.log('Entity missing:', error.context?.entityId);
        break;
      case EntityErrorCode.MISSING_COMPONENT:
        console.log('Component missing:', error.context?.componentName);
        break;
    }
  }
}
```

### Game Loop Error Handling

```typescript
import {
  createGame,
  createSystemError,
  SystemErrorCode,
  isSystemError,
} from 'blecsd';

const game = createGame({ width: 80, height: 24 });

game.onUpdate((world, delta) => {
  try {
    // Game logic that might fail
    updateEntities(world, delta);
  } catch (e) {
    const error = fromNativeError(e);
    if (error && isSystemError(error)) {
      // Handle gracefully, maybe pause the game
      game.stop();
      showErrorDialog(error.message);
    } else {
      // Re-throw unknown errors
      throw e;
    }
  }
});
```

---

## Best Practices

### 1. Use Specific Error Codes

```typescript
// Good: Specific error code
createValidationError(
  ValidationErrorCode.INVALID_HEX_COLOR,
  'Invalid color format'
);

// Avoid: Generic error code
createValidationError(
  ValidationErrorCode.INVALID_INPUT,
  'Invalid color format'
);
```

### 2. Include Context

```typescript
// Good: Rich context for debugging
createEntityError(
  EntityErrorCode.MISSING_COMPONENT,
  'Position component required for movement',
  {
    context: {
      entityId: eid,
      componentName: 'Position',
      functionName: 'moveEntity',
      data: { dx, dy },
    },
  }
);
```

### 3. Use Result for Recoverable Operations

```typescript
// Use Result when caller should handle failure
function findEntity(name: string): Result<Entity> {
  const entity = entities.find(e => e.name === name);
  return entity ? ok(entity) : err(createEntityError(...));
}

// Use throw for programmer errors
function requireEntity(name: string): Entity {
  const entity = entities.find(e => e.name === name);
  if (!entity) {
    throw toNativeError(createInternalError(...));
  }
  return entity;
}
```

### 4. Chain Result Operations

<!-- blecsd-doccheck:ignore -->
```typescript
import { flatMap, map, unwrapOr } from 'blecsd';

const result = flatMap(
  validateConfig(input),
  config => flatMap(
    createEntity(world, config),
    entity => map(
      addComponents(world, entity),
      () => entity
    )
  )
);

const entity = unwrapOr(result, null);
```

---

## See Also

- [Game API](./game/index.md) - High-level game creation
- [Components](./components/index.md) - ECS components
- [Systems](./systems/index.md) - ECS systems
