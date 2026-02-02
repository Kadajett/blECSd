# Printf-Style String Formatting

Provides printf-style string formatting for terminal capabilities and general output formatting. This is a subset of printf functionality tailored for terminfo capability strings.

## Overview

```typescript
import { sprintf, createFormatter, parseFormat } from 'blecsd';

// Basic formatting
sprintf('%d items', 42);           // '42 items'
sprintf('%s: %d', 'Count', 10);    // 'Count: 10'

// Width and padding
sprintf('%5d', 42);                // '   42'
sprintf('%05d', 42);               // '00042'

// Create reusable formatter
const fmt = createFormatter('Point(%d, %d)');
fmt(10, 20);  // 'Point(10, 20)'
```

---

## sprintf

Printf-style string formatting with support for common format specifiers.

```typescript
import { sprintf } from 'blecsd';

// Decimal integers
sprintf('%d', 42);         // '42'
sprintf('%d', -42);        // '-42'
sprintf('%i', 42);         // '42' (same as %d)

// Strings
sprintf('%s', 'hello');    // 'hello'
sprintf('%s', 123);        // '123'

// Characters (from code point)
sprintf('%c', 65);         // 'A'
sprintf('%c', 97);         // 'a'

// Octal
sprintf('%o', 8);          // '10'
sprintf('%o', 64);         // '100'

// Hexadecimal
sprintf('%x', 255);        // 'ff'
sprintf('%X', 255);        // 'FF'
```

### Format Specifier Syntax

```
%[flags][width][.precision]type
```

### Supported Types

| Type | Description | Example |
|------|-------------|---------|
| `d`, `i` | Signed decimal integer | `sprintf('%d', 42)` → `'42'` |
| `o` | Unsigned octal | `sprintf('%o', 8)` → `'10'` |
| `x` | Unsigned hex (lowercase) | `sprintf('%x', 255)` → `'ff'` |
| `X` | Unsigned hex (uppercase) | `sprintf('%X', 255)` → `'FF'` |
| `s` | String | `sprintf('%s', 'hi')` → `'hi'` |
| `c` | Character (from code point) | `sprintf('%c', 65)` → `'A'` |

### Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-` | Left-justify | `sprintf('%-5d', 42)` → `'42   '` |
| `+` | Always show sign | `sprintf('%+d', 42)` → `'+42'` |
| ` ` | Space if no sign | `sprintf('% d', 42)` → `' 42'` |
| `#` | Alternate form | `sprintf('%#x', 255)` → `'0xff'` |
| `0` | Zero-pad | `sprintf('%05d', 42)` → `'00042'` |

### Width and Precision

```typescript
import { sprintf } from 'blecsd';

// Width: minimum field width
sprintf('%5d', 42);        // '   42'
sprintf('%5s', 'hi');      // '   hi'

// Zero-padding with width
sprintf('%05d', 42);       // '00042'

// Precision for strings: maximum length
sprintf('%.3s', 'hello');  // 'hel'

// Precision for integers: minimum digits
sprintf('%.5d', 42);       // '00042'

// Combined width and precision
sprintf('%8.5d', 42);      // '   00042'
```

**Parameters:**
- `format` - Format string with `%` specifiers
- `...args` - Values to substitute

**Returns:** `string`

---

## createFormatter

Creates a reusable formatter function for a format string. More efficient when formatting the same pattern multiple times.

```typescript
import { createFormatter } from 'blecsd';

const pointFmt = createFormatter('Point(%d, %d)');
pointFmt(10, 20);   // 'Point(10, 20)'
pointFmt(5, 15);    // 'Point(5, 15)'

const timeFmt = createFormatter('[%02d:%02d:%02d]');
timeFmt(9, 5, 3);    // '[09:05:03]'
timeFmt(12, 30, 45); // '[12:30:45]'

const hexFmt = createFormatter('0x%08X');
hexFmt(255);         // '0x000000FF'
```

**Parameters:**
- `format` - Format string

**Returns:** `(...args: unknown[]) => string`

---

## parseFormat

Parses a format string and returns information about its specifiers. Useful for analyzing format strings or validating arguments.

```typescript
import { parseFormat } from 'blecsd';

const specs = parseFormat('%5d %s');
// [
//   { original: '%5d', flags: {...}, width: 5, precision: 0, type: 'd' },
//   { original: '%s', flags: {...}, width: 0, precision: 0, type: 's' }
// ]

const hexSpec = parseFormat('%#08x');
// [
//   {
//     original: '%#08x',
//     flags: { alternate: true, zero: true, ... },
//     width: 8,
//     precision: 0,
//     type: 'x'
//   }
// ]
```

**Parameters:**
- `format` - Format string to analyze

**Returns:** `FormatSpec[]`

