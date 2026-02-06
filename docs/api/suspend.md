# Suspend/Resume Handling

The suspend module provides SIGTSTP (Ctrl+Z) and SIGCONT resume handling for terminal applications.

## Overview

When users press Ctrl+Z in a terminal application, the process should:
1. Save the current terminal state (alternate buffer, mouse tracking, raw mode)
2. Restore the terminal to a "normal" state for the shell
3. Actually suspend the process

When the process resumes (via `fg` command), it should:
1. Restore the terminal to its previous state
2. Re-render the screen

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { SuspendManager } from 'blecsd/terminal';

const suspendManager = new SuspendManager({
  isAlternateBuffer: true,
  isMouseEnabled: true,
  onResume: (state) => {
    // Re-render your application after resume
    screen.render();
  },
});

// Enable Ctrl+Z handling
suspendManager.enable();

// Later, when done
suspendManager.disable();
```

## Classes

### SuspendManager

Manages terminal suspend and resume handling.

```typescript
class SuspendManager {
  constructor(options?: SuspendManagerOptions);

  // Properties
  readonly enabled: boolean;
  isAlternateBuffer: boolean;
  isMouseEnabled: boolean;

  // Methods
  enable(): void;
  disable(): void;
  suspend(callback?: () => void): void;
  setAlternateBuffer(inAlternateBuffer: boolean): void;
  setMouseEnabled(mouseEnabled: boolean): void;
}
```

#### Constructor Options

```typescript
interface SuspendManagerOptions {
  /** Output stream (default: process.stdout) */
  output?: Writable;

  /** Input stream (default: process.stdin) */
  input?: NodeJS.ReadStream;

  /** Called before suspending, can return custom state */
  onSuspend?: () => unknown;

  /** Called after resuming with saved state */
  onResume?: (state: SuspendState) => void;

  /** Initial alternate buffer state (default: false) */
  isAlternateBuffer?: boolean;

  /** Initial mouse tracking state (default: false) */
  isMouseEnabled?: boolean;
}
```

#### Methods

##### enable()

Enable SIGTSTP and SIGCONT signal handlers.

```typescript
const manager = new SuspendManager();
manager.enable();
// Now Ctrl+Z will properly suspend the application
```

##### disable()

Disable signal handlers.

```typescript
manager.disable();
// Ctrl+Z will no longer be handled
```

##### suspend(callback?)

Manually trigger a suspend. Useful for custom key bindings.

```typescript
// In a key handler
if (key === 'ctrl+z') {
  manager.suspend(() => {
    console.log('Resumed!');
  });
}
```

##### setAlternateBuffer(inAlternateBuffer)

Update the alternate buffer state tracking.

```typescript
process.stdout.write(screen.alternateOn());
manager.setAlternateBuffer(true);
```

##### setMouseEnabled(mouseEnabled)

Update the mouse tracking state.

```typescript
process.stdout.write(mouse.enableNormal());
manager.setMouseEnabled(true);
```

## Types

### SuspendState

State saved before suspending.

```typescript
interface SuspendState {
  /** Whether the terminal was in alternate buffer mode */
  wasAlternateBuffer: boolean;

  /** Whether mouse tracking was enabled */
  wasMouseEnabled: boolean;

  /** Whether raw mode was enabled */
  wasRawMode: boolean;

  /** Custom state from onSuspend callback */
  customState?: unknown;
}
```

## Functions

### suspend()

Simple one-shot suspend function for basic use cases.

```typescript
function suspend(options: {
  output?: Writable;
  input?: NodeJS.ReadStream;
  isAlternateBuffer?: boolean;
  isMouseEnabled?: boolean;
}): Promise<void>
```

**Example:**

<!-- blecsd-doccheck:ignore -->
```typescript
import { suspend } from 'blecsd/terminal';

// Simple suspend and wait for resume
await suspend({
  isAlternateBuffer: true,
  isMouseEnabled: false,
});
console.log('Resumed!');
```

### suspendSequences

Low-level escape sequence generators for custom implementations.

```typescript
const suspendSequences = {
  prepareForSuspend(isAlternateBuffer: boolean, isMouseEnabled: boolean): string;
  restoreAfterResume(wasAlternateBuffer: boolean, wasMouseEnabled: boolean): string;
}
```

**Example:**
```typescript
import { suspendSequences } from 'blecsd/terminal';

// Get all sequences to prepare for suspend
const seq = suspendSequences.prepareForSuspend(true, true);
process.stdout.write(seq);

// After SIGCONT, restore
const restore = suspendSequences.restoreAfterResume(true, true);
process.stdout.write(restore);
```

## Suspend Flow

The suspend operation follows this sequence:

1. **Save State**: Record current terminal state (alternate buffer, mouse, raw mode)
2. **Exit Alternate Buffer**: If in alternate buffer, exit to normal buffer
3. **Show Cursor**: Make cursor visible
4. **Disable Mouse**: Turn off mouse tracking
5. **Exit Raw Mode**: Return stdin to cooked mode
6. **Pause Input**: Stop reading from stdin
7. **Send SIGTSTP**: Actually suspend the process

## Resume Flow

When the process receives SIGCONT:

1. **Resume Input**: Start reading from stdin again
2. **Enter Raw Mode**: Enable raw mode for stdin
3. **Enter Alternate Buffer**: If was in alternate buffer, re-enter it
4. **Enable Mouse**: If mouse was enabled, re-enable it
5. **Call Callback**: Invoke the resume callback for re-rendering

## Usage Patterns

### Game Loop Integration

<!-- blecsd-doccheck:ignore -->
```typescript
import { SuspendManager, screen, mouse } from 'blecsd/terminal';

class Game {
  private suspendManager: SuspendManager;

  constructor() {
    this.suspendManager = new SuspendManager({
      onSuspend: () => this.saveGameState(),
      onResume: () => this.restoreAndRender(),
    });
  }

  start() {
    // Enter alternate buffer
    process.stdout.write(screen.alternateOn());
    this.suspendManager.setAlternateBuffer(true);

    // Enable mouse
    process.stdout.write(mouse.enableNormal());
    this.suspendManager.setMouseEnabled(true);

    // Enable suspend handling
    this.suspendManager.enable();

    // Start game loop
    this.gameLoop();
  }

  private saveGameState() {
    return { score: this.score, level: this.level };
  }

  private restoreAndRender() {
    this.render();
  }
}
```

### Custom Key Binding

<!-- blecsd-doccheck:ignore -->
```typescript
import { SuspendManager } from 'blecsd/terminal';

const manager = new SuspendManager({
  isAlternateBuffer: true,
  onResume: () => redraw(),
});

// Don't auto-enable - we'll handle Ctrl+Z manually
process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'z') {
    // Custom handling before suspend
    saveProgress();
    manager.suspend();
  }
});
```

## Platform Notes

- **Unix/Linux/macOS**: Full support for SIGTSTP and SIGCONT
- **Windows**: SIGTSTP is not supported on Windows. The SuspendManager will still work but `suspend()` will have no effect.

## Related

- [Cleanup Module](./cleanup.md) - Terminal cleanup on exit
- [Screen Namespace](./ansi.md#screen) - Alternate buffer handling
- [Mouse Namespace](./ansi.md#mouse) - Mouse tracking control
