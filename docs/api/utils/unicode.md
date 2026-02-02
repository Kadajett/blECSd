# Unicode Utilities

Unicode utilities for terminal text handling, including character width calculation and combining character detection.

## Overview

Terminal emulators display characters at different widths:
- **Narrow (width = 1)**: ASCII, Latin, most European scripts
- **Wide (width = 2)**: CJK ideographs, Hangul, fullwidth forms, emoji
- **Zero-width (width = 0)**: Combining marks, control characters, zero-width joiners
- **Ambiguous**: Characters that may be narrow or wide depending on context

**Combining characters** are marks that attach to the preceding base character (accents, diacritics, tone marks). All combining characters are zero-width.

This module provides efficient lookup functions using binary search and pre-computed sets.

## Types

### CodePointRange

A range of Unicode code points (inclusive).

```typescript
type CodePointRange = readonly [number, number];
```

## Constants

### WIDE_RANGES

Wide character ranges that display as two terminal cells.

```typescript
import { WIDE_RANGES } from 'blecsd';

// Includes CJK, Hangul, fullwidth forms
console.log(WIDE_RANGES.length); // Number of wide ranges
```

**Covered blocks:**
- CJK Unified Ideographs (U+4E00-U+9FFF)
- CJK Extensions A-H
- Hiragana, Katakana (U+3040-U+30FF)
- Hangul Syllables (U+AC00-U+D7A3)
- Halfwidth and Fullwidth Forms (fullwidth portion)
- And more...

### FULLWIDTH_RANGES

Fullwidth character ranges from the Halfwidth and Fullwidth Forms Unicode block.

```typescript
import { FULLWIDTH_RANGES } from 'blecsd';

// U+FF01-FF5E: Fullwidth ASCII variants
// U+FFE0-FFE6: Fullwidth currency symbols
```

### ZERO_WIDTH_RANGES

Zero-width characters that don't occupy display cells.

```typescript
import { ZERO_WIDTH_RANGES } from 'blecsd';

// Includes combining marks, control characters, modifiers
```

**Covered characters:**
- C0/C1 control characters
- Combining Diacritical Marks (U+0300-U+036F)
- Zero Width Space (U+200B)
- Zero Width Non-Joiner (U+200C)
- Zero Width Joiner (U+200D)
- Variation Selectors (U+FE00-U+FE0F)
- BOM (U+FEFF)

### AMBIGUOUS_RANGES

Characters with ambiguous width that may display as 1 or 2 cells depending on context.

```typescript
import { AMBIGUOUS_RANGES } from 'blecsd';

// Greek letters, Cyrillic, box drawing, geometric shapes
```

**Covered characters:**
- Greek and Coptic (U+0391-U+03C9)
- Cyrillic (U+0410-U+044F)
- Box Drawing (U+2500-U+257F)
- Block Elements (U+2580-U+259F)
- Geometric Shapes (U+25A0-U+25FF)
- Miscellaneous Symbols (U+2600-U+26FF)

### EMOJI_WIDE_RANGES

Emoji ranges typically displayed as wide characters.

```typescript
import { EMOJI_WIDE_RANGES } from 'blecsd';

// Emoticons, pictographs, transport symbols
```

## Functions

### isWideChar

Checks if a character displays as 2 cells.

```typescript
function isWideChar(codePoint: number): boolean
```

**Parameters:**
- `codePoint` - Unicode code point to check

**Returns:** `true` if the character is wide (2 cells)

**Example:**
```typescript
import { isWideChar } from 'blecsd';

isWideChar(0x4e00);  // true - CJK ideograph "一"
isWideChar(0x0041);  // false - Latin 'A'
isWideChar(0xff21);  // true - Fullwidth 'A'
isWideChar(0x1f600); // true - Grinning face emoji
isWideChar(0xac00);  // true - Hangul syllable "가"
```

### isZeroWidthChar

Checks if a character displays as 0 cells.

```typescript
function isZeroWidthChar(codePoint: number): boolean
```

**Parameters:**
- `codePoint` - Unicode code point to check

**Returns:** `true` if the character is zero-width

