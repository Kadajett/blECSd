# Builtin Terminfo Data

Provides hardcoded terminal capabilities for common terminals when terminfo database files are not available on the system. This ensures the library can function on minimal systems without terminfo installed.

## Overview

```typescript
import {
  getBuiltinTerminfo,
  getBestBuiltinTerminfo,
  hasBuiltinTerminfo,
  BUILTIN_TERMINALS,
} from 'blecsd';

// Get terminfo for a specific terminal
const data = getBuiltinTerminfo('xterm-256color');

// Get best match with fallback
const bestMatch = getBestBuiltinTerminfo('xterm-256color-italic');
// Returns xterm-256color data

// Check if builtin data exists
if (hasBuiltinTerminfo(process.env.TERM ?? '')) {
  console.log('Builtin fallback available');
}
```

---

## BUILTIN_TERMINALS

Map of terminal names to their builtin terminfo data.

```typescript
import { BUILTIN_TERMINALS } from 'blecsd';

// Access terminfo data directly
const xtermData = BUILTIN_TERMINALS.get('xterm-256color');

// Check available terminals
for (const name of BUILTIN_TERMINALS.keys()) {
  console.log(name);
}
```

### Supported Terminals

| Terminal | Description |
|----------|-------------|
| `xterm` | Basic xterm (8 colors) |
| `xterm-16color` | xterm with 16 colors |
| `xterm-256color` | xterm with 256 colors |
| `vt100` | DEC VT100 (no colors) |
| `vt220` | DEC VT220 (no colors, more features) |
| `screen` | GNU Screen (8 colors) |
| `screen-256color` | GNU Screen (256 colors) |
| `tmux` | tmux terminal multiplexer |
| `tmux-256color` | tmux with 256 colors |
| `linux` | Linux console |

### Terminal Aliases

Many terminal emulators are xterm-compatible. The following aliases map to xterm variants:

| Alias | Maps To |
|-------|---------|
| `konsole` | xterm-256color |
| `gnome` | xterm-256color |
| `putty` | xterm-256color |
| `iterm2` | xterm-256color |
| `alacritty` | xterm-256color |
| `wezterm` | xterm-256color |
| `rxvt-unicode` | xterm-256color |
| `ansi` | vt100 |
| `dumb` | vt100 |

---

## getBuiltinTerminfo

Gets builtin terminfo data for an exact terminal name match.

```typescript
import { getBuiltinTerminfo } from 'blecsd';

const data = getBuiltinTerminfo('xterm-256color');
if (data) {
  console.log(`${data.name} supports ${data.numbers.max_colors} colors`);
}

// Returns null for unknown terminals
const unknown = getBuiltinTerminfo('unknown-terminal');
// null
```

**Parameters:**
- `terminal` - Terminal name (e.g., 'xterm-256color')

**Returns:** `TerminfoData | null`

---

## getBestBuiltinTerminfo

Gets the best matching builtin terminfo, with intelligent fallback.

```typescript
import { getBestBuiltinTerminfo } from 'blecsd';

// Exact match
getBestBuiltinTerminfo('xterm-256color');
// Returns xterm-256color data

// Variant falls back to base
getBestBuiltinTerminfo('xterm-256color-italic');
// Returns xterm-256color data

// Unknown variant falls back to simpler version
getBestBuiltinTerminfo('xterm-unknown');
// Returns xterm data

// Completely unknown falls back to xterm-256color
getBestBuiltinTerminfo('totally-unknown-terminal');
// Returns xterm-256color data (universal fallback)
```

**Parameters:**
- `terminal` - Terminal name

**Returns:** `TerminfoData` (never null, always falls back to xterm-256color)

---

## hasBuiltinTerminfo

Checks if builtin terminfo data exists for a terminal.

```typescript
import { hasBuiltinTerminfo } from 'blecsd';

hasBuiltinTerminfo('xterm-256color');  // true
hasBuiltinTerminfo('linux');           // true
hasBuiltinTerminfo('unknown');         // false
```

**Parameters:**
- `terminal` - Terminal name to check

**Returns:** `boolean`

---

