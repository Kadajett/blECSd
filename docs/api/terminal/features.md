# Feature Detection

Detects terminal capabilities, quirks, and modern protocol support. This module provides passive detection based on terminfo data, environment variables, and terminal name patterns.

## Overview

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

// Detect all features at once using default xterm data
const info = getDefaultXtermData();
const features = detectFeatures(info);

if (features.unicode) {
  // Use Unicode box drawing
}

if (features.trueColor) {
  // Use 24-bit colors
}

console.log('Supports 256 colors:', features.color256);
```

---

## detectFeatures

Detects all terminal features from terminfo data.

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

const info = getDefaultXtermData();
const features = detectFeatures(info);

console.log('Colors:', features.colors);
console.log('Unicode:', features.unicode);
console.log('True color:', features.trueColor);
console.log('Mouse:', features.mouse);
```

**Parameters:**
- `info` - Terminfo data object
- `options` - Optional `FeatureDetectionOptions`

**Returns:** `TerminalFeatures` object

### TerminalFeatures

```typescript
interface TerminalFeatures {
  /** Terminal supports Unicode */
  unicode: boolean;
  /** ACS (alternate character set) is broken/unsupported */
  brokenACS: boolean;
  /** Terminal uses PC ROM character set */
  pcRomSet: boolean;
  /** Terminal has magic cookie glitch */
  magicCookie: boolean;
  /** Terminal requires padding */
  padding: boolean;
  /** Terminal needs setbuf */
  setbuf: boolean;
  /** Parsed ACS character map */
  acsc: Map<string, string>;
  /** Reverse ACS map (Unicode to code) */
  acscReverse: Map<string, string>;
  /** Number of colors supported */
  colors: number;
  /** Supports true color (24-bit) */
  trueColor: boolean;
  /** Supports 256 colors */
  color256: boolean;
  /** Has alternate screen buffer */
  alternateScreen: boolean;
  /** Supports mouse tracking */
  mouse: boolean;
  /** Supports focus events */
  focusEvents: boolean;
  /** Supports bracketed paste */
  bracketedPaste: boolean;
  /** Supports title setting */
  title: boolean;
}
```

### Options

```typescript
interface FeatureDetectionOptions {
  /** Force Unicode support on/off */
  forceUnicode?: boolean;
  /** Use termcap data (affects some quirk detection) */
  termcap?: boolean;
}
```

---

## detectModernProtocols

Detects modern terminal protocol support (Kitty, iTerm2, Sixel, etc.).

```typescript
import { detectFeatures } from 'blecsd/terminal';

const protocols = detectFeatures(getDefaultXtermData());

if (protocols.kittyKeyboard) {
  // Enable enhanced keyboard protocol
}

if (protocols.hyperlinks) {
  // Use OSC 8 for clickable links
}

if (protocols.sixel) {
  // Can display Sixel graphics
}
```

**Parameters:**
- `info` - Terminfo data object

**Returns:** `ModernProtocols` object

### ModernProtocols

```typescript
interface ModernProtocols {
  /** Kitty keyboard protocol support */
  kittyKeyboard: boolean;
  /** Kitty graphics protocol support */
  kittyGraphics: boolean;
  /** iTerm2 inline images support */
  iterm2Images: boolean;
  /** Sixel graphics support */
  sixel: boolean;
  /** OSC 8 hyperlinks support */
  hyperlinks: boolean;
  /** Synchronized output (DEC 2026) support */
  synchronizedOutput: boolean;
}
```

---

## Individual Detection Functions

### detectUnicode

Detects Unicode support based on locale settings.

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

if (detectUnicode()) {
  console.log('Unicode box drawing available');
} else {
  console.log('Falling back to ASCII');
}

// Force Unicode on/off
detectUnicode({ forceUnicode: true });  // Always returns true
detectUnicode({ forceUnicode: false }); // Always returns false
```

**Environment Variables:**
- `LANG`, `LC_ALL`, `LC_CTYPE`, `LANGUAGE` - Checked for UTF-8
- `NCURSES_FORCE_UNICODE` - Set to `1` to force Unicode on

---

### detectColors

Gets the number of colors supported.

```typescript
import { detectFeatures } from 'blecsd/terminal';

const colors = detectFeatures(info).colors;
// 0, 8, 16, 256, or 16777216 (true color)
```

---

### detectTrueColor

Detects 24-bit true color support.

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

if (detectTrueColor(info)) {
  // Use RGB colors directly
  console.log('\x1b[38;2;255;100;50mTrue color!\x1b[0m');
}
```

**Detection Methods:**
- `COLORTERM=truecolor` or `COLORTERM=24bit`
- Known true color terminals (Kitty, iTerm2, Alacritty, WezTerm, etc.)
- Terminfo RGB capability

---

### detect256Color

Detects 256 color support.

