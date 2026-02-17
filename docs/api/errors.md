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
  TerminalErrorCode,
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
} from 'blecsd/errors';

const validationErr = createValidationError(
  ValidationErrorCode.INVALID_INPUT,
  'Test error'
);
const entityErr = createEntityError(EntityErrorCode.NOT_FOUND, 'Not found');
const termErr = createTerminalError(TerminalErrorCode.NOT_INITIALIZED, 'Terminal not ready');
void validationErr; void entityErr; void termErr;
void isValidationError; void isEntityError; void isOk; void err;
const r = ok(1);
const safeVal = unwrapOr(r, 0);
void safeVal;
const nativeErr = toNativeError(validationErr);
void nativeErr;
const extracted = fromNativeError(nativeErr);
void extracted;
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
import { ValidationErrorCode } from 'blecsd/errors';

void ValidationErrorCode.INVALID_INPUT;          // Generic validation failure
void ValidationErrorCode.INVALID_HEX_COLOR;      // Invalid hex color format
void ValidationErrorCode.INVALID_DIMENSION;      // Invalid dimension value
void ValidationErrorCode.SCHEMA_VALIDATION_FAILED; // Zod schema failed
void ValidationErrorCode.REQUIRED_FIELD_MISSING; // Required field missing
void ValidationErrorCode.VALUE_OUT_OF_RANGE;     // Value out of range
```

### EntityErrorCode

```typescript
import { EntityErrorCode } from 'blecsd/errors';

void EntityErrorCode.NOT_FOUND;           // Entity not found
void EntityErrorCode.ALREADY_EXISTS;      // Entity already exists
void EntityErrorCode.INVALID_ID;          // Invalid entity ID
void EntityErrorCode.MISSING_COMPONENT;   // Missing required component
void EntityErrorCode.HIERARCHY_ERROR;     // Parent/child error
```

### ComponentErrorCode

```typescript
import { ComponentErrorCode } from 'blecsd/errors';

void ComponentErrorCode.NOT_FOUND;             // Component not on entity
void ComponentErrorCode.ALREADY_EXISTS;        // Component already exists
void ComponentErrorCode.INVALID_DATA;          // Invalid component data
void ComponentErrorCode.STORE_NOT_INITIALIZED; // Store not ready
```

### SystemErrorCode

```typescript
import { SystemErrorCode } from 'blecsd/errors';

void SystemErrorCode.LOOP_ALREADY_RUNNING;    // Game loop running
void SystemErrorCode.LOOP_NOT_RUNNING;        // Game loop not running
void SystemErrorCode.SYSTEM_EXECUTION_FAILED; // System threw error
void SystemErrorCode.PHASE_NOT_FOUND;         // Unknown phase
```

### TerminalErrorCode

```typescript
import { TerminalErrorCode } from 'blecsd/errors';

void TerminalErrorCode.NOT_INITIALIZED;        // Terminal not ready
void TerminalErrorCode.TERMINFO_NOT_FOUND;     // Missing terminfo
void TerminalErrorCode.CAPABILITY_NOT_SUPPORTED; // Feature unavailable
void TerminalErrorCode.WRITE_FAILED;           // Output failed
```

### InputErrorCode

```typescript
import { InputErrorCode } from 'blecsd/errors';

void InputErrorCode.INVALID_KEY_SEQUENCE;   // Bad key input
void InputErrorCode.INVALID_MOUSE_EVENT;    // Bad mouse input
void InputErrorCode.BUFFER_OVERFLOW;        // Too many events queued
```

### RenderErrorCode

```typescript
import { RenderErrorCode } from 'blecsd/errors';

void RenderErrorCode.BUFFER_NOT_INITIALIZED; // Screen buffer not ready
void RenderErrorCode.INVALID_COORDINATES;    // Out of bounds
void RenderErrorCode.CYCLE_TIMEOUT;          // Render took too long
```

### ConfigErrorCode

```typescript
import { ConfigErrorCode } from 'blecsd/errors';