## listBuiltinTerminals

Lists all supported builtin terminal names.

```typescript
import { listBuiltinTerminals } from 'blecsd';

const terminals = listBuiltinTerminals();
console.log(`Supported: ${terminals.length} terminals`);

for (const name of terminals) {
  console.log(`  ${name}`);
}
```

**Returns:** `readonly string[]`

---

## Individual Terminal Constants

You can also import individual terminal definitions:

```typescript
import {
  XTERM,
  XTERM_16COLOR,
  XTERM_256COLOR,
  VT100,
  VT220,
  SCREEN,
  SCREEN_256COLOR,
  TMUX,
  TMUX_256COLOR,
  LINUX,
} from 'blecsd';

// Use directly
console.log(XTERM_256COLOR.numbers.max_colors);  // 256
console.log(LINUX.numbers.max_colors);           // 8
```

---

## Usage with Tput

Combine builtin data with Tput for terminal operations:

```typescript
import { createTput, getBestBuiltinTerminfo } from 'blecsd';

// Get builtin data for current terminal
const terminal = process.env.TERM ?? 'xterm-256color';
const data = getBestBuiltinTerminfo(terminal);

// Create Tput with builtin data
const tput = createTput({ data });

// Use terminal capabilities
process.stdout.write(tput.cup(10, 5));  // Move cursor
process.stdout.write(tput.setaf(1));    // Red foreground
console.log('Hello!');
process.stdout.write(tput.getString('orig_pair') ?? '');  // Reset colors
```

---

## Capability Comparison

### Color Support

| Terminal | Colors | Color Pairs |
|----------|--------|-------------|
| xterm-256color | 256 | 65536 |
| xterm-16color | 16 | 256 |
| xterm | 8 | 64 |
| screen-256color | 256 | 65536 |
| screen | 8 | 64 |
| tmux-256color | 256 | 65536 |
| linux | 8 | 64 |
| vt100 | - | - |
| vt220 | - | - |

### Feature Support

| Feature | xterm-256color | vt100 | linux |
|---------|----------------|-------|-------|
| Cursor visibility | Yes | No | Yes |
| Alternate screen | Yes | No | No |
| Insert/delete | Yes | No | Yes |
| ACS (box drawing) | Yes | No | Yes |
| Function keys | F1-F12 | F1-F4 | F1-F12 |
| Mouse | Yes | No | No |

---

## Examples

### Automatic Fallback

```typescript
import {
  findTerminfo,
  getBuiltinTerminfo,
  getBestBuiltinTerminfo,
  createTput,
} from 'blecsd';

function createTputWithFallback(): Tput {
  const terminal = process.env.TERM ?? 'xterm-256color';

  // Try to load from system terminfo
  const systemPath = findTerminfo(terminal);
  if (systemPath) {
    // Load and parse system terminfo...
    // return createTput({ data: parsedData });
  }

  // Fall back to builtin
  const builtinData = getBestBuiltinTerminfo(terminal);
  return createTput({ data: builtinData });
}
```

### Checking Terminal Features

```typescript
import { getBuiltinTerminfo } from 'blecsd';

function getTerminalFeatures(terminal: string) {
  const data = getBuiltinTerminfo(terminal);
  if (!data) return null;

  return {
    colors: data.numbers.max_colors ?? 0,
    hasAlternateScreen: !!data.strings.enter_ca_mode,
    hasCursorVisibility: !!data.strings.cursor_invisible,
    hasBoxDrawing: !!data.strings.acs_chars,
  };
}

console.log(getTerminalFeatures('xterm-256color'));
// { colors: 256, hasAlternateScreen: true, hasCursorVisibility: true, hasBoxDrawing: true }

console.log(getTerminalFeatures('vt100'));
// { colors: 0, hasAlternateScreen: false, hasCursorVisibility: false, hasBoxDrawing: false }
```

---

## See Also

- [Tput](./tput.md) - High-level capability interface
- [Parser](./parser.md) - Binary terminfo format parser
- [Locator](./locator.md) - Finding terminfo files
- [Compiler](./compiler.md) - Parameterized string compilation
