# Screen Buffer

The `createScreenBuffer` factory manages alternate screen buffer state and ensures proper cleanup on exit.

## Overview

ScreenBuffer handles the alternate screen buffer mode used by full-screen terminal applications. It automatically installs signal handlers to ensure the terminal is properly restored when the program exits, even on crashes or interrupts.

## Quick Start

```typescript
import { createScreenBuffer } from 'blecsd/terminal';

// createScreenBuffer requires a writable TTY stream
if (process.stdout.isTTY) {
  const buffer = createScreenBuffer(process.stdout);

  // Enter alternate screen (saves current screen content)
  buffer.enterAlternateScreen();

  // ... do work in alternate screen ...

  // Exit alternate screen (restores original content)
  buffer.exitAlternateScreen();
}
```

## Factory Function

```typescript
// function createScreenBuffer(output: Writable): ScreenBuffer
```

**Parameters:**
- `output` - Writable stream for terminal output (usually `process.stdout`)

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAlternate` | `boolean` | Whether currently in alternate screen buffer |

## Methods

### enterAlternateScreen()

Enter alternate screen buffer. Installs cleanup handlers to ensure restoration on exit.

```typescript
// enterAlternateScreen(): void
```

When called:
- Saves the current screen content
- Switches to an empty alternate buffer
- Installs signal handlers for cleanup

### exitAlternateScreen()

Exit alternate screen buffer and restore the original screen content.

```typescript
// exitAlternateScreen(): void
```

### onCleanup()

Register a cleanup callback to run when exiting alternate screen.

```typescript
// onCleanup(callback: CleanupCallback): () => void
```

**Parameters:**
- `callback` - Cleanup function to call

**Returns:** Unsubscribe function

### cleanup()

Perform cleanup and exit alternate screen. Called automatically on signals and process exit.

```typescript
// cleanup(): void
```

This method:
1. Runs all registered cleanup handlers
2. Exits alternate screen if active

### destroy()

Destroy the screen buffer and remove signal handlers.

```typescript
// destroy(): void
```

Call this when done with the buffer to clean up resources.

## Types

### CleanupCallback

```typescript
type CleanupCallback = () => void;
```

### ScreenBuffer

```typescript
interface ScreenBuffer {
  readonly isAlternate: boolean;
  enterAlternateScreen(): void;
  exitAlternateScreen(): void;
  onCleanup(callback: CleanupCallback): () => void;
  cleanup(): void;
  destroy(): void;
}
```

## Signal Handling

ScreenBuffer automatically handles these signals:

| Signal | Description | Behavior |
|--------|-------------|----------|
| SIGINT | Ctrl+C | Cleanup and exit alternate screen |
| SIGTERM | Kill command | Cleanup and exit alternate screen |
| exit | Process exit | Cleanup and exit alternate screen |
| uncaughtException | Unhandled error | Cleanup, then re-throw error |
| unhandledRejection | Unhandled promise rejection | Cleanup, then re-throw |

## Usage Patterns

### Full-Screen Application

```typescript
import { createScreenBuffer, cursor } from 'blecsd/terminal';

// createScreenBuffer requires a real TTY
// function startApplication() {
//   const screenBuffer = createScreenBuffer(process.stdout);
//   screenBuffer.enterAlternateScreen();
//   screenBuffer.onCleanup(() => {
//     process.stdout.write(cursor.show());
//   });
//   process.stdout.write(cursor.hide());
//   return screenBuffer;
// }

// function quitApplication(screenBuffer) {
//   screenBuffer.destroy();
//   process.exit(0);
// }

void createScreenBuffer; void cursor;
```

### Multiple Cleanup Handlers

```typescript
import { createScreenBuffer, cursor, mouse } from 'blecsd/terminal';

// When running in a real terminal:
// const buffer = createScreenBuffer(process.stdout);
// buffer.onCleanup(() => { process.stdout.write(cursor.show()); });
// buffer.onCleanup(() => { process.stdout.write(mouse.disableAll()); });
// buffer.onCleanup(() => { console.log('Application exiting...'); });
// buffer.enterAlternateScreen();

void createScreenBuffer; void cursor; void mouse;
```

## Alternate Screen Buffer

The alternate screen buffer is a standard terminal feature that:

1. **Preserves content**: Your shell history and output remain intact
2. **Provides clean canvas**: Full-screen apps get a blank screen to work with
3. **Automatic restoration**: When the app exits, original content reappears

This is why `vim`, `less`, and other TUI applications don't leave their content on screen after quitting.

## Related

- [Cleanup Manager](./cleanup.md) - Global cleanup coordination
- [Program](./program.md) - High-level terminal control
- [ANSI Escape Codes](./ansi.md) - Screen control sequences
