# Error Handling in blECSd

This guide explains how blECSd handles errors, how to work with the error system in your applications, and best practices for building robust terminal UIs.

## Overview

blECSd uses a typed error system built on functional programming principles. All errors are:

- **Immutable plain objects** (not classes)
- **Discriminated by type** (using `kind` field for type narrowing)
- **Machine-readable** (with error codes for programmatic handling)
- **Context-rich** (with optional debugging data)

The system supports two error handling patterns:

1. **Result types** for recoverable operations (no exceptions thrown)
2. **Native errors** for exceptional cases (compatible with try/catch)

## Error Types

All blECSd errors share a common structure and are part of the `BlECSdError` discriminated union:

```typescript
import type { BlECSdError } from 'blecsd/errors';

// All errors have these fields:
interface BlECSdErrorBase {
  readonly kind: string;        // Error category for type narrowing
  readonly code: string;         // Specific error code
  readonly message: string;      // Human-readable message
  readonly timestamp: number;    // When the error occurred
  readonly cause?: Error;        // Original error (if wrapping)
  readonly context?: ErrorContext; // Debug context
}
```

### Error Categories

| Kind | Description | Common Use Cases |
|------|-------------|-----------------|
| `validation` | Input/config validation failures | Invalid colors, dimensions, buffer sizes |
| `terminal` | Terminal I/O and capability failures | Terminfo not found, read/write errors |
| `system` | ECS system and game loop failures | Loop already running, phase errors |
| `entity` | Entity management failures | Entity not found, missing components |
| `component` | Component operation failures | Component not found, invalid data |
| `input` | Input handling failures | Invalid key sequences, mouse events |
| `render` | Rendering failures | Buffer overflow, invalid coordinates |
| `config` | Configuration errors | Invalid game/screen/widget config |
| `internal` | Library bugs (should never happen) | Assertion failures, unreachable code |

### Error Context

Errors can include rich context for debugging:

```typescript
import type { ErrorContext } from 'blecsd/errors';

interface ErrorContext {
  readonly entityId?: number;           // Entity involved
  readonly componentName?: string;      // Component involved
  readonly systemName?: string;         // System involved
  readonly filePath?: string;           // File path involved
  readonly functionName?: string;       // Function where error occurred
  readonly data?: Readonly<Record<string, unknown>>; // Additional data
  readonly zodIssues?: readonly ZodIssue[]; // Zod validation issues
}
```

## Creating Errors

Use factory functions to create errors:

```typescript
import {
  createValidationError,
  createEntityError,
  createSystemError,
  ValidationErrorCode,
  EntityErrorCode,
  SystemErrorCode,
} from 'blecsd/errors';

// Validation error
const colorError = createValidationError(
  ValidationErrorCode.INVALID_HEX_COLOR,
  'Invalid hex color format: #xyz',
  { context: { data: { input: '#xyz' } } }
);

// Entity error
const notFoundError = createEntityError(
  EntityErrorCode.NOT_FOUND,
  'Entity not found: 42',
  { context: { entityId: 42 } }
);

// System error with cause
function startGameLoop(world: World): Result<void> {
  try {
    // risky operation
    return ok(undefined);
  } catch (e) {
    return err(createSystemError(
      SystemErrorCode.SYSTEM_EXECUTION_FAILED,
      'Failed to start game loop',
      { cause: e instanceof Error ? e : undefined }
    ));
  }
}
```

## Using Result Types

For recoverable operations, use the `Result<T, E>` type instead of throwing exceptions:

```typescript
import { Result, ok, err, isOk, isErr, unwrapOr } from 'blecsd/errors';
import { createWorld, addEntity, Position } from 'blecsd';

// Function that might fail
function getEntityPosition(
  world: World,
  entityId: number
): Result<{ x: number; y: number }, BlECSdError> {
  if (!hasComponent(world, Position, entityId)) {
    return err(createEntityError(
      EntityErrorCode.MISSING_COMPONENT,
      `Entity ${entityId} missing Position component`,
      { context: { entityId, componentName: 'Position' } }
    ));
  }

  return ok({
    x: Position.x[entityId] ?? 0,
    y: Position.y[entityId] ?? 0,
  });
}

// Usage with type guards
const result = getEntityPosition(world, entityId);

if (isOk(result)) {
  console.log(`Position: ${result.value.x}, ${result.value.y}`);
} else {
  console.error(`Error: ${result.error.message}`);
}

// Usage with unwrapOr (provide default value)
const position = unwrapOr(result, { x: 0, y: 0 });
```

