# ANSI Escape Code Generator

The ansi module provides pure functions for generating ANSI escape sequences. All functions return strings with no side effects.

## Overview

ANSI escape codes control terminal behavior including cursor positioning, text styling, colors, screen management, and more. This module provides type-safe generators for all common escape sequences.

## Quick Start

```typescript
import { cursor, style, screen, mouse } from 'blecsd/terminal';

// Move cursor and style text
process.stdout.write(cursor.move(10, 5));
process.stdout.write(style.bold() + 'Bold text' + style.reset());

// Enter alternate screen
process.stdout.write(screen.alternateOn());

// Enable mouse tracking
process.stdout.write(mouse.enableNormal());
```

## Constants

### Control Sequences

| Constant | Value | Description |
|----------|-------|-------------|
| `CSI` | `\x1b[` | Control Sequence Introducer - starts most ANSI sequences |
| `OSC` | `\x1b]` | Operating System Command - for titles, clipboard, etc. |
| `DCS` | `\x1bP` | Device Control String - terminal-specific commands |
| `ST` | `\x1b\\` | String Terminator - ends OSC and DCS sequences |
| `BEL` | `\x07` | Bell character - alternative string terminator |
| `ESC` | `\x1b` | Escape character |

### SGR (Select Graphic Rendition) Codes

```typescript
import { SGR } from 'blecsd/terminal';

// Text styles
SGR.RESET        // 0 - Reset all attributes
SGR.BOLD         // 1
SGR.DIM          // 2
SGR.ITALIC       // 3
SGR.UNDERLINE    // 4
SGR.BLINK        // 5
SGR.INVERSE      // 7
SGR.HIDDEN       // 8
SGR.STRIKETHROUGH // 9

// Foreground colors (30-37)
SGR.FG_BLACK, SGR.FG_RED, SGR.FG_GREEN, SGR.FG_YELLOW
SGR.FG_BLUE, SGR.FG_MAGENTA, SGR.FG_CYAN, SGR.FG_WHITE

// Bright foreground (90-97)
SGR.FG_BRIGHT_BLACK, SGR.FG_BRIGHT_RED, ...

// Background colors (40-47, 100-107)
SGR.BG_BLACK, SGR.BG_RED, ...
SGR.BG_BRIGHT_BLACK, SGR.BG_BRIGHT_RED, ...

// Extended colors
SGR.FG_256  // 38 - 256-color foreground
SGR.BG_256  // 48 - 256-color background
```

## cursor Namespace

Functions for cursor positioning and visibility.

### Movement

```typescript
import { cursor } from 'blecsd/terminal';

cursor.move(col, row)    // Move to absolute position (1-based)
cursor.up(n)             // Move up n rows
cursor.down(n)           // Move down n rows
cursor.forward(n)        // Move right n columns
cursor.back(n)           // Move left n columns
cursor.nextLine(n)       // Move to beginning of line n down
cursor.prevLine(n)       // Move to beginning of line n up
cursor.column(n)         // Move to column n (1-based)
cursor.home()            // Move to (1, 1)
```

### Visibility

```typescript
cursor.show()            // Make cursor visible
cursor.hide()            // Make cursor invisible
cursor.save()            // Save cursor position
cursor.restore()         // Restore cursor position
```

### Position Query

```typescript
cursor.requestPosition() // Request cursor position (terminal responds with CSI row;col R)
```

**Example:**

```typescript
import { cursor } from 'blecsd/terminal';

// Draw a box at position 10, 5
process.stdout.write(cursor.move(10, 5) + '┌───┐');
process.stdout.write(cursor.move(10, 6) + '│   │');
process.stdout.write(cursor.move(10, 7) + '└───┘');

// Hide cursor during animation
process.stdout.write(cursor.hide());
// ... animation ...
process.stdout.write(cursor.show());
```

## CursorShape

Constants for cursor shape styles.

