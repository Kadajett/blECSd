# SSH Server

Provides an SSH server for secure remote terminal access to blECSd applications.

## Overview

The SSH server uses the `ssh2` package to provide authenticated, encrypted access to your blECSd terminal applications. Each connecting client receives its own `StreamSession` with proper PTY dimensions and supports both key-based and password authentication.

**Features:**
- Public key authentication
- Password authentication (optional)
- PTY (pseudo-terminal) support with window resize
- Secure encrypted connections
- Multi-client support

## Prerequisites

The `ssh2` package is required as a peer dependency:

```bash
npm install ssh2
```

## Imports

```typescript
import {
  createSSHServer,
  startSSHServer,
  stopSSHServer,
  getSSHClientCount,
  type SSHServerConfig,
  type SSHServerState,
  type SSHAuthorizedKey,
} from 'blecsd/terminal';
```

## Basic Usage

```typescript
import { createSSHServer, startSSHServer, stopSSHServer } from 'blecsd/terminal';
import { writeToSession } from 'blecsd/terminal';
import { readFileSync } from 'node:fs';

const server = createSSHServer({
  port: 2222,
  hostKey: readFileSync('/path/to/host_key'),
  onSession: (session, username) => {
    writeToSession(session, `Welcome via SSH, ${username}!\r\n`);
  },
});

await startSSHServer(server);
```

## API

### `createSSHServer(config)`

Create an SSH server.

**Parameters:**
- `config: SSHServerConfig` — Server configuration

**Returns:** `SSHServerState`

**Example:**
```typescript
const server = createSSHServer({
  port: 2222,
  host: '0.0.0.0',
  hostKey: readFileSync('./host_key'),
  authorizedKeys: [
    { key: readFileSync('./authorized_keys/user1.pub') },
    { key: readFileSync('./authorized_keys/user2.pub'), comment: 'user2@example.com' },
  ],
  maxClients: 10,
  onSession: (session, username) => {
    console.log(`User ${username} connected`);
    // Handle session
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
  serverIdent: 'MyApp_SSH_v1',
});
```

### `startSSHServer(state)`

Start the SSH server, accepting connections.

**Parameters:**
- `state: SSHServerState` — Server state returned from `createSSHServer`

**Returns:** `Promise<void>` — Resolves when the server is listening

**Throws:** `Error` if the `ssh2` package is not installed

**Example:**
```typescript
try {
  await startSSHServer(server);
  console.log('SSH server listening on port 2222');
} catch (err) {
  console.error('Failed to start SSH server:', err);
}
```

### `stopSSHServer(state)`

Stop the SSH server and disconnect all clients.

**Parameters:**
- `state: SSHServerState` — Server state

**Returns:** `Promise<void>` — Resolves when the server has stopped

**Example:**
```typescript
await stopSSHServer(server);
console.log('SSH server stopped');
```

### `getSSHClientCount(state)`

Get the number of active SSH sessions.

**Parameters:**
- `state: SSHServerState` — Server state

**Returns:** `number`

**Example:**
```typescript
const activeClients = getSSHClientCount(server);
console.log(`Active SSH clients: ${activeClients}`);
```

## Types

### `SSHServerConfig`

Configuration for the SSH server.

```typescript
interface SSHServerConfig {
  /** TCP port to listen on */
  readonly port: number;
  /** Host to bind to (default: '0.0.0.0') */
  readonly host?: string;
  /** Host private key (PEM format) */
  readonly hostKey: Buffer | string;
  /** Authorized public keys for authentication */
  readonly authorizedKeys?: readonly SSHAuthorizedKey[];
  /** Allow password authentication (default: false) */
  readonly allowPassword?: boolean;
  /** Password validation function (required if allowPassword is true) */
  readonly validatePassword?: (username: string, password: string) => boolean;
  /** Maximum concurrent clients (default: 10) */
  readonly maxClients?: number;
  /** Called when a new client session is established */
  readonly onSession?: (session: StreamSession, username: string) => void;
  /** Called when a session ends */
  readonly onSessionEnd?: (sessionId: string, reason: string) => void;
  /** Server identification string (default: 'blECSd_SSH') */
  readonly serverIdent?: string;
}
```

### `SSHServerState`

SSH server state object.

```typescript
interface SSHServerState {
  /** Server configuration */
  readonly config: SSHServerConfig;
  /** Whether the server is listening */
  running: boolean;
  /** Active sessions */
  readonly sessions: Map<string, StreamSession>;
  /** Internal server reference */
  _server: SSH2ServerInstance | null;
}
```

### `SSHAuthorizedKey`

Authorized key entry for SSH authentication.

```typescript
interface SSHAuthorizedKey {
  /** The public key data (OpenSSH format or raw Buffer) */
  readonly key: Buffer | string;
  /** Optional comment/username associated with the key */
  readonly comment?: string;
}
```

## Authentication

### Public Key Authentication

Load authorized keys from files:

```typescript
import { readFileSync } from 'node:fs';

const server = createSSHServer({
  port: 2222,
  hostKey: readFileSync('./host_key'),
  authorizedKeys: [
    { key: readFileSync('./keys/alice.pub'), comment: 'alice' },
    { key: readFileSync('./keys/bob.pub'), comment: 'bob' },
  ],
  onSession: (session, username) => {
    writeToSession(session, `Authenticated as ${username}\r\n`);
  },
});
```

### Password Authentication

Enable password authentication with a validation function:

```typescript
const server = createSSHServer({
  port: 2222,
  hostKey: readFileSync('./host_key'),
  allowPassword: true,
  validatePassword: (username, password) => {
    // Example: simple username/password check
    const users = {
      alice: 'password123',
      bob: 'secret456',
    };
    return users[username] === password;
  },
  onSession: (session, username) => {
    writeToSession(session, `Welcome, ${username}!\r\n`);
  },
});
```

### No Authentication (Development Only)

For development/testing, omit both `authorizedKeys` and `allowPassword`:

```typescript
const server = createSSHServer({
  port: 2222,
  hostKey: readFileSync('./host_key'),
  // No auth configured — accepts any connection
  onSession: (session, username) => {
    writeToSession(session, 'Connected (no auth)\r\n');
  },
});
```

## Generating Host Keys

Use `ssh-keygen` to generate a host key:

```bash
ssh-keygen -t rsa -b 4096 -f ./host_key -N ""
```

## Complete Example

```typescript
import { createSSHServer, startSSHServer, stopSSHServer } from 'blecsd/terminal';
import { writeToSession } from 'blecsd/terminal';
import { readFileSync } from 'node:fs';

// Create server with key auth
const server = createSSHServer({
  port: 2222,
  host: '127.0.0.1',
  hostKey: readFileSync('./host_key'),
  authorizedKeys: [
    { key: readFileSync('./authorized_keys/admin.pub'), comment: 'admin' },
  ],
  maxClients: 5,
  onSession: (session, username) => {
    writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen
    writeToSession(session, `Welcome to blECSd, ${username}!\r\n\r\n`);
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
await startSSHServer(server);
console.log('SSH server listening on 127.0.0.1:2222');

// Graceful shutdown
process.on('SIGINT', async () => {
  await stopSSHServer(server);
  process.exit(0);
});
```

## Client Connection

Connect using any SSH client:

```bash
# With key authentication
ssh -p 2222 -i ~/.ssh/id_rsa user@localhost

# With password authentication
ssh -p 2222 user@localhost
```

## See Also

- [Custom Streams](./custom-streams.md) — Low-level stream session API
- [Telnet Server](./telnet-server.md) — Alternative without encryption
- [Server App](./server-app.md) — Higher-level server application framework
