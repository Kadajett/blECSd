# Debug Logging System

The debug module provides logging utilities for development and debugging terminal applications.

## Overview

Debug logging is controlled by environment variables and writes to a log file rather than stdout/stderr (which are used for terminal output). This allows debugging terminal applications without interfering with the display.

## Quick Start

```typescript
import { createDebugLogger, configureDebugLogger, LogLevel } from 'blecsd/terminal';

// Enable debug logging
configureDebugLogger({
  enabled: true,
  logFile: '/tmp/blecsd.log',
  level: LogLevel.DEBUG,
});

// Create a namespaced logger
const debug = createDebugLogger('myapp:input');

// Log messages at different levels
debug('Processing key event');
debug.trace('Low-level trace info');
debug.warn('Potential issue detected');
debug.error('Error occurred:', error);
```

## Environment Variables

Debug logging can be controlled via environment variables:

```bash
# Enable debug logging for all blecsd namespaces
DEBUG=blecsd:* node myapp.js

# Enable for specific namespace
DEBUG=blecsd:input node myapp.js

# Alternative: use BLECSD_DEBUG
BLECSD_DEBUG=1 node myapp.js
```

## Functions

### configureDebugLogger()

Configure the global debug logger settings.

```typescript
function configureDebugLogger(config: DebugLoggerConfig): void
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `DebugLoggerConfig` | Logger configuration options |

**Example:**

```typescript
import { configureDebugLogger, LogLevel } from 'blecsd/terminal';

configureDebugLogger({
  enabled: true,
  logFile: '/tmp/myapp-debug.log',
  level: LogLevel.TRACE,
  timestamps: true,
  includeLevel: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  namespaceFilter: 'blecsd:*',
});
```

### createDebugLogger()

Create a namespaced debug logger.

```typescript
function createDebugLogger(namespace: string): DebugLogger
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `namespace` | `string` | The namespace for this logger (e.g., 'blecsd:input') |

**Returns:** `DebugLogger` - A debug logger function with level methods

**Example:**

```typescript
import { createDebugLogger } from 'blecsd/terminal';

const debug = createDebugLogger('myapp:renderer');

// Direct call logs at DEBUG level
debug('Rendering frame', { frameNumber: 42 });

// Level-specific methods
debug.trace('Entering render loop');
debug.debug('Frame buffer updated');
debug.info('Screen resized to', { width: 80, height: 24 });
debug.warn('Frame took longer than expected');
debug.error('Render failed:', error);
```

### isDebugLoggingEnabled()

Check if debug logging is currently enabled.

```typescript
function isDebugLoggingEnabled(): boolean
```

**Example:**

```typescript
import { isDebugLoggingEnabled } from 'blecsd/terminal';

if (isDebugLoggingEnabled()) {
  // Perform expensive debug-only computation
  const debugInfo = computeExpensiveDebugInfo();
  debug('Debug info:', debugInfo);
}
```

### getLogFile()

Get the current log file path.

```typescript
function getLogFile(): string
```

**Returns:** `string` - The path to the log file

### clearLog()

Clear the log file contents.

```typescript
function clearLog(): void
```

**Example:**

```typescript
import { clearLog } from 'blecsd/terminal';

// Clear log at start of session
clearLog();
```

### dumpTerminalState()

Dump terminal state to the log file for debugging.

```typescript
function dumpTerminalState(
  state: Partial<TerminalStateDump>,
  label?: string
): void
```

**Example:**

```typescript
import { dumpTerminalState } from 'blecsd/terminal';

dumpTerminalState({
  isAlternateBuffer: true,
  isMouseEnabled: true,
  terminalSize: { rows: 24, cols: 80 },
  custom: { myState: 'value' },
}, 'Before rendering');
```

### dumpRaw()

Dump raw data (useful for debugging escape sequences).

```typescript
function dumpRaw(data: string | Buffer, label?: string): void
```

**Example:**

```typescript
import { dumpRaw } from 'blecsd/terminal';

// Dump escape sequence for debugging
dumpRaw('\x1b[?1049h', 'Alternate buffer on');

// Output in log file:
// Raw dump: Alternate buffer on
//   Length: 8
//   Hex: 1b 5b 3f 31 30 34 39 68
//   Print: .[?1049h
```

## Types

### DebugLoggerConfig

Configuration options for the debug logger.

