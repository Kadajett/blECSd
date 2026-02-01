# Character Set Handling

The `charset` namespace provides functions for managing terminal character sets, including G0-G3 designation, locking and single shifts, and alternate character set (ACS) mode for line drawing.

## Overview

Terminals maintain four character set registers (G0-G3) that can each hold a different character set. GL (Graphic Left, 00-7F) and GR (Graphic Right, 80-FF) are the "working" areas that display characters. You can invoke any G-register into GL or GR to make it active.

The most common use case is enabling DEC Special Graphics (line drawing characters) for drawing boxes and borders.

## Quick Start

```typescript
import { charset, boxDrawing } from 'blecsd/terminal';

// Method 1: Simple ACS mode (most common)
const box = charset.enterAcs() + 'lqqqk' + charset.exitAcs();
// Draws: ┌───┐

// Method 2: Use boxDrawing helpers with Unicode directly
const unicodeBox = boxDrawing.unicode.topLeft +
  boxDrawing.unicode.horizontal.repeat(3) +
  boxDrawing.unicode.topRight;
// Draws: ┌───┐
```

## Functions

### charset.designate

Designate a character set to a G0-G3 register.

```typescript
function designate(set: CharacterSetId, gn?: CharacterSetRegister): string
```

**Parameters:**
- `set` - The character set to load (see Character Set IDs below)
- `gn` - The register (0-3, default 0)

**Returns:** The escape sequence

**Example:**
```typescript
import { charset } from 'blecsd/terminal';

// Load DEC graphics into G0
process.stdout.write(charset.designate('dec-graphics', 0));

// Load UK character set into G1
process.stdout.write(charset.designate('uk', 1));
```

### charset.invokeG0

Invoke G0 into GL (Shift In / SI). This is the default state.

```typescript
function invokeG0(): string  // Returns '\x0f' (SI)
```

### charset.invokeG1

Invoke G1 into GL (Shift Out / SO).

```typescript
function invokeG1(): string  // Returns '\x0e' (SO)
```

### charset.invokeG2

Invoke G2 into GL (LS2 - Locking Shift 2).

```typescript
function invokeG2(): string  // Returns '\x1bn'
```

### charset.invokeG3

Invoke G3 into GL (LS3 - Locking Shift 3).

```typescript
function invokeG3(): string  // Returns '\x1bo'
```

### charset.invokeG1R / invokeG2R / invokeG3R

Invoke G1/G2/G3 into GR (right half, 80-FF).

```typescript
function invokeG1R(): string  // LS1R: '\x1b~'
function invokeG2R(): string  // LS2R: '\x1b}'
function invokeG3R(): string  // LS3R: '\x1b|'
```

### charset.singleShiftG2

Single shift to G2 (SS2). The next character uses G2, then returns to current GL.

```typescript
function singleShiftG2(): string  // Returns '\x1bN'
```

### charset.singleShiftG3

Single shift to G3 (SS3). The next character uses G3, then returns to current GL.

```typescript
function singleShiftG3(): string  // Returns '\x1bO'
```

### charset.enterAcs / smacs

Enter alternate character set mode. Designates DEC Special Graphics to G0.

```typescript
function enterAcs(): string  // Returns '\x1b(0'
function smacs(): string     // Alias for enterAcs()
```

**Example:**
```typescript
import { charset } from 'blecsd/terminal';

// Draw a box using ACS mode
let box = '';
box += charset.enterAcs();
box += 'lqqqqqqqqqk\n'; // ┌─────────┐
box += 'x         x\n'; // │         │
box += 'mqqqqqqqqqj';   // └─────────┘
box += charset.exitAcs();
process.stdout.write(box);
```

### charset.exitAcs / rmacs

Exit alternate character set mode. Restores US ASCII to G0.

```typescript
function exitAcs(): string  // Returns '\x1b(B'
function rmacs(): string    // Alias for exitAcs()
```

## Character Set IDs

