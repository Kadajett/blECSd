# GPM Mouse Client

Linux console mouse support via the GPM (General Purpose Mouse) daemon.

GPM provides mouse input in Linux virtual consoles (TTYs) where xterm-style mouse protocols are unavailable. This module connects to the GPM daemon via its Unix socket and translates events into the standard `MouseEvent` type.

## Quick Start

```typescript
import {
  createGpmClient,
  connectGpm,
  disconnectGpm,
  onGpmMouse,
  isGpmAvailable,
} from 'blecsd/terminal';

if (isGpmAvailable()) {
  const client = createGpmClient();
  const unsub = onGpmMouse(client, (event) => {
    console.log(`${event.action} ${event.button} at (${event.x}, ${event.y})`);
  });

  await connectGpm(client);

  // Later: cleanup
  unsub();
  disconnectGpm(client);
}
```

## API Reference

### `createGpmClient(config?)`

Creates a new GPM client. The client is not connected until `connectGpm()` is called.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config.socketPath` | `string` | `'/dev/gpmctl'` | Path to GPM daemon socket |
| `config.connectTimeout` | `number` | `1000` | Connection timeout in ms |

**Returns:** `GpmClientState`

```typescript
const client = createGpmClient();
const custom = createGpmClient({ connectTimeout: 500 });
```

### `connectGpm(state)`

Connects to the GPM daemon. Sends the connect packet and begins receiving mouse events.

**Returns:** `Promise<void>` - Resolves when connected, rejects on error or timeout.

```typescript
try {
  await connectGpm(client);
} catch (err) {
  console.log('GPM not available:', err.message);
}
```

### `disconnectGpm(state)`

Disconnects from the GPM daemon. Safe to call even if not connected.

```typescript
disconnectGpm(client);
```

### `onGpmMouse(state, handler)`

Registers a handler for mouse events. Returns an unsubscribe function.

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `GpmClientState` | The client state |
| `handler` | `(event: MouseEvent) => void` | Event callback |

**Returns:** `() => void` - Unsubscribe function

```typescript
const unsub = onGpmMouse(client, (event) => {
  if (event.action === 'press') {
    console.log(`Clicked at ${event.x}, ${event.y}`);
  }
});
unsub(); // Stop listening
```

### `isGpmConnected(state)`

Returns `true` if the client is currently connected.

```typescript
if (isGpmConnected(client)) {
  console.log('GPM active');
}
```

### `isGpmAvailable(socketPath?)`

Checks whether the GPM socket file exists. Does not verify the daemon is running.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `socketPath` | `string` | `'/dev/gpmctl'` | Socket path to check |

**Returns:** `boolean`

```typescript
if (isGpmAvailable()) {
  // GPM daemon is likely running
}
```

### `parseGpmEvent(data)`

Parses a raw 28-byte GPM event buffer into a `MouseEvent`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Buffer` | Raw 28-byte GPM event |

**Returns:** `MouseEvent | null`

### `buildConnectPacket(pid, vc)`

Builds the 16-byte GPM connect packet.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pid` | `number` | Client process ID |
| `vc` | `number` | Virtual console number |

**Returns:** `Buffer`

### `detectVirtualConsole()`

Detects the current virtual console number from the `XDG_VTNR` environment variable.

**Returns:** `number` (0 if detection fails)

## Mouse Event Shape

GPM events are converted to the standard `MouseEvent` interface:

```typescript
interface MouseEvent {
  readonly x: number;        // 0-indexed column
  readonly y: number;        // 0-indexed row
  readonly button: MouseButton;  // 'left' | 'middle' | 'right' | 'unknown'
  readonly action: MouseAction;  // 'press' | 'release' | 'move' | 'wheel'
  readonly ctrl: boolean;
  readonly meta: boolean;    // Always false for GPM
  readonly shift: boolean;
  readonly protocol: 'x10';  // GPM maps to X10 protocol semantics
  readonly raw: Uint8Array;
}
```

## GPM Protocol Details

- **Socket:** `/dev/gpmctl` (Unix domain socket)
- **Connect packet:** 16 bytes (event mask, default mask, min/max modifiers, PID, VC)
- **Event packet:** 28 bytes (buttons, modifiers, position, type, clicks, margin, wheel)
- **Coordinates:** 1-based from GPM, converted to 0-based in `MouseEvent`
- **Modifiers:** Shift and Ctrl are supported; Alt/Meta is not reported by GPM

## Configuration Schema

```typescript
import { GpmClientConfigSchema } from 'blecsd/terminal';

const config = GpmClientConfigSchema.parse({
  socketPath: '/dev/gpmctl',
  connectTimeout: 2000,
});
```
