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

// Inspect error properties
console.log(validationErr.kind);    // 'validation'
console.log(entityErr.code);        // EntityErrorCode.NOT_FOUND
console.log(termErr.message);       // 'Terminal not ready'

// Use type guards for narrowing
if (isValidationError(validationErr)) {
  console.log('Validation kind:', validationErr.kind);
}
if (isEntityError(entityErr)) {
  console.log('Entity code:', entityErr.code);
}

// Result type usage
const r = ok(1);
console.log(isOk(r));           // true
const safeVal = unwrapOr(r, 0);
console.log(safeVal);           // 1

// Native interop round-trip
const nativeErr = toNativeError(validationErr);
console.log(nativeErr instanceof Error); // true
const extracted = fromNativeError(nativeErr);
if (extracted) {
  console.log(extracted.kind); // 'validation'
}

// err() creates an Err result
const failed = err('something went wrong');
console.log(isOk(failed)); // false
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

// These string enum values identify specific failure modes
console.log(ValidationErrorCode.INVALID_INPUT);           // generic validation failure
console.log(ValidationErrorCode.INVALID_HEX_COLOR);       // invalid hex color format
console.log(ValidationErrorCode.INVALID_DIMENSION);       // invalid dimension value
console.log(ValidationErrorCode.SCHEMA_VALIDATION_FAILED); // Zod schema failed
console.log(ValidationErrorCode.REQUIRED_FIELD_MISSING);  // required field missing
console.log(ValidationErrorCode.VALUE_OUT_OF_RANGE);      // value out of range
```

### EntityErrorCode

```typescript
import { EntityErrorCode } from 'blecsd/errors';

console.log(EntityErrorCode.NOT_FOUND);         // entity not found
console.log(EntityErrorCode.ALREADY_EXISTS);    // entity already exists
console.log(EntityErrorCode.INVALID_ID);        // invalid entity ID
console.log(EntityErrorCode.MISSING_COMPONENT); // missing required component
console.log(EntityErrorCode.HIERARCHY_ERROR);   // parent/child error
```

### ComponentErrorCode

```typescript
import { ComponentErrorCode } from 'blecsd/errors';

console.log(ComponentErrorCode.NOT_FOUND);             // component not on entity
console.log(ComponentErrorCode.ALREADY_EXISTS);        // component already exists
console.log(ComponentErrorCode.INVALID_DATA);          // invalid component data
console.log(ComponentErrorCode.STORE_NOT_INITIALIZED); // store not ready
```

### SystemErrorCode

```typescript
import { SystemErrorCode } from 'blecsd/errors';

console.log(SystemErrorCode.LOOP_ALREADY_RUNNING);    // game loop running
console.log(SystemErrorCode.LOOP_NOT_RUNNING);        // game loop not running
console.log(SystemErrorCode.SYSTEM_EXECUTION_FAILED); // system threw error
console.log(SystemErrorCode.PHASE_NOT_FOUND);         // unknown phase
```

### TerminalErrorCode

```typescript
import { TerminalErrorCode } from 'blecsd/errors';

console.log(TerminalErrorCode.NOT_INITIALIZED);          // terminal not ready
console.log(TerminalErrorCode.TERMINFO_NOT_FOUND);       // missing terminfo
console.log(TerminalErrorCode.CAPABILITY_NOT_SUPPORTED); // feature unavailable
console.log(TerminalErrorCode.WRITE_FAILED);             // output failed
```

### InputErrorCode

```typescript
import { InputErrorCode } from 'blecsd/errors';

console.log(InputErrorCode.INVALID_KEY_SEQUENCE); // bad key input
console.log(InputErrorCode.INVALID_MOUSE_EVENT);  // bad mouse input
console.log(InputErrorCode.BUFFER_OVERFLOW);      // too many events queued
```

### RenderErrorCode

```typescript
import { RenderErrorCode } from 'blecsd/errors';

console.log(RenderErrorCode.BUFFER_NOT_INITIALIZED); // screen buffer not ready
console.log(RenderErrorCode.INVALID_COORDINATES);    // out of bounds
console.log(RenderErrorCode.CYCLE_TIMEOUT);          // render took too long
```

### ConfigErrorCode

```typescript
import { ConfigErrorCode } from 'blecsd/errors';

console.log(ConfigErrorCode.INVALID_GAME_CONFIG);   // bad game config
console.log(ConfigErrorCode.INVALID_WIDGET_CONFIG); // bad widget config
console.log(ConfigErrorCode.MISSING_REQUIRED);      // missing required option
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

console.log(error.kind);                    // 'validation'
console.log(error.code);                    // ValidationErrorCode.INVALID_HEX_COLOR
console.log(error.message);                 // 'Color must be a valid hex string like #ff0000'
console.log(error.context?.functionName);   // 'parseColor'
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

console.log(error.kind);               // 'entity'
console.log(error.context?.entityId);  // 42
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

console.log(error.kind);                    // 'component'
console.log(error.context?.componentName);  // 'Position'
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

// Each factory produces a typed error with the correct kind discriminant
const errors = [
  createValidationError(ValidationErrorCode.INVALID_INPUT, 'msg'),
  createTerminalError(TerminalErrorCode.NOT_INITIALIZED, 'msg'),
  createSystemError(SystemErrorCode.LOOP_NOT_RUNNING, 'msg'),
  createEntityError(EntityErrorCode.NOT_FOUND, 'msg'),
  createComponentError(ComponentErrorCode.NOT_FOUND, 'msg'),
  createInputError(InputErrorCode.INVALID_KEY_SEQUENCE, 'msg'),
  createRenderError(RenderErrorCode.BUFFER_NOT_INITIALIZED, 'msg'),
  createConfigError(ConfigErrorCode.MISSING_REQUIRED, 'msg'),
  createInternalError(InternalErrorCode.UNEXPECTED_STATE, 'msg'),
];

