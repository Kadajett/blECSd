# Key Parser

Parses ANSI escape sequences into structured key events with strict typing. Handles regular characters, control characters, function keys, navigation keys, and modifier combinations.

## Quick Start

```typescript
import {
  parseKeySequence,
  parseKeyBuffer,
  isMouseSequence,
} from 'blecsd';

// Parse a single key sequence
const event = parseKeySequence(Buffer.from([0x1b, 0x5b, 0x41]));
if (event) {
  console.log(event.name); // 'up'
  console.log(event.ctrl); // false
}

// Parse Ctrl+C
const ctrlC = parseKeySequence(Buffer.from([0x03]));
console.log(ctrlC?.name); // 'c'
console.log(ctrlC?.ctrl); // true

// Parse multiple key sequences from one buffer
const events = parseKeyBuffer(Buffer.from('abc'));
console.log(events.length); // 3
```

## Types

### KeyName

All recognized key names, including letters (a-z), digits (0-9), function keys (f1-f12), navigation keys (up, down, left, right, home, end, pageup, pagedown, insert, delete, clear), special keys (return, enter, tab, backspace, escape, space), and punctuation/symbols.

```typescript
type KeyName =
  | 'a' | 'b' | 'c' | /* ... */ | 'z'
  | '0' | '1' | /* ... */ | '9'
  | 'f1' | 'f2' | /* ... */ | 'f12'
  | 'up' | 'down' | 'left' | 'right'
  | 'home' | 'end' | 'pageup' | 'pagedown'
  | 'insert' | 'delete' | 'clear'
  | 'return' | 'enter' | 'tab' | 'backspace' | 'escape' | 'space'
  | '!' | '@' | '#' | /* ... punctuation ... */
  | 'undefined';
```

### KeyEvent

Parsed keyboard event with modifiers.

```typescript
interface KeyEvent {
  readonly sequence: string;     // Raw sequence string
  readonly name: KeyName;        // Normalized key name
  readonly ctrl: boolean;        // Ctrl modifier
  readonly meta: boolean;        // Alt/Meta modifier
  readonly shift: boolean;       // Shift modifier
  readonly code?: string;        // Terminal-specific escape code
  readonly raw: Uint8Array;      // Raw buffer data
}
```

## Functions

### parseKeySequence

Parses a key sequence from a buffer. Handles regular characters, control characters (Ctrl+A through Ctrl+Z), function keys (F1-F12), navigation keys, modifier combinations, and special keys.

```typescript
function parseKeySequence(buffer: Uint8Array): KeyEvent | null
```

```typescript
import { parseKeySequence } from 'blecsd';

// Parse Ctrl+C
const ctrlC = parseKeySequence(Buffer.from([0x03]));
console.log(ctrlC?.name); // 'c'
console.log(ctrlC?.ctrl); // true

// Parse Up arrow
const up = parseKeySequence(Buffer.from([0x1b, 0x5b, 0x41]));
console.log(up?.name); // 'up'

// Parse F1
const f1 = parseKeySequence(Buffer.from([0x1b, 0x4f, 0x50]));
console.log(f1?.name); // 'f1'
```

### parseKeyBuffer

Parses multiple key sequences from a buffer. Handles cases where multiple keypresses arrive in a single read.

```typescript
function parseKeyBuffer(buffer: Uint8Array): readonly KeyEvent[]
```

```typescript
import { parseKeyBuffer } from 'blecsd';

const events = parseKeyBuffer(Buffer.from('abc'));
console.log(events.length); // 3
console.log(events[0].name); // 'a'
console.log(events[1].name); // 'b'
console.log(events[2].name); // 'c'
```

### isMouseSequence

Checks if a buffer starts with a mouse sequence. Mouse sequences are handled separately by the mouse parser.

```typescript
function isMouseSequence(buffer: Uint8Array): boolean
```

## Supported Escape Sequences

The parser recognizes sequences from multiple terminal types:

| Sequence Type | Example | Key Name |
|--------------|---------|----------|
| xterm ESC O | ESC O P | f1 |
| xterm ESC [ | ESC [ A | up |
| xterm ESC [ ~ | ESC [ 15~ | f5 |
| Cygwin ESC [[ | ESC [[ A | f1 |
| rxvt shift | ESC [ a | up (shift) |
| rxvt ctrl | ESC O a | up (ctrl) |
| Meta+key | ESC a | a (meta) |
| Control | 0x01-0x1a | Ctrl+a through Ctrl+z |

### Modifier Encoding

Modifier values follow the standard encoding: `1 + (shift * 1) + (alt * 2) + (ctrl * 4)`. For example, Ctrl+Shift+Up sends `ESC[1;6A`.

## Zod Schema

```typescript
import { KeyEventSchema } from 'blecsd';

const result = KeyEventSchema.safeParse(event);
if (result.success) {
  console.log('Valid key event');
}
```

## See Also

- [Mouse Parser](./mouse-parser.md) - Mouse event parsing
- [Kitty Protocol](./kitty-protocol.md) - Modern keyboard protocol with key release events
- [Bracketed Paste](./bracketed-paste.md) - Distinguishing pasted text from typed input
