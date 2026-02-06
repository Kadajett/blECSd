# Terminal Detection

The detection module provides functions for detecting terminal capabilities and type. This is part of the **public API**.

## Overview

Terminal detection helps your application adapt to different terminal environments by detecting:
- Terminal type (xterm, iTerm2, Kitty, etc.)
- Color support (16, 256, or truecolor)
- Feature support (mouse, Unicode, bracketed paste)
- Multiplexer presence (tmux, screen)

## Quick Start

```typescript
import {
  getTerminalInfo,
  isColorSupported,
  isTrueColorSupported,
  isMouseSupported,
  isTmux,
} from 'blecsd/terminal';

// Get comprehensive terminal info
const info = getTerminalInfo();
console.log(`Terminal: ${info.name}`);
console.log(`Colors: ${info.colorSupport}`);
console.log(`Size: ${info.cols}x${info.rows}`);

// Check specific features
if (isTrueColorSupported()) {
  // Use 24-bit RGB colors
} else if (isColorSupported()) {
  // Fall back to 256 or 16 colors
}

if (isMouseSupported()) {
  // Enable mouse tracking
}
```

## Functions

### getTerminalInfo()

Get comprehensive terminal information.

```typescript
function getTerminalInfo(): TerminalInfo
```

**Returns:** `TerminalInfo` object with all detected capabilities

**Example:**

```typescript
import { getTerminalInfo } from 'blecsd/terminal';

const info = getTerminalInfo();

console.log(info);
// {
//   name: 'xterm-256color',
//   version: '380',
//   colorSupport: 256,
//   unicodeSupport: true,
//   mouseSupport: true,
//   bracketedPaste: true,
//   tmux: false,
//   screen: false,
//   vscode: false,
//   cols: 120,
//   rows: 40
// }
```

### Color Detection

#### isColorSupported()

Check if color output is supported.

```typescript
function isColorSupported(): boolean
```

**Example:**

```typescript
import { isColorSupported, style } from 'blecsd/terminal';

function log(msg: string) {
  if (isColorSupported()) {
    process.stdout.write(style.fg('green') + msg + style.reset() + '\n');
  } else {
    console.log(msg);
  }
}
```

#### isTrueColorSupported()

Check if 24-bit true color (RGB) is supported.

```typescript
function isTrueColorSupported(): boolean
```

**Example:**

```typescript
import { isTrueColorSupported, style } from 'blecsd/terminal';

function colorize(text: string, r: number, g: number, b: number) {
  if (isTrueColorSupported()) {
    return style.fgRgb(r, g, b) + text + style.reset();
  }
  // Fall back to closest 256-color
  return style.fg256(approximateColor(r, g, b)) + text + style.reset();
}
```

#### getColorDepth()

Get the color depth level.

```typescript
function getColorDepth(): ColorSupport
```

**Returns:** `2` (monochrome), `16`, `256`, or `'truecolor'`

**Example:**

```typescript
import { getColorDepth } from 'blecsd/terminal';

const depth = getColorDepth();
switch (depth) {
  case 'truecolor':
    console.log('Full 24-bit color support');
    break;
  case 256:
    console.log('256 color palette');
    break;
  case 16:
    console.log('Basic 16 colors');
    break;
  default:
    console.log('Monochrome');
}
```

### Terminal Type Detection

#### isTmux()

Check if running inside tmux.

```typescript
function isTmux(): boolean
```

**Example:**

```typescript
import { isTmux, tmux } from 'blecsd/terminal';

function writeOutput(seq: string) {
  if (isTmux()) {
    // Wrap in tmux passthrough
    process.stdout.write(tmux.passThrough(seq));
  } else {
    process.stdout.write(seq);
  }
}
```

#### isScreen()

Check if running inside GNU screen.

```typescript
function isScreen(): boolean
```

#### isVSCode()

Check if running in VSCode integrated terminal.

```typescript
function isVSCode(): boolean
```

#### isXterm()

Check if terminal is xterm or xterm-compatible.

```typescript
function isXterm(): boolean
```

#### isVTE()

Check if terminal is VTE-based (GNOME Terminal, Tilix, etc.).

```typescript
function isVTE(): boolean
```

#### isITerm2()

Check if terminal is iTerm2.

```typescript
function isITerm2(): boolean
```

#### isAlacritty()

Check if terminal is Alacritty.

```typescript
function isAlacritty(): boolean
```

#### isKitty()

Check if terminal is Kitty.

```typescript
function isKitty(): boolean
```

#### isWindowsTerminal()

Check if terminal is Windows Terminal.

```typescript
function isWindowsTerminal(): boolean
```

### Feature Detection

#### isUnicodeSupported()

Check if Unicode/UTF-8 is supported.

