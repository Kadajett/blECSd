# Unicode Width Tables

Unicode East Asian Width utilities for calculating character display widths in terminal applications.

## Overview

Terminal emulators display characters at different widths:
- **Narrow (width = 1)**: ASCII, Latin, most European scripts
- **Wide (width = 2)**: CJK ideographs, Hangul, fullwidth forms, emoji
- **Zero-width (width = 0)**: Combining marks, control characters, zero-width joiners
- **Ambiguous**: Characters that may be narrow or wide depending on context

This module provides efficient lookup functions using binary search over sorted Unicode ranges.

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

## Related

- [Text Wrap](./text-wrap.md) - Text wrapping with width awareness
- [Box](./box.md) - Box drawing utilities
- [Sattr](./sattr.md) - Style attribute encoding