### Result Type Utilities

```typescript
import { map, flatMap, mapError, unwrapOrElse } from 'blecsd/errors';

// Transform success value
const doubled = map(ok(42), (x) => x * 2); // ok(84)

// Chain operations
const sqrt = (x: number): Result<number, string> =>
  x >= 0 ? ok(Math.sqrt(x)) : err('negative number');

flatMap(ok(16), sqrt);   // ok(4)
flatMap(ok(-1), sqrt);   // err('negative number')

// Transform error
const withError = mapError(
  err('oops'),
  (msg) => createInternalError(InternalErrorCode.INTERNAL_ERROR, msg)
);

// Compute fallback value from error
const value = unwrapOrElse(
  result,
  (error) => {
    console.warn(`Using default: ${error.message}`);
    return { x: 0, y: 0 };
  }
);
```

## Working with Native Errors

For exceptional cases or compatibility with existing try/catch code, convert blECSd errors to native Error instances:

```typescript
import { toNativeError, fromNativeError } from 'blecsd/errors';

// Convert to native Error for throwing
function riskyOperation(): void {
  const error = createValidationError(
    ValidationErrorCode.INVALID_INPUT,
    'Invalid input data'
  );
  throw toNativeError(error);
}

// Catch and extract blECSd error
try {
  riskyOperation();
} catch (e) {
  const blecsdError = fromNativeError(e);
  if (blecsdError) {
    // It's a blECSd error - handle it
    console.log(`Error code: ${blecsdError.code}`);
    console.log(`Error kind: ${blecsdError.kind}`);
  } else {
    // Unknown error - rethrow or handle generically
    throw e;
  }
}
```

### Wrapping Unknown Errors

When catching errors from external code, wrap them as blECSd errors:

```typescript
import { wrapError, InternalErrorCode } from 'blecsd/errors';

function processExternalData(data: unknown): Result<ParsedData> {
  try {
    const parsed = externalLibrary.parse(data);
    return ok(parsed);
  } catch (e) {
    // Wrap any error as a blECSd error
    const error = wrapError(
      e,
      InternalErrorCode.UNEXPECTED_STATE,
      'Failed to parse external data'
    );
    return err(error);
  }
}
```

## Type Guards and Error Narrowing

Use type guards to narrow error types for specific handling:

```typescript
import {
  isValidationError,
  isEntityError,
  isTerminalError,
  hasErrorCode,
  hasContext,
  hasZodIssues,
  ValidationErrorCode,
} from 'blecsd/errors';

function handleError(error: BlECSdError): void {
  // Narrow by kind
  if (isValidationError(error)) {
    // error is now ValidationError
    if (hasZodIssues(error)) {
      console.log('Zod validation issues:', error.context.zodIssues);
    }
  }

  if (isEntityError(error)) {
    // error is now EntityError
    if (hasContext(error) && error.context.entityId !== undefined) {
      console.log(`Problem with entity ${error.context.entityId}`);
    }
  }

  // Check specific error code
  if (hasErrorCode(error, ValidationErrorCode.INVALID_HEX_COLOR)) {
    console.log('Invalid color format - using default color');
  }
}
```

## Error Handling in Systems

Systems should handle errors gracefully and avoid crashing the game loop:

```typescript
import { defineSystem, query, hasComponent, World } from 'blecsd';
import { Result, ok, err } from 'blecsd/errors';

// System that processes entities and collects errors
const processEntitiesSystem = defineSystem((world: World) => {
  const entities = query(world, [Position, Velocity]);
  const errors: BlECSdError[] = [];

  for (const eid of entities) {
    const result = updateEntityPosition(world, eid);
    if (isErr(result)) {
      // Log error but continue processing other entities
      errors.push(result.error);
      console.error(`Entity ${eid}: ${result.error.message}`);
    }
  }

  // Optionally attach errors to world state for higher-level handling
  if (errors.length > 0) {
    emitEvent(world, 'system:errors', { system: 'processEntities', errors });
  }

  return world;
});

// Helper function with Result type
function updateEntityPosition(
  world: World,
  eid: Entity
): Result<void, BlECSdError> {
  if (!hasComponent(world, Velocity, eid)) {
    return err(createEntityError(
      EntityErrorCode.MISSING_COMPONENT,
      `Entity ${eid} missing Velocity component`,
      { context: { entityId: eid, componentName: 'Velocity' } }
    ));
  }

  Position.x[eid] += Velocity.x[eid] ?? 0;
  Position.y[eid] += Velocity.y[eid] ?? 0;

  return ok(undefined);
}
```

