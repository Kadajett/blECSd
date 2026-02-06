# Feature Detection

Detects terminal capabilities, quirks, and modern protocol support. This module provides passive detection based on terminfo data, environment variables, and terminal name patterns.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFeatures, detectModernProtocols, getFeatureSummary } from 'blecsd';

// Detect all features at once
const features = detectFeatures(terminfoData);

if (features.unicode && !features.brokenACS) {
  // Use Unicode box drawing
}

if (features.trueColor) {
  // Use 24-bit colors
}

// Check modern protocol support
const protocols = detectModernProtocols(terminfoData);

if (protocols.kittyKeyboard) {
  // Enable Kitty keyboard protocol
}

// Get human-readable summary
console.log(getFeatureSummary(features, protocols));
```

---

## detectFeatures

Detects all terminal features from terminfo data.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFeatures, createTput } from 'blecsd';

const tput = createTput();
const features = detectFeatures(tput.getData());

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectModernProtocols } from 'blecsd';

const protocols = detectModernProtocols(terminfoData);

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectUnicode } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectColors } from 'blecsd';

const colors = detectColors(info);
// 0, 8, 16, 256, or 16777216 (true color)
```

---

### detectTrueColor

Detects 24-bit true color support.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectTrueColor } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detect256Color } from 'blecsd';

if (detect256Color(info)) {
  // Use 256-color palette
}
```

---

### detectBrokenACS

Detects if ACS (alternate character set) is broken.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectBrokenACS } from 'blecsd';

if (detectBrokenACS(info)) {
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectPCRomSet } from 'blecsd';

if (detectPCRomSet(info)) {
  console.log('Using PC ROM character set');
}
```

---

### detectAlternateScreen

Detects alternate screen buffer support (smcup/rmcup).

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectAlternateScreen } from 'blecsd';

if (detectAlternateScreen(info)) {
  // Can use alternate screen for full-screen UI
}
```

---

### detectMouse

Detects mouse tracking support.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectMouse } from 'blecsd';

if (detectMouse(info)) {
  // Enable mouse tracking
}
```

---

### detectFocusEvents

Detects focus event reporting support.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFocusEvents } from 'blecsd';

if (detectFocusEvents(info)) {
  // Can track window focus/blur
}
```

---

### detectBracketedPaste

Detects bracketed paste mode support.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectBracketedPaste } from 'blecsd';

if (detectBracketedPaste(info)) {
  // Can differentiate typed vs pasted input
}
```

---

### detectTitle

Detects title setting support.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectTitle } from 'blecsd';

if (detectTitle(info)) {
  // Can set window title
}
```

---

### detectMagicCookie, detectPadding, detectSetbuf

NCurses-compatible quirk detection.

```typescript
import { detectMagicCookie, detectPadding, detectSetbuf } from 'blecsd';

// These are controlled by environment variables:
// NCURSES_NO_MAGIC_COOKIE=1 to disable magic cookie handling
// NCURSES_NO_PADDING=1 to disable padding
// NCURSES_NO_SETBUF=1 to disable setbuf
```

---

## getFeatureSummary

Gets a human-readable summary of detected features.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFeatures, detectModernProtocols, getFeatureSummary } from 'blecsd';

const features = detectFeatures(info);
const protocols = detectModernProtocols(info);
const summary = getFeatureSummary(features, protocols);

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFeatures, detectUnicode, createTput } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectFeatures, detectModernProtocols } from 'blecsd';

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

- [Tput](./tput.md) - Terminal capability interface
- [ACS Maps](./acs.md) - Alternate character set handling
- [Capabilities](./capabilities.md) - Capability name mappings