**Example:**
```typescript
import { isZeroWidthChar } from 'blecsd';

isZeroWidthChar(0x0300); // true - Combining grave accent
isZeroWidthChar(0x200b); // true - Zero-width space
isZeroWidthChar(0x200d); // true - Zero-width joiner
isZeroWidthChar(0xfe0f); // true - Variation selector
isZeroWidthChar(0x0041); // false - Latin 'A'
```

### isAmbiguousChar

Checks if a character has ambiguous width.

```typescript
function isAmbiguousChar(codePoint: number): boolean
```

**Parameters:**
- `codePoint` - Unicode code point to check

**Returns:** `true` if the character has ambiguous width

**Example:**
```typescript
import { isAmbiguousChar } from 'blecsd';

isAmbiguousChar(0x03b1); // true - Greek alpha (α)
isAmbiguousChar(0x0410); // true - Cyrillic A (А)
isAmbiguousChar(0x2500); // true - Box drawing horizontal (─)
isAmbiguousChar(0x25a0); // true - Black square (■)
isAmbiguousChar(0x0041); // false - Latin 'A'
isAmbiguousChar(0x4e00); // false - CJK (not ambiguous, always wide)
```

### getCharWidth

Gets the display width of a character (0, 1, or 2).

```typescript
function getCharWidth(codePoint: number, ambiguousIsWide?: boolean): number
```

**Parameters:**
- `codePoint` - Unicode code point to check
- `ambiguousIsWide` - Treat ambiguous width chars as wide (default: `false`)

**Returns:** Character display width (0, 1, or 2)

**Example:**
```typescript
import { getCharWidth } from 'blecsd';

// Basic usage
getCharWidth(0x0041);  // 1 - Latin 'A'
getCharWidth(0x4e00);  // 2 - CJK ideograph
getCharWidth(0x0300);  // 0 - Combining mark
getCharWidth(0x1f600); // 2 - Emoji

// Ambiguous width handling
getCharWidth(0x03b1);       // 1 - Greek alpha (narrow by default)
getCharWidth(0x03b1, true); // 2 - Greek alpha (wide in CJK context)
getCharWidth(0x2500);       // 1 - Box drawing (narrow by default)
getCharWidth(0x2500, true); // 2 - Box drawing (wide in CJK context)
```

## Performance

All lookup functions use binary search over sorted ranges, providing O(log n) lookup time. The fast path for ASCII characters (< U+1100) returns immediately without searching.

```typescript
// Performance test: 10,000 lookups
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  getCharWidth(0x4e00 + (i % 1000));
}
const elapsed = performance.now() - start;
// Typically completes in under 10ms
```

## Use Cases

### Calculating String Display Width

```typescript
import { getCharWidth } from 'blecsd';

function getStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      width += getCharWidth(codePoint);
    }
  }
  return width;
}

getStringWidth('Hello');     // 5
getStringWidth('你好');       // 4 (2 + 2)
getStringWidth('Héllo');     // 5 (combining accent is zero-width)
getStringWidth('Hello🚀');   // 7 (5 + 2)
```

### Text Truncation with Ellipsis

```typescript
import { getCharWidth } from 'blecsd';

function truncate(str: string, maxWidth: number): string {
  let width = 0;
  let result = '';

  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;

    const charWidth = getCharWidth(codePoint);
    if (width + charWidth + 1 > maxWidth) {
      return result + '…';
    }

    width += charWidth;
    result += char;
  }

  return result;
}

truncate('Hello World', 8);  // 'Hello W…'
truncate('你好世界', 5);      // '你好…'
```

### Terminal Column Alignment

```typescript
import { getCharWidth } from 'blecsd';

function padEnd(str: string, targetWidth: number): string {
  let currentWidth = 0;
  for (const char of str) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      currentWidth += getCharWidth(codePoint);
    }
  }

  const padding = targetWidth - currentWidth;
  return padding > 0 ? str + ' '.repeat(padding) : str;
}

// Aligned columns
console.log(padEnd('Name', 10) + '| Value');
console.log(padEnd('日本語', 10) + '| Japanese');
```

---

## Combining Characters

Combining characters are marks that attach to the preceding base character. They include accents, diacritics, vowel signs, and tone marks.

### COMBINING_RANGES

Sorted array of combining character ranges.

