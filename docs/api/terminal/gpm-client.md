# GPM Mouse Client

Linux console mouse support via the GPM (General Purpose Mouse) daemon.

GPM provides mouse input in Linux virtual consoles (TTYs) where xterm-style mouse protocols are unavailable. This module connects to the GPM daemon via its Unix socket and translates events into the standard `MouseEvent` type.

## Quick Start

```typescript
import {
  createGpmClient,
  isGpmAvailable,
  parseGpmEventBuffer,
  gpmEventToMouseEvent,
} from 'blecsd';

if (isGpmAvailable()) {
  const client = createGpmClient();

  client.onMouse((event) => {
    console.log(`${event.action} ${event.button} at ${event.x},${event.y}`);
  });

  if (client.connect()) {
    console.log('GPM connected');
  }

  // Clean up
  client.disconnect();
}
```

## Types

### GpmEventType

GPM event type constants (from gpm.h).

```typescript
const GpmEventType = {
  MOVE: 1,
  DRAG: 2,
  DOWN: 4,
  UP: 8,
  SINGLE: 16,
  DOUBLE: 32,
  TRIPLE: 64,
  MFLAG: 128,
  HARD: 256,
  ENTER: 512,
  LEAVE: 1024,
} as const;
```

### GpmButton

GPM button mask constants (from gpm.h).

```typescript
const GpmButton = {
  NONE: 0,
  LEFT: 4,
  MIDDLE: 2,
  RIGHT: 1,
  FOURTH: 8,
  UP: 16,
  DOWN: 32,
} as const;
```

### GpmClientConfig

```typescript
interface GpmClientConfig {
  readonly socketPath: string;    // Default: '/dev/gpmctl'
  readonly eventMask: number;     // Default: 0xffff (all events)
  readonly defaultMask: number;   // Default: 0
  readonly minMod: number;        // Default: 0
  readonly maxMod: number;        // Default: 0xffff
  readonly pid: number;           // Default: process.pid
  readonly vc: number;            // Default: auto-detect
}
```

### GpmRawEvent

Raw GPM event structure (20 bytes), matching the C struct `Gpm_Event`.

```typescript
interface GpmRawEvent {
  readonly buttons: number;
  readonly modifiers: number;
  readonly vc: number;
  readonly dx: number;
  readonly dy: number;
  readonly x: number;
  readonly y: number;
  readonly type: number;
  readonly clicks: number;
}
```

### GpmClientState

```typescript
interface GpmClientState {
  readonly connected: boolean;
  readonly available: boolean;
  readonly config: GpmClientConfig;
}
```

### GpmClient

```typescript
interface GpmClient {
  readonly state: GpmClientState;
  onMouse(handler: (event: MouseEvent) => void): () => void;
  onConnectionChange(handler: (connected: boolean) => void): () => void;
  connect(): boolean;
  disconnect(): void;
  isAvailable(): boolean;
}
```

## Functions

### parseGpmEventBuffer

Parses a raw GPM event buffer (20 bytes) into a `GpmRawEvent`.

```typescript
function parseGpmEventBuffer(buffer: Uint8Array): GpmRawEvent | null
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseGpmEventBuffer } from 'blecsd';

const raw = parseGpmEventBuffer(buffer);
if (raw) {
  console.log(`Mouse at ${raw.x}, ${raw.y}`);
}
```

### gpmButtonToMouseButton

Converts GPM button flags to a `MouseButton` identifier.

```typescript
function gpmButtonToMouseButton(buttons: number): MouseButton
```

### gpmTypeToMouseAction

Converts GPM event type to a `MouseAction`.

```typescript
function gpmTypeToMouseAction(type: number, buttons: number): MouseAction
```

### parseGpmModifiers

Extracts modifier state from GPM modifier byte.

```typescript
function parseGpmModifiers(modifiers: number): { shift: boolean; meta: boolean; ctrl: boolean }
```

### gpmEventToMouseEvent

Converts a GPM raw event to a standard `MouseEvent`. Coordinates are converted from 1-indexed (GPM) to 0-indexed.

```typescript
function gpmEventToMouseEvent(raw: GpmRawEvent): MouseEvent
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseGpmEventBuffer, gpmEventToMouseEvent } from 'blecsd';

const raw = parseGpmEventBuffer(buffer);
if (raw) {
  const event = gpmEventToMouseEvent(raw);
  console.log(`${event.action} at ${event.x}, ${event.y}`);
}
```

### buildGpmConnectPacket

Builds the 16-byte GPM connection request packet.

```typescript
function buildGpmConnectPacket(config: GpmClientConfig): Uint8Array
```

### detectVirtualConsole

Detects the virtual console number from the `GPM_TTY` environment variable.

```typescript
function detectVirtualConsole(): number
```

**Returns:** The VC number, or 0 if not on a Linux console.

### isGpmAvailable

Checks if GPM is likely available on this system (Linux-only, virtual console).

```typescript
function isGpmAvailable(): boolean
```

```typescript
import { isGpmAvailable } from 'blecsd';

if (isGpmAvailable()) {
  const client = createGpmClient();
  client.connect();
}
```

### createGpmClient

Creates a GPM mouse client for Linux console mouse support.

```typescript
function createGpmClient(config?: Partial<GpmClientConfig>): GpmClient
```

```typescript
import { createGpmClient, isGpmAvailable } from 'blecsd';

if (isGpmAvailable()) {
  const client = createGpmClient();

  client.onMouse((event) => {
    console.log(`${event.action} ${event.button} at ${event.x},${event.y}`);
  });

  if (client.connect()) {
    console.log('GPM connected');
  }

  client.disconnect();
}
```

## GPM Protocol Details

- **Socket:** `/dev/gpmctl` (Unix domain socket)
- **Connect packet:** 16 bytes (eventMask, defaultMask, minMod, maxMod, pid, vc)
- **Event packet:** 20 bytes (buttons, modifiers, vc, dx, dy, x, y, type, clicks)
- **Coordinates:** 1-based from GPM, converted to 0-based in `MouseEvent`
- **Protocol mapping:** GPM events map to `x10` protocol semantics

## Zod Schema

```typescript
import { GpmClientConfigSchema } from 'blecsd';

const config = GpmClientConfigSchema.parse({
  socketPath: '/dev/gpmctl',
  eventMask: 0xffff,
});
```

## See Also

- [Mouse Parser](./mouse-parser.md) - Terminal mouse protocol parsing
