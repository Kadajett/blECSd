# Custom Streams

Low-level API for integrating any Readable/Writable stream pair with the blECSd terminal system.

## Overview

The custom stream API allows you to use any Node.js stream as terminal input/output, enabling integration with telnet, SSH, websockets, or any custom transport layer. Each stream pair creates a `StreamSession` that provides a normalized interface for terminal I/O.

**Use Cases:**
- Building custom network protocols
- Bridging to non-standard transports
- Testing terminal applications with mock streams
- Creating custom server implementations

## Imports

```typescript
import {
  createStreamSession,
  writeToSession,
  endSession,
  type StreamSession,
  type StreamSessionConfig,
  type StreamDataHandler,
  type StreamResizeHandler,
  type StreamCloseHandler,
} from 'blecsd/terminal';
```

## Basic Usage

```typescript
import { createStreamSession, writeToSession, endSession } from 'blecsd/terminal';
import { PassThrough } from 'node:stream';

const input = new PassThrough();
const output = new PassThrough();

const session = createStreamSession({
  input,
  output,
  width: 80,
  height: 24,
});

// Write terminal output to the session
writeToSession(session, '\x1b[2J\x1b[HHello!');

// Read input events
session.onData((data) => console.log('Input:', data));

// Clean up
endSession(session);
```

## API

### `createStreamSession(config)`

Create a stream session from any Readable/Writable pair.

**Parameters:**
- `config: StreamSessionConfig` — Session configuration

**Returns:** `StreamSession`

**Example:**
```typescript
import { PassThrough } from 'node:stream';

const session = createStreamSession({
  input: new PassThrough(),
  output: new PassThrough(),
  width: 80,
  height: 24,
  termType: 'xterm-256color',
  encoding: 'utf-8',
});
```

### `writeToSession(session, data)`

Write terminal output data to a stream session.

**Parameters:**
- `session: StreamSession` — The stream session
- `data: string` — Terminal output data (ANSI sequences, text, etc.)

**Returns:** `boolean` — Whether the write succeeded

**Example:**
```typescript
// Write with ANSI codes
writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen and home
writeToSession(session, '\x1b[1;32mGreen text\x1b[0m\r\n');

// Write plain text
writeToSession(session, 'Hello, world!\r\n');
```

### `endSession(session, reason?)`

End a stream session, cleaning up resources.

**Parameters:**
- `session: StreamSession` — The stream session to end
- `reason?: string` — Optional reason for ending (default: 'ended')

**Example:**
```typescript
endSession(session, 'user disconnected');
```

## Types

### `StreamSessionConfig`

Configuration for creating a custom stream session.

```typescript
interface StreamSessionConfig {
  /** Readable stream for input (e.g., socket, stdin, PassThrough) */
  readonly input: Readable;
  /** Writable stream for output (e.g., socket, stdout, PassThrough) */
  readonly output: Writable;
  /** Terminal width (default: 80) */
  readonly width?: number;
  /** Terminal height (default: 24) */
  readonly height?: number;
  /** Terminal type identifier (default: 'xterm') */
  readonly termType?: string;
  /** Encoding for input data (default: 'utf-8') */
  readonly encoding?: BufferEncoding;
}
```

### `StreamSession`

A stream-based terminal session.

```typescript
interface StreamSession {
  /** Unique session ID */
  readonly id: string;
  /** Terminal width */
  width: number;
  /** Terminal height */
  height: number;
  /** Terminal type */
  readonly termType: string;
  /** Whether the session is active */
  active: boolean;
  /** The underlying input stream */
  readonly input: Readable;
  /** The underlying output stream */
  readonly output: Writable;
  /** Register a data handler */
  onData(handler: StreamDataHandler): () => void;
  /** Register a resize handler */
  onResize(handler: StreamResizeHandler): () => void;
  /** Register a close handler */
  onClose(handler: StreamCloseHandler): () => void;
  /** Emit a resize event (used by transport layers like telnet NAWS) */
  emitResize(width: number, height: number): void;
}
```

### Handler Types

```typescript
/** Data handler callback */
type StreamDataHandler = (data: string) => void;

/** Resize handler callback */
type StreamResizeHandler = (width: number, height: number) => void;

/** Close handler callback */
type StreamCloseHandler = (reason: string) => void;
```

