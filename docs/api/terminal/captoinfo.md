# Captoinfo Converter

Converts termcap parameterized strings to terminfo format. This is used when parsing termcap data to make the string capabilities compatible with the terminfo parameter compiler.

## Overview

```typescript
import { captoinfo, convertTermcapStrings, needsConversion } from 'blecsd';

// Convert a single string
const terminfo = captoinfo('\\E[%i%d;%dH');
// '\\E[%i%p1%d;%p2%dH'

// Convert all string capabilities
const strings = convertTermcapStrings({
  cm: '\\E[%i%d;%dH',
  cl: '\\E[H\\E[2J',
});

// Check if conversion is needed
if (needsConversion('%d;%dH')) {
  // Has termcap-style codes
}
```

---

## captoinfo

Converts a termcap parameterized string to terminfo format.

```typescript
import { captoinfo } from 'blecsd';

// Basic decimal output
captoinfo('%d');        // '%p1%d'
captoinfo('%d;%d');     // '%p1%d;%p2%d'

// Character output
captoinfo('%.');        // '%p1%c'

// Width formatting
captoinfo('%2');        // '%p1%2d'
captoinfo('%3');        // '%p1%3d'

// Increment parameters
captoinfo('%i%d;%d');   // '%i%p1%d;%p2%d'

// Reverse parameters
captoinfo('%r%d;%d');   // '%p2%d;%p1%d'

// Character addition
captoinfo('%+ ');       // '%p1%{32}%+%c'
```

### Termcap to Terminfo Conversions

| Termcap | Terminfo | Description |
|---------|----------|-------------|
| `%%` | `%` | Literal percent |
| `%d` | `%p1%d` | Decimal output |
| `%.` | `%p1%c` | Character output |
| `%+c` | `%p1%{c}%+%c` | Add char, output as char |
| `%-c` | `%{c}%p1%-%c` | Subtract, output as char |
| `%2`, `%02` | `%p1%2d` | 2-digit decimal |
| `%3`, `%03` | `%p1%3d` | 3-digit decimal |
| `%i` | `%i` | Increment parameters |
| `%r` | (reorders params) | Reverse params 1 and 2 |
| `%m` | `%{127}%^` | Mask with 0177 |
| `%n` | `%{96}%^` | XOR with 0140 |
| `%B`, `%6` | BCD encoding | Binary-coded decimal |
| `%D`, `%8` | `%{2}%*%-` | Difference encoding |
| `%>xy` | `%?%{x}%>%t%{y}%+%;` | Conditional add |
| `%s` | `%p1%s` | String output |

**Parameters:**
- `input` - Termcap string to convert
- `options` - Optional `CaptoInfoOptions`

**Returns:** `string` - Terminfo-format string

### Options

```typescript
interface CaptoInfoOptions {
  /** Convert % escape sequences (default: true) */
  parameterized?: boolean;
  /** Convert padding specifications (default: true) */
  convertPadding?: boolean;
}
```

---

## convertTermcapStrings

Converts all string capabilities in a record.

```typescript
import { convertTermcapStrings } from 'blecsd';

const termcapStrings = {
  cm: '\\E[%i%d;%dH',
  cl: '\\E[H\\E[2J',
  up: '\\E[A',
  do: '\\E[B',
};

const terminfoStrings = convertTermcapStrings(termcapStrings);
// {
//   cm: '\\E[%i%p1%d;%p2%dH',
//   cl: '\\E[H\\E[2J',
//   up: '\\E[A',
//   do: '\\E[B',
// }
```

**Parameters:**
- `strings` - Record of termcap string capabilities
- `options` - Optional `CaptoInfoOptions`

**Returns:** `Record<string, string>` - Record with converted strings

---

## needsConversion

Checks if a string contains termcap-style % codes that need conversion.