void ConfigErrorCode.INVALID_GAME_CONFIG;   // Bad game config
void ConfigErrorCode.INVALID_WIDGET_CONFIG; // Bad widget config
void ConfigErrorCode.MISSING_REQUIRED;      // Missing required option
```

---

## Creating Errors

Use factory functions to create errors:

### createValidationError

```typescript
import { createValidationError, ValidationErrorCode } from 'blecsd/errors';

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
void error;
```

### createEntityError

```typescript
import { createEntityError, EntityErrorCode } from 'blecsd/errors';

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
void error;
```

### createComponentError

```typescript
import { createComponentError, ComponentErrorCode } from 'blecsd/errors';

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
void error;
```

### All Factory Functions

```typescript
import {
  createValidationError,
  createTerminalError,
  createSystemError,
  createEntityError,
  createComponentError,
  createInputError,
  createRenderError,
  createConfigError,
  createInternalError,
  ValidationErrorCode,
  TerminalErrorCode,
  SystemErrorCode,
  EntityErrorCode,
  ComponentErrorCode,
  InputErrorCode,
  RenderErrorCode,
  ConfigErrorCode,
  InternalErrorCode,
} from 'blecsd/errors';

void createValidationError(ValidationErrorCode.INVALID_INPUT, 'msg');
void createTerminalError(TerminalErrorCode.NOT_INITIALIZED, 'msg');
void createSystemError(SystemErrorCode.LOOP_NOT_RUNNING, 'msg');
void createEntityError(EntityErrorCode.NOT_FOUND, 'msg');
void createComponentError(ComponentErrorCode.NOT_FOUND, 'msg');
void createInputError(InputErrorCode.INVALID_KEY_SEQUENCE, 'msg');
void createRenderError(RenderErrorCode.BUFFER_NOT_INITIALIZED, 'msg');
void createConfigError(ConfigErrorCode.MISSING_REQUIRED, 'msg');
void createInternalError(InternalErrorCode.UNEXPECTED_STATE, 'msg');
```

---

## Type Guards

Use type guards to narrow error types:

```typescript
import {
  createValidationError,
  createEntityError,
  ValidationErrorCode,
  EntityErrorCode,
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
} from 'blecsd/errors';

const sampleError = createValidationError(ValidationErrorCode.INVALID_INPUT, 'test');

if (isValidationError(sampleError)) {
  // sampleError is ValidationError
  console.log('Validation failed:', sampleError.context?.zodIssues);
} else if (isEntityError(sampleError)) {
  // sampleError is EntityError
  console.log('Entity error:', sampleError.context?.entityId);
}

// Check by kind string
if (isErrorKind(sampleError, 'validation')) {
  // sampleError.kind === 'validation'
}

void isComponentError; void isSystemError; void isTerminalError;
void isInputError; void isRenderError; void isConfigError; void isInternalError;
void isBlECSdError;
```

### Additional Guards

```typescript
import {
  createValidationError,
  ValidationErrorCode,
  hasContext,
  hasCause,
  hasZodIssues,
  hasErrorCode,
  hasBlECSdErrorShape,
} from 'blecsd/errors';

const guardError = createValidationError(ValidationErrorCode.INVALID_INPUT, 'test', {
  context: { entityId: 1 }
});

if (hasContext(guardError)) {
  console.log(guardError.context.entityId);
}

if (hasZodIssues(guardError)) {
  guardError.context.zodIssues.forEach(issue => {
    console.log(issue.path, issue.message);
  });
}

void hasCause; void hasErrorCode; void hasBlECSdErrorShape;
```

---

## Native Error Interop

Convert between BlECSd errors and native JavaScript Errors:

### toNativeError

Convert a BlECSd error to a throwable Error:

```typescript
import { createValidationError, ValidationErrorCode, toNativeError } from 'blecsd/errors';

const blError = createValidationError(
  ValidationErrorCode.INVALID_INPUT,
  'Invalid input provided'
);

