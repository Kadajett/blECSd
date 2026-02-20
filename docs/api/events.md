# Events API

Type-safe event emitter for decoupling application systems. Events let systems communicate without direct dependencies on each other.

## How do I create an event bus?

### createEventBus

```typescript
import { createEventBus } from 'blecsd/core';

interface AppEvents {
  'panel:resized': { width: number; height: number };
  'file:selected': { path: string; name: string };
}

const events = createEventBus<AppEvents>();
```

---

## How do I subscribe to events?

### on

Subscribe to an event. Returns an unsubscribe function.

```typescript
import { createEventBus } from 'blecsd/core';
interface PlayerEvents { 'player:moved': { x: number; y: number }; }
const events = createEventBus<PlayerEvents>();
const unsubscribe = events.on('player:moved', (e) => {
  console.log(`Player at ${e.x}, ${e.y}`);
});

// Later: stop listening
unsubscribe();
```

**Parameters:** `event` (event name), `handler` (callback function)

**Returns:** Unsubscribe function

### once

Subscribe to an event once. Handler is removed after first call.

```typescript
import { createEventBus } from 'blecsd/core';
interface GameEvents { 'game:over': { score: number }; }
const events = createEventBus<GameEvents>();
events.once('game:over', (e) => {
  console.log(`Final score: ${e.score}`);
});
```

---

## How do I emit events?

### emit

Emit an event to all listeners.

```typescript
import { createEventBus } from 'blecsd/core';
interface PlayerEvents { 'player:moved': { x: number; y: number }; }
const events = createEventBus<PlayerEvents>();
const hadListeners = events.emit('player:moved', { x: 10, y: 5 });
// Returns true if any handlers were called
```

**Parameters:** `event` (event name), `payload` (event data)

**Returns:** `true` if any listeners were called

---

## How do I unsubscribe?

### off

Remove a specific listener.

```typescript
import { createEventBus } from 'blecsd/core';
interface ClickEvents { 'click': { x: number; y: number }; }
const events = createEventBus<ClickEvents>();
const handler = (e: { x: number; y: number }) => console.log(e);
events.on('click', handler);
events.off('click', handler);
```

### removeAllListeners

Remove all listeners for an event, or all listeners for all events.

```typescript
import { createEventBus } from 'blecsd/core';
interface ClickEvents { 'click': { x: number; y: number }; }
const events = createEventBus<ClickEvents>();
events.removeAllListeners('click');  // Remove click listeners
events.removeAllListeners();          // Remove all listeners
```

---

## How do I check listener state?

### listenerCount

```typescript
import { createEventBus } from 'blecsd/core';
interface AppEvents { 'error': { message: string }; }
const events = createEventBus<AppEvents>();
const count = events.listenerCount('error');
```

### eventNames

Get all event names that have listeners.

```typescript
import { createEventBus } from 'blecsd/core';
interface GameEvents { 'player:moved': { x: number; y: number }; 'enemy:killed': { id: number }; }
const events = createEventBus<GameEvents>();
const names = events.eventNames();
// ['player:moved', 'enemy:killed']
```

### hasListeners

```typescript
import { createEventBus } from 'blecsd/core';
interface DebugEvents { 'debug': { message: string }; }
const events = createEventBus<DebugEvents>();
if (events.hasListeners('debug')) {
  events.emit('debug', { message: 'info' });
}
```

---

## Types

### EventHandler

```typescript
type EventHandler<T> = (event: T) => void;
```

### EventMap

```typescript
type EventMap = Record<string, unknown>;
```

### Unsubscribe

```typescript
type Unsubscribe = () => void;
```

---

## Built-in Event Maps

### UIEventMap

Standard UI events for interactive elements.

```typescript
interface UIEventMap {
  click: { x: number; y: number; button: number };
  keypress: { key: string; ctrl: boolean; meta: boolean; shift: boolean };
  focus: { target: unknown };
  blur: { target: unknown };
  mouseenter: { x: number; y: number };
  mouseleave: { x: number; y: number };
  mousemove: { x: number; y: number };
  mousedown: { x: number; y: number; button: number };
  mouseup: { x: number; y: number; button: number };
  scroll: { direction: 'up' | 'down'; amount: number };
}
```

### ScreenEventMap

Screen-level events.

```typescript
interface ScreenEventMap {
  resize: { width: number; height: number };
  render: { frameTime: number };
  destroy: Record<string, never>;
}
```

---

## Common Patterns

### Scoped Events

Use prefixes to organize events:

```typescript
interface AppEvents {
  'file:open': { path: string };
  'file:save': { path: string; content: string };
  'file:close': { path: string };
  'panel:focus': { panelId: string };
  'panel:resize': { panelId: string; width: number; height: number };
  'ui:modal:open': { modalId: string };
  'ui:modal:close': { modalId: string };
  'ui:toast:show': { message: string; type: 'info' | 'error' | 'success' };
}
```