```typescript
import { cursor, CursorShape } from 'blecsd/terminal';

CursorShape.DEFAULT         // 0 - Default cursor
CursorShape.BLOCK_BLINK     // 1 - Blinking block
CursorShape.BLOCK           // 2 - Steady block
CursorShape.UNDERLINE_BLINK // 3 - Blinking underline
CursorShape.UNDERLINE       // 4 - Steady underline
CursorShape.BAR_BLINK       // 5 - Blinking bar
CursorShape.BAR             // 6 - Steady bar

// Set cursor shape
process.stdout.write(cursor.setShape(CursorShape.BAR));
```

## style Namespace

Functions for text styling and colors.

### Text Attributes

```typescript
import { style } from 'blecsd/terminal';

style.reset()         // Reset all attributes
style.bold()          // Bold text
style.dim()           // Dim/faint text
style.italic()        // Italic text
style.underline()     // Underlined text
style.blink()         // Blinking text
style.inverse()       // Inverted colors
style.hidden()        // Hidden/invisible text
style.strikethrough() // Strikethrough text
```

### Colors

```typescript
// Basic colors (named)
style.fg('red')
style.bg('blue')
style.fg('brightYellow')

// 256-color palette (0-255)
style.fg256(196)      // Bright red
style.bg256(21)       // Blue

// True color (RGB)
style.fgRgb(255, 128, 0)   // Orange foreground
style.bgRgb(0, 0, 128)     // Navy background

// Reset individual colors
style.fgDefault()
style.bgDefault()
```

### Combined Styling

```typescript
// Chain multiple styles
const styled = style.bold() + style.fg('red') + 'Error!' + style.reset();
process.stdout.write(styled);
```

**Example:**

```typescript
import { style } from 'blecsd/terminal';

// Styled log output
function logError(msg: string) {
  process.stdout.write(
    style.bold() + style.fg('red') + '[ERROR] ' + style.reset() +
    msg + '\n'
  );
}

function logSuccess(msg: string) {
  process.stdout.write(
    style.fg('green') + '✓ ' + style.reset() + msg + '\n'
  );
}
```

## screen Namespace

Functions for screen management.

### Clearing

```typescript
import { screen } from 'blecsd/terminal';

screen.clear()           // Clear entire screen
screen.clearBelow()      // Clear from cursor to end
screen.clearAbove()      // Clear from cursor to beginning
screen.clearLine()       // Clear entire current line
screen.clearLineEnd()    // Clear from cursor to end of line
screen.clearLineStart()  // Clear from cursor to start of line
```

### Alternate Screen Buffer

```typescript
screen.alternateOn()     // Enter alternate screen buffer
screen.alternateOff()    // Exit alternate screen buffer
```

### Scrolling

```typescript
screen.scrollUp(n)       // Scroll up n lines
screen.scrollDown(n)     // Scroll down n lines
screen.setScrollRegion(top, bottom)  // Set scroll region
screen.resetScrollRegion()           // Reset scroll region
```

**Example:**

```typescript
import { screen, cursor } from 'blecsd/terminal';

// Full-screen application
process.stdout.write(screen.alternateOn());  // Enter alternate buffer
process.stdout.write(screen.clear());         // Clear screen
process.stdout.write(cursor.hide());          // Hide cursor

// ... application runs ...

// Cleanup
process.stdout.write(cursor.show());
process.stdout.write(screen.alternateOff()); // Exit alternate buffer
```

## title Namespace

Functions for terminal title manipulation.

```typescript
import { title } from 'blecsd/terminal';

title.set('My Application')     // Set window title
title.setIcon('Icon')           // Set icon name
title.setBoth('App', 'Icon')    // Set both title and icon
```

**Example:**

```typescript
import { title } from 'blecsd/terminal';

// Update title with status
function updateStatus(status: string) {
  process.stdout.write(title.set(`My App - ${status}`));
}

updateStatus('Ready');
// ... later ...
updateStatus('Processing...');
```

## mouse Namespace

Functions for mouse tracking.

### MouseMode Constants

```typescript
import { MouseMode } from 'blecsd/terminal';

MouseMode.OFF           // Mouse tracking disabled
MouseMode.NORMAL        // X10 compatibility mode
MouseMode.BUTTON        // Button events only
MouseMode.ANY           // Any event tracking
MouseMode.SGR           // SGR extended mode
MouseMode.URXVT         // urxvt extended mode
```

