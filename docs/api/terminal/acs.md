# ACS (Alternate Character Set)

Provides character maps for box drawing and special symbols used in terminal UIs. ACS characters allow drawing boxes, lines, and decorative elements using Unicode characters with ASCII fallbacks for terminals that don't support Unicode.

## Overview

```typescript
import {
  ACS,
  ACSC_CODES,
  UNICODE_TO_ASCII,
  createBox,
  getAcsChar,
  unicodeToAscii,
  stringToAscii,
  isBoxDrawingChar,
} from 'blecsd';

// Draw a box using named constants
console.log(ACS.ulcorner + ACS.hline.repeat(10) + ACS.urcorner);
console.log(ACS.vline + ' Content  ' + ACS.vline);
console.log(ACS.llcorner + ACS.hline.repeat(10) + ACS.lrcorner);

// Create a complete box
const box = createBox(12, 3, 'single');
box.forEach(line => console.log(line));
```

---

## ACS

Named constants for common box drawing and special characters. These are the Unicode characters that terminals display when using the alternate character set.

```typescript
import { ACS } from 'blecsd';

// Box corners
ACS.ulcorner  // '┌' - upper left corner
ACS.urcorner  // '┐' - upper right corner
ACS.llcorner  // '└' - lower left corner
ACS.lrcorner  // '┘' - lower right corner

// Tee characters (for borders/dividers)
ACS.ltee      // '├' - left tee
ACS.rtee      // '┤' - right tee
ACS.ttee      // '┬' - top tee
ACS.btee      // '┴' - bottom tee

// Lines
ACS.hline     // '─' - horizontal line
ACS.vline     // '│' - vertical line
ACS.plus      // '┼' - crossover/plus

// Symbols
ACS.diamond   // '◆' - diamond
ACS.ckboard   // '▒' - checkerboard
ACS.degree    // '°' - degree symbol
ACS.bullet    // '·' - bullet
ACS.block     // '█' - solid block
ACS.board     // '░' - light shade
ACS.lantern   // '█' - lantern symbol
ACS.plminus   // '±' - plus/minus

// Arrows
ACS.larrow    // '←' - left arrow
ACS.rarrow    // '→' - right arrow
ACS.uarrow    // '↑' - up arrow
ACS.darrow    // '↓' - down arrow

// Comparison symbols
ACS.lequal    // '≤' - less than or equal
ACS.gequal    // '≥' - greater than or equal
ACS.nequal    // '≠' - not equal
ACS.pi        // 'π' - pi symbol
ACS.sterling  // '£' - pound sterling

// Scan lines
ACS.s1        // '⎺' - scan line 1
ACS.s3        // '⎻' - scan line 3
ACS.s7        // '⎼' - scan line 7
ACS.s9        // '⎽' - scan line 9

// Double-line variants
ACS.ulcorner_double  // '╔' - double upper left
ACS.urcorner_double  // '╗' - double upper right
ACS.llcorner_double  // '╚' - double lower left
ACS.lrcorner_double  // '╝' - double lower right
ACS.hline_double     // '═' - double horizontal
ACS.vline_double     // '║' - double vertical
ACS.ltee_double      // '╠' - double left tee
ACS.rtee_double      // '╣' - double right tee
ACS.ttee_double      // '╦' - double top tee
ACS.btee_double      // '╩' - double bottom tee
ACS.plus_double      // '╬' - double crossover

// Rounded corners
ACS.ulcorner_rounded // '╭' - rounded upper left
ACS.urcorner_rounded // '╮' - rounded upper right
ACS.llcorner_rounded // '╰' - rounded lower left
ACS.lrcorner_rounded // '╯' - rounded lower right
```

### Example: Drawing a Simple Box

