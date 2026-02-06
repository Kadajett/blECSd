# Input Event Buffer API

Frame-independent input event buffering. Buffers keyboard and mouse events between frames so no input is lost. Events are collected asynchronously from stdin and drained synchronously each frame by the game loop.

## Quick Start

```typescript
import { createInputEventBuffer, pushKeyEvent, drainKeys, drainMouse } from 'blecsd';

const buffer = createInputEventBuffer({ maxBufferSize: 500 });

// Push events from stdin handler
pushKeyEvent(buffer, keyEvent);
pushMouseEvent(buffer, mouseEvent);

// Drain in game loop
const keys = drainKeys(buffer);
const mouse = drainMouse(buffer);
```

## Types

### TimestampedKeyEvent

```typescript
interface TimestampedKeyEvent {
  readonly type: 'key';
  readonly event: KeyEvent;
  readonly timestamp: number;
}
```

### TimestampedMouseEvent

```typescript
interface TimestampedMouseEvent {
  readonly type: 'mouse';
  readonly event: MouseEvent;
  readonly timestamp: number;
}
```

### TimestampedInputEvent

```typescript
type TimestampedInputEvent = TimestampedKeyEvent | TimestampedMouseEvent;
```

### InputBufferStats

```typescript
interface InputBufferStats {
  readonly totalKeyEvents: number;
  readonly totalMouseEvents: number;
  readonly pendingKeyEvents: number;
  readonly pendingMouseEvents: number;
  readonly droppedEvents: number;
  readonly maxBufferSize: number;
}
```

### InputLatencyStats

Latency statistics for input processing. All values in milliseconds.

```typescript
interface InputLatencyStats {
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p95: number;
  readonly p99: number;
  readonly sampleCount: number;
  readonly lastFrameProcessingTime: number;
  readonly avgFrameProcessingTime: number;
}
```

### InputEventBufferOptions

```typescript
interface InputEventBufferOptions {
  readonly maxBufferSize?: number;      // default: 1000
  readonly warnOnOverflow?: boolean;    // default: true
  readonly onOverflow?: (droppedCount: number) => void;
  readonly maxLatencySamples?: number;  // default: 1000
  readonly maxFrameSamples?: number;    // default: 100
}
```

### InputEventBufferData

The buffer data structure containing all state.

```typescript
interface InputEventBufferData {
  keyEvents: TimestampedKeyEvent[];
  mouseEvents: TimestampedMouseEvent[];
  latencySamples: number[];
  frameProcessingTimes: number[];
  frameStartTime: number;
  totalKeyEvents: number;
  totalMouseEvents: number;
  droppedEvents: number;
  readonly config: { ... };
}
```

## Functions

### createInputEventBuffer

Creates a new input event buffer.

```typescript
function createInputEventBuffer(options?: InputEventBufferOptions): InputEventBufferData;
```

**Parameters:**
- `options` - Buffer configuration options

**Returns:** A new InputEventBufferData.

### pushKeyEvent

Pushes a keyboard event to the buffer.

```typescript
function pushKeyEvent(buffer: InputEventBufferData, event: KeyEvent, timestamp?: number): void;
```

### pushMouseEvent

Pushes a mouse event to the buffer.

```typescript
function pushMouseEvent(buffer: InputEventBufferData, event: MouseEvent, timestamp?: number): void;
```

### drainKeys

Drains all keyboard events from the buffer. Returns events in order (oldest first) and clears the buffer.

```typescript
function drainKeys(buffer: InputEventBufferData): TimestampedKeyEvent[];
```

### drainMouse

Drains all mouse events from the buffer. Returns events in order (oldest first) and clears the buffer.

```typescript
function drainMouse(buffer: InputEventBufferData): TimestampedMouseEvent[];
```

### drainAllEvents

Drains all events (keys and mouse) from the buffer sorted by timestamp.

