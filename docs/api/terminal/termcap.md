# Termcap Parser

Parses the older termcap text format used before terminfo. Supports capability inheritance via the `tc=` capability and converts termcap short names to terminfo-style names.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseTermcap, findTermcapEntry, getTermcapData, createTput } from 'blecsd';

// Parse termcap data directly
const result = parseTermcap(data, '/etc/termcap');
const vt100 = result.entries.get('vt100');

// Find and use terminal entry
const entry = findTermcapEntry('vt100');
if (entry) {
  console.log(`Columns: ${entry.numbers.co}`);
}

// Get as TerminfoData for Tput
const terminfo = getTermcapData('vt100');
if (terminfo) {
  const tput = createTput({ data: terminfo });
}
```

---

## parseTermcap

Parses termcap format data into a database of entries.

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseTermcap } from 'blecsd';

const data = `
# VT100 terminal
vt100|dec vt100:\\
  :am:co#80:li#24:\\
  :cl=\\E[H\\E[2J:cm=\\E[%i%d;%dH:
`;

const result = parseTermcap(data, '/etc/termcap');

if (result.success) {
  const vt100 = result.entries.get('vt100');
  console.log(vt100?.numbers.co);  // 80
  console.log(vt100?.strings.cl);  // '\x1b[H\x1b[2J'
}
```

### Termcap Format

Termcap files use a colon-separated text format:

- **Comments**: Lines starting with `#`
- **Continuation**: Backslash at end of line
- **Names**: First field, separated by `|` (last is description)
- **Booleans**: Just the name (e.g., `am`)
- **Numbers**: `name#value` (e.g., `co#80`)
- **Strings**: `name=value` (e.g., `cl=\E[H`)

### Escape Sequences

| Sequence | Meaning |
|----------|---------|
| `\E`, `\e` | ESC (0x1B) |
| `^X` | Control character |
| `\n`, `\r`, `\t` | Standard escapes |
| `\b`, `\f` | Backspace, form feed |
| `\\` | Literal backslash |
| `\:` | Literal colon |
| `\0XXX` | Octal character |

**Parameters:**
- `data` - Termcap file contents
- `file` - Source file path (for error reporting)

**Returns:** `TermcapParseResult`

```typescript
interface TermcapParseResult {
  success: boolean;
  entries: TermcapDatabase;  // Map<string, TermcapEntry>
  errors: string[];
}
```

---

## TermcapEntry

A parsed termcap entry.

```typescript
interface TermcapEntry {
  name: string;                    // Primary name
  names: readonly string[];        // All aliases
  description: string;             // Description (last name)
  file: string;                    // Source file path
  bools: Record<string, boolean>;  // Boolean capabilities
  numbers: Record<string, number>; // Numeric capabilities
  strings: Record<string, string>; // String capabilities
  inherits?: string[];             // Inherited terminals (from tc=)
}
```

---

## findTermcapEntry

Finds and parses a terminal's termcap entry from standard locations.

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTermcapEntry } from 'blecsd';

const entry = findTermcapEntry('vt100');
if (entry) {
  console.log(`Terminal: ${entry.name}`);
  console.log(`Columns: ${entry.numbers.co}`);
  console.log(`Clear: ${entry.strings.cl}`);
}

// With custom options
const entry2 = findTermcapEntry('xterm', {
  extraPaths: ['/custom/termcap'],
  home: '/home/user',
});
```

**Parameters:**
- `terminal` - Terminal name to find
- `options` - Optional `TermcapLocatorOptions`

**Returns:** `TermcapEntry | null`

The returned entry has:
- Inheritance resolved (tc= capabilities merged)
- Names translated to terminfo style

---

## getTermcapData

Finds termcap entry and converts to TerminfoData format.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTermcapData, createTput } from 'blecsd';

const data = getTermcapData('vt100');
if (data) {
  const tput = createTput({ data });
  process.stdout.write(tput.cup(10, 5));
}
```

**Parameters:**
- `terminal` - Terminal name to find
- `options` - Optional `TermcapLocatorOptions`

**Returns:** `TerminfoData | null`

---

## getTermcapSearchPaths

Gets the list of paths searched for termcap files.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTermcapSearchPaths } from 'blecsd';

const paths = getTermcapSearchPaths();
// ['/home/user/.termcap', '/usr/share/misc/termcap', '/etc/termcap']

// With custom options
const paths2 = getTermcapSearchPaths({
  extraPaths: ['/custom/path'],
  termcapEnv: '/my/termcap',
  termpath: '/path1:/path2',
  home: '/home/other',
});
```

**Search Order:**
1. `$TERMCAP` (if it's a file path)
2. `$TERMPATH` directories
3. Extra paths from options
4. `~/.termcap`
5. `/usr/share/misc/termcap`
6. `/etc/termcap`

**Parameters:**
- `options` - Optional `TermcapLocatorOptions`

**Returns:** `readonly string[]`

---

## termcapToTerminfo

Converts a TermcapEntry to TerminfoData format.

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseTermcap, termcapToTerminfo } from 'blecsd';

const result = parseTermcap(data);
const entry = result.entries.get('vt100');

if (entry) {
  const terminfo = termcapToTerminfo(entry);
  // Use with createTput({ data: terminfo })
}
```

**Parameters:**
- `entry` - Parsed termcap entry

**Returns:** `TerminfoData`

---

## readTermcapFile

Reads and parses a termcap file.

<!-- blecsd-doccheck:ignore -->
```typescript
import { readTermcapFile } from 'blecsd';

const result = readTermcapFile('/etc/termcap');
if (result?.success) {
  for (const [name, entry] of result.entries) {
    console.log(name, entry.description);
  }
}
```

**Parameters:**
- `filePath` - Path to termcap file

**Returns:** `TermcapParseResult | null`

---

## listTermcapTerminals

Lists all terminals in a termcap file.

<!-- blecsd-doccheck:ignore -->
```typescript
import { listTermcapTerminals } from 'blecsd';

const terminals = listTermcapTerminals('/etc/termcap');
console.log(`Found ${terminals.length} terminals`);
terminals.forEach(name => console.log(`  ${name}`));
```

**Parameters:**
- `filePath` - Path to termcap file

**Returns:** `readonly string[]`

---

## termcapFileExists

Checks if a termcap file exists and is readable.

<!-- blecsd-doccheck:ignore -->
```typescript
import { termcapFileExists } from 'blecsd';

if (termcapFileExists('/etc/termcap')) {
  console.log('System termcap available');
}
```

**Parameters:**
- `filePath` - Path to check

**Returns:** `boolean`

---

## findTermcapFile

Gets the first existing termcap file from search paths.

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTermcapFile } from 'blecsd';