```typescript
import { ACS } from 'blecsd';

function drawBox(width: number, height: number): string[] {
  const lines: string[] = [];

  // Top border
  lines.push(ACS.ulcorner + ACS.hline.repeat(width - 2) + ACS.urcorner);

  // Middle rows
  for (let i = 0; i < height - 2; i++) {
    lines.push(ACS.vline + ' '.repeat(width - 2) + ACS.vline);
  }

  // Bottom border
  lines.push(ACS.llcorner + ACS.hline.repeat(width - 2) + ACS.lrcorner);

  return lines;
}

const box = drawBox(20, 5);
box.forEach(line => console.log(line));
// ┌──────────────────┐
// │                  │
// │                  │
// │                  │
// └──────────────────┘
```

---

## ACSC_CODES

Maps terminfo ACS codes (single characters) to their Unicode representations. These codes are used in the terminfo `acs_chars` capability string.

```typescript
import { ACSC_CODES } from 'blecsd';

// Corners
ACSC_CODES['l']  // '┌' - upper left
ACSC_CODES['m']  // '└' - lower left
ACSC_CODES['k']  // '┐' - upper right
ACSC_CODES['j']  // '┘' - lower right

// Tees
ACSC_CODES['t']  // '├' - left tee
ACSC_CODES['u']  // '┤' - right tee
ACSC_CODES['v']  // '┴' - bottom tee
ACSC_CODES['w']  // '┬' - top tee

// Lines
ACSC_CODES['q']  // '─' - horizontal
ACSC_CODES['x']  // '│' - vertical
ACSC_CODES['n']  // '┼' - crossover

// Symbols
ACSC_CODES['`']  // '◆' - diamond
ACSC_CODES['a']  // '▒' - checkerboard
ACSC_CODES['f']  // '°' - degree
ACSC_CODES['g']  // '±' - plus/minus
ACSC_CODES['o']  // '⎺' - scan line 1
ACSC_CODES['0']  // '█' - solid block
```

---

## UNICODE_TO_ASCII

Maps Unicode box drawing and special characters to their ASCII equivalents. Use this for terminals that don't support Unicode.

```typescript
import { UNICODE_TO_ASCII } from 'blecsd';

// Box drawing to ASCII
UNICODE_TO_ASCII['┌']  // '+'
UNICODE_TO_ASCII['─']  // '-'
UNICODE_TO_ASCII['│']  // '|'
UNICODE_TO_ASCII['┼']  // '+'

// Double lines
UNICODE_TO_ASCII['═']  // '='
UNICODE_TO_ASCII['║']  // '|'

// Arrows
UNICODE_TO_ASCII['←']  // '<'
UNICODE_TO_ASCII['→']  // '>'
UNICODE_TO_ASCII['↑']  // '^'
UNICODE_TO_ASCII['↓']  // 'v'

// Blocks and symbols
UNICODE_TO_ASCII['█']  // '#'
UNICODE_TO_ASCII['▒']  // '%'
UNICODE_TO_ASCII['░']  // ':'
UNICODE_TO_ASCII['◆']  // '*'
```

---

## parseAcsc

Parses a terminfo `acs_chars` capability string into a Map of code-to-character mappings.

```typescript
import { parseAcsc } from 'blecsd';

// Typical xterm acs_chars string (pairs of code+character)
const acsc = '``aaffggjjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~';
const map = parseAcsc(acsc);

map.get('l');  // 'l' (the terminal's character for upper-left corner)
map.get('q');  // 'q' (the terminal's character for horizontal line)
map.size;      // 25 pairs
```

**Parameters:**
- `acsc` - The `acs_chars` capability string from terminfo

**Returns:** `Map<string, string>` mapping ACS codes to terminal characters

---

## getAcsChar

Gets a Unicode ACS character by its name.

```typescript
import { getAcsChar } from 'blecsd';

getAcsChar('ulcorner');  // '┌'
getAcsChar('hline');     // '─'
getAcsChar('vline');     // '│'
getAcsChar('diamond');   // '◆'
getAcsChar('invalid');   // undefined
```

**Parameters:**
- `name` - The ACS character name (e.g., 'ulcorner', 'hline')

**Returns:** `string | undefined`

---

## getAcsCharByCode

Gets a Unicode ACS character by its terminfo code.

```typescript
import { getAcsCharByCode } from 'blecsd';

