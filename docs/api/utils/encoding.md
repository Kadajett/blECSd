# Encoding Utilities

Utilities for handling legacy character encodings, primarily CP437 (IBM PC / DOS) for classic ANSI art files.

## Overview

```typescript
import { encoding } from 'blecsd/utils';

const buffer = Buffer.from([0x41, 0x42, 0x43]); // Example CP437 bytes
const text = 'Hello World';

// Convert CP437 buffer to UTF-8 string
const content = encoding.bufferToString(buffer, 'cp437');
console.log('decoded:', content);

// Convert UTF-8 string to CP437 buffer
const encoded = encoding.stringToBuffer(text, 'cp437');
console.log('encoded bytes:', encoded.length);
```

## Why CP437?

Classic ANSI art from the BBS era (1980s-1990s) uses IBM Code Page 437, which includes:

- Standard ASCII (0x20-0x7E)
- Box-drawing characters (─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼)
- Block elements (░ ▒ ▓ █ ▀ ▄ ▌ ▐)
- Mathematical symbols and Greek letters
- Special symbols in the control character range (☺ ☻ ♥ ♦ ♣ ♠)

When viewing .ANS files in a modern Unicode terminal, you must convert from CP437 to UTF-8 to display correctly.

## API

### bufferToString

Convert a buffer from a legacy encoding to a UTF-8 string.

```typescript
function bufferToString(
  buffer: Buffer | Uint8Array,
  encoding: 'cp437' | 'utf8'
): string;
```

**Parameters:**
- `buffer` - The input buffer containing encoded bytes
- `encoding` - Source encoding ('cp437' or 'utf8')

**Returns:** UTF-8 string

**Example:**

```typescript
import { encoding } from 'blecsd/utils';

// Read ANSI art file bytes (e.g., from fs.readFileSync)
const buffer = Buffer.from([0xDA, 0xC4, 0xBF]); // Box-drawing chars in CP437

// Convert CP437 to UTF-8
const content = encoding.bufferToString(buffer, 'cp437');

// Now safe to display in terminal
process.stdout.write(content);
```

### stringToBuffer

Convert a UTF-8 string to a buffer in a legacy encoding.

```typescript
function stringToBuffer(
  str: string,
  encoding: 'cp437' | 'utf8'
): Buffer;
```

**Parameters:**
- `str` - The UTF-8 string to encode
- `encoding` - Target encoding ('cp437' or 'utf8')

**Returns:** Buffer with encoded bytes

**Example:**

```typescript
import { encoding } from 'blecsd/utils';
import { writeFileSync } from 'node:fs';

// Create ANSI art with box-drawing characters
const art = `
┌────────────────┐
│  Hello World!  │
└────────────────┘
`;

// Convert to CP437 for saving as .ANS file
const buffer = encoding.stringToBuffer(art, 'cp437');
writeFileSync('hello.ans', buffer);
```

## CP437 Character Map

The CP437 encoding maps bytes 0x00-0xFF to specific Unicode characters:

| Range | Description | Examples |
|-------|-------------|----------|
| 0x00-0x1F | Special symbols | ☺ ☻ ♥ ♦ ♣ ♠ • ◘ ○ |
| 0x20-0x7E | Standard ASCII | A-Z a-z 0-9 punctuation |
| 0x7F | House | ⌂ |
| 0x80-0x9F | Accented letters | Ç ü é â ä à å ç ê ë |
| 0xA0-0xAF | More accented | á í ó ú ñ Ñ ª º ¿ |
| 0xB0-0xDF | Box-drawing | ░ ▒ ▓ │ ┤ ╡ ╢ ╖ ╕ ╣ ║ |
| 0xE0-0xEF | Greek/Math | α ß Γ π Σ σ µ τ Φ Θ |
| 0xF0-0xFF | Math symbols | ≡ ± ≥ ≤ ⌠ ⌡ ÷ ≈ ° • |

## Block Elements

Common block elements used in ANSI art:

```
░ (0xB0) - Light shade (25%)
▒ (0xB1) - Medium shade (50%)
▓ (0xB2) - Dark shade (75%)
█ (0xDB) - Full block (100%)
▀ (0xDF) - Upper half block
▄ (0xDC) - Lower half block
▌ (0xDD) - Left half block
▐ (0xDE) - Right half block
```

## Box-Drawing Characters

Single and double line box characters:

```
Single:  ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Double:  ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬
Mixed:   ╒ ╓ ╕ ╖ ╘ ╙ ╛ ╜ ╞ ╟ ╡ ╢ ╤ ╥ ╧ ╨
```

## Use Cases

### ANSI Art Viewer

```typescript
import { encoding } from 'blecsd/utils';
import { createTerminal } from 'blecsd/widgets';

async function displayAnsiArt(url: string): Promise<void> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const content = encoding.bufferToString(buffer, 'cp437');

  const terminal = createTerminal(world, {
    width: 82,   // Standard ANSI width (80) + borders
    height: 60,
  });

  terminal.write(content);
}
```

### Legacy File Conversion

```typescript
import { encoding } from 'blecsd/utils';

// Convert CP437 buffer to UTF-8
const cp437Buffer = Buffer.from([0xDA, 0xC4, 0xBF]); // Box-drawing in CP437
const utf8Content = encoding.bufferToString(cp437Buffer, 'cp437');
console.log('utf8 content:', utf8Content);

// Convert UTF-8 back to CP437
const utf8Buffer = 'Hello World';
const cp437Content = encoding.stringToBuffer(utf8Buffer, 'cp437');
console.log('cp437 bytes:', cp437Content.length);
```

## Resources

- [Wikipedia: Code page 437](https://en.wikipedia.org/wiki/Code_page_437)
- [16colo.rs ANSI Art Archive](https://16colo.rs/)
- [textfiles.com ANSI Collection](http://artscene.textfiles.com/ansi/)

## Related

- [Terminal Widget](../widgets/terminal.md) - Display ANSI content
- [ANSI Parser](../ansi.md) - Parse ANSI escape sequences
- [Examples: ANSI Viewer](https://github.com/Kadajett/blECSd-Examples) - Browse ANSI art