### FormatSpec

```typescript
interface FormatSpec {
  original: string;     // Original format string (e.g., '%08d')
  flags: FormatFlags;   // Parsed flags
  width: number;        // Minimum field width
  precision: number;    // Precision value
  type: FormatType;     // Type character
}

interface FormatFlags {
  left: boolean;        // '-' flag
  sign: boolean;        // '+' flag
  alternate: boolean;   // '#' flag
  space: boolean;       // ' ' flag
  zero: boolean;        // '0' flag
}
```

---

## countFormatArgs

Counts the number of format specifiers in a format string.

```typescript
import { countFormatArgs } from 'blecsd';

countFormatArgs('%d + %d = %d');  // 3
countFormatArgs('Hello %s!');     // 1
countFormatArgs('No args');       // 0
countFormatArgs('[%d;%dH');       // 2
```

**Parameters:**
- `format` - Format string to analyze

**Returns:** `number`

---

## isValidFormat

Checks if a format string contains only valid specifiers.

```typescript
import { isValidFormat } from 'blecsd';

isValidFormat('%d');       // true
isValidFormat('%5.2s');    // true
isValidFormat('%+08d');    // true
isValidFormat('hello');    // true (no specifiers is valid)
isValidFormat('%z');       // false (invalid type)
isValidFormat('%');        // false (incomplete specifier)
```

**Parameters:**
- `format` - Format string to validate

**Returns:** `boolean`

---

## Examples

### Terminal Escape Sequences

```typescript
import { sprintf, createFormatter } from 'blecsd';

// Cursor positioning
const cup = createFormatter('\x1b[%d;%dH');
cup(10, 20);  // Move to row 10, column 20

// SGR (Select Graphic Rendition)
const sgr = createFormatter('\x1b[%dm');
sgr(1);       // Bold
sgr(0);       // Reset

// 256-color foreground
const fg256 = createFormatter('\x1b[38;5;%dm');
fg256(196);   // Red foreground

// RGB color
const fgRgb = createFormatter('\x1b[38;2;%d;%d;%dm');
fgRgb(255, 128, 0);  // Orange foreground
```

### Formatted Output

```typescript
import { sprintf } from 'blecsd';

// Table-like output
function formatRow(name: string, value: number): string {
  return sprintf('%-20s %8d', name, value);
}

formatRow('Total', 1234);      // 'Total                    1234'
formatRow('Average', 56);      // 'Average                    56'

// Hex dump style
function formatHexLine(offset: number, bytes: number[]): string {
  const hex = bytes.map(b => sprintf('%02x', b)).join(' ');
  return sprintf('%08x: %s', offset, hex);
}

formatHexLine(0, [0x48, 0x65, 0x6c, 0x6c, 0x6f]);
// '00000000: 48 65 6c 6c 6f'
```

### Time Formatting

```typescript
import { createFormatter } from 'blecsd';

const timeFmt = createFormatter('%02d:%02d:%02d');
const dateFmt = createFormatter('%04d-%02d-%02d');

function formatTime(h: number, m: number, s: number): string {
  return timeFmt(h, m, s);
}

function formatDate(y: number, m: number, d: number): string {
  return dateFmt(y, m, d);
}

formatTime(9, 5, 3);      // '09:05:03'
formatDate(2026, 2, 2);   // '2026-02-02'
```

### Debugging Output

```typescript
import { sprintf } from 'blecsd';

function debugValue(name: string, value: number): string {
  return sprintf(
    '%s: %d (0x%04X, 0o%o)',
    name, value, value, value
  );
}

debugValue('code', 65);
// 'code: 65 (0x0041, 0o101)'

debugValue('flags', 255);
// 'flags: 255 (0x00FF, 0o377)'
```

---

## Differences from Standard printf

This implementation provides a subset of printf functionality:

| Feature | Supported | Notes |
|---------|-----------|-------|
| `%d`, `%i` | Yes | Signed decimal |
| `%o`, `%x`, `%X` | Yes | Unsigned octal/hex |
| `%s` | Yes | String |
| `%c` | Yes | Character from code |
| `%f`, `%e`, `%g` | No | Floating point not supported |
| `%p` | No | Pointer not supported |
| `%n` | No | Character count not supported |
| `%%` | No | Literal percent not supported |
| `*` width | No | Dynamic width not supported |
| `*` precision | No | Dynamic precision not supported |

For floating-point formatting, use JavaScript's built-in methods:

```typescript
const pi = 3.14159;
`${pi.toFixed(2)}`;      // '3.14'
`${pi.toExponential(2)}`; // '3.14e+0'
```

---

## See Also

- [Compiler](./compiler.md) - Parameterized string compilation
- [Tput](./tput.md) - High-level capability interface