```typescript
import { COMBINING_RANGES } from 'blecsd';

// Check how many ranges are covered
console.log(COMBINING_RANGES.length);
```

**Covered blocks:**
- Combining Diacritical Marks (U+0300-U+036F)
- Combining Diacritical Marks Extended (U+1AB0-U+1AFF)
- Combining Diacritical Marks Supplement (U+1DC0-U+1DFF)
- Combining Diacritical Marks for Symbols (U+20D0-U+20FF)
- Arabic, Hebrew, Indic, Thai, and other script combining marks
- Variation Selectors (U+FE00-U+FE0F, U+E0100-U+E01EF)

### COMBINING_SET

Pre-computed Set of all combining character code points for O(1) lookup.

```typescript
import { COMBINING_SET } from 'blecsd';

if (COMBINING_SET.has(codePoint)) {
  // Character is a combining mark
}
```

### isCombiningChar

Checks if a character is a combining character using the pre-computed Set.

```typescript
function isCombiningChar(codePoint: number): boolean
```

**Parameters:**
- `codePoint` - Unicode code point to check

**Returns:** `true` if the character is a combining character

**Example:**
```typescript
import { isCombiningChar } from 'blecsd';

isCombiningChar(0x0300); // true - Combining grave accent
isCombiningChar(0x0301); // true - Combining acute accent
isCombiningChar(0x0308); // true - Combining diaeresis
isCombiningChar(0x0041); // false - Latin 'A'
isCombiningChar(0x200b); // false - Zero-width space (not combining)
isCombiningChar(0x200d); // false - Zero-width joiner (not combining)
```

### isCombiningCharBinarySearch

Checks if a character is a combining character using binary search. Slightly slower than `isCombiningChar()` but uses less memory.

```typescript
function isCombiningCharBinarySearch(codePoint: number): boolean
```

**Example:**
```typescript
import { isCombiningCharBinarySearch } from 'blecsd';

isCombiningCharBinarySearch(0x0300); // true
isCombiningCharBinarySearch(0x0041); // false
```

### getCombiningCharCount

Gets the total number of combining character code points covered.

```typescript
function getCombiningCharCount(): number
```

**Example:**
```typescript
import { getCombiningCharCount } from 'blecsd';

const count = getCombiningCharCount();
console.log(`Covering ${count} combining characters`);
```

### Combining vs Zero-Width

Not all zero-width characters are combining characters:

| Character Type | Zero-Width | Combining |
|----------------|------------|-----------|
| Combining accents (U+0300-U+036F) | Yes | Yes |
| Control characters (U+0000-U+001F) | Yes | No |
| Zero-width space (U+200B) | Yes | No |
| Zero-width joiner (U+200D) | Yes | No |
| BOM (U+FEFF) | Yes | No |

Use `isZeroWidthChar()` for display width calculation, and `isCombiningChar()` for text processing that needs to identify combining marks specifically.

---

---

## String Width Measurement

Functions for measuring and manipulating strings based on display width.

### WidthOptions

Options for string width calculation.

```typescript
interface WidthOptions {
  tabWidth?: number;       // Tab width (default: 8)
  ambiguousAsWide?: boolean; // Treat ambiguous as wide (default: false)
}
```

### stringWidth / strWidth

Calculates the display width of a string in terminal columns.

```typescript
function stringWidth(str: string, options?: WidthOptions): number
function strWidth(str: string, options?: WidthOptions): number  // alias
```

**Example:**
```typescript
import { stringWidth, strWidth } from 'blecsd';

stringWidth('Hello');      // 5
stringWidth('你好');        // 4
stringWidth('Hello😀');    // 7
stringWidth('café');       // 4 (combining accent is zero-width)
stringWidth('A\tB');       // 9 (A=1, tab=8)
stringWidth('A\tB', { tabWidth: 4 }); // 5

// strWidth is an alias
strWidth('Hello世界');     // 9
```

### charWidth

Gets the display width of a single character.

```typescript
function charWidth(char: string, ambiguousAsWide?: boolean): 0 | 1 | 2
```

**Example:**
```typescript
import { charWidth } from 'blecsd';

charWidth('A');  // 1
charWidth('中'); // 2
charWidth('😀'); // 2
```

### charWidthAt

