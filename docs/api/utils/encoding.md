# Encoding Utilities

Utilities for handling legacy character encodings, primarily CP437 (IBM PC / DOS) for classic ANSI art files.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { encoding } from 'blecsd';

// Convert CP437 buffer to UTF-8 string
const content = encoding.bufferToString(buffer, 'cp437');

// Convert UTF-8 string to CP437 buffer
const encoded = encoding.stringToBuffer(text, 'cp437');
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { encoding } from 'blecsd';

// Fetch ANSI art file
const response = await fetch('https://example.com/art.ans');
const buffer = Buffer.from(await response.arrayBuffer());

// Convert CP437 to UTF-8
const content = encoding.bufferToString(buffer, 'cp437');

// Now safe to display in terminal
terminal.write(content);
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { encoding } from 'blecsd';
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { encoding } from 'blecsd';
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { encoding } from 'blecsd';
import { readFileSync, writeFileSync } from 'node:fs';

// Convert CP437 file to UTF-8
const cp437Buffer = readFileSync('legacy.ans');
const utf8Content = encoding.bufferToString(cp437Buffer, 'cp437');
writeFileSync('converted.txt', utf8Content, 'utf8');

// Convert UTF-8 back to CP437
const utf8Buffer = readFileSync('modern.txt', 'utf8');
const cp437Content = encoding.stringToBuffer(utf8Buffer, 'cp437');
writeFileSync('output.ans', cp437Content);
```

## Resources

- [Wikipedia: Code page 437](https://en.wikipedia.org/wiki/Code_page_437)
- [16colo.rs ANSI Art Archive](https://16colo.rs/)
- [textfiles.com ANSI Collection](http://artscene.textfiles.com/ansi/)

## Related

- [Terminal Widget](../widgets/terminal.md) - Display ANSI content
- [ANSI Parser](../ansi.md) - Parse ANSI escape sequences
- [Examples: ANSI Viewer](../../examples/index.md#ansi-art-viewer) - Browse ANSI art