## Event Handling

### Data Events

Handle incoming terminal input:

```typescript
const unsubscribe = session.onData((data) => {
  console.log('Received:', data);
  
  // Echo back
  writeToSession(session, data);
  
  // Check for Ctrl+C
  if (data === '\x03') {
    endSession(session, 'Ctrl+C');
  }
});

// Later: unsubscribe
unsubscribe();
```

### Resize Events

Handle terminal window size changes:

```typescript
session.onResize((width, height) => {
  console.log(`Terminal resized to ${width}x${height}`);
  
  // Redraw your UI with new dimensions
  redrawUI(width, height);
});

// Manually trigger resize (for protocol implementations)
session.emitResize(120, 30);
```

### Close Events

Handle session termination:

```typescript
session.onClose((reason) => {
  console.log(`Session closed: ${reason}`);
  
  // Cleanup application state
  cleanup();
});
```

## Complete Example: Echo Server

```typescript
import { createStreamSession, writeToSession, endSession } from 'blecsd/terminal';
import { createServer } from 'node:net';
import { PassThrough } from 'node:stream';

const server = createServer((socket) => {
  const inputStream = new PassThrough();
  const outputStream = new PassThrough();

  const session = createStreamSession({
    input: inputStream,
    output: outputStream,
    width: 80,
    height: 24,
    termType: 'xterm',
  });

  // Forward socket data to input stream
  socket.on('data', (data) => inputStream.write(data));

  // Forward output stream to socket
  outputStream.on('data', (chunk) => socket.write(chunk));

  // Handle disconnection
  socket.on('close', () => {
    endSession(session, 'socket closed');
  });

  // Welcome message
  writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen
  writeToSession(session, 'Welcome to Echo Server!\r\n\r\n');
  writeToSession(session, '> ');

  // Echo handler
  session.onData((data) => {
    if (data === '\x03') { // Ctrl+C
      writeToSession(session, '\r\nGoodbye!\r\n');
      socket.end();
      return;
    }

    if (data === '\r' || data === '\n') {
      writeToSession(session, '\r\n> ');
    } else {
      writeToSession(session, data); // Echo
    }
  });

  session.onResize((width, height) => {
    console.log(`Client resized: ${width}x${height}`);
  });

  session.onClose((reason) => {
    console.log(`Session ended: ${reason}`);
  });
});

server.listen(3000, () => {
  console.log('Echo server listening on port 3000');
});
```

## Integration with Transport Protocols

### Telnet Example

For telnet integration, use the higher-level [Telnet Server](./telnet-server.md) API, which handles protocol negotiation automatically.

### WebSocket Example

```typescript
import { WebSocketServer } from 'ws';
import { createStreamSession, writeToSession } from 'blecsd/terminal';
import { PassThrough } from 'node:stream';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  const input = new PassThrough();
  const output = new PassThrough();

  const session = createStreamSession({ input, output });

  // WebSocket → input stream
  ws.on('message', (data) => input.write(data.toString()));

  // Output stream → WebSocket
  output.on('data', (chunk) => ws.send(chunk.toString()));

  // Cleanup
  ws.on('close', () => endSession(session, 'websocket closed'));

  // App logic
  writeToSession(session, 'Connected via WebSocket!\r\n');
});
```

## Testing with Mock Streams

```typescript
import { createStreamSession, writeToSession } from 'blecsd/terminal';
import { PassThrough } from 'node:stream';

// Create mock streams
const input = new PassThrough();
const output = new PassThrough();

const session = createStreamSession({ input, output });

// Capture output
const outputData: string[] = [];
output.on('data', (chunk) => outputData.push(chunk.toString()));

// Simulate input
session.onData((data) => {
  writeToSession(session, `Echo: ${data}\r\n`);
});

input.write('Hello');
input.write('\r\n');

// Assert
console.log(outputData); // ['Echo: Hello\r\n']
```

## See Also

- [Telnet Server](./telnet-server.md) — Telnet protocol with automatic negotiation
- [SSH Server](./ssh-server.md) — SSH protocol with authentication
- [Server App](./server-app.md) — Higher-level server application framework