```typescript
import { detectFeatures, getDefaultXtermData } from 'blecsd/terminal';

if (detect256Color(info)) {
  // Use 256-color palette
}
```

---

### detectBrokenACS

Detects if ACS (alternate character set) is broken.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).brokenACS) {
  // Use Unicode fallback for box drawing
} else {
  // Can use ACS characters
}
```

**Detected Cases:**
- Linux console (always broken)
- PC ROM character set terminals
- Terminals with U8 capability set
- `NCURSES_NO_UTF8_ACS=1` environment

---

### detectPCRomSet

Detects if terminal uses PC ROM character set instead of ACS.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).pcRomSet) {
  console.log('Using PC ROM character set');
}
```

---

### detectAlternateScreen

Detects alternate screen buffer support (smcup/rmcup).

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).alternateScreen) {
  // Can use alternate screen for full-screen UI
}
```

---

### detectMouse

Detects mouse tracking support.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).mouse) {
  // Enable mouse tracking
}
```

---

### detectFocusEvents

Detects focus event reporting support.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).focusEvents) {
  // Can track window focus/blur
}
```

---

### detectBracketedPaste

Detects bracketed paste mode support.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).bracketedPaste) {
  // Can differentiate typed vs pasted input
}
```

---

### detectTitle

Detects title setting support.

```typescript
import { detectFeatures } from 'blecsd/terminal';

if (detectFeatures(info).title) {
  // Can set window title
}
```

---

### detectMagicCookie, detectPadding, detectSetbuf

NCurses-compatible quirk detection.

```typescript
import { detectFeatures } from 'blecsd/terminal';

// These are controlled by environment variables:
// NCURSES_NO_MAGIC_COOKIE=1 to disable magic cookie handling
// NCURSES_NO_PADDING=1 to disable padding
// NCURSES_NO_SETBUF=1 to disable setbuf
```

---

## getFeatureSummary

Gets a human-readable summary of detected features.

```typescript
import { detectFeatures } from 'blecsd/terminal';
import { detectFeatures } from 'blecsd/terminal';

const features = detectFeatures(info);
const protocols = detectModernProtocols(info);
const summary = JSON.stringify(features);

console.log(summary);
// Colors: 256 (true color)
// Unicode: yes
// ACS: ok (31 chars)
// Alt screen: yes
// Mouse: yes
// Focus events: yes
// Bracketed paste: yes
//
// Modern protocols:
//   - Kitty keyboard
//   - Kitty graphics
//   - OSC 8 hyperlinks
//   - Synchronized output
```

**Parameters:**
- `features` - Detected features from `detectFeatures()`
- `protocols` - Optional protocols from `detectModernProtocols()`

**Returns:** Multi-line string summary

---

## Examples

### Adaptive Rendering

```typescript
import { detectFeatures, detectUnicode, createTput } from 'blecsd/terminal';

const tput = createTput();
const features = detectFeatures(tput.getData());

// Choose box drawing characters
const boxChars = features.unicode && !features.brokenACS
  ? { topLeft: '\u250c', horizontal: '\u2500', vertical: '\u2502' }
  : { topLeft: '+', horizontal: '-', vertical: '|' };

// Choose color depth
function setColor(r: number, g: number, b: number): string {
  if (features.trueColor) {
    return `\x1b[38;2;${r};${g};${b}m`;
  }
  if (features.color256) {
    // Convert to 256-color palette
    const code = 16 + (36 * Math.round(r / 51)) +
                 (6 * Math.round(g / 51)) +
                 Math.round(b / 51);
    return `\x1b[38;5;${code}m`;
  }
  // Fall back to basic colors
  return '\x1b[37m';
}
```

### Feature-Based Initialization

```typescript
import { detectFeatures } from 'blecsd/terminal';
import { detectFeatures } from 'blecsd/terminal';

function initTerminal(info: TerminfoData): void {
  const features = detectFeatures(info);
  const protocols = detectModernProtocols(info);

  // Enable alternate screen if available
  if (features.alternateScreen) {
    process.stdout.write('\x1b[?1049h');
  }

  // Enable mouse tracking
  if (features.mouse) {
    process.stdout.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
  }

  // Enable focus events
  if (features.focusEvents) {
    process.stdout.write('\x1b[?1004h');
  }

  // Enable bracketed paste
  if (features.bracketedPaste) {
    process.stdout.write('\x1b[?2004h');
  }

  // Enable Kitty keyboard protocol
  if (protocols.kittyKeyboard) {
    process.stdout.write('\x1b[>1u');
  }

  // Enable synchronized output
  if (protocols.synchronizedOutput) {
    // Use BSU/ESU when rendering
  }
}
```

---

## See Also

- [Tput](../terminfo.md) - Terminal capability interface
- [ACS Maps](./acs.md) - Alternate character set handling
- [Capabilities](../capabilities.md) - Capability name mappings
