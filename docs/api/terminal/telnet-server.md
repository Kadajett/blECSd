# Telnet Server

Implements a telnet server with proper protocol negotiation for blECSd terminal applications.

## Overview

The telnet server provides a network interface for remote terminal access to your blECSd applications. Each connecting client receives its own `StreamSession` for integration with the blECSd terminal system.

**Protocol Support:**
- NAWS (Negotiate About Window Size, RFC 1073)
- TTYPE (Terminal Type, RFC 1091)
- SGA (Suppress Go Ahead)
- ECHO

## Imports

```typescript
import {
  createTelnetServer,
  startTelnetServer,
  stopTelnetServer,
  getTelnetClientCount,
  type TelnetServerConfig,
  type TelnetServerState,
} from 'blecsd/terminal';
```

## Basic Usage

```typescript
import { createTelnetServer, startTelnetServer, stopTelnetServer } from 'blecsd/terminal';
import { writeToSession } from 'blecsd/terminal';

const server = createTelnetServer({
  port: 2323,
  onSession: (session) => {
    writeToSession(session, 'Welcome to blECSd!\r\n');
    session.onData((data) => console.log('Input:', data));
  },
});

await startTelnetServer(server);
```

## API

### `createTelnetServer(config)`

Create a telnet server.

**Parameters:**
- `config: TelnetServerConfig` — Server configuration

**Returns:** `TelnetServerState`

**Example:**
```typescript
const server = createTelnetServer({
  port: 2323,
  host: '0.0.0.0',
  maxClients: 10,
  onSession: (session) => {
    // Handle new client session
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
});
```

### `startTelnetServer(state)`

Start the telnet server, accepting connections.

**Parameters:**
- `state: TelnetServerState` — Server state returned from `createTelnetServer`

**Returns:** `Promise<void>` — Resolves when the server is listening

**Example:**
```typescript
await startTelnetServer(server);
console.log('Telnet server listening on port 2323');
```

### `stopTelnetServer(state)`

Stop the telnet server and disconnect all clients.

**Parameters:**
- `state: TelnetServerState` — Server state

**Returns:** `Promise<void>` — Resolves when the server has stopped

**Example:**
```typescript
await stopTelnetServer(server);
console.log('Telnet server stopped');
```

### `getTelnetClientCount(state)`

Get the number of active telnet sessions.

**Parameters:**
- `state: TelnetServerState` — Server state

**Returns:** `number`

**Example:**
```typescript
const activeClients = getTelnetClientCount(server);
console.log(`Active clients: ${activeClients}`);
```

## Types

### `TelnetServerConfig`

Configuration for the telnet server.

```typescript
interface TelnetServerConfig {
  /** TCP port to listen on */
  readonly port: number;
  /** Host to bind to (default: '0.0.0.0') */
  readonly host?: string;
  /** Maximum concurrent clients (default: 10) */
  readonly maxClients?: number;
  /** Called when a new client session is established */
  readonly onSession?: (session: StreamSession) => void;
  /** Called when a session ends */
  readonly onSessionEnd?: (sessionId: string, reason: string) => void;
}
```

### `TelnetServerState`

Telnet server state object.

```typescript
interface TelnetServerState {
  /** Server configuration */
  readonly config: TelnetServerConfig;
  /** Whether the server is listening */
  running: boolean;
  /** Active sessions */
  readonly sessions: Map<string, StreamSession>;
  /** Internal TCP server */
  _server: Server | null;
}
```

## Complete Example

```typescript
import { createTelnetServer, startTelnetServer, stopTelnetServer } from 'blecsd/terminal';
import { createStreamSession, writeToSession } from 'blecsd/terminal';

// Create server
const server = createTelnetServer({
  port: 2323,
  host: '127.0.0.1',
  maxClients: 5,
  onSession: (session) => {
    writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen
    writeToSession(session, 'Welcome to blECSd Terminal!\r\n\r\n');
    writeToSession(session, '> ');

    session.onData((data) => {
      const input = data.toString();
      if (input === '\r' || input === '\n') {
        writeToSession(session, '\r\n> ');
      } else if (input === '\x03') { // Ctrl+C
        writeToSession(session, '\r\nGoodbye!\r\n');
        session.input.end();
      } else {
        writeToSession(session, input); // Echo
      }
    });

    session.onResize((width, height) => {
      console.log(`Client resized: ${width}x${height}`);
    });
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
});

// Start server
await startTelnetServer(server);
console.log('Telnet server listening on 127.0.0.1:2323');

// Graceful shutdown
process.on('SIGINT', async () => {
  await stopTelnetServer(server);
  process.exit(0);
});
```

## Protocol Details

The server automatically handles telnet protocol negotiation:

1. **ECHO**: Server echoes client input (suppresses client local echo)
2. **SGA**: Suppress Go Ahead for line-at-a-time operation
3. **NAWS**: Negotiates terminal window size, updates session on resize
4. **TTYPE**: Requests client terminal type

All protocol handling is transparent — you work with clean data streams through the `StreamSession` interface.

## See Also

- [Custom Streams](./custom-streams.md) — Low-level stream session API
- [SSH Server](./ssh-server.md) — SSH alternative with authentication
- [Server App](./server-app.md) — Higher-level server application framework