### Cleanup

Always clean up listeners to prevent memory leaks:

```typescript
import { createEventBus } from 'blecsd/core';
interface GameEvents { 'player:moved': { x: number; y: number }; 'game:over': { score: number }; }

const bus = createEventBus<GameEvents>();
const unsubscribers: Array<() => void> = [];

// Subscribe and collect unsubscribers
unsubscribers.push(
  bus.on('player:moved', (e) => console.log('Player moved:', e.x, e.y)),
  bus.on('game:over', (e) => console.log('Game over, score:', e.score))
);

// Cleanup: call each unsubscriber
for (const unsub of unsubscribers) {
  unsub();
}
unsubscribers.length = 0;
```
```

### Conditional Emit

Skip expensive work when no listeners exist:

```typescript
import { createEventBus } from 'blecsd/core';
interface DebugEvents { 'debug': { message: string }; }
const events = createEventBus<DebugEvents>();
function expensiveDebugInfo() { return 'computed debug info'; }
if (events.hasListeners('debug')) {
  events.emit('debug', { message: expensiveDebugInfo() });
}
```

---

---

## Warning Events

blECSd provides a built-in warning system for non-fatal issues like small terminal sizes, unsupported capabilities, deprecated APIs, and performance problems.

### createWarningEmitter

Creates a warning event emitter with typed warning events.

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';

const warnings = createWarningEmitter();

// Listen for all warnings
warnings.on('warning', (event) => {
  console.warn(`[${event.type}] ${event.message}`);
  console.warn('Metadata:', event.metadata);
});
```

**Returns:** `WarningEmitter` - Event bus for warning events

---

### Warning Types

#### WarningType.TERMINAL_TOO_SMALL

Emitted when terminal is resized to very small dimensions.

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';
const warnings = createWarningEmitter();
warnings.on('warning', (event) => {
  if (event.type === WarningType.TERMINAL_TOO_SMALL) {
    const { width, height, minWidth, minHeight } = event.metadata as { width: number; height: number; minWidth: number; minHeight: number };
    console.warn(`Terminal ${width}x${height} is smaller than ${minWidth}x${minHeight}`);
  }
});
```

**Metadata:**
- `width: number` - Current terminal width
- `height: number` - Current terminal height
- `minWidth: number` - Minimum recommended width
- `minHeight: number` - Minimum recommended height

#### WarningType.UNSUPPORTED_CAPABILITY

Emitted when a requested terminal capability is not supported.

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';
const warnings = createWarningEmitter();
warnings.on('warning', (event) => {
  if (event.type === WarningType.UNSUPPORTED_CAPABILITY) {
    const { capability, fallback } = event.metadata as { capability: string; fallback?: string };
    console.warn(`${capability} not supported. ${fallback || ''}`);
  }
});
```

**Metadata:**
- `capability: string` - The unsupported capability name
- `fallback?: string` - Optional fallback description

#### WarningType.DEPRECATED_API

Emitted when deprecated API is used.

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';
const warnings = createWarningEmitter();
warnings.on('warning', (event) => {
  if (event.type === WarningType.DEPRECATED_API) {
    const { api, replacement, since } = event.metadata as { api: string; replacement: string; since: string };
    console.warn(`${api} deprecated since ${since}. Use ${replacement}`);
  }
});
```

**Metadata:**
- `api: string` - Deprecated API name
- `replacement: string` - Replacement API
- `since: string` - Version since deprecated

#### WarningType.PERFORMANCE_ISSUE

Emitted when performance issues are detected (frame drops, slow operations).

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';
const warnings = createWarningEmitter();
warnings.on('warning', (event) => {
  if (event.type === WarningType.PERFORMANCE_ISSUE) {
    const { metric, value, threshold, frameTime } = event.metadata as { metric: string; value: number; threshold: number; frameTime?: number };
    console.warn(`${metric}: ${value} exceeds ${threshold}`);
    if (frameTime !== undefined) console.log('frame time:', frameTime, 'ms');
  }
});
```

**Metadata:**
- `metric: string` - Performance metric name
- `value: number` - Measured value
- `threshold: number` - Threshold value
- `frameTime?: number` - Optional frame time in milliseconds

---

### Emitting Warnings

#### emitTerminalTooSmallWarning

```typescript
import { createWarningEmitter, emitTerminalTooSmallWarning } from 'blecsd/core';

const warnings = createWarningEmitter();
emitTerminalTooSmallWarning(warnings, 40, 15, 80, 24);
// Emits: "Terminal size (40x15) is smaller than recommended (80x24)"
```

**Parameters:**
- `emitter: WarningEmitter` - The warning emitter
- `width: number` - Current terminal width
- `height: number` - Current terminal height
- `minWidth: number` - Minimum recommended width
- `minHeight: number` - Minimum recommended height

#### emitUnsupportedCapabilityWarning