```typescript
import { needsConversion } from 'blecsd';

// Termcap-style codes
needsConversion('%d;%dH');      // true
needsConversion('%.;%.H');      // true
needsConversion('%+ ');         // true
needsConversion('%r%d');        // true
needsConversion('%B');          // true
needsConversion('%>xy');        // true

// Already terminfo or no codes
needsConversion('\\E[H\\E[2J'); // false (no % codes)
needsConversion('%p1%d');       // false (terminfo style)
needsConversion('%i');          // false (same in both)
```

**Parameters:**
- `input` - String to check

**Returns:** `boolean`

---

## Padding

Termcap strings often start with padding specifications like `50\E[H` meaning 50ms delay. By default, captoinfo strips these:

```typescript
import { captoinfo } from 'blecsd';

// Default: strips padding
captoinfo('50\\E[H');          // '\\E[H'
captoinfo('50*\\E[H');         // '\\E[H'

// Preserve padding
captoinfo('50\\E[H', { convertPadding: false });  // '50\\E[H'
```

---

## Parameter Handling

### Basic Parameters

Each `%d`, `%.`, etc. consumes one parameter:

```typescript
captoinfo('%d;%d');   // '%p1%d;%p2%d'
captoinfo('%d;%d;%d'); // '%p1%d;%p2%d;%p3%d'
```

### Parameter Reversal (%r)

The `%r` code reverses parameters 1 and 2:

```typescript
captoinfo('%d;%d');     // '%p1%d;%p2%d'
captoinfo('%r%d;%d');   // '%p2%d;%p1%d'
```

### Skip and Back (%f, %b)

```typescript
// %f skips to next parameter
captoinfo('%f%d');      // '%p2%d'

// %b goes back to previous parameter
captoinfo('%d%b%d');    // '%p1%d%p1%d'
```

---

## Examples

### Cursor Positioning

```typescript
import { captoinfo } from 'blecsd';

// VT100-style cursor_address (cm)
// Termcap: \E[%i%d;%dH
const cm = captoinfo('\\E[%i%d;%dH');
// '\\E[%i%p1%d;%p2%dH'

// Some terminals use character addition
// Termcap: \E[%i%+ ;%+ H
const cm2 = captoinfo('\\E[%i%+ ;%+ H');
// '\\E[%i%p1%{32}%+%c;%p2%{32}%+%cH'
```

### With Termcap Parser

```typescript
import { parseTermcap, termcapToTerminfo, captoinfo } from 'blecsd';

// Parse termcap data
const result = parseTermcap(termcapData);
const entry = result.entries.get('vt100');

if (entry) {
  // Convert string capabilities
  for (const [name, value] of Object.entries(entry.strings)) {
    entry.strings[name] = captoinfo(value);
  }

  // Now convert to terminfo format
  const terminfo = termcapToTerminfo(entry);
}
```

### Conditional Conversion

```typescript
import { captoinfo, needsConversion } from 'blecsd';

function convertIfNeeded(value: string): string {
  if (needsConversion(value)) {
    return captoinfo(value);
  }
  return value;
}

// Only converts when necessary
convertIfNeeded('%d;%dH');           // converts
convertIfNeeded('\\E[H\\E[2J');      // passes through
convertIfNeeded('%p1%d;%p2%dH');     // passes through
```

---

## Escape Sequences

Character constants in termcap can use escapes:

| Escape | Character |
|--------|-----------|
| `\\` | Backslash |
| `\'` | Single quote |
| `\$` | Dollar sign |
| `\%` | Percent sign |
| `\0XX` | Octal value |
| `^X` | Control character |

These are converted to terminfo push notation:

```typescript
// Printable chars use %'c'
captoinfo('%+ ');     // "%p1%' '%+%c" (adds space)

// Non-printable use %{n}
captoinfo('%+\\000'); // "%p1%{0}%+%c" (adds NUL)
```

---

## See Also

- [Termcap Parser](./termcap.md) - Parse termcap text format
- [Compiler](./compiler.md) - Terminfo parameterized string compiler
- [Capabilities](./capabilities.md) - Capability name mappings