getAcsCharByCode('l');  // '┌' (upper-left corner)
getAcsCharByCode('q');  // '─' (horizontal line)
getAcsCharByCode('x');  // '│' (vertical line)
getAcsCharByCode('Z');  // 'Z' (unknown code, returns as-is)
```

**Parameters:**
- `code` - The single-character ACS code

**Returns:** `string` - The Unicode character, or the original code if unknown

---

## unicodeToAscii

Converts a single Unicode character to its ASCII fallback.

```typescript
import { unicodeToAscii } from 'blecsd';

unicodeToAscii('┌');  // '+'
unicodeToAscii('─');  // '-'
unicodeToAscii('│');  // '|'
unicodeToAscii('A');  // 'A' (no mapping, returns as-is)
```

**Parameters:**
- `char` - A single Unicode character

**Returns:** `string` - The ASCII equivalent, or the original character

---

## stringToAscii

Converts a string containing Unicode box drawing characters to ASCII.

```typescript
import { stringToAscii } from 'blecsd';

stringToAscii('┌──┐');       // '+--+'
stringToAscii('│Hi│');       // '|Hi|'
stringToAscii('└──┘');       // '+--+'
stringToAscii('Hello');      // 'Hello' (no box chars)
stringToAscii('│ Text │');   // '| Text |'
```

**Parameters:**
- `str` - A string potentially containing Unicode characters

**Returns:** `string` - The string with Unicode replaced by ASCII

---

## isBoxDrawingChar

Checks if a character is a Unicode box drawing character (U+2500-U+257F).

```typescript
import { isBoxDrawingChar } from 'blecsd';

isBoxDrawingChar('┌');  // true
isBoxDrawingChar('─');  // true
isBoxDrawingChar('╔');  // true (double line)
isBoxDrawingChar('A');  // false
isBoxDrawingChar('+');  // false
isBoxDrawingChar('█');  // false (block element, not box drawing)
```

**Parameters:**
- `char` - A single character to check

**Returns:** `boolean`

---

## containsBoxDrawing

Checks if a string contains any Unicode box drawing characters.

```typescript
import { containsBoxDrawing } from 'blecsd';

containsBoxDrawing('┌──┐');         // true
containsBoxDrawing('Hello │ World'); // true
containsBoxDrawing('Hello World');   // false
containsBoxDrawing('+-+');           // false
containsBoxDrawing('');              // false
```

**Parameters:**
- `str` - A string to check

**Returns:** `boolean`

---

## createBox

Creates a box with the specified dimensions and style.

```typescript
import { createBox } from 'blecsd';

// Single-line box (default)
const singleBox = createBox(10, 4, 'single');
// ['┌────────┐', '│        │', '│        │', '└────────┘']

// Double-line box
const doubleBox = createBox(10, 4, 'double');
// ['╔════════╗', '║        ║', '║        ║', '╚════════╝']

// Rounded corners
const roundedBox = createBox(10, 4, 'rounded');
// ['╭────────╮', '│        │', '│        │', '╰────────╯']

// Minimum size box
const minBox = createBox(2, 2, 'single');
// ['┌┐', '└┘']
```

**Parameters:**
- `width` - Box width in characters (including borders)
- `height` - Box height in lines (including borders)
- `style` - Box style: `'single'` (default), `'double'`, or `'rounded'`

**Returns:** `string[]` - Array of strings, one per line

---

## getAcsCharNames

Returns an array of all available ACS character names.

```typescript
import { getAcsCharNames } from 'blecsd';

const names = getAcsCharNames();
// ['ulcorner', 'urcorner', 'llcorner', 'lrcorner', 'ltee', 'rtee', ...]

