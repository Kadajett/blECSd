# ANSI Escape Code Generator

The ansi module provides pure functions for generating ANSI escape sequences. All functions return strings with no side effects.

## Overview

ANSI escape codes control terminal behavior including cursor positioning, text styling, colors, screen management, and more. This module provides type-safe generators for all common escape sequences.

## Quick Start

```typescript
import { cursorSeq, style, screenSeq, mouse } from 'blecsd/terminal';

// Move cursor and style text
process.stdout.write(cursorSeq.move(10, 5));
process.stdout.write(style.bold() + 'Bold text' + style.reset());

// Enter alternate screen
process.stdout.write(screenSeq.alternateOn());

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

## ANSI Attribute Parser

Parse SGR escape sequences into attribute objects for rendering pipelines.

```typescript
import { createAttribute, parseSgrString } from 'blecsd/terminal';

const attr = createAttribute();
parseSgrString('\x1b[1;38;5;196m', attr);
// attr now has bold + 256-color foreground
```

Useful helpers:

```typescript
import { applySgrCodes, extractSgrCodes, createAttribute } from 'blecsd/terminal';

const attr = createAttribute();
const codes = extractSgrCodes('\x1b[1;31m');
applySgrCodes(codes[0] ?? [], attr);
```

Notes:
- `parseSgrString` applies codes in-place and is optimized for streaming input.
- Empty parameters (CSI `m`) are treated as reset (`0`).

## cursorSeq Namespace

Functions for cursor positioning and visibility (ANSI escape sequences). Exported as `cursorSeq` from `blecsd/terminal` to distinguish from the artificial cursor manager (`cursor`).

### Movement

```typescript
import { cursorSeq } from 'blecsd/terminal';

const col = 10;
const row = 5;
const n = 1;

cursorSeq.move(col, row)    // Move to absolute position (1-based)
cursorSeq.up(n)             // Move up n rows
cursorSeq.down(n)           // Move down n rows
cursorSeq.forward(n)        // Move right n columns
cursorSeq.back(n)           // Move left n columns
cursorSeq.nextLine(n)       // Move to beginning of line n down
cursorSeq.prevLine(n)       // Move to beginning of line n up
cursorSeq.column(n)         // Move to column n (1-based)
cursorSeq.home()            // Move to (1, 1)
```

### Visibility

```typescript
import { cursorSeq } from 'blecsd/terminal';

cursorSeq.show()            // Make cursor visible
cursorSeq.hide()            // Make cursor invisible
cursorSeq.save()            // Save cursor position
cursorSeq.restore()         // Restore cursor position
```

### Position Query

```typescript
import { cursorSeq } from 'blecsd/terminal';

cursorSeq.requestPosition() // Request cursor position (terminal responds with CSI row;col R)
```

**Example:**

```typescript
import { cursorSeq } from 'blecsd/terminal';

// Draw a box at position 10, 5
process.stdout.write(cursorSeq.move(10, 5) + '┌───┐');
process.stdout.write(cursorSeq.move(10, 6) + '│   │');
process.stdout.write(cursorSeq.move(10, 7) + '└───┘');

// Hide cursor during animation
process.stdout.write(cursorSeq.hide());
// ... animation ...
process.stdout.write(cursorSeq.show());
```

## CursorShape

Constants for cursor shape styles.

```typescript
import { cursorSeq } from 'blecsd/terminal';
import { CursorShape } from 'blecsd/components';

CursorShape.DEFAULT         // 0 - Default cursor
CursorShape.BLOCK_BLINK     // 1 - Blinking block
CursorShape.BLOCK           // 2 - Steady block
CursorShape.UNDERLINE_BLINK // 3 - Blinking underline
CursorShape.UNDERLINE       // 4 - Steady underline
CursorShape.BAR_BLINK       // 5 - Blinking bar
CursorShape.BAR             // 6 - Steady bar

// Set cursor shape
process.stdout.write(cursorSeq.setShape(CursorShape.BAR));
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
import { style } from 'blecsd/terminal';

// Basic colors (named)
style.fg('red')
style.bg('blue')
style.fg('brightYellow')

// 256-color palette (0-255) - pass number directly to fg/bg
style.fg(196)      // Bright red (256-color)
style.bg(21)       // Blue (256-color)

// True color (RGB) - pass object to fg/bg
style.fg({ r: 255, g: 128, b: 0 })   // Orange foreground
style.bg({ r: 0, g: 0, b: 128 })     // Navy background
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

