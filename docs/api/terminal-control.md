# Terminal Control

Low-level terminal control utilities for cursor movement, screen management, and mouse tracking. These functions provide direct access to ANSI escape sequences for fine-grained terminal manipulation.

## Quick Start

```typescript
import {
  setOutputStream,
  hideCursor,
  enterAlternateScreen,
  clearScreen,
  moveTo,
  writeRaw,
  cleanup,
} from 'blecsd';

// Setup output stream
setOutputStream(process.stdout);

// Enter fullscreen mode
hideCursor();
enterAlternateScreen();
clearScreen();

// Move cursor and write content
moveTo(10, 5);
writeRaw('Hello, terminal!');

// Cleanup on exit
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
```

## API Reference

### Output Stream Management

#### setOutputStream

Sets the output stream for all terminal control functions.

**Parameters:**
- `stream` - Writable stream (typically `process.stdout`)

**Returns:** `void`

**Example:**
```typescript
import { setOutputStream } from 'blecsd';

setOutputStream(process.stdout);
```

#### getOutputStream

Gets the current output stream.

**Returns:** `Writable | null` - The current stream or null if not set

#### clearOutputStream

Clears the output stream reference.

**Returns:** `void`

### Cursor Control

#### hideCursor

Hides the terminal cursor.

**Example:**
```typescript
import { hideCursor } from 'blecsd';

hideCursor();
```

#### showCursor

Shows the terminal cursor.

**Example:**
```typescript
import { showCursor } from 'blecsd';

showCursor();
```

#### moveTo

Moves cursor to a specific position.

**Parameters:**
- `x` - Column position (0-indexed)
- `y` - Row position (0-indexed)

**Example:**
```typescript
import { moveTo } from 'blecsd';

moveTo(10, 5); // Move to column 10, row 5
```

#### saveCursorPosition

Saves the current cursor position for later restoration.

**Example:**
```typescript
import { saveCursorPosition, restoreCursorPosition } from 'blecsd';

saveCursorPosition();
// ... move cursor and draw ...
restoreCursorPosition(); // Return to saved position
```

#### restoreCursorPosition

Restores the previously saved cursor position.

**Example:**
```typescript
import { restoreCursorPosition } from 'blecsd';

restoreCursorPosition();
```

#### setTerminalCursorShape

Sets the terminal cursor shape.

**Parameters:**
- `shape` - Cursor shape: `'block'`, `'underline'`, or `'bar'`

**Example:**
```typescript
import { setTerminalCursorShape } from 'blecsd';

setTerminalCursorShape('block');     // Block cursor
setTerminalCursorShape('underline'); // Underline cursor
setTerminalCursorShape('bar');       // Bar/vertical line cursor
```

### Screen Management

#### enterAlternateScreen

Enters alternate screen buffer mode. Creates a separate screen buffer that can be discarded on exit, preserving the user's terminal history.

**Example:**
```typescript
import { enterAlternateScreen, leaveAlternateScreen } from 'blecsd';

enterAlternateScreen();
// ... render application ...
leaveAlternateScreen();
```

#### leaveAlternateScreen

Leaves alternate screen buffer mode and returns to the main screen.

**Example:**
```typescript
import { leaveAlternateScreen } from 'blecsd';

leaveAlternateScreen();
```

#### clearScreen

Clears the entire screen.

**Example:**
```typescript
import { clearScreen } from 'blecsd';

clearScreen();
```

#### cursorHome

Moves cursor to home position (0, 0).

**Example:**
```typescript
import { cursorHome } from 'blecsd';

cursorHome();
```

### Mouse Tracking

#### enableMouseTracking

Enables mouse tracking in the terminal.

**Parameters:**
- `mode` - Mouse tracking mode:
  - `'normal'` - Track clicks only
  - `'button'` - Track clicks and drag
  - `'any'` - Track all mouse motion (default)

**Example:**
```typescript
import { enableMouseTracking } from 'blecsd';

enableMouseTracking('any');    // Track all mouse motion
enableMouseTracking('button'); // Track only when button pressed
enableMouseTracking('normal'); // Track clicks only
```

#### disableMouseTracking

Disables mouse tracking in the terminal.

**Example:**
```typescript
import { disableMouseTracking } from 'blecsd';

disableMouseTracking();
```

### Synchronized Output

#### beginSyncOutput

Begins synchronized output mode. Prevents partial screen updates from being displayed until `endSyncOutput()` is called. All updates appear atomically.

**Example:**
```typescript
import { beginSyncOutput, endSyncOutput } from 'blecsd';

beginSyncOutput();
// ... render multiple updates ...
endSyncOutput(); // All updates appear atomically
```

#### endSyncOutput

Ends synchronized output mode and flushes buffered output to the screen.

**Example:**
```typescript
import { endSyncOutput } from 'blecsd';

endSyncOutput();
```

### Styling and Attributes

#### resetAttributes

Resets all terminal attributes (colors, bold, italic, etc.) to defaults.

**Example:**
```typescript
import { resetAttributes } from 'blecsd';

resetAttributes();
```

#### setWindowTitle

Sets the terminal window title.

**Parameters:**
- `title` - Window title string

**Example:**
```typescript
import { setWindowTitle } from 'blecsd';

setWindowTitle('My Terminal App');
```

### Raw Output

#### writeRaw

Writes raw output to the stream, bypassing the double buffer for immediate output.

**Parameters:**
- `data` - String data to write

**Example:**
```typescript
import { writeRaw } from 'blecsd';

// Write raw ANSI sequence
writeRaw('\x1b[2J'); // Clear screen
writeRaw('Hello!');   // Write text immediately
```

### Audio

#### bell

Rings the terminal bell (produces audible or visual bell depending on terminal settings).

**Example:**
```typescript
import { bell } from 'blecsd';

bell(); // Produce audible or visual bell
```

### Cleanup

#### cleanup

Flushes output and resets terminal state. Call this before exiting the application to restore the terminal to a clean state.

Automatically handles:
- Disabling mouse tracking if enabled
- Ending synchronized output if active
- Leaving alternate screen if in use
- Resetting attributes
- Showing cursor
- Moving cursor to home

**Example:**
```typescript
import { cleanup } from 'blecsd';

// Before exiting
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
```

## Common Patterns

### Setting Up a Fullscreen Application

```typescript
import {
  setOutputStream,
  hideCursor,
  enterAlternateScreen,
  clearScreen,
  cleanup,
} from 'blecsd';

// Setup
setOutputStream(process.stdout);
hideCursor();
enterAlternateScreen();
clearScreen();

// Handle exit
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
```

### Drawing at Specific Positions

```typescript
import { moveTo, writeRaw } from 'blecsd';

// Draw box corners
moveTo(0, 0);
writeRaw('┌');
moveTo(79, 0);
writeRaw('┐');
moveTo(0, 23);
writeRaw('└');
moveTo(79, 23);
writeRaw('┘');
```

### Atomic Screen Updates

```typescript
import { beginSyncOutput, endSyncOutput, moveTo, writeRaw } from 'blecsd';

// All these updates appear together atomically
beginSyncOutput();
moveTo(0, 0);
writeRaw('Line 1');
moveTo(0, 1);
writeRaw('Line 2');
moveTo(0, 2);
writeRaw('Line 3');
endSyncOutput();
```

### Preserving Cursor Position

```typescript
import { saveCursorPosition, restoreCursorPosition, moveTo, writeRaw } from 'blecsd';

// Save current position
saveCursorPosition();

// Draw status bar at bottom
moveTo(0, 23);
writeRaw('Status: Ready');

// Return to previous position
restoreCursorPosition();
```
