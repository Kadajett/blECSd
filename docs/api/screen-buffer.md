# Screen Buffer

The ScreenBuffer class manages alternate screen buffer state and ensures proper cleanup on exit.

## Overview

ScreenBuffer handles the alternate screen buffer mode used by full-screen terminal applications. It automatically installs signal handlers to ensure the terminal is properly restored when the program exits, even on crashes or interrupts.

**Note:** This module is internal and not exported from the main package. It is used internally by the Program class.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { ScreenBuffer } from 'blecsd/terminal';

const buffer = new ScreenBuffer(process.stdout);

// Enter alternate screen (saves current screen content)
buffer.enterAlternateScreen();

// ... do work in alternate screen ...

// Exit alternate screen (restores original content)
buffer.exitAlternateScreen();
```

## Constructor

```typescript
new ScreenBuffer(output: Writable)
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
enterAlternateScreen(): void
```

When called:
- Saves the current screen content
- Switches to an empty alternate buffer
- Installs signal handlers for cleanup

**Example:**

```typescript
buffer.enterAlternateScreen();
// Screen content is saved, now using alternate buffer
// Original content is preserved and will be restored on exit
```

### exitAlternateScreen()

Exit alternate screen buffer and restore the original screen content.

```typescript
exitAlternateScreen(): void
```

**Example:**

```typescript
buffer.exitAlternateScreen();
// Original screen content is restored
```

### onCleanup()

Register a cleanup callback to run when exiting alternate screen.

```typescript
onCleanup(callback: CleanupCallback): () => void
```

**Parameters:**
- `callback` - Cleanup function to call

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = buffer.onCleanup(() => {
  // Restore cursor visibility
  process.stdout.write(cursor.show());
  // Reset colors
  process.stdout.write(style.reset());
});

// Later, to remove the handler
unsubscribe();
```

### cleanup()

Perform cleanup and exit alternate screen. Called automatically on signals and process exit.

```typescript
cleanup(): void
```

This method:
1. Runs all registered cleanup handlers
2. Exits alternate screen if active

### destroy()

Destroy the screen buffer and remove signal handlers.

```typescript
destroy(): void
```

Call this when done with the buffer to clean up resources.

**Example:**

```typescript
// When application exits normally
buffer.destroy();
```

## Types

### CleanupCallback

```typescript
type CleanupCallback = () => void;
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { ScreenBuffer, cursor, screen } from 'blecsd/terminal';

class Application {
  private screenBuffer: ScreenBuffer;

  constructor() {
    this.screenBuffer = new ScreenBuffer(process.stdout);
  }

  start() {
    // Enter alternate screen
    this.screenBuffer.enterAlternateScreen();

    // Register cleanup for cursor
    this.screenBuffer.onCleanup(() => {
      process.stdout.write(cursor.show());
    });

    // Hide cursor for cleaner display
    process.stdout.write(cursor.hide());

    // Clear and start rendering
    process.stdout.write(screen.clear());
    this.render();
  }

  quit() {
    // Destroy handles cleanup automatically
    this.screenBuffer.destroy();
    process.exit(0);
  }
}
```

### Game with State Save on Exit

<!-- blecsd-doccheck:ignore -->
```typescript
import { ScreenBuffer } from 'blecsd/terminal';

class Game {
  private screenBuffer: ScreenBuffer;
  private gameState: GameState;

  start() {
    this.screenBuffer = new ScreenBuffer(process.stdout);

    // Save game state on any exit
    this.screenBuffer.onCleanup(() => {
      this.saveGame();
    });

    this.screenBuffer.enterAlternateScreen();
    this.gameLoop();
  }

  private saveGame() {
    // This runs even on Ctrl+C or crashes
    fs.writeFileSync('save.json', JSON.stringify(this.gameState));
  }
}
```

### Multiple Cleanup Handlers

```typescript
const buffer = new ScreenBuffer(process.stdout);

// Restore cursor
buffer.onCleanup(() => {
  process.stdout.write(cursor.show());
});

// Reset colors
buffer.onCleanup(() => {
  process.stdout.write(style.reset());
});

// Disable mouse
buffer.onCleanup(() => {
  process.stdout.write(mouse.disableAll());
});

// Log exit
buffer.onCleanup(() => {
  console.log('Application exiting...');
});

buffer.enterAlternateScreen();
```

## Alternate Screen Buffer

The alternate screen buffer is a standard terminal feature that:

1. **Preserves content**: Your shell history and output remain intact
2. **Provides clean canvas**: Full-screen apps get a blank screen to work with
3. **Automatic restoration**: When the app exits, original content reappears

This is why `vim`, `less`, and other TUI applications don't leave their content on screen after quitting.

## Error Handling

ScreenBuffer catches errors in cleanup handlers to ensure all handlers run:

```typescript
buffer.onCleanup(() => {
  throw new Error('Cleanup error');
});

buffer.onCleanup(() => {
  // This still runs even if the previous handler threw
  process.stdout.write(cursor.show());
});
```

## Related

- [Cleanup Manager](./cleanup.md) - Global cleanup coordination
- [Program](./program.md) - High-level terminal control
- [ANSI Escape Codes](./ansi.md) - Screen control sequences
