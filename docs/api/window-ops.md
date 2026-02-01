# Window Manipulation

The `windowOps` namespace provides functions for controlling terminal window position, size, and state using xterm control sequences.

## Overview

These are xterm-compatible window manipulation sequences (CSI Ps t). Not all terminals support all operations, and some terminals may disable window operations for security reasons (controlled by xterm's `allowWindowOps` resource).

## Quick Start

```typescript
import { windowOps } from 'blecsd/terminal';

// Maximize the window
process.stdout.write(windowOps.maximize());

// Move to specific position
process.stdout.write(windowOps.move(100, 50));

// Resize to 80x24 characters
process.stdout.write(windowOps.resizeChars(80, 24));
```

## Functions

### Iconify/Deiconify

#### windowOps.deiconify

Restore (de-iconify) a minimized window.

```typescript
function deiconify(): string  // Returns '\x1b[1t'
```

#### windowOps.iconify

Minimize (iconify) the window.

```typescript
function iconify(): string  // Returns '\x1b[2t'
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Minimize window for 3 seconds, then restore
process.stdout.write(windowOps.iconify());
setTimeout(() => {
  process.stdout.write(windowOps.deiconify());
}, 3000);
```

### Window Position

#### windowOps.move

Move the terminal window to a specific screen position.

```typescript
function move(x: number, y: number): string
```

**Parameters:**
- `x` - X position in pixels from left edge of screen
- `y` - Y position in pixels from top edge of screen

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Move to top-left corner
process.stdout.write(windowOps.move(0, 0));

// Center on a 1920x1080 screen (approximately)
process.stdout.write(windowOps.move(460, 240));
```

### Window Size

#### windowOps.resizePixels

Resize the window to specific pixel dimensions.

```typescript
function resizePixels(width: number, height: number): string
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Resize to 800x600 pixels
process.stdout.write(windowOps.resizePixels(800, 600));
```

#### windowOps.resizeChars

Resize the text area to specific character dimensions.

```typescript
function resizeChars(columns: number, rows: number): string
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Standard 80x24 terminal
process.stdout.write(windowOps.resizeChars(80, 24));

// Wide mode (132 columns)
process.stdout.write(windowOps.resizeChars(132, 43));
```

#### windowOps.setLines

Set the number of lines (DECSLPP - DEC Set Lines Per Page).

```typescript
function setLines(lines: number): string
```

**Parameters:**
- `lines` - Number of lines (minimum 24)

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Set to 50 lines
process.stdout.write(windowOps.setLines(50));
```

### Stacking Order

#### windowOps.raise

Raise the window to the front of the stacking order.

```typescript
function raise(): string  // Returns '\x1b[5t'
```

#### windowOps.lower

Lower the window to the bottom of the stacking order.

```typescript
function lower(): string  // Returns '\x1b[6t'
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Bring window to front
process.stdout.write(windowOps.raise());

// Send to back
process.stdout.write(windowOps.lower());
```

### Refresh

#### windowOps.refresh

Force a redraw of the terminal content.

```typescript
function refresh(): string  // Returns '\x1b[7t'
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Force window refresh after rendering issue
process.stdout.write(windowOps.refresh());
```

### Maximize/Restore

#### windowOps.maximize

Maximize the window to fill the screen.

```typescript
function maximize(): string  // Returns '\x1b[9;1t'
```

#### windowOps.restoreMaximized

Restore a maximized window to its previous size.

```typescript
function restoreMaximized(): string  // Returns '\x1b[9;0t'
```

#### windowOps.maximizeVertical

Maximize the window vertically only.

```typescript
function maximizeVertical(): string  // Returns '\x1b[9;2t'
```

#### windowOps.maximizeHorizontal

Maximize the window horizontally only.

```typescript
function maximizeHorizontal(): string  // Returns '\x1b[9;3t'
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Maximize window
process.stdout.write(windowOps.maximize());

// Later, restore to previous size
process.stdout.write(windowOps.restoreMaximized());

// Or maximize just vertically for a tall terminal
process.stdout.write(windowOps.maximizeVertical());
```

### Full Screen

#### windowOps.enterFullScreen

Enter full-screen mode.

```typescript
function enterFullScreen(): string  // Returns '\x1b[10;1t'
```

#### windowOps.exitFullScreen

Exit full-screen mode.

```typescript
function exitFullScreen(): string  // Returns '\x1b[10;0t'
```

#### windowOps.toggleFullScreen

Toggle full-screen mode.

```typescript
function toggleFullScreen(): string  // Returns '\x1b[10;2t'
```

**Example:**
```typescript
import { windowOps } from 'blecsd/terminal';

// Enter full-screen for immersive experience
process.stdout.write(windowOps.enterFullScreen());

// Exit when done
process.stdout.write(windowOps.exitFullScreen());

// Or toggle based on key press
process.stdout.write(windowOps.toggleFullScreen());
```

### Title Stack

#### windowOps.pushTitle

Save the window title and/or icon title to the stack.

```typescript
function pushTitle(which?: 'both' | 'icon' | 'title'): string
```

**Parameters:**
- `which` - What to save: 'both' (default), 'icon', or 'title'

#### windowOps.popTitle

Restore the window title and/or icon title from the stack.

```typescript
function popTitle(which?: 'both' | 'icon' | 'title'): string
```

**Parameters:**
- `which` - What to restore: 'both' (default), 'icon', or 'title'

**Example:**
```typescript
import { windowOps, title } from 'blecsd/terminal';

// Save current title
process.stdout.write(windowOps.pushTitle('both'));

// Set a temporary title while processing
process.stdout.write(title.set('Processing... 50%'));

// When done, restore the original title
process.stdout.write(windowOps.popTitle('both'));
```

## Querying Window State

For querying window state (position, size, etc.), use the `query` namespace from the response parser:

```typescript
import { query, parseResponse, isWindowPosition } from 'blecsd/terminal';

// Send position query
process.stdout.write(query.windowPosition());

// Parse the response (you'd read from stdin)
const response = '\x1b[3;100;50t';
const parsed = parseResponse(response);

if (isWindowPosition(parsed)) {
  console.log(`Window at (${parsed.x}, ${parsed.y})`);
}
```

Available queries:
- `query.windowState()` - Check if iconified
- `query.windowPosition()` - Get x, y position
- `query.windowSizePixels()` - Get size in pixels
- `query.textAreaSize()` - Get size in characters
- `query.screenSize()` - Get screen size in characters
- `query.windowTitle()` - Get current title
- `query.iconLabel()` - Get icon label

## Terminal Support

| Feature | xterm | iTerm2 | Kitty | Terminal.app | GNOME Terminal |
|---------|-------|--------|-------|--------------|----------------|
| iconify/deiconify | Yes | Yes | Yes | Limited | Yes |
| move | Yes | Yes | Yes | No | Yes |
| resize (pixels) | Yes | Yes | Yes | No | Yes |
| resize (chars) | Yes | Yes | Yes | No | Yes |
| raise/lower | Yes | Limited | Yes | No | Limited |
| maximize | Yes | Yes | Yes | No | Yes |
| full-screen | Yes | Yes | Yes | No | Yes |
| title stack | Yes | Yes | Yes | Yes | Yes |

**Note:** Support varies by terminal and configuration. Some security-conscious terminals disable window manipulation by default.

## Security Considerations

Window manipulation can be used maliciously (e.g., moving a window off-screen). Many terminals:

1. Disable window ops by default (`allowWindowOps: false` in xterm)
2. Require explicit user consent
3. Limit what operations are allowed

When using these features:
- Don't assume they'll work on all terminals
- Provide fallbacks for terminals that don't support them
- Consider the user experience if operations are blocked