```typescript
import { createWarningEmitter, emitUnsupportedCapabilityWarning } from 'blecsd/core';

const warnings = createWarningEmitter();
emitUnsupportedCapabilityWarning(
  warnings,
  'truecolor',
  'Falling back to 256-color mode'
);
```

**Parameters:**
- `emitter: WarningEmitter` - The warning emitter
- `capability: string` - The unsupported capability name
- `fallback?: string` - Optional fallback description

#### emitDeprecatedAPIWarning

```typescript
import { createWarningEmitter, emitDeprecatedAPIWarning } from 'blecsd/core';

const warnings = createWarningEmitter();
emitDeprecatedAPIWarning(
  warnings,
  'oldFunction()',
  'newFunction()',
  'v2.0.0'
);
```

**Parameters:**
- `emitter: WarningEmitter` - The warning emitter
- `api: string` - Deprecated API name
- `replacement: string` - Replacement API
- `since: string` - Version since deprecated

#### emitPerformanceWarning

```typescript
import { createWarningEmitter, emitPerformanceWarning } from 'blecsd/core';

const warnings = createWarningEmitter();
emitPerformanceWarning(
  warnings,
  'frame-time',
  35,       // Current frame time
  16.67,    // Target (60 FPS)
  35        // Frame time in ms
);
```

**Parameters:**
- `emitter: WarningEmitter` - The warning emitter
- `metric: string` - Performance metric name
- `value: number` - Measured value
- `threshold: number` - Threshold value
- `frameTime?: number` - Optional frame time in milliseconds

---

### Warning Event Structure

```typescript
interface WarningEvent {
  type: 'terminal-too-small' | 'unsupported-capability' | 'deprecated-api' | 'performance-issue';
  message: string;          // Human-readable message
  metadata: WarningMetadata; // Type-specific metadata
  timestamp: number;         // Unix timestamp
}
```

---

### Complete Warning System Example

```typescript
import { createWarningEmitter, WarningType, emitTerminalTooSmallWarning } from 'blecsd/core';

// Create warning emitter
const warnings = createWarningEmitter();

function showResizePrompt(metadata: unknown) { console.warn('Please resize terminal:', metadata); }
function disableFeature(capability: unknown) { console.warn('Disabling feature:', capability); }
function reduceQuality() { console.warn('Reducing quality to maintain performance'); }

// Listen for warnings
warnings.on('warning', (event) => {
  // Log to console
  console.warn(`[${new Date(event.timestamp).toISOString()}] ${event.message}`);

  // Handle specific warning types
  switch (event.type) {
    case WarningType.TERMINAL_TOO_SMALL:
      // Show resize prompt to user
      showResizePrompt(event.metadata);
      break;

    case WarningType.UNSUPPORTED_CAPABILITY:
      // Disable feature or show fallback
      disableFeature((event.metadata as { capability: string }).capability);
      break;

    case WarningType.DEPRECATED_API:
      // Log for developer
      if (process.env.NODE_ENV === 'development') {
        console.error('Deprecation:', event.metadata);
      }
      break;

    case WarningType.PERFORMANCE_ISSUE:
      // Reduce quality or frame rate
      if ((event.metadata as { value: number; threshold: number }).value > (event.metadata as { value: number; threshold: number }).threshold * 2) {
        reduceQuality();
      }
      break;
  }
});

// Emit warnings from your systems
function checkTerminalSize(width: number, height: number) {
  if (width < 80 || height < 24) {
    emitTerminalTooSmallWarning(warnings, width, height, 80, 24);
  }
}

checkTerminalSize(40, 15);
```

---

### Filtering Warnings

Filter warnings by type:

```typescript
import { createWarningEmitter, WarningType } from 'blecsd/core';
const warnings = createWarningEmitter();

warnings.on('warning', (event) => {
  // Only handle performance warnings
  if (event.type === WarningType.PERFORMANCE_ISSUE) {
    console.warn('Performance issue:', event.message);
  }
});
```

---

### Warning Validation

All warnings are validated using Zod schemas:

```typescript
import {
  WarningEventSchema,
  TerminalTooSmallMetadataSchema,
  UnsupportedCapabilityMetadataSchema,
  DeprecatedAPIMetadataSchema,
  PerformanceIssueMetadataSchema,
  WarningType,
} from 'blecsd/core';

// Validate warning event
const event = {
  type: WarningType.TERMINAL_TOO_SMALL,
  message: 'Terminal size (40x15) is smaller than recommended (80x24)',
  metadata: { width: 40, height: 15, minWidth: 80, minHeight: 24 },
  timestamp: Date.now(),
};
const result = WarningEventSchema.safeParse(event);
if (!result.success) {
  console.error('Invalid warning:', result.error);
}
```

---

## See Also

- [Core Concepts](../getting-started/concepts.md) - Event bus overview
- [Event Bubbling](./core/event-bubbling.md) - Hierarchical event propagation