## Error Handling in Input Processing

Input errors are often recoverable - log them and continue processing:

```typescript
import { parseKeyEvent } from 'blecsd';
import { isInputError, InputErrorCode } from 'blecsd/errors';

function handleKeyPress(data: Buffer): void {
  const result = parseKeyEvent(data);

  if (isErr(result)) {
    if (isInputError(result.error)) {
      // Input errors are usually safe to ignore
      if (hasErrorCode(result.error, InputErrorCode.INVALID_KEY_SEQUENCE)) {
        // Unknown escape sequence - skip it
        return;
      }
    }
    // Other error types might be more serious
    console.error('Key processing error:', result.error.message);
    return;
  }

  // Process the key event
  processKeyEvent(result.value);
}
```

## Recovery Strategies

Different error types require different recovery strategies:

### Validation Errors (Recoverable)

```typescript
import { isValidationError } from 'blecsd/errors';

function handleConfigError(error: BlECSdError, config: Config): Config {
  if (isValidationError(error)) {
    // Use default values for invalid config
    console.warn(`Invalid config: ${error.message}, using defaults`);
    return getDefaultConfig();
  }
  throw toNativeError(error); // Other errors are not recoverable
}
```

### Terminal Errors (May require fallback)

```typescript
import { isTerminalError, TerminalErrorCode } from 'blecsd/errors';

function initializeTerminal(): Result<Terminal> {
  const result = detectTerminalCapabilities();

  if (isErr(result)) {
    if (isTerminalError(result.error)) {
      if (hasErrorCode(result.error, TerminalErrorCode.TERMINFO_NOT_FOUND)) {
        // Fall back to basic terminal
        console.warn('Terminfo not found, using basic terminal');
        return ok(createBasicTerminal());
      }
    }
    return result; // Propagate error
  }

  return result;
}
```

### System Errors (Usually fatal)

```typescript
import { isSystemError } from 'blecsd/errors';

function handleSystemError(error: BlECSdError): void {
  if (isSystemError(error)) {
    // System errors usually indicate serious problems
    console.error('Critical system error:', error.message);

    // Log context for debugging
    if (hasContext(error)) {
      console.error('Context:', error.context);
    }

    // Shut down gracefully
    cleanup();
    process.exit(1);
  }
}
```

### Internal Errors (Always report)

```typescript
import { isInternalError } from 'blecsd/errors';

function handleError(error: BlECSdError): void {
  if (isInternalError(error)) {
    // Internal errors are library bugs - always report them
    console.error('INTERNAL ERROR (please report):', error.message);
    console.error('Stack:', error.cause?.stack);
    console.error('Context:', error.context);

    // In production, try to keep running if possible
    // In development, crash to surface the bug
    if (process.env.NODE_ENV === 'development') {
      throw toNativeError(error);
    }
  }
}
```

## Error Boundaries in TUI Applications

Create error boundaries to prevent one component's errors from crashing the entire UI:

```typescript
import { World, Entity } from 'blecsd';
import { BlECSdError } from 'blecsd/errors';

interface ErrorBoundaryState {
  errors: Map<Entity, BlECSdError[]>;
}

const errorBoundaryState: ErrorBoundaryState = {
  errors: new Map(),
};

function renderWithErrorBoundary(
  world: World,
  eid: Entity,
  renderFn: (world: World, eid: Entity) => Result<void>
): void {
  const result = renderFn(world, eid);

  if (isErr(result)) {
    // Record error for this entity
    const entityErrors = errorBoundaryState.errors.get(eid) ?? [];
    entityErrors.push(result.error);
    errorBoundaryState.errors.set(eid, entityErrors);

    // Render error state instead of crashing
    renderErrorState(world, eid, result.error);
  } else {
    // Clear previous errors on success
    errorBoundaryState.errors.delete(eid);
  }
}

function renderErrorState(world: World, eid: Entity, error: BlECSdError): void {
  // Render a fallback UI showing the error
  const errorMessage = `[Error: ${error.code}]`;
  // Use safe rendering that won't fail
  renderPlainText(world, eid, errorMessage);
}
```

## Best Practices

### 1. Prefer Result Types Over Exceptions