Gets the display width of the character at a specific index.

```typescript
function charWidthAt(str: string, index: number, ambiguousAsWide?: boolean): 0 | 1 | 2 | -1
```

**Example:**
```typescript
import { charWidthAt } from 'blecsd';

const str = 'A中😀';
charWidthAt(str, 0);  // 1
charWidthAt(str, 1);  // 2
charWidthAt(str, 2);  // 2
charWidthAt(str, 3);  // -1 (out of bounds)
```

### sliceByWidth

Slices a string to fit within a maximum display width.

```typescript
function sliceByWidth(str: string, maxWidth: number, options?: WidthOptions): SliceResult

interface SliceResult {
  text: string;      // The sliced string
  width: number;     // Display width of result
  truncated: boolean; // Whether truncation occurred
}
```

**Example:**
```typescript
import { sliceByWidth } from 'blecsd';

sliceByWidth('Hello World', 8);
// { text: 'Hello Wo', width: 8, truncated: true }

sliceByWidth('你好世界', 5);
// { text: '你好', width: 4, truncated: true }
```

### truncateByWidth

Truncates a string to fit within a maximum display width.

```typescript
function truncateByWidth(str: string, maxWidth: number, options?: WidthOptions): string
```

**Example:**
```typescript
import { truncateByWidth } from 'blecsd';

truncateByWidth('Hello World', 8);  // 'Hello Wo'
truncateByWidth('你好世界', 5);      // '你好'
```

### truncateWithEllipsis

Truncates a string with an ellipsis if it exceeds the maximum width.

```typescript
function truncateWithEllipsis(
  str: string,
  maxWidth: number,
  ellipsis?: string,
  options?: WidthOptions
): string
```

**Example:**
```typescript
import { truncateWithEllipsis } from 'blecsd';

truncateWithEllipsis('Hello World', 8);       // 'Hello W…'
truncateWithEllipsis('Hello World', 8, '...'); // 'Hello...'
truncateWithEllipsis('Hi', 10);               // 'Hi'
```

### Padding Functions

```typescript
function padEndByWidth(str: string, targetWidth: number, padChar?: string, options?: WidthOptions): string
function padStartByWidth(str: string, targetWidth: number, padChar?: string, options?: WidthOptions): string
function centerByWidth(str: string, targetWidth: number, padChar?: string, options?: WidthOptions): string
```

**Example:**
```typescript
import { padEndByWidth, padStartByWidth, centerByWidth } from 'blecsd';

padEndByWidth('Hi', 5);      // 'Hi   '
padStartByWidth('Hi', 5);    // '   Hi'
centerByWidth('Hi', 6);      // '  Hi  '

padEndByWidth('你好', 6);     // '你好  '
padStartByWidth('Hi', 5, '0'); // '000Hi'
```

### Index/Column Mapping

```typescript
function indexAtColumn(str: string, column: number, options?: WidthOptions): number
function columnAtIndex(str: string, index: number, options?: WidthOptions): number
```

**Example:**
```typescript
import { indexAtColumn, columnAtIndex } from 'blecsd';

const str = 'A中B';
indexAtColumn(str, 0);  // 0 ('A')
indexAtColumn(str, 1);  // 1 ('中')
indexAtColumn(str, 2);  // 1 ('中' spans columns 1-2)
indexAtColumn(str, 3);  // 2 ('B')

columnAtIndex(str, 0);  // 0 ('A' at column 0)
columnAtIndex(str, 1);  // 1 ('中' at column 1)
columnAtIndex(str, 2);  // 3 ('B' at column 3)
```

### Utility Functions

```typescript
function hasWideChars(str: string): boolean
function hasZeroWidthChars(str: string): boolean
```

**Example:**
```typescript
import { hasWideChars, hasZeroWidthChars } from 'blecsd';

hasWideChars('Hello');     // false
hasWideChars('Hello中');   // true

hasZeroWidthChars('café');      // false (precomposed)
hasZeroWidthChars('cafe\u0301'); // true (decomposed)
```

---

## Related

- [Text Wrap](./text-wrap.md) - Text wrapping with width awareness
- [Box](./box.md) - Box drawing utilities
- [Sattr](./sattr.md) - Style attribute encoding