## screenSeq Namespace

Functions for screen management (ANSI escape sequences). Exported as `screenSeq` from `blecsd/terminal` to distinguish from the screen management namespace (`screen`).

### Clearing

```typescript
import { screenSeq } from 'blecsd/terminal';

screenSeq.clear()           // Clear entire screen
screenSeq.clearDown()       // Clear from cursor to end of screen
screenSeq.clearUp()         // Clear from cursor to beginning of screen
screenSeq.clearLine()       // Clear entire current line
screenSeq.clearLineRight()  // Clear from cursor to end of line
screenSeq.clearLineLeft()   // Clear from cursor to start of line
```

### Alternate Screen Buffer

```typescript
import { screenSeq } from 'blecsd/terminal';

screenSeq.alternateOn()     // Enter alternate screen buffer
screenSeq.alternateOff()    // Exit alternate screen buffer
```

### Scrolling

```typescript
import { screenSeq } from 'blecsd/terminal';

const n = 1;
const top = 1;
const bottom = 24;

screenSeq.scrollUp(n)       // Scroll up n lines
screenSeq.scrollDown(n)     // Scroll down n lines
screenSeq.setScrollRegion(top, bottom)  // Set scroll region
screenSeq.resetScrollRegion()           // Reset scroll region
```

**Example:**

```typescript
import { screenSeq, cursorSeq } from 'blecsd/terminal';

// Full-screen application
process.stdout.write(screenSeq.alternateOn());  // Enter alternate buffer
process.stdout.write(screenSeq.clear());         // Clear screen
process.stdout.write(cursorSeq.hide());          // Hide cursor

// ... application runs ...

// Cleanup
process.stdout.write(cursorSeq.show());
process.stdout.write(screenSeq.alternateOff()); // Exit alternate buffer
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

mouse.enableNormal()       // Enable X10 mouse mode
mouse.enableButtonEvent()  // Enable button tracking
mouse.enableAnyEvent()     // Enable any-event tracking
mouse.enableSGR()          // Enable SGR extended mode

mouse.disableNormal()      // Disable X10 mode
mouse.disableButtonEvent() // Disable button tracking
mouse.disableAnyEvent()    // Disable any-event tracking
mouse.disableSGR()         // Disable SGR mode

mouse.disableAll()         // Disable all mouse modes
```

**Example:**

```typescript
import { mouse, screenSeq } from 'blecsd/terminal';

// Interactive application with mouse
process.stdout.write(screenSeq.alternateOn());
process.stdout.write(mouse.enableSGR());  // Best mouse mode

process.stdin.on('data', (_data) => {
  // Parse mouse events from data
  // SGR format: CSI < button;col;row M/m
});

// Cleanup
process.stdout.write(mouse.disableAll());
process.stdout.write(screenSeq.alternateOff());
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
import { sync, cursorSeq, style } from 'blecsd/terminal';

function render() {
  let output = sync.begin();  // Start sync

  // Build entire frame
  output += cursorSeq.home();
  output += 'Frame content...';

  output += sync.end();       // End sync
  process.stdout.write(output);
}
```

## bracketedPasteSeq Namespace

Bracketed paste mode ANSI sequences. Exported as `bracketedPasteSeq` from `blecsd/terminal` to distinguish from the paste event handler (`bracketedPaste`).

```typescript
import { bracketedPasteSeq } from 'blecsd/terminal';

bracketedPasteSeq.enable()   // Enable bracketed paste mode
bracketedPasteSeq.disable()  // Disable bracketed paste mode
```

When enabled, pasted content is wrapped with special sequences:
- Start: `\x1b[200~`
- End: `\x1b[201~`

This allows the application to distinguish typed input from pasted content.

## clipboardSeq Namespace

Terminal clipboard ANSI operations (OSC 52). Exported as `clipboardSeq` from `blecsd/terminal` to distinguish from the clipboard manager (`clipboard`).

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
import { clipboardSeq, ClipboardSelection } from 'blecsd/terminal';

// Write to clipboard
clipboardSeq.write('text to copy', ClipboardSelection.CLIPBOARD)

// Request clipboard contents (terminal responds with OSC 52)
clipboardSeq.requestRead(ClipboardSelection.CLIPBOARD)

// Clear clipboard
clipboardSeq.clear(ClipboardSelection.CLIPBOARD)
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
