# ACS (Alternate Character Set)

Provides character maps for box drawing and special symbols used in terminal UIs. ACS characters allow drawing boxes, lines, and decorative elements using Unicode characters with ASCII fallbacks for terminals that don't support Unicode.

## Overview

```typescript
import { ACS, UNICODE_TO_ASCII, ACSC_CODES } from 'blecsd/terminal';

// Draw a box using named constants
console.log(ACS.ulcorner + ACS.hline.repeat(10) + ACS.urcorner);
console.log(ACS.vline + ' Content  ' + ACS.vline);
console.log(ACS.llcorner + ACS.hline.repeat(10) + ACS.lrcorner);

// Look up an ASCII fallback for a Unicode box-drawing character
const fallback = UNICODE_TO_ASCII['┌'] ?? '+';
console.log(fallback);

// Check available ACS codes
const codes = Object.keys(ACSC_CODES);
console.log(`${codes.length} ACS code mappings available`);
```

---

## ACS

Named constants for common box drawing and special characters. These are the Unicode characters that terminals display when using the alternate character set.

```typescript
import { ACS } from 'blecsd/terminal';

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
import { ACS } from 'blecsd/terminal';

const width = 20;
const height = 5;
const boxLines: string[] = [];

// Top border
boxLines.push(ACS.ulcorner + ACS.hline.repeat(width - 2) + ACS.urcorner);

// Middle rows
for (let i = 0; i < height - 2; i++) {
  boxLines.push(ACS.vline + ' '.repeat(width - 2) + ACS.vline);
}

// Bottom border
boxLines.push(ACS.llcorner + ACS.hline.repeat(width - 2) + ACS.lrcorner);

boxLines.forEach(line => console.log(line));
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
import { ACSC_CODES } from 'blecsd/terminal';

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
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

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
import { parseAcsc } from 'blecsd/terminal';

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

Gets a Unicode ACS character by its name using the `ACS` constant object.

```typescript
import { ACS } from 'blecsd/terminal';

ACS.ulcorner;  // '┌'
ACS.hline;     // '─'
ACS.vline;     // '│'
ACS.diamond;   // '◆'
```

**Returns:** The Unicode character for that ACS name

---

## getAcsCharByCode

Gets a Unicode ACS character by its terminfo code using the `ACSC_CODES` map.

```typescript
import { ACSC_CODES } from 'blecsd/terminal';

ACSC_CODES['l'];  // '┌' (upper-left corner, may be undefined)
ACSC_CODES['q'];  // '─' (horizontal line)
ACSC_CODES['x'];  // '│' (vertical line)
```

**Returns:** `string | undefined` - The Unicode character for that code

---

## unicodeToAscii

Converts a single Unicode box-drawing character to its ASCII fallback using `UNICODE_TO_ASCII`.

```typescript
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

UNICODE_TO_ASCII['┌'] ?? '+';  // '+'
UNICODE_TO_ASCII['─'] ?? '-';  // '-'
UNICODE_TO_ASCII['│'] ?? '|';  // '|'
UNICODE_TO_ASCII['A'];         // undefined (no mapping for 'A')
```

**Returns:** `string | undefined` - The ASCII equivalent, or undefined if not a box-drawing character

---

## stringToAscii

Converts a string containing Unicode box drawing characters to ASCII using `UNICODE_TO_ASCII`.

```typescript
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

const asciiResult1 = [...'┌──┐'].map(c => UNICODE_TO_ASCII[c] ?? c).join('');
const asciiResult2 = [...'│Hi│'].map(c => UNICODE_TO_ASCII[c] ?? c).join('');
console.log(asciiResult1);  // '+--+'
console.log(asciiResult2);  // '|Hi|'
```

---

## isBoxDrawingChar

Checks if a character is a Unicode box drawing character using `UNICODE_TO_ASCII`.

```typescript
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

const isBoxCorner = '┌' in UNICODE_TO_ASCII;
const isLetter = 'A' in UNICODE_TO_ASCII;
console.log(isBoxCorner);  // true
console.log(isLetter);     // false
```

---

## containsBoxDrawing

Checks if a string contains any Unicode box drawing characters.

```typescript
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