// Each error has a unique kind discriminant
for (const e of errors) {
  console.log(e.kind, e.code);
}
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
  // sampleError is narrowed to ValidationError here
  console.log('Validation failed:', sampleError.kind);  // 'validation'
} else if (isEntityError(sampleError)) {
  // sampleError is narrowed to EntityError here
  console.log('Entity error:', sampleError.context?.entityId);
}

// Check by kind string
if (isErrorKind(sampleError, 'validation')) {
  console.log('Kind matches:', sampleError.kind);  // 'validation'
}

// isBlECSdError narrows from unknown to BlECSdError
const unknown: unknown = sampleError;
if (isBlECSdError(unknown)) {
  console.log('Is a blecsd error:', unknown.kind);
}

// Other guards narrow to their respective types
const entityErr = createEntityError(EntityErrorCode.NOT_FOUND, 'not found');
console.log(isComponentError(entityErr));  // false
console.log(isSystemError(entityErr));     // false
console.log(isTerminalError(entityErr));   // false
console.log(isInputError(entityErr));      // false
console.log(isRenderError(entityErr));     // false
console.log(isConfigError(entityErr));     // false
console.log(isInternalError(entityErr));   // false
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
  console.log(guardError.context.entityId);  // 1
}

if (hasZodIssues(guardError)) {
  guardError.context.zodIssues.forEach(issue => {
    console.log(issue.path, issue.message);
  });
}

// hasCause checks for a wrapped native error
console.log(hasCause(guardError));  // false (no cause set)

// hasErrorCode checks if a specific code is present
console.log(hasErrorCode(guardError, ValidationErrorCode.INVALID_INPUT));  // true

// hasBlECSdErrorShape checks duck-typed shape for unknown values
const shape: unknown = guardError;
console.log(hasBlECSdErrorShape(shape));  // true
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
console.log(nativeError instanceof Error);  // true
console.log(nativeError.message);           // 'Invalid input provided'
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
import { wrapError, isInternalError, InternalErrorCode } from 'blecsd/errors';

try {
  JSON.parse('invalid json');
} catch (e) {
  const wrapped = wrapError(e, InternalErrorCode.UNEXPECTED_STATE, 'JSON parse failed');
  // Unknown errors are wrapped as InternalError
  console.log(isInternalError(wrapped));  // true
  console.log(wrapped.kind);              // 'internal'
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
console.log(result);  // { ok: true, value: 5 }

const failed = divide(10, 0);
console.log(failed);  // { ok: false, error: 'Division by zero' }
```

### Checking Results

```typescript
import { ok, isOk, isErr } from 'blecsd/errors';

const result = ok(5);

if (isOk(result)) {
  console.log('Value:', result.value);  // 'Value: 5'
}

if (isErr(result)) {
  console.log('Error:', result.error);
} else {
  console.log('No error, value is:', result.value);  // 'No error, value is: 5'
}
```

### Unwrapping Values

```typescript
import { ok, unwrap, unwrapOr, unwrapOrElse } from 'blecsd/errors';

const result = ok(42);

// Returns value (throws if Err)
const value = unwrap(result);
console.log(value);  // 42

// Returns default if Err
const safeValue = unwrapOr(result, 0);
console.log(safeValue);  // 42

// Computes default from error if Err
const computed = unwrapOrElse(result, (error) => {
  console.error(error);
  return -1;
});
console.log(computed);  // 42
```

### Transforming Results

```typescript
import { map, mapError, flatMap, ok, err } from 'blecsd/errors';
import type { Result } from 'blecsd/errors';

// Map over Ok value
const doubled = map(ok(5), x => x * 2);
console.log(doubled);  // { ok: true, value: 10 }

// Map over Err value
const mapped = mapError(err('oops'), e => new Error(e));
console.log(mapped.ok);  // false

// Chain Result-returning functions
function sqrt(x: number): Result<number, string> {
  return x >= 0 ? ok(Math.sqrt(x)) : err('negative');
}

const chained = flatMap(ok(16), sqrt);
console.log(chained);  // { ok: true, value: 4 }
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
  isOk,
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
if (isOk(boxResult)) {
  console.log('Valid config:', boxResult.value.width, 'x', boxResult.value.height);
}

const badResult = validateBoxConfig({ width: -1, height: 50 });
if (!isOk(badResult)) {
  console.log('Invalid:', badResult.error.message);
}
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
  ok,
  err,
  flatMap,
  unwrapOr,
} from 'blecsd/errors';
import type { Result } from 'blecsd/errors';

// 1. Use Specific Error Codes
const colorError = createValidationError(
  ValidationErrorCode.INVALID_HEX_COLOR,
  'Invalid color format'
);
console.log(colorError.code);  // ValidationErrorCode.INVALID_HEX_COLOR

// 2. Include Context
const eid = 42;
const dx = 1;
const dy = 0;
const moveError = createEntityError(
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
console.log(moveError.context?.entityId);      // 42
console.log(moveError.context?.componentName); // 'Position'

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
console.log(finalValue);  // 'FOO'
```

---

## See Also

- Components - ECS components
- Systems - ECS systems