// Convert to native Error for throw/catch
const nativeError = toNativeError(blError);
void nativeError;
// throw nativeError; -- would throw in real use
```

### fromNativeError

Extract BlECSd error data from a caught native Error:

```typescript
import { createValidationError, ValidationErrorCode, toNativeError, fromNativeError, isValidationError } from 'blecsd/errors';

const blError2 = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Test');

try {
  throw toNativeError(blError2);
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
import { wrapError } from 'blecsd/errors';

try {
  JSON.parse('invalid json');
} catch (e) {
  const wrapped = wrapError(e, 'config', 'CONFIG_ERROR');
  // wrapped is a ConfigError with the original error as cause
  void wrapped;
}
```

---

## Result Type

For functional error handling without exceptions, use the Result type (inspired by Rust):

### Creating Results

```typescript
import { ok, err } from 'blecsd/errors';
import type { Result } from 'blecsd/errors';

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
void result; void failed;
```

### Checking Results

```typescript
import { ok, isOk, isErr } from 'blecsd/errors';

const result = ok(5);

if (isOk(result)) {
  console.log('Value:', result.value);
}

if (isErr(result)) {
  console.log('Error:', result.error);
}
```

### Unwrapping Values

```typescript
import { ok, unwrap, unwrapOr, unwrapOrElse } from 'blecsd/errors';

const result = ok(42);

// Returns value (throws if Err)
const value = unwrap(result);

// Returns default if Err
const safeValue = unwrapOr(result, 0);

// Computes default from error if Err
const computed = unwrapOrElse(result, (error) => {
  console.error(error);
  return -1;
});

void value; void safeValue; void computed;
```

### Transforming Results

```typescript
import { map, mapError, flatMap, ok, err } from 'blecsd/errors';
import type { Result } from 'blecsd/errors';

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

void doubled; void mapped; void chained;
```

---

## Practical Examples

### Validating Widget Config

```typescript
import type { Result } from 'blecsd/errors';
import {
  createValidationError,
  ValidationErrorCode,
  ok,
  err,
} from 'blecsd/errors';

interface BoxConfig {
  width: number;
  height: number;
}

function validateBoxConfig(config: unknown): Result<BoxConfig, ReturnType<typeof createValidationError>> {
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

const boxResult = validateBoxConfig({ width: 100, height: 50 });
void boxResult;
```

### Handling Entity Operations

```typescript
import {
  createEntityError,
  EntityErrorCode,
  toNativeError,
  isEntityError,
  fromNativeError,
} from 'blecsd/errors';

// Create an entity error and wrap it as native
const entityErr = createEntityError(
  EntityErrorCode.NOT_FOUND,
  'Entity 999 does not exist',
  { context: { entityId: 999 } }
);

try {
  throw toNativeError(entityErr);
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

### Best Practices

```typescript
import {
  createValidationError,
  createEntityError,
  createInternalError,
  ValidationErrorCode,
  EntityErrorCode,
  InternalErrorCode,
  toNativeError,
  ok,
  err,
  flatMap,
  map,
  unwrapOr,
} from 'blecsd/errors';
import type { Result } from 'blecsd/errors';

// 1. Use Specific Error Codes
createValidationError(
  ValidationErrorCode.INVALID_HEX_COLOR,
  'Invalid color format'
);

// 2. Include Context
const eid = 42;
const dx = 1;
const dy = 0;
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

// 3. Use Result for Recoverable Operations
const findItem = (items: string[], name: string): Result<string, ReturnType<typeof createEntityError>> =>
  items.find(e => e === name)
    ? ok(items.find(e => e === name) as string)
    : err(createEntityError(EntityErrorCode.NOT_FOUND, `Item ${name} not found`));

// 4. Chain Result Operations
const items = ['foo', 'bar'];
const chainResult = flatMap(
  findItem(items, 'foo'),
  item => ok(item.toUpperCase())
);

const finalValue = unwrapOr(chainResult, 'default');
void finalValue;
```

---

## See Also

- Components - ECS components
- Systems - ECS systems