### Enable/Disable

```typescript
import { mouse } from 'blecsd/terminal';

mouse.enableNormal()    // Enable X10 mouse mode
mouse.enableButton()    // Enable button tracking
mouse.enableAny()       // Enable any-event tracking
mouse.enableSgr()       // Enable SGR extended mode

mouse.disableNormal()   // Disable X10 mode
mouse.disableButton()   // Disable button tracking
mouse.disableAny()      // Disable any-event tracking
mouse.disableSgr()      // Disable SGR mode

mouse.disableAll()      // Disable all mouse modes
```

**Example:**

```typescript
import { mouse, screen } from 'blecsd/terminal';

// Interactive application with mouse
process.stdout.write(screen.alternateOn());
process.stdout.write(mouse.enableSgr());  // Best mouse mode

process.stdin.on('data', (data) => {
  // Parse mouse events from data
  // SGR format: CSI < button;col;row M/m
});

// Cleanup
process.stdout.write(mouse.disableAll());
process.stdout.write(screen.alternateOff());
```

## sync Namespace

Synchronized output for flicker-free rendering.

```typescript
import { sync } from 'blecsd/terminal';

sync.begin()   // Begin synchronized update (CSI ? 2026 h)
sync.end()     // End synchronized update (CSI ? 2026 l)
```

**Example:**

```typescript
import { sync, cursor, style } from 'blecsd/terminal';

function render() {
  let output = sync.begin();  // Start sync

  // Build entire frame
  output += cursor.home();
  output += 'Frame content...';

  output += sync.end();       // End sync
  process.stdout.write(output);
}
```

## bracketedPaste Namespace

Bracketed paste mode for safe paste handling.

```typescript
import { bracketedPaste } from 'blecsd/terminal';

bracketedPaste.enable()   // Enable bracketed paste mode
bracketedPaste.disable()  // Disable bracketed paste mode
```

When enabled, pasted content is wrapped with special sequences:
- Start: `\x1b[200~`
- End: `\x1b[201~`

This allows the application to distinguish typed input from pasted content.

## clipboard Namespace

Terminal clipboard operations (OSC 52).

### ClipboardSelection Constants

```typescript
import { ClipboardSelection } from 'blecsd/terminal';

ClipboardSelection.CLIPBOARD  // 'c' - System clipboard
ClipboardSelection.PRIMARY    // 'p' - Primary selection (X11)
ClipboardSelection.SECONDARY  // 's' - Secondary selection
ClipboardSelection.SELECT     // 's' - Select
ClipboardSelection.CUT0       // '0' - Cut buffer 0
// ... CUT1 through CUT7
```

### Operations

```typescript
import { clipboard, ClipboardSelection } from 'blecsd/terminal';

// Write to clipboard
clipboard.write('text to copy', ClipboardSelection.CLIPBOARD)

// Request clipboard contents (terminal responds with OSC 52)
clipboard.request(ClipboardSelection.CLIPBOARD)

// Clear clipboard
clipboard.clear(ClipboardSelection.CLIPBOARD)
```

**Note:** Clipboard operations require terminal support and may be disabled for security reasons.

## Color Types

```typescript
// Basic 16 colors
type BasicColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' |
                  'magenta' | 'cyan' | 'white' |
                  'brightBlack' | 'brightRed' | 'brightGreen' |
                  'brightYellow' | 'brightBlue' | 'brightMagenta' |
                  'brightCyan' | 'brightWhite' | 'default';

// 256-color palette index
type Color256 = number;  // 0-255

// RGB color
interface RGBColor {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

// Union of all color types
type Color = BasicColor | Color256 | RGBColor;
```

## Related Documentation

For specialized terminal features, see:
- [Character Sets](./charset.md) - Box drawing and special characters
- [Window Operations](./window-ops.md) - Window manipulation
- [Hyperlinks](./hyperlink.md) - Clickable links (OSC 8)
- [Tmux Pass-Through](./tmux.md) - Tmux compatibility