```typescript
// GOOD - recoverable error with Result
function parseColor(input: string): Result<Color, BlECSdError> {
  if (!isValidHex(input)) {
    return err(createValidationError(
      ValidationErrorCode.INVALID_HEX_COLOR,
      `Invalid hex color: ${input}`
    ));
  }
  return ok(hexToColor(input));
}

// BAD - exception for recoverable error
function parseColor(input: string): Color {
  if (!isValidHex(input)) {
    throw new Error('Invalid hex color');
  }
  return hexToColor(input);
}
```

### 2. Always Include Error Context

```typescript
// GOOD - rich context for debugging
return err(createRenderError(
  RenderErrorCode.INVALID_COORDINATES,
  'Cell coordinates out of bounds',
  {
    context: {
      entityId: eid,
      data: { x, y, screenWidth, screenHeight }
    }
  }
));

// BAD - no context
return err(createRenderError(
  RenderErrorCode.INVALID_COORDINATES,
  'Cell coordinates out of bounds'
));
```

### 3. Use Specific Error Codes

```typescript
// GOOD - specific code for programmatic handling
if (hasErrorCode(error, ValidationErrorCode.INVALID_HEX_COLOR)) {
  // Handle this specific case
  useDefaultColor();
}

// BAD - checking message strings
if (error.message.includes('hex color')) {
  // Fragile and prone to breaking
}
```

### 4. Validate at Boundaries

```typescript
// Validate at system boundaries (user input, config files, etc.)
function loadConfig(filePath: string): Result<Config> {
  const rawData = readFile(filePath);

  // Validate with Zod at the boundary
  const parseResult = ConfigSchema.safeParse(rawData);
  if (!parseResult.success) {
    return err(createValidationError(
      ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
      'Invalid config file',
      { zodIssues: parseResult.error.issues }
    ));
  }

  return ok(parseResult.data);
}

// Don't validate internal function calls - trust your own code
function internalHelper(value: number): number {
  // No need to validate - caller is trusted internal code
  return value * 2;
}
```

### 5. Log Errors Appropriately

```typescript
// Different log levels for different error kinds
function logError(error: BlECSdError): void {
  if (isInternalError(error)) {
    // Internal errors are bugs - log as ERROR
    console.error('[BUG]', error.message, error.context);
  } else if (isSystemError(error) || isTerminalError(error)) {
    // System/terminal errors are critical - log as ERROR
    console.error('[ERROR]', error.message);
  } else if (isValidationError(error) || isInputError(error)) {
    // Validation/input errors are common - log as WARN
    console.warn('[WARN]', error.message);
  } else {
    // Other errors - log as INFO
    console.info('[INFO]', error.message);
  }
}
```

### 6. Don't Swallow Errors Silently

```typescript
// BAD - silent failure
function updateEntity(world: World, eid: Entity): void {
  const result = doSomething(world, eid);
  // Error is ignored!
}

// GOOD - handle or propagate
function updateEntity(world: World, eid: Entity): Result<void> {
  const result = doSomething(world, eid);
  if (isErr(result)) {
    // Either handle it...
    console.error(`Failed to update entity ${eid}:`, result.error.message);
    // ...or propagate it
    return result;
  }
  return ok(undefined);
}
```

## Testing Error Handling

Test both success and error cases:

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, addEntity } from 'blecsd';
import { isOk, isErr } from 'blecsd/errors';

describe('getEntityPosition', () => {
  it('returns position for valid entity', () => {
    const world = createWorld();
    const eid = addEntity(world);
    setPosition(world, eid, 10, 20);

    const result = getEntityPosition(world, eid);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ x: 10, y: 20 });
    }
  });

  it('returns error for entity without Position', () => {
    const world = createWorld();
    const eid = addEntity(world);
    // No Position component

    const result = getEntityPosition(world, eid);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(isEntityError(result.error)).toBe(true);
      expect(result.error.code).toBe(EntityErrorCode.MISSING_COMPONENT);
    }
  });
});
```

## Summary

- Use **Result types** for recoverable errors, **native Errors** for exceptional cases
- Create errors with **factory functions** and **specific error codes**
- Include **rich context** to aid debugging
- Use **type guards** to narrow and handle different error kinds
- Implement **error boundaries** to prevent cascading failures
- **Validate** at system boundaries, **trust** internal code
- **Log** appropriately based on error severity
- **Test** both success and error paths

For the complete error API reference, see [Error Handling API](../api/errors.md).
