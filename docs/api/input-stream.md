# Input Stream API

Input stream handler for processing raw terminal input into typed events.

## Overview

The `InputHandler` class wraps a NodeJS readable stream and converts raw bytes into typed keyboard, mouse, and focus events. It handles:

- ANSI escape sequence parsing
- Buffering incomplete sequences
- Timeout-based sequence completion
- Multiple event types (key, mouse, focus)

## Quick Start

```typescript
import { createInputHandler } from 'blecsd';

const handler = createInputHandler(process.stdin);

handler.onKey((event) => {
  console.log(`Key: ${event.name}, Ctrl: ${event.ctrl}`);
  if (event.name === 'q' && event.ctrl) {
    handler.stop();
  }
});

handler.onMouse((event) => {
  console.log(`Mouse: ${event.action} at ${event.x}, ${event.y}`);
});

handler.start();
```

## InputHandler Class

### Constructor

```typescript
import { InputHandler } from 'blecsd';

const handler = new InputHandler(process.stdin, {
  maxBufferSize: 4096,  // Bytes before force flush
  escapeTimeout: 100    // Ms to wait for escape sequences
});
```

**Parameters:**
- `stream` - NodeJS ReadableStream (typically `process.stdin`)
- `config` - Optional configuration

### start()

Start listening for input.

```typescript
handler.start();
```

The stream should be in raw mode for proper input handling:

```typescript
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
handler.start();
```

### stop()

Stop listening for input.

```typescript
handler.stop();

// Restore terminal
if (process.stdin.isTTY) {
  process.stdin.setRawMode(false);
}
```

### isRunning()

Check if handler is active.

```typescript
if (handler.isRunning()) {
  console.log('Listening for input');
}
```

### getBufferSize()

Get current internal buffer size (for debugging).

```typescript
console.log(`Buffer: ${handler.getBufferSize()} bytes`);
```

## Event Handlers

All handlers return an unsubscribe function.

### onKey(handler)

Subscribe to keyboard events.

```typescript
const unsubscribe = handler.onKey((event) => {
  console.log(`Key: ${event.name}`);

  // Check modifiers
  if (event.ctrl && event.name === 'c') {
    console.log('Ctrl+C pressed');
  }

  // Arrow keys
  if (event.name === 'up') {
    console.log('Up arrow');
  }
});

// Later: stop listening
unsubscribe();
```

**KeyEvent properties:**
- `name` - Key name ('a', 'enter', 'up', 'f1', etc.)
- `ctrl` - Control key held
- `meta` - Alt/Meta key held
- `shift` - Shift key held
- `raw` - Raw input string

### onMouse(handler)

Subscribe to mouse events.

```typescript
handler.onMouse((event) => {
  console.log(`${event.action} at ${event.x}, ${event.y}`);

  if (event.action === 'press' && event.button === 'left') {
    console.log('Left click');
  }
});
```

**MouseEvent properties:**
- `x`, `y` - Position (0-indexed)
- `button` - 'left', 'middle', 'right', 'wheelup', 'wheeldown', 'none'
- `action` - 'press', 'release', 'move', 'wheel'
- `raw` - Raw input string

### onFocus(handler)

Subscribe to terminal focus events.

```typescript
handler.onFocus((event) => {
  if (event.focused) {
    console.log('Terminal focused');
  } else {
    console.log('Terminal unfocused');
  }
});
```

**FocusEvent properties:**
- `focused` - Whether terminal has focus
- `raw` - Raw input string

## Factory Function

### createInputHandler()

Create an InputHandler instance.

```typescript
import { createInputHandler } from 'blecsd';

const handler = createInputHandler(process.stdin, {
  escapeTimeout: 50
});
```

## Configuration

### InputHandlerConfig

```typescript
interface InputHandlerConfig {
  maxBufferSize?: number;  // Default: 4096
  escapeTimeout?: number;  // Default: 100ms
}
```

### InputHandlerConfigSchema

Zod schema for validation.

```typescript
import { InputHandlerConfigSchema } from 'blecsd';

const result = InputHandlerConfigSchema.safeParse({
  maxBufferSize: 8192
});

if (!result.success) {
  console.error('Invalid config');
}
```

## Integration with Input System

Connect InputHandler to the input system for ECS processing:

```typescript
import {
  createInputHandler,
  queueKeyEvent,
  queueMouseEvent,
  registerInputSystem,
  createScheduler
} from 'blecsd';

const scheduler = createScheduler();
registerInputSystem(scheduler);

const handler = createInputHandler(process.stdin);

// Queue events for system processing
handler.onKey(queueKeyEvent);
handler.onMouse(queueMouseEvent);

handler.start();

// In game loop
scheduler.run(world, deltaTime);
```

## Types

### KeyHandler

```typescript
type KeyHandler = (event: KeyEvent) => void;
```

### MouseHandler

```typescript
type MouseHandler = (event: MouseEvent) => void;
```

### FocusHandler

```typescript
type FocusHandler = (event: FocusEvent) => void;
```

### Unsubscribe

```typescript
type Unsubscribe = () => void;
```

## Escape Sequence Handling

The handler buffers input to handle multi-byte escape sequences:

1. When an ESC byte (0x1B) is received, it waits for more data
2. If a complete sequence is detected, it's processed immediately
3. If no more data arrives within `escapeTimeout`, the buffer is flushed
4. If buffer exceeds `maxBufferSize`, it's force-flushed

This allows proper handling of:
- Arrow keys (ESC [ A/B/C/D)
- Function keys (ESC [ 11~ etc.)
- Mouse events (ESC [ < ... M)
- Focus events (ESC [ I/O)

## Error Handling

Handler errors are caught and ignored to prevent one handler from breaking others:

```typescript
handler.onKey(() => {
  throw new Error('This won\'t crash the handler');
});

handler.onKey((event) => {
  // This will still be called
  console.log(event.name);
});
```

## Full Example

```typescript
import {
  createInputHandler,
  createWorld,
  addEntity,
  createScheduler,
  registerInputSystem,
  queueKeyEvent,
  queueMouseEvent,
  getInputEventBus,
  setPosition,
  setDimensions,
  setInteractive
} from 'blecsd';

// Set up terminal
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdout.write('\x1b[?1003h'); // Enable mouse tracking

// Create ECS world
const world = createWorld();
const scheduler = createScheduler();
registerInputSystem(scheduler);

// Create interactive element
const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 10, 1);
setInteractive(world, button, { clickable: true });

// Set up input
const handler = createInputHandler(process.stdin);
handler.onKey(queueKeyEvent);
handler.onMouse(queueMouseEvent);

// Subscribe to events
getInputEventBus().on('click', () => console.log('Click!'));

handler.onKey((event) => {
  if (event.name === 'q' && event.ctrl) {
    cleanup();
  }
});

handler.start();

// Game loop
let lastTime = Date.now();
const interval = setInterval(() => {
  const now = Date.now();
  scheduler.run(world, (now - lastTime) / 1000);
  lastTime = now;
}, 16);

// Cleanup
function cleanup() {
  clearInterval(interval);
  handler.stop();
  process.stdout.write('\x1b[?1003l'); // Disable mouse
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(0);
}
```