```typescript
function isUnicodeSupported(): boolean
```

**Example:**

```typescript
import { isUnicodeSupported, boxDrawing } from 'blecsd/terminal';

const chars = isUnicodeSupported()
  ? boxDrawing.unicode      // ┌─┐ etc.
  : boxDrawing.ascii;       // +-+ etc.
```

#### isMouseSupported()

Check if mouse tracking is supported.

```typescript
function isMouseSupported(): boolean
```

**Example:**

<!-- blecsd-doccheck:ignore -->
```typescript
import { isMouseSupported, mouse } from 'blecsd/terminal';

if (isMouseSupported()) {
  process.stdout.write(mouse.enableSgr());
  // Handle mouse events...
}
```

#### isBracketedPasteSupported()

Check if bracketed paste mode is supported.

```typescript
function isBracketedPasteSupported(): boolean
```

**Example:**

```typescript
import { isBracketedPasteSupported, bracketedPaste } from 'blecsd/terminal';

if (isBracketedPasteSupported()) {
  process.stdout.write(bracketedPaste.enable());
}
```

### Version Detection

#### getTerminalVersion()

Get the terminal version string if available.

```typescript
function getTerminalVersion(): string | undefined
```

**Example:**

```typescript
import { getTerminalVersion, isITerm2 } from 'blecsd/terminal';

if (isITerm2()) {
  const version = getTerminalVersion();
  if (version && parseInt(version) >= 3) {
    // iTerm2 v3+ features available
  }
}
```

#### detectTerminalName()

Detect the terminal name/type.

```typescript
function detectTerminalName(): string
```

**Returns:** Terminal name like `'xterm-256color'`, `'iTerm.app'`, `'kitty'`, etc.

## Types

### ColorSupport

```typescript
type ColorSupport = 2 | 16 | 256 | 'truecolor';
```

| Value | Description |
|-------|-------------|
| `2` | Monochrome (black/white) |
| `16` | Basic 16 ANSI colors |
| `256` | 256-color palette |
| `'truecolor'` | 24-bit RGB colors |

### TerminalInfo

```typescript
interface TerminalInfo {
  /** Terminal name (xterm, vte, iterm2, etc.) */
  name: string;
  /** Terminal version if available */
  version?: string;
  /** Color support level */
  colorSupport: ColorSupport;
  /** Unicode/UTF-8 support */
  unicodeSupport: boolean;
  /** Mouse tracking support */
  mouseSupport: boolean;
  /** Bracketed paste mode support */
  bracketedPaste: boolean;
  /** Running inside tmux */
  tmux: boolean;
  /** Running inside GNU screen */
  screen: boolean;
  /** Running inside VSCode terminal */
  vscode: boolean;
  /** Terminal width in columns */
  cols: number;
  /** Terminal height in rows */
  rows: number;
}
```

## Environment Variables

The detection functions check these environment variables:

| Variable | Used For |
|----------|----------|
| `TERM` | Terminal type |
| `COLORTERM` | Color support (truecolor) |
| `TERM_PROGRAM` | Terminal application name |
| `TERM_PROGRAM_VERSION` | Terminal version |
| `TMUX` | tmux detection |
| `STY` | GNU screen detection |
| `VTE_VERSION` | VTE-based terminal detection |
| `KITTY_WINDOW_ID` | Kitty detection |
| `ALACRITTY_SOCKET` | Alacritty detection |
| `WT_SESSION` | Windows Terminal detection |
| `LANG`, `LC_ALL` | Unicode support |

## Usage Patterns

### Feature-Based Rendering

```typescript
import {
  getTerminalInfo,
  isUnicodeSupported,
  isTrueColorSupported,
} from 'blecsd/terminal';

class Renderer {
  private info = getTerminalInfo();
  private useUnicode = isUnicodeSupported();
  private useTrueColor = isTrueColorSupported();

  drawBorder() {
    const chars = this.useUnicode
      ? { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }
      : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
    // ...
  }

  setColor(r: number, g: number, b: number) {
    if (this.useTrueColor) {
      return style.fgRgb(r, g, b);
    }
    return style.fg256(this.toAnsi256(r, g, b));
  }
}
```

### Multiplexer Awareness

```typescript
import { isTmux, isScreen, tmux } from 'blecsd/terminal';

function setTitle(newTitle: string) {
  if (isTmux() || isScreen()) {
    // Set tmux/screen window title
    process.stdout.write(`\x1bk${newTitle}\x1b\\`);
  } else {
    // Set regular terminal title
    process.stdout.write(`\x1b]0;${newTitle}\x07`);
  }
}
```

## Related

- [ANSI Escape Codes](./ansi.md) - Escape sequence generation
- [Tmux Pass-Through](./tmux.md) - tmux compatibility