```typescript
interface DebugLoggerConfig {
  /** Enable logging (default: reads from DEBUG env var) */
  enabled?: boolean;
  /** Log file path (default: blecsd-debug.log in current directory) */
  logFile?: string;
  /** Minimum log level to output (default: DEBUG) */
  level?: LogLevelValue;
  /** Include timestamps (default: true) */
  timestamps?: boolean;
  /** Include log level in output (default: true) */
  includeLevel?: boolean;
  /** Maximum log file size in bytes before rotation (default: 10MB) */
  maxFileSize?: number;
  /** Namespace filter (comma-separated, supports wildcards) */
  namespaceFilter?: string;
}
```

### DebugLogger

The debug logger interface.

```typescript
interface DebugLogger {
  (message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  namespace: string;
}
```

### LogLevel

Log level constants.

```typescript
const LogLevel = {
  TRACE: 0,  // Most verbose
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5, // No output
} as const;
```

### TerminalStateDump

State information for terminal dumps.

```typescript
interface TerminalStateDump {
  timestamp: string;
  isAlternateBuffer?: boolean;
  isMouseEnabled?: boolean;
  isRawMode?: boolean;
  terminalSize?: { rows: number; cols: number };
  environment?: {
    TERM?: string;
    COLORTERM?: string;
    TERM_PROGRAM?: string;
  };
  custom?: Record<string, unknown>;
}
```

## Pre-configured Loggers

The module provides pre-configured loggers for common namespaces:

```typescript
import { debugLoggers } from 'blecsd/terminal';

debugLoggers.input('Key pressed:', key);   // blecsd:input
debugLoggers.render('Frame rendered');      // blecsd:render
debugLoggers.mouse('Mouse event:', event); // blecsd:mouse
debugLoggers.program('Program started');   // blecsd:program
debugLoggers.detect('Terminal detected');  // blecsd:detect
debugLoggers.ecs('Entity created:', eid);  // blecsd:ecs
```

## Namespace Filtering

Namespaces can be filtered using the DEBUG environment variable or `namespaceFilter` config:

| Pattern | Matches |
|---------|---------|
| `blecsd:input` | Exact match only |
| `blecsd:*` | All blecsd namespaces |
| `*` | Everything |
| `blecsd:input,blecsd:render` | Multiple namespaces |
| `-blecsd:verbose` | Exclude namespace |

**Example:**

```bash
# Only input and render namespaces
DEBUG=blecsd:input,blecsd:render node myapp.js

# All blecsd except verbose
DEBUG=blecsd:*,-blecsd:verbose node myapp.js
```

## Log Format

Default log format:

```
[TIMESTAMP] [LEVEL] [NAMESPACE] MESSAGE ARGS...
```

**Example output:**

```
[2024-01-15 10:30:45.123] [DEBUG] [blecsd:input] Key pressed: { key: 'q', ctrl: false }
[2024-01-15 10:30:45.124] [WARN] [blecsd:render] Frame took 50ms (target: 16ms)
[2024-01-15 10:30:45.200] [ERROR] [blecsd:program] Uncaught error: Error: Connection lost
    at Socket.onclose (socket.js:42:15)
```

## Usage Patterns

### Game Development

```typescript
import { createDebugLogger, dumpTerminalState } from 'blecsd/terminal';

const debug = createDebugLogger('mygame:loop');

class GameLoop {
  tick(deltaTime: number) {
    debug.trace('Tick start', { deltaTime });

    // Game logic...

    debug.trace('Tick end', { duration: performance.now() - start });
  }

  onError(error: Error) {
    debug.error('Game error:', error);
    dumpTerminalState({
      isAlternateBuffer: this.isAltBuffer,
      custom: { gameState: this.state },
    }, 'Error state');
  }
}
```

### Input Debugging

```typescript
import { createDebugLogger, dumpRaw } from 'blecsd/terminal';

const debug = createDebugLogger('myapp:input');

function onData(data: Buffer) {
  // Dump raw input for debugging escape sequences
  dumpRaw(data, 'Raw input');

  // Parse and log
  const parsed = parseInput(data);
  debug('Parsed input:', parsed);
}
```

### Conditional Expensive Operations

```typescript
import { createDebugLogger, isDebugLoggingEnabled } from 'blecsd/terminal';

const debug = createDebugLogger('myapp:perf');

function render() {
  // Only compute performance stats if debugging
  if (isDebugLoggingEnabled()) {
    const start = performance.now();
    doRender();
    debug('Render time:', performance.now() - start, 'ms');
  } else {
    doRender();
  }
}
```

## Log Rotation

When the log file exceeds `maxFileSize` (default 10MB), the current file is renamed to `.old` and a new file is created. Only one backup file is kept.

## Related

- [Process Utilities](./process.md) - Process spawning
- [Terminal Detection](./detection.md) - Terminal capability detection