const file = findTermcapFile();
if (file) {
  console.log(`Using termcap: ${file}`);
}
```

**Parameters:**
- `options` - Optional `TermcapLocatorOptions`

**Returns:** `string | null`

---

## TermcapLocatorOptions

Options for termcap file location.

```typescript
interface TermcapLocatorOptions {
  extraPaths?: string[];    // Additional paths to search
  termcapEnv?: string;      // Custom TERMCAP value
  termpath?: string;        // Custom TERMPATH value
  home?: string;            // Custom HOME directory
}
```

---

## Termcap Inheritance

Termcap supports inheritance via the `tc=` capability:

```
# Base terminal
vt100|basic vt100:am:co#80:cl=\E[H\E[2J:

# Extended terminal inheriting from vt100
vt102|vt100 with editing:tc=vt100:dc=\E[P:ic=\E[@:
```

When parsed with `findTermcapEntry`, the `tc=` references are resolved automatically:
- Parent capabilities are loaded first
- Child capabilities override parent values
- Multiple levels of inheritance are supported

---

## Termcap vs Terminfo

| Aspect | Termcap | Terminfo |
|--------|---------|----------|
| Format | Text | Binary |
| Names | 2-char codes | Full names |
| Storage | Single file | Directory tree |
| Inheritance | tc= capability | use= in source |

Common termcap-to-terminfo name mappings:

| Termcap | Terminfo | Description |
|---------|----------|-------------|
| `am` | `auto_right_margin` | Auto wrap at margin |
| `co` | `columns` | Number of columns |
| `li` | `lines` | Number of lines |
| `cl` | `clear_screen` | Clear screen |
| `cm` | `cursor_address` | Move cursor |
| `ho` | `cursor_home` | Home cursor |
| `up` | `cursor_up` | Move cursor up |
| `do` | `cursor_down` | Move cursor down |
| `le` | `cursor_left` | Move cursor left |
| `nd` | `cursor_right` | Move cursor right |

---

## Examples

### Reading System Termcap

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTermcapFile, readTermcapFile } from 'blecsd';

const file = findTermcapFile();
if (file) {
  const result = readTermcapFile(file);
  if (result?.success) {
    console.log(`Loaded ${result.entries.size} terminal entries`);
  }
}
```

### Using Termcap with Tput

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTermcapData, createTput } from 'blecsd';

function createTputFromTermcap(terminal: string): Tput | null {
  const data = getTermcapData(terminal);
  if (!data) {
    return null;
  }
  return createTput({ data });
}

const tput = createTputFromTermcap('vt100');
if (tput) {
  process.stdout.write(tput.cup(5, 10));
  process.stdout.write('Hello from termcap!');
}
```

### Parsing Inline Termcap

<!-- blecsd-doccheck:ignore -->
```typescript
import { parseTermcap } from 'blecsd';

// TERMCAP environment can contain inline definitions
const termcapEnv = process.env.TERMCAP;
if (termcapEnv && !termcapEnv.startsWith('/')) {
  // It's an inline definition, not a file path
  const result = parseTermcap(termcapEnv, 'TERMCAP');
  const terminal = process.env.TERM ?? '';
  const entry = result.entries.get(terminal);
  if (entry) {
    console.log(`Using inline termcap for ${terminal}`);
  }
}
```

---

## See Also

- [Parser](./parser.md) - Binary terminfo format parser
- [Locator](./locator.md) - Finding terminfo files
- [Capabilities](./capabilities.md) - Capability name mappings
- [Tput](./tput.md) - High-level capability interface