// Check if a name is valid
if (names.includes('ulcorner')) {
  console.log('ulcorner is a valid ACS name');
}
```

**Returns:** `readonly string[]`

---

## Box Style Reference

| Style | Corners | Lines | Use Case |
|-------|---------|-------|----------|
| `single` | ┌┐└┘ | ─│ | Standard UI boxes |
| `double` | ╔╗╚╝ | ═║ | Emphasis, dialogs |
| `rounded` | ╭╮╰╯ | ─│ | Modern, friendly UI |

---

## ASCII Fallback Reference

When Unicode is not available, box drawing characters fall back to ASCII:

| Unicode | ASCII | Description |
|---------|-------|-------------|
| ┌┐└┘ | + | Corners |
| ├┤┬┴┼ | + | Tees and crossover |
| ─ | - | Horizontal line |
| │ | \| | Vertical line |
| ═ | = | Double horizontal |
| ║ | \| | Double vertical |
| ◆ | * | Diamond |
| █ | # | Solid block |
| ▒ | % | Medium shade |
| ░ | : | Light shade |
| ←→↑↓ | <>^v | Arrows |

---

## Examples

### Window with Title

```typescript
import { ACS } from 'blecsd';

function drawWindow(title: string, width: number, height: number): string[] {
  const lines: string[] = [];
  const innerWidth = width - 2;
  const paddedTitle = ` ${title} `.slice(0, innerWidth);
  const leftPad = Math.floor((innerWidth - paddedTitle.length) / 2);
  const rightPad = innerWidth - leftPad - paddedTitle.length;

  // Top with title
  lines.push(
    ACS.ulcorner +
    ACS.hline.repeat(leftPad) +
    paddedTitle +
    ACS.hline.repeat(rightPad) +
    ACS.urcorner
  );

  // Content rows
  for (let i = 0; i < height - 2; i++) {
    lines.push(ACS.vline + ' '.repeat(innerWidth) + ACS.vline);
  }

  // Bottom
  lines.push(ACS.llcorner + ACS.hline.repeat(innerWidth) + ACS.lrcorner);

  return lines;
}

const window = drawWindow('My Window', 30, 5);
// ┌───────── My Window ──────────┐
// │                              │
// │                              │
// │                              │
// └──────────────────────────────┘
```

### Table with Dividers

```typescript
import { ACS } from 'blecsd';

function drawTableRow(cells: string[], widths: number[]): string {
  return ACS.vline + cells.map((cell, i) =>
    cell.padEnd(widths[i])
  ).join(ACS.vline) + ACS.vline;
}

function drawTableDivider(widths: number[], position: 'top' | 'middle' | 'bottom'): string {
  const left = position === 'top' ? ACS.ulcorner : position === 'bottom' ? ACS.llcorner : ACS.ltee;
  const right = position === 'top' ? ACS.urcorner : position === 'bottom' ? ACS.lrcorner : ACS.rtee;
  const mid = position === 'top' ? ACS.ttee : position === 'bottom' ? ACS.btee : ACS.plus;

  return left + widths.map(w => ACS.hline.repeat(w)).join(mid) + right;
}

const widths = [10, 8, 12];
console.log(drawTableDivider(widths, 'top'));
console.log(drawTableRow(['Name', 'Age', 'City'], widths));
console.log(drawTableDivider(widths, 'middle'));
console.log(drawTableRow(['Alice', '30', 'New York'], widths));
console.log(drawTableDivider(widths, 'bottom'));
// ┌──────────┬────────┬────────────┐
// │Name      │Age     │City        │
// ├──────────┼────────┼────────────┤
// │Alice     │30      │New York    │
// └──────────┴────────┴────────────┘
```

### ASCII-Safe Rendering

```typescript
import { createBox, stringToAscii } from 'blecsd';

function renderBox(width: number, height: number, useUnicode: boolean): string[] {
  const box = createBox(width, height, 'single');

  if (!useUnicode) {
    return box.map(line => stringToAscii(line));
  }

  return box;
}

// Unicode terminal
renderBox(10, 3, true);
// ['┌────────┐', '│        │', '└────────┘']

// ASCII-only terminal
renderBox(10, 3, false);
// ['+--------+', '|        |', '+--------+']
```

---

## See Also

- [Tput](./tput.md) - High-level capability interface
- [Builtin](./builtin.md) - Hardcoded terminfo data
- [Compiler](./compiler.md) - Parameterized string compilation