| ID | Description | Final Character |
|----|-------------|-----------------|
| `dec-graphics` | DEC Special Graphics (line drawing) | `0` |
| `us-ascii` | US ASCII (default) | `B` |
| `uk` | UK ASCII (£ instead of #) | `A` |
| `dutch` | Dutch | `4` |
| `finnish` | Finnish | `C` |
| `french` | French | `R` |
| `french-canadian` | French Canadian | `Q` |
| `german` | German | `K` |
| `italian` | Italian | `Y` |
| `norwegian-danish` | Norwegian/Danish | `E` |
| `spanish` | Spanish | `Z` |
| `swedish` | Swedish | `H` |
| `swiss` | Swiss | `=` |
| `iso-latin` | ISO Latin-1 Supplemental | `/A` |

## DEC Special Graphics

The `DEC_SPECIAL_GRAPHICS` constant maps input characters (when in ACS mode) to their Unicode equivalents:

```typescript
import { DEC_SPECIAL_GRAPHICS } from 'blecsd/terminal';

// Box drawing corners
DEC_SPECIAL_GRAPHICS['l']  // '┌' top-left
DEC_SPECIAL_GRAPHICS['k']  // '┐' top-right
DEC_SPECIAL_GRAPHICS['m']  // '└' bottom-left
DEC_SPECIAL_GRAPHICS['j']  // '┘' bottom-right

// Box drawing lines
DEC_SPECIAL_GRAPHICS['q']  // '─' horizontal
DEC_SPECIAL_GRAPHICS['x']  // '│' vertical

// Box drawing tees
DEC_SPECIAL_GRAPHICS['n']  // '┼' cross
DEC_SPECIAL_GRAPHICS['t']  // '├' tee right
DEC_SPECIAL_GRAPHICS['u']  // '┤' tee left
DEC_SPECIAL_GRAPHICS['v']  // '┴' tee up
DEC_SPECIAL_GRAPHICS['w']  // '┬' tee down

// Symbols
DEC_SPECIAL_GRAPHICS['`']  // '◆' diamond
DEC_SPECIAL_GRAPHICS['a']  // '▒' checkerboard
DEC_SPECIAL_GRAPHICS['f']  // '°' degree
DEC_SPECIAL_GRAPHICS['g']  // '±' plus-minus
```

### Full DEC Graphics Character Map

| Char | Unicode | Description |
|------|---------|-------------|
| `` ` `` | ◆ | Diamond |
| `a` | ▒ | Checkerboard |
| `f` | ° | Degree symbol |
| `g` | ± | Plus-minus |
| `h` | ␤ | Newline symbol |
| `j` | ┘ | Box corner bottom-right |
| `k` | ┐ | Box corner top-right |
| `l` | ┌ | Box corner top-left |
| `m` | └ | Box corner bottom-left |
| `n` | ┼ | Box cross |
| `o` | ⎺ | Scan line 1 |
| `p` | ⎻ | Scan line 3 |
| `q` | ─ | Horizontal line |
| `r` | ⎼ | Scan line 7 |
| `s` | ⎽ | Scan line 9 |
| `t` | ├ | Tee pointing right |
| `u` | ┤ | Tee pointing left |
| `v` | ┴ | Tee pointing up |
| `w` | ┬ | Tee pointing down |
| `x` | │ | Vertical line |
| `y` | ≤ | Less than or equal |
| `z` | ≥ | Greater than or equal |
| `{` | π | Pi |
| `\|` | ≠ | Not equal |
| `}` | £ | Pound sign |
| `~` | · | Centered dot |

## Box Drawing Utilities

The `boxDrawing` namespace provides pre-built character sets for different box styles:

```typescript
import { boxDrawing } from 'blecsd/terminal';

// Unicode single-line (most common)
const box = boxDrawing.unicode;
console.log(box.topLeft + box.horizontal.repeat(5) + box.topRight);
// Output: ┌─────┐

// Unicode double-line
const dbl = boxDrawing.unicodeDouble;
console.log(dbl.topLeft + dbl.horizontal.repeat(5) + dbl.topRight);
// Output: ╔═════╗

// Unicode rounded corners
const rnd = boxDrawing.unicodeRounded;
console.log(rnd.topLeft + rnd.horizontal.repeat(5) + rnd.topRight);
// Output: ╭─────╮

// ASCII fallback
const ascii = boxDrawing.ascii;
console.log(ascii.topLeft + ascii.horizontal.repeat(5) + ascii.topRight);
// Output: +-----+

// DEC graphics input characters (for ACS mode)
const dec = boxDrawing.decGraphics;
console.log(dec.topLeft + dec.horizontal.repeat(5) + dec.topRight);
// Output: lqqqqqk (renders as ┌─────┐ in ACS mode)
```

### Box Drawing Set Properties

Each box drawing set contains:

| Property | Description |
|----------|-------------|
| `topLeft` | Top-left corner |
| `topRight` | Top-right corner |
| `bottomLeft` | Bottom-left corner |
| `bottomRight` | Bottom-right corner |
| `horizontal` | Horizontal line |
| `vertical` | Vertical line |
| `cross` | Four-way intersection |
| `teeRight` | T pointing right |
| `teeLeft` | T pointing left |
| `teeUp` | T pointing up |
| `teeDown` | T pointing down |

## ASCII Fallback

The `UNICODE_TO_ASCII` constant provides ASCII fallbacks for Unicode box drawing:

```typescript
import { UNICODE_TO_ASCII } from 'blecsd/terminal';

const char = '─'; // Unicode horizontal line
const ascii = UNICODE_TO_ASCII[char]; // '-'
```

## Usage Patterns

### Pattern 1: Simple ACS Mode

Best for quick box drawing:

```typescript
import { charset } from 'blecsd/terminal';

function drawBox(width: number, height: number): string {
  const dec = { h: 'q', v: 'x', tl: 'l', tr: 'k', bl: 'm', br: 'j' };

  let result = charset.enterAcs();
  result += dec.tl + dec.h.repeat(width - 2) + dec.tr + '\n';
  for (let i = 1; i < height - 1; i++) {
    result += dec.v + ' '.repeat(width - 2) + dec.v + '\n';
  }
  result += dec.bl + dec.h.repeat(width - 2) + dec.br;
  result += charset.exitAcs();

  return result;
}
```

### Pattern 2: Using G1 for Switching

Keep normal text and line drawing available:

```typescript
import { charset } from 'blecsd/terminal';

// Setup: Load DEC graphics into G1
process.stdout.write(charset.designate('dec-graphics', 1));

// Now you can switch between normal (G0) and graphics (G1)
process.stdout.write('Normal text ');
process.stdout.write(charset.invokeG1()); // Switch to G1
process.stdout.write('lqqqk');             // Line drawing
process.stdout.write(charset.invokeG0()); // Back to G0
process.stdout.write(' Normal text');
```

### Pattern 3: Unicode Direct

Skip escape sequences entirely for modern terminals:

```typescript
import { boxDrawing } from 'blecsd/terminal';

const box = boxDrawing.unicode;
console.log(box.topLeft + box.horizontal.repeat(10) + box.topRight);
console.log(box.vertical + ' Content  ' + box.vertical);
console.log(box.bottomLeft + box.horizontal.repeat(10) + box.bottomRight);
```

## Types

### CharacterSetId

```typescript
type CharacterSetId =
  | 'dec-graphics'
  | 'us-ascii'
  | 'uk'
  | 'dutch'
  | 'finnish'
  | 'french'
  | 'french-canadian'
  | 'german'
  | 'italian'
  | 'norwegian-danish'
  | 'spanish'
  | 'swedish'
  | 'swiss'
  | 'iso-latin';
```

### CharacterSetRegister

```typescript
type CharacterSetRegister = 0 | 1 | 2 | 3;
```

### BoxDrawingSet

```typescript
type BoxDrawingSet = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  cross: string;
  teeRight: string;
  teeLeft: string;
  teeUp: string;
  teeDown: string;
};
```