const hasBoxChars1 = [...'┌──┐'].some(c => c in UNICODE_TO_ASCII);
const hasBoxChars2 = [...'Hello World'].some(c => c in UNICODE_TO_ASCII);
console.log(hasBoxChars1);  // true
console.log(hasBoxChars2);  // false
```

**Parameters:**
- `str` - A string to check

**Returns:** `boolean`

---

## createBox

Creates an ECS box widget entity. See [Box widget docs](../widgets/box.md) for full details.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBox } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);
createBox(world, eid, { width: 10, height: 4 });
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity to attach the box to
- `config` - Box configuration (width, height, border style, etc.)

**Returns:** `BoxWidget`

---

## getAcsCharNames

Returns all available ACS character names by enumerating the `ACS` object.

```typescript
import { ACS } from 'blecsd/terminal';

const names = Object.keys(ACS);
// ['ulcorner', 'urcorner', 'llcorner', 'lrcorner', 'ltee', 'rtee', ...]

// Check if a name is valid
if ('ulcorner' in ACS) {
  console.log('ulcorner is a valid ACS name');
}
```

**Returns:** `string[]`

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
import { ACS } from 'blecsd/terminal';

const windowTitle = 'My Window';
const windowWidth = 30;
const windowHeight = 5;
const windowLines: string[] = [];
const innerWidth = windowWidth - 2;
const paddedTitle = ` ${windowTitle} `.slice(0, innerWidth);
const leftPad = Math.floor((innerWidth - paddedTitle.length) / 2);
const rightPad = innerWidth - leftPad - paddedTitle.length;

// Top with title
windowLines.push(
  ACS.ulcorner +
  ACS.hline.repeat(leftPad) +
  paddedTitle +
  ACS.hline.repeat(rightPad) +
  ACS.urcorner
);

// Content rows
for (let i = 0; i < windowHeight - 2; i++) {
  windowLines.push(ACS.vline + ' '.repeat(innerWidth) + ACS.vline);
}

// Bottom
windowLines.push(ACS.llcorner + ACS.hline.repeat(innerWidth) + ACS.lrcorner);

windowLines.forEach(line => console.log(line));
// ┌───────── My Window ──────────┐
// │                              │
// │                              │
// │                              │
// └──────────────────────────────┘
```

### Table with Dividers

```typescript
import { ACS } from 'blecsd/terminal';

const tableWidths = [10, 8, 12];

const makeRow = (cells: string[]): string =>
  ACS.vline + cells.map((cell, i) => cell.padEnd(tableWidths[i])).join(ACS.vline) + ACS.vline;

const makeDivider = (position: 'top' | 'middle' | 'bottom'): string => {
  const left = position === 'top' ? ACS.ulcorner : position === 'bottom' ? ACS.llcorner : ACS.ltee;
  const right = position === 'top' ? ACS.urcorner : position === 'bottom' ? ACS.lrcorner : ACS.rtee;
  const mid = position === 'top' ? ACS.ttee : position === 'bottom' ? ACS.btee : ACS.plus;
  return left + tableWidths.map(w => ACS.hline.repeat(w)).join(mid) + right;
};

console.log(makeDivider('top'));
console.log(makeRow(['Name', 'Age', 'City']));
console.log(makeDivider('middle'));
console.log(makeRow(['Alice', '30', 'New York']));
console.log(makeDivider('bottom'));
// ┌──────────┬────────┬────────────┐
// │Name      │Age     │City        │
// ├──────────┼────────┼────────────┤
// │Alice     │30      │New York    │
// └──────────┴────────┴────────────┘
```

### ASCII-Safe Rendering

```typescript
import { ACS, UNICODE_TO_ASCII } from 'blecsd/terminal';

const safeWidth = 10;
const safeHeight = 3;
const inner = safeWidth - 2;
const unicodeBox: string[] = [];
unicodeBox.push(ACS.ulcorner + ACS.hline.repeat(inner) + ACS.urcorner);
for (let i = 0; i < safeHeight - 2; i++) {
  unicodeBox.push(ACS.vline + ' '.repeat(inner) + ACS.vline);
}
unicodeBox.push(ACS.llcorner + ACS.hline.repeat(inner) + ACS.lrcorner);
// ['┌────────┐', '│        │', '└────────┘']

// ASCII-only terminal
const asciiBox = unicodeBox.map(line => [...line].map(c => UNICODE_TO_ASCII[c] ?? c).join(''));
// ['+--------+', '|        |', '+--------+']
console.log(unicodeBox);
console.log(asciiBox);
```

---

## See Also

- [Tput](../terminfo.md) - High-level capability interface
- [Builtin](../terminfo.md) - Hardcoded terminfo data
- [Compiler](../terminfo.md) - Parameterized string compilation