```typescript
function drainAllEvents(buffer: InputEventBufferData): TimestampedInputEvent[];
```

### peekEvents / peekKeys / peekMouse

Peek at pending events without removing them.

```typescript
function peekEvents(buffer: InputEventBufferData): TimestampedInputEvent[];
function peekKeys(buffer: InputEventBufferData): readonly TimestampedKeyEvent[];
function peekMouse(buffer: InputEventBufferData): readonly TimestampedMouseEvent[];
```

### clearBuffer

Clears all pending events from the buffer.

```typescript
function clearBuffer(buffer: InputEventBufferData): void;
```

### getPendingKeyCount / getPendingMouseCount / getPendingCount

Get counts of pending events.

```typescript
function getPendingKeyCount(buffer: InputEventBufferData): number;
function getPendingMouseCount(buffer: InputEventBufferData): number;
function getPendingCount(buffer: InputEventBufferData): number;
```

### hasPendingEvents

Checks if there are any pending events.

```typescript
function hasPendingEvents(buffer: InputEventBufferData): boolean;
```

### getStats

Gets buffer statistics for debugging.

```typescript
function getStats(buffer: InputEventBufferData): InputBufferStats;
```

### resetStats

Resets buffer statistics.

```typescript
function resetStats(buffer: InputEventBufferData): void;
```

### beginFrame / endFrame

Marks the start and end of frame processing for latency tracking.

```typescript
function beginFrame(buffer: InputEventBufferData): void;
function endFrame(buffer: InputEventBufferData): number;
```

### recordLatency / recordLatencyBatch

Records latency for processed events.

```typescript
function recordLatency(buffer: InputEventBufferData, latencyMs: number): void;
function recordLatencyBatch(buffer: InputEventBufferData, avgLatencyMs: number, eventCount: number): void;
```

### getLatencyStats

Gets latency statistics for input processing.

```typescript
function getLatencyStats(buffer: InputEventBufferData): InputLatencyStats;
```

### resetLatencyStats

Resets latency statistics.

```typescript
function resetLatencyStats(buffer: InputEventBufferData): void;
```

### isLatencyAcceptable

Checks if p95 latency is within acceptable bounds (default: 16ms).

```typescript
function isLatencyAcceptable(buffer: InputEventBufferData, maxLatencyMs?: number): boolean;
```

### isProcessingTimeAcceptable

Checks if average frame processing time is within budget (default: 1ms).

```typescript
function isProcessingTimeAcceptable(buffer: InputEventBufferData, maxProcessingTimeMs?: number): boolean;
```

## Constants

### globalInputBuffer

Global shared input buffer for simple use cases.

```typescript
import { globalInputBuffer, pushKeyEvent, drainAllEvents } from 'blecsd';

pushKeyEvent(globalInputBuffer, event);
const events = drainAllEvents(globalInputBuffer);
```

## Usage Example

```typescript
import {
  createInputEventBuffer,
  pushKeyEvent,
  pushMouseEvent,
  drainKeys,
  drainMouse,
  beginFrame,
  endFrame,
  getLatencyStats,
} from 'blecsd';

const buffer = createInputEventBuffer({
  maxBufferSize: 500,
  warnOnOverflow: true,
});

// Async: push events from stdin
stdinHandler.onKey((event) => pushKeyEvent(buffer, event));
stdinHandler.onMouse((event) => pushMouseEvent(buffer, event));

// Game loop
function update(deltaTime: number) {
  beginFrame(buffer);

  const keys = drainKeys(buffer);
  const mouse = drainMouse(buffer);

  for (const { event, timestamp } of keys) {
    handleKey(event);
    const latency = performance.now() - timestamp;
    recordLatency(buffer, latency);
  }

  endFrame(buffer);

  // Monitor latency
  const stats = getLatencyStats(buffer);
  if (stats.p95 > 16) {
    console.warn(`Input latency: ${stats.p95.toFixed(2)}ms p95`);
  }
}
```
