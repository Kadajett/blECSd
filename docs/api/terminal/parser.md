# Terminfo Binary Parser

Parses compiled terminfo database files (.tic format) into structured data. Supports both legacy 16-bit and extended 32-bit NCurses formats.

## Overview

The parser reads binary terminfo files and extracts terminal capabilities including boolean flags, numeric values, and string sequences.

```typescript
import { parseTerminfo, isValidTerminfo, toTerminfoData } from 'blecsd';
import { readFileSync } from 'fs';

// Read and parse terminfo file
const buffer = readFileSync('/usr/share/terminfo/x/xterm-256color');

if (isValidTerminfo(buffer)) {
  const result = parseTerminfo(buffer);

  if (result.success) {
    console.log(`Terminal: ${result.data.name}`);
    console.log(`Max colors: ${result.data.numbers['max_colors']}`);
    console.log(`Clear screen: ${result.data.strings['clear_screen']}`);
  }
}
```

---

## Constants

### TERMINFO_MAGIC_LEGACY

Magic number for legacy 16-bit terminfo format.

```typescript
import { TERMINFO_MAGIC_LEGACY } from 'blecsd';

TERMINFO_MAGIC_LEGACY  // 0x011a
```

### TERMINFO_MAGIC_EXTENDED

Magic number for extended 32-bit terminfo format (NCurses 5+).

```typescript
import { TERMINFO_MAGIC_EXTENDED } from 'blecsd';

TERMINFO_MAGIC_EXTENDED  // 0x021e
```

---

## parseTerminfo

Parses a terminfo binary buffer into structured data.

```typescript
import { parseTerminfo } from 'blecsd';
import { readFileSync } from 'fs';

const buffer = readFileSync('/usr/share/terminfo/x/xterm');
const result = parseTerminfo(buffer);

if (result.success) {
  console.log(`Terminal: ${result.data.name}`);
  console.log(`Aliases: ${result.data.names.join(', ')}`);
  console.log(`Description: ${result.data.description}`);

  // Boolean capabilities
  if (result.data.booleans['auto_right_margin']) {
    console.log('Terminal has auto right margin');
  }

  // Numeric capabilities
  const maxColors = result.data.numbers['max_colors'];
  console.log(`Max colors: ${maxColors}`);

  // String capabilities
  const clearScreen = result.data.strings['clear_screen'];
  process.stdout.write(clearScreen);
} else {
  console.error(`Parse error: ${result.error} - ${result.message}`);
}
```

**Parameters:**
- `buffer` - Buffer containing compiled terminfo data

**Returns:** `ParseResult`

---

## isValidTerminfo

Quick validation check without full parsing.

```typescript
import { isValidTerminfo } from 'blecsd';

const buffer = readFileSync('/usr/share/terminfo/x/xterm');

if (isValidTerminfo(buffer)) {
  console.log('Valid terminfo file');
}
```

**Parameters:**
- `buffer` - Buffer to validate

**Returns:** `boolean`

---

## getTerminfoFormat

Gets the terminfo format version from a buffer.

```typescript
import { getTerminfoFormat } from 'blecsd';

const format = getTerminfoFormat(buffer);
// Returns: 'legacy' | 'extended' | null

switch (format) {
  case 'legacy':
    console.log('16-bit format');
    break;
  case 'extended':
    console.log('32-bit format (NCurses 5+)');
    break;
  default:
    console.log('Invalid terminfo file');
}
```

**Parameters:**
- `buffer` - Buffer to check

**Returns:** `'legacy' | 'extended' | null`

---

## toTerminfoData

Converts ParsedTerminfo to TerminfoData format for use with Tput.

```typescript
import { parseTerminfo, toTerminfoData, createTput } from 'blecsd';

const result = parseTerminfo(buffer);

if (result.success) {
  const data = toTerminfoData(result.data);
  const tput = createTput({ data });

  // Use tput for terminal operations
  process.stdout.write(tput.cup(10, 5));
}
```

**Parameters:**
- `parsed` - ParsedTerminfo from parseTerminfo()

**Returns:** `TerminfoData`

---

## Types

### TerminfoHeader

Binary file header structure.

```typescript
interface TerminfoHeader {
  /** Magic number (0x011a for legacy, 0x021e for extended) */
  readonly magic: number;
  /** Size of names section in bytes */
  readonly nameSize: number;
  /** Number of boolean capabilities */
  readonly boolCount: number;
  /** Number of numeric capabilities */
  readonly numCount: number;
  /** Number of string capabilities */
  readonly stringCount: number;
  /** Size of string table in bytes */
  readonly stringTableSize: number;
}
```

### ParsedTerminfo

Parsed terminfo data structure.

```typescript
interface ParsedTerminfo {
  /** Primary terminal name */
  readonly name: string;
  /** All terminal name aliases */
  readonly names: readonly string[];
  /** Terminal description */
  readonly description: string;
  /** Boolean capabilities */
  readonly booleans: Readonly<Record<string, boolean>>;
  /** Numeric capabilities */
  readonly numbers: Readonly<Record<string, number>>;
  /** String capabilities */
  readonly strings: Readonly<Record<string, string>>;
  /** Extended capabilities (if present) */
  readonly extended?: TerminfoExtended;
}
```

