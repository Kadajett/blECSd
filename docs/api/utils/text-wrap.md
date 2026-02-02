# Text Wrapping Utilities

Utilities for wrapping, aligning, and measuring text with support for ANSI escape codes.

## Types

### TextAlign

```typescript
type TextAlign = 'left' | 'center' | 'right';
```

### WrapOptions

```typescript
interface WrapOptions {
  width: number;         // Maximum width in characters
  wrap?: boolean;        // Whether to wrap text (default: true)
  align?: TextAlign;     // Text alignment (default: 'left')
  breakWord?: boolean;   // Break mid-word if needed (default: false)
}
```

## Functions

### wrapText

Wraps and aligns text with full options.

```typescript
function wrapText(text: string, options: WrapOptions): string[]
```

**Example:**

```typescript
import { wrapText } from 'blecsd';

const lines = wrapText('Hello world, this is a test', {
  width: 15,
  wrap: true,
  align: 'center'
});
// ["  Hello world  ", " this is a test"]
```

### wordWrap

Wraps text at word boundaries without alignment.

```typescript
function wordWrap(text: string, width: number): string[]
```

**Example:**

```typescript
import { wordWrap } from 'blecsd';

const lines = wordWrap('The quick brown fox jumps over the lazy dog', 20);
// ["The quick brown fox", "jumps over the lazy", "dog"]
```

### alignLine

Aligns a single line of text within a specified width.

```typescript
function alignLine(line: string, width: number, align: TextAlign): string
```

**Example:**

```typescript
import { alignLine } from 'blecsd';

console.log(alignLine('Hello', 10, 'left'));   // "Hello     "
console.log(alignLine('Hello', 10, 'center')); // "  Hello   "
console.log(alignLine('Hello', 10, 'right'));  // "     Hello"
```

### truncate

Truncates text to fit within a width, adding an ellipsis.

```typescript
function truncate(
  text: string,
  width: number,
  ellipsis?: string  // Default: '…'
): string
```

**Example:**

```typescript
import { truncate } from 'blecsd';

console.log(truncate('Hello World', 8));        // "Hello W…"
console.log(truncate('Hello World', 8, '...'));  // "Hello..."
```

### padHeight

Pads an array of lines to a specific height.

```typescript
function padHeight(
  lines: string[],
  height: number,
  width: number,
  valign?: 'top' | 'middle' | 'bottom'  // Default: 'top'
): string[]
```

**Example:**

```typescript
import { padHeight } from 'blecsd';

const lines = padHeight(['Hello'], 3, 10, 'middle');
// ["          ", "Hello     ", "          "]
```

### getVisibleWidth

Gets the visible width of text, excluding ANSI codes.

```typescript
function getVisibleWidth(text: string): number
```

**Example:**

```typescript
import { getVisibleWidth } from 'blecsd';

console.log(getVisibleWidth('Hello'));              // 5
console.log(getVisibleWidth('\x1b[31mHello\x1b[0m')); // 5 (ANSI not counted)
```

### stripAnsi

Removes all ANSI escape sequences from text.

```typescript
function stripAnsi(text: string): string
```

**Example:**

```typescript
import { stripAnsi } from 'blecsd';

const plain = stripAnsi('\x1b[31mRed\x1b[0m Text');
console.log(plain); // "Red Text"
```

## Integration Examples

### Text Box with Wrapping

```typescript
import { createCellBuffer, renderBox, renderText, wrapText, BOX_ROUNDED } from 'blecsd';

const buffer = createCellBuffer(40, 10);
const text = 'This is a long paragraph that needs to be wrapped to fit inside the box.';

// Draw box
renderBox(buffer, 0, 0, 40, 10, BOX_ROUNDED, { fill: true });

// Wrap and render text inside box (with 1-cell padding)
const lines = wrapText(text, { width: 36, align: 'left' });
for (let i = 0; i < lines.length && i < 8; i++) {
  renderText(buffer, 2, 1 + i, lines[i]);
}
```

### Centered Multi-line Text

```typescript
import { wrapText, padHeight } from 'blecsd';

const text = 'Welcome to the game!';
const lines = wrapText(text, { width: 30, align: 'center' });
const padded = padHeight(lines, 5, 30, 'middle');

// padded now has 5 lines, vertically centered
```

### Handling Colored Text

```typescript
import { wrapText, getVisibleWidth } from 'blecsd';

const coloredText = '\x1b[1m\x1b[31mWarning:\x1b[0m This is important!';

// Width calculation excludes ANSI codes
console.log(getVisibleWidth(coloredText)); // 27 (not counting escape sequences)

// Wrapping preserves ANSI codes
const lines = wrapText(coloredText, { width: 15, align: 'left' });
// Lines still contain the color codes
```

### No-wrap Mode with Truncation

```typescript
import { wrapText } from 'blecsd';

const lines = wrapText('This is a very long line that should be truncated', {
  width: 20,
  wrap: false  // Don't wrap, truncate instead
});
// ["This is a very lon…"]
```

## ANSI Code Support

All functions preserve ANSI escape sequences correctly:

- **CSI sequences**: Color codes like `\x1b[31m` (red) and `\x1b[0m` (reset)
- **SGR sequences**: Style codes with parameters like `\x1b[38;5;196m`
- **Width calculation**: ANSI codes are excluded from width measurements
- **Truncation**: Reset codes are added after truncation if colors were used

## Future Enhancements

East Asian width support (CJK characters) will be added in the Unicode utilities epic (blessed-etz). Currently all characters are treated as single-width.

## Related

- [Box Utilities](./box.md) - Box rendering functions
- [Content Component](../content.md) - Content management for entities
