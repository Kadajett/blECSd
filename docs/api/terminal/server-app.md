# Server App

Unified server application factory for creating TCP, Telnet, and SSH servers.

## Overview

The `createServerApp` function provides a single entry point for creating network-accessible terminal applications. Each client connection receives its own `StreamSession` for integration with the blECSd terminal system.

**Supported Modes:**
- **TCP** — Raw TCP socket connections (no protocol)
- **Telnet** — Telnet protocol with NAWS and TTYPE negotiation
- **SSH** — SSH protocol with public key or password authentication

## Imports

```typescript
import {
  createServerApp,
  type ServerApp,
  type ServerAppConfig,
  type TCPServerAppConfig,
  type TelnetServerAppConfig,
  type SSHServerAppConfig,
} from 'blecsd/terminal';
```

## Basic Usage

```typescript
import { createServerApp } from 'blecsd/terminal';
import { writeToSession } from 'blecsd/terminal';

// Create a telnet server
const app = createServerApp({
  mode: 'telnet',
  port: 2323,
  onSession: (session) => {
    writeToSession(session, 'Welcome to blECSd!\r\n');
  },
});

// Start the server
await app.start();
console.log(`Listening on port ${app.port}`);

// Later: stop the server
await app.stop();
```

## API

### `createServerApp(config)`

Create a server app for the specified mode.

**Parameters:**
- `config: ServerAppConfig` — Server configuration with mode and mode-specific options

**Returns:** `ServerApp` — A server instance with start/stop methods

**Example:**
```typescript
// TCP mode
const tcp = createServerApp({
  mode: 'tcp',
  port: 3000,
  onSession: (session) => {
    // Handle session
  },
});

// Telnet mode (with NAWS + TTYPE negotiation)
const telnet = createServerApp({
  mode: 'telnet',
  port: 2323,
  onSession: (session) => {
    // Handle session
  },
});

// SSH mode (with key auth)
const ssh = createServerApp({
  mode: 'ssh',
  port: 2222,
  hostKey: readFileSync('host_key'),
  authorizedKeys: [
    { key: readFileSync('user.pub') },
  ],
  onSession: (session, username) => {
    console.log(`User ${username} connected`);
    // Handle session
  },
});
```

## Types

### `ServerApp`

Running server app instance.

```typescript
interface ServerApp {
  /** Server mode */
  readonly mode: ServerMode;
  /** Port the server is listening on */
  readonly port: number;
  /** Whether the server is running */
  readonly running: boolean;
  /** Number of active client sessions */
  readonly clientCount: number;
  /** Active sessions */
  readonly sessions: ReadonlyMap<string, StreamSession>;
  /** Start the server */
  start(): Promise<void>;
  /** Stop the server and disconnect all clients */
  stop(): Promise<void>;
}
```

### `TCPServerAppConfig`

TCP-specific configuration.