### TerminfoExtended

Extended capabilities section (NCurses 5+ extension).

```typescript
interface TerminfoExtended {
  /** Extended boolean capabilities */
  readonly booleans: Readonly<Record<string, boolean>>;
  /** Extended numeric capabilities */
  readonly numbers: Readonly<Record<string, number>>;
  /** Extended string capabilities */
  readonly strings: Readonly<Record<string, string>>;
}
```

### ParseResult

Parser result with success/failure status.

```typescript
type ParseResult =
  | { readonly success: true; readonly data: ParsedTerminfo }
  | { readonly success: false; readonly error: ParserErrorType; readonly message: string };
```

### ParserErrorType

Parser error types for better error handling.

```typescript
type ParserErrorType =
  | 'INVALID_MAGIC'
  | 'TRUNCATED_HEADER'
  | 'TRUNCATED_NAMES'
  | 'TRUNCATED_BOOLEANS'
  | 'TRUNCATED_NUMBERS'
  | 'TRUNCATED_STRINGS'
  | 'INVALID_STRING_OFFSET';
```

---

## Binary Format Reference

### Legacy Format (0x011a)

```
[Header: 12 bytes]
  0-1:  Magic (0x011a)
  2-3:  Name section size
  4-5:  Boolean count
  6-7:  Number count
  8-9:  String count
  10-11: String table size

[Names: variable]
  Pipe-separated names ending with description
  Null-terminated

[Booleans: boolCount bytes]
  1 byte per capability (0=absent, 1=present)

[Alignment padding if needed]

[Numbers: numCount * 2 bytes]
  2 bytes per value (little-endian)
  0xFFFF = absent

[String offsets: stringCount * 2 bytes]
  2 bytes per offset into string table
  0xFFFF = absent

[String table: stringTableSize bytes]
  Null-terminated strings
```

### Extended Format (0x021e)

Same structure but numbers use 4 bytes instead of 2, and absent number value is 0xFFFFFFFF.

---

## Examples

### Reading System Terminfo

```typescript
import { parseTerminfo, toTerminfoData, createTput } from 'blecsd';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadTerminfo(terminal: string): TerminfoData | null {
  const paths = [
    `/usr/share/terminfo/${terminal[0]}/${terminal}`,
    `/lib/terminfo/${terminal[0]}/${terminal}`,
    join(process.env.HOME ?? '', `.terminfo/${terminal[0]}/${terminal}`),
  ];

  for (const path of paths) {
    try {
      const buffer = readFileSync(path);
      const result = parseTerminfo(buffer);
      if (result.success) {
        return toTerminfoData(result.data);
      }
    } catch {
      continue;
    }
  }

  return null;
}

const data = loadTerminfo('xterm-256color');
if (data) {
  const tput = createTput({ data });
  console.log(`Loaded ${data.name}`);
}
```

### Inspecting Terminal Capabilities

```typescript
import { parseTerminfo } from 'blecsd';
import { readFileSync } from 'fs';

const buffer = readFileSync('/usr/share/terminfo/x/xterm-256color');
const result = parseTerminfo(buffer);

if (result.success) {
  const { data } = result;

  console.log('=== Boolean Capabilities ===');
  for (const [name, value] of Object.entries(data.booleans)) {
    if (value) console.log(`  ${name}: true`);
  }

  console.log('\n=== Numeric Capabilities ===');
  for (const [name, value] of Object.entries(data.numbers)) {
    console.log(`  ${name}: ${value}`);
  }

  console.log('\n=== String Capabilities ===');
  for (const [name, value] of Object.entries(data.strings)) {
    // Escape non-printable characters for display
    const escaped = value.replace(/[\x00-\x1f]/g,
      (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`
    );
    console.log(`  ${name}: "${escaped}"`);
  }
}
```

### Validating Terminfo Files

```typescript
import { isValidTerminfo, getTerminfoFormat, parseTerminfo } from 'blecsd';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function validateTerminfoDir(dir: string): void {
  for (const subdir of readdirSync(dir)) {
    const subdirPath = join(dir, subdir);

    for (const file of readdirSync(subdirPath)) {
      const filePath = join(subdirPath, file);
      const buffer = readFileSync(filePath);

      if (!isValidTerminfo(buffer)) {
        console.log(`Invalid: ${filePath}`);
        continue;
      }

      const format = getTerminfoFormat(buffer);
      const result = parseTerminfo(buffer);

      if (result.success) {
        console.log(`OK: ${result.data.name} (${format})`);
      } else {
        console.log(`Parse error: ${filePath} - ${result.error}`);
      }
    }
  }
}

validateTerminfoDir('/usr/share/terminfo');
```

---

## See Also

- [Tput](./tput.md) - High-level capability interface
- [Terminfo Locator](./locator.md) - Finding terminfo files
- [Capabilities](../capabilities.md) - Runtime capability negotiation
