# Terminal Cleanup

The cleanup module provides a global cleanup coordinator that ensures the terminal is properly restored on exit, signals, or errors.

## Overview

When a terminal application exits unexpectedly (Ctrl+C, uncaught exception, etc.), the terminal can be left in a bad state (cursor hidden, alternate screen active, raw mode enabled). The CleanupManager ensures proper restoration.

## Quick Start

```typescript
import { CleanupManager, registerForCleanup, onExit } from 'blecsd/terminal';

// Register your program for cleanup
registerForCleanup('my-app', process.stdout, () => {
  // Custom cleanup logic
  console.log('Cleaning up...');
});

// Add exit handler for logging
onExit((info) => {
  console.log('Exiting due to:', info.reason);
});
```

## Classes

### CleanupManager

Singleton that coordinates terminal cleanup across multiple Program instances.

```typescript
class CleanupManager {
  static get instance(): CleanupManager;
  static reset(): void;

  get instanceCount(): number;
  get hasCleanedUp(): boolean;

  register(id: string, output: Writable, cleanup: CleanupHandler): void;
  unregister(id: string): void;
  onExit(handler: ExitHandler): () => void;
  runCleanup(reason: ExitReason, error?: Error): Promise<void>;
  runCleanupSync(reason: ExitReason, error?: Error): void;
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `instance` | `CleanupManager` | Singleton instance |
| `instanceCount` | `number` | Number of registered instances |
| `hasCleanedUp` | `boolean` | Whether cleanup has been run |

#### Methods

##### register()

Register a program instance for cleanup.

```typescript
CleanupManager.instance.register(
  'my-program',
  process.stdout,
  () => {
    // Custom cleanup for this instance
  }
);
```

##### unregister()

Unregister a program instance.

```typescript
CleanupManager.instance.unregister('my-program');
```

##### onExit()

Add an exit handler that runs during cleanup.

```typescript
const unsubscribe = CleanupManager.instance.onExit((info) => {
  console.log('Exit reason:', info.reason);
  if (info.error) {
    console.error('Error:', info.error);
  }
});

// Later, to remove the handler
unsubscribe();
```

## Functions

### registerForCleanup()

Convenience function to register for cleanup.

```typescript
function registerForCleanup(
  id: string,
  output: Writable,
  cleanup: CleanupHandler
): void
```

**Example:**

```typescript
import { registerForCleanup, screen, cursor } from 'blecsd/terminal';

// Enter alternate screen
process.stdout.write(screen.alternateOn());
process.stdout.write(cursor.hide());

// Register cleanup
registerForCleanup('my-app', process.stdout, () => {
  // Additional cleanup if needed
});

// Now if the process exits (Ctrl+C, exception, etc.),
// the terminal will be automatically restored
```

### unregisterFromCleanup()

Convenience function to unregister from cleanup.

```typescript
function unregisterFromCleanup(id: string): void
```

### onExit()

Convenience function to add an exit handler.

```typescript
function onExit(handler: ExitHandler): () => void
```

**Example:**

```typescript
import { onExit } from 'blecsd/terminal';

const unsubscribe = onExit(({ reason, error }) => {
  if (reason === 'uncaughtException') {
    // Log error to file before exit
    fs.appendFileSync('crash.log', `${error?.stack}\n`);
  }
});
```

## Types

### CleanupHandler

```typescript
type CleanupHandler = () => void | Promise<void>;
```

### ExitHandler

```typescript
type ExitHandler = (info: ExitInfo) => void | Promise<void>;
```

### ExitInfo

```typescript
interface ExitInfo {
  /** Why cleanup was triggered */
  reason: ExitReason;
  /** Exit code (if applicable) */
  code?: number;
  /** Error that triggered cleanup (if applicable) */
  error?: Error;
}
```

### ExitReason

```typescript
type ExitReason =
  | 'exit'              // Normal exit
  | 'SIGINT'            // Ctrl+C
  | 'SIGTERM'           // kill command
  | 'SIGQUIT'           // Ctrl+\
  | 'SIGHUP'            // Terminal closed
  | 'uncaughtException' // Unhandled error
  | 'unhandledRejection'; // Unhandled promise rejection
```

## Automatic Restoration

The CleanupManager automatically writes these sequences on cleanup:

1. Exit alternate screen buffer (`\x1b[?1049l`)
2. Show cursor (`\x1b[?25h`)
3. Reset text styles (`\x1b[0m`)
4. Write newline (to avoid prompt overwrite)

## Signal Handling

The CleanupManager installs handlers for:

| Signal | Description | Exit Code |
|--------|-------------|-----------|
| SIGINT | Ctrl+C | 130 |
| SIGTERM | kill command | 143 |
| SIGQUIT | Ctrl+\ | 131 |
| SIGHUP | Terminal closed | 129 |

## Usage Patterns

### Game Application

```typescript
import {
  registerForCleanup,
  unregisterFromCleanup,
  screen,
  cursor,
  mouse,
} from 'blecsd/terminal';

class Game {
  start() {
    // Setup terminal
    process.stdout.write(screen.alternateOn());
    process.stdout.write(cursor.hide());
    process.stdout.write(mouse.enableSgr());

    // Register for cleanup
    registerForCleanup('game', process.stdout, () => {
      this.saveState();  // Save game state
    });

    this.run();
  }

  quit() {
    // Manual cleanup
    process.stdout.write(mouse.disableAll());
    process.stdout.write(cursor.show());
    process.stdout.write(screen.alternateOff());

    unregisterFromCleanup('game');
    process.exit(0);
  }
}
```

### Error Logging

```typescript
import { onExit } from 'blecsd/terminal';
import fs from 'fs';

onExit(({ reason, error }) => {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] Exit: ${reason}`;

  if (error) {
    fs.appendFileSync('errors.log', `${entry}\n${error.stack}\n\n`);
  }
});
```

## Related

- [Suspend/Resume](./suspend.md) - SIGTSTP handling
- [Process Utilities](./process.md) - Child process management