```typescript
interface TCPServerAppConfig {
  readonly mode: 'tcp';
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

### `TelnetServerAppConfig`

Telnet-specific configuration.

```typescript
interface TelnetServerAppConfig {
  readonly mode: 'telnet';
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

### `SSHServerAppConfig`

SSH-specific configuration.

```typescript
interface SSHServerAppConfig {
  readonly mode: 'ssh';
  /** TCP port to listen on */
  readonly port: number;
  /** Host to bind to (default: '0.0.0.0') */
  readonly host?: string;
  /** Host private key (PEM format) */
  readonly hostKey: Buffer | string;
  /** Authorized public keys */
  readonly authorizedKeys?: SSHAuthorizedKey[];
  /** Allow password authentication */
  readonly allowPassword?: boolean;
  /** Password validation function */
  readonly validatePassword?: (username: string, password: string) => boolean;
  /** Maximum concurrent clients (default: 10) */
  readonly maxClients?: number;
  /** Called when a new client session is established */
  readonly onSession?: (session: StreamSession, username: string) => void;
  /** Called when a session ends */
  readonly onSessionEnd?: (sessionId: string, reason: string) => void;
  /** Server identification string */
  readonly serverIdent?: string;
}
```

## Server Modes

### TCP Mode

Raw TCP socket connections with no protocol negotiation.

```typescript
const app = createServerApp({
  mode: 'tcp',
  port: 3000,
  host: '127.0.0.1',
  maxClients: 5,
  onSession: (session) => {
    writeToSession(session, 'Connected via TCP\r\n');
    
    session.onData((data) => {
      writeToSession(session, `Echo: ${data}`);
    });
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
});

await app.start();
```

**Use Cases:**
- Custom binary protocols
- Simple text-based protocols
- Testing and debugging

### Telnet Mode

Telnet protocol with automatic negotiation for window size and terminal type.

```typescript
const app = createServerApp({
  mode: 'telnet',
  port: 2323,
  onSession: (session) => {
    writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen
    writeToSession(session, 'Welcome to Telnet Server!\r\n');
    
    session.onResize((width, height) => {
      console.log(`Terminal resized: ${width}x${height}`);
    });
    
    session.onData((data) => {
      if (data === '\x03') { // Ctrl+C
        writeToSession(session, '\r\nGoodbye!\r\n');
        session.input.end();
      } else {
        writeToSession(session, data); // Echo
      }
    });
  },
});

await app.start();
console.log('Telnet server on port 2323');
```

**Protocol Support:**
- NAWS (Negotiate About Window Size)
- TTYPE (Terminal Type)
- SGA (Suppress Go Ahead)
- ECHO

**Use Cases:**
- Interactive terminal applications
- MUD/text games
- Remote administration tools

### SSH Mode

SSH protocol with public key or password authentication.

```typescript
import { readFileSync } from 'node:fs';

const app = createServerApp({
  mode: 'ssh',
  port: 2222,
  hostKey: readFileSync('./host_key'),
  authorizedKeys: [
    { key: readFileSync('./keys/admin.pub'), comment: 'admin' },
    { key: readFileSync('./keys/user.pub'), comment: 'user' },
  ],
  onSession: (session, username) => {
    writeToSession(session, `Welcome, ${username}!\r\n\r\n`);
    
    session.onData((data) => {
      // Handle user input
      writeToSession(session, data);
    });
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
});

await app.start();
console.log('SSH server on port 2222');
```

**Authentication Options:**
- Public key (most secure)
- Password (requires `allowPassword: true` and `validatePassword`)
- No auth (development only — omit both options)

**Use Cases:**
- Secure remote access
- Production deployments
- Multi-user systems

## Complete Example: Multi-Protocol Server

```typescript
import { createServerApp, writeToSession } from 'blecsd/terminal';
import { readFileSync } from 'node:fs';

// Session handler (shared across modes)
function handleSession(session: StreamSession, info?: string) {
  const greeting = info ? `Welcome, ${info}!` : 'Welcome!';
  writeToSession(session, '\x1b[2J\x1b[H'); // Clear screen
  writeToSession(session, `${greeting}\r\n\r\n`);
  writeToSession(session, '> ');

  session.onData((data) => {
    const input = data.toString();
    
    if (input === '\x03') { // Ctrl+C
      writeToSession(session, '\r\nGoodbye!\r\n');
      session.input.end();
      return;
    }
    
    if (input === '\r' || input === '\n') {
      writeToSession(session, '\r\n> ');
    } else {
      writeToSession(session, input); // Echo
    }
  });

  session.onResize((width, height) => {
    console.log(`Session ${session.id} resized: ${width}x${height}`);
  });

  session.onClose((reason) => {
    console.log(`Session ${session.id} closed: ${reason}`);
  });
}

// Create multiple servers
const servers = [
  // TCP on port 3000
  createServerApp({
    mode: 'tcp',
    port: 3000,
    onSession: handleSession,
  }),

  // Telnet on port 2323
  createServerApp({
    mode: 'telnet',
    port: 2323,
    onSession: handleSession,
  }),

  // SSH on port 2222
  createServerApp({
    mode: 'ssh',
    port: 2222,
    hostKey: readFileSync('./host_key'),
    authorizedKeys: [
      { key: readFileSync('./keys/admin.pub') },
    ],
    onSession: (session, username) => handleSession(session, username),
  }),
];

// Start all servers
await Promise.all(servers.map(s => s.start()));

console.log('All servers started:');
servers.forEach(s => {
  console.log(`- ${s.mode.toUpperCase()} on port ${s.port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await Promise.all(servers.map(s => s.stop()));
  process.exit(0);
});
```

## Server Management

### Starting a Server

```typescript
const app = createServerApp({ mode: 'tcp', port: 3000, onSession: () => {} });

try {
  await app.start();
  console.log(`Server listening on port ${app.port}`);
} catch (err) {
  console.error('Failed to start server:', err);
}
```

### Stopping a Server

```typescript
await app.stop();
console.log('Server stopped');
```

### Monitoring Client Count

```typescript
setInterval(() => {
  console.log(`Active clients: ${app.clientCount}`);
}, 5000);
```

### Accessing Sessions

```typescript
for (const [id, session] of app.sessions) {
  console.log(`Session ${id}: ${session.width}x${session.height}`);
}
```

## SSH Server Setup

### Generate Host Key

```bash
ssh-keygen -t rsa -b 4096 -f ./host_key -N ""
```

### Generate User Keys

```bash
ssh-keygen -t rsa -b 4096 -f ./keys/admin -N ""
```

### Password Authentication

```typescript
const app = createServerApp({
  mode: 'ssh',
  port: 2222,
  hostKey: readFileSync('./host_key'),
  allowPassword: true,
  validatePassword: (username, password) => {
    const users = {
      admin: 'secret123',
      guest: 'guest',
    };
    return users[username] === password;
  },
  onSession: (session, username) => {
    writeToSession(session, `Logged in as ${username}\r\n`);
  },
});
```

## Error Handling

```typescript
const app = createServerApp({
  mode: 'telnet',
  port: 2323,
  onSession: (session) => {
    try {
      writeToSession(session, 'Welcome!\r\n');
    } catch (err) {
      console.error('Session error:', err);
    }
  },
  onSessionEnd: (sessionId, reason) => {
    console.log(`Session ${sessionId} ended: ${reason}`);
  },
});

try {
  await app.start();
} catch (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Port already in use');
  } else {
    console.error('Server error:', err);
  }
}
```

## See Also

- [Telnet Server](./telnet-server.md) — Low-level telnet server API
- [SSH Server](./ssh-server.md) — Low-level SSH server API
- [Custom Streams](./custom-streams.md) — Stream session API
- [Process Utilities](./process.md) — Spawning external processes
