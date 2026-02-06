# Bracketed Paste

Distinguishes pasted text from typed input by detecting ESC[200~ / ESC[201~ markers that terminals send when bracketed paste mode is enabled. Provides paste event parsing, sanitization, and a stateful paste buffer for multi-chunk paste operations.

## Quick Start

```typescript
import {
  createPasteState,
  processPasteBuffer,
  enableBracketedPaste,
  disableBracketedPaste,
  sanitizePastedText,
  extractPasteContent,
  isPasteStart,
} from 'blecsd';

// Enable bracketed paste mode in the terminal
process.stdout.write(enableBracketedPaste());

// Create paste state machine
let state = createPasteState({ sanitize: true, maxLength: 1024 });

// Process incoming data through the paste state machine
const result = processPasteBuffer(state, inputBuffer);
state = result.state;

if (result.event) {
  console.log('Pasted:', result.event.text);
}

// Disable when done
process.stdout.write(disableBracketedPaste());
```

## Types

### PasteEvent

A paste event detected from bracketed paste mode markers.

```typescript
interface PasteEvent {
  readonly type: 'paste';
  readonly text: string;
  readonly timestamp: number;
  readonly sanitized: boolean;
  readonly originalLength: number;
}
```

### PasteConfig

Configuration for paste handling.

```typescript
interface PasteConfig {
  readonly sanitize: boolean;   // Strip escape sequences (default: true)
  readonly maxLength: number;   // Max paste length in bytes (default: 1MB, 0 = unlimited)
  readonly enabled: boolean;    // Whether bracketed paste mode is enabled (default: true)
}
```

### PasteParseResult

Result of parsing a buffer for paste sequences.

```typescript
interface PasteParseResult {
  readonly pasteStarted: boolean;
  readonly pasteEnded: boolean;
  readonly text: string | null;
  readonly consumed: number;
}
```

### PasteState

State for tracking an ongoing paste operation.

```typescript
interface PasteState {
  readonly isPasting: boolean;
  readonly buffer: string;
  readonly config: PasteConfig;
}
```

### PasteProcessResult

Result of processing a buffer chunk through the paste state machine.

```typescript
interface PasteProcessResult {
  readonly state: PasteState;
  readonly event: PasteEvent | null;
  readonly consumed: number;
  readonly remaining: Uint8Array;
}
```

### PasteHandler

```typescript
type PasteHandler = (event: PasteEvent) => void;
```

## Functions

### sanitizePastedText

Strips ANSI escape sequences from pasted text, preventing escape sequence injection.

```typescript
function sanitizePastedText(text: string): string
```

```typescript
import { sanitizePastedText } from 'blecsd';

const clean = sanitizePastedText('Hello\x1b[31mRed\x1b[0m World');
// 'HelloRed World'
```

### truncatePaste

Truncates text to the maximum allowed paste length.

```typescript
function truncatePaste(text: string, maxLength: number): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Text to truncate |
| `maxLength` | `number` | Maximum length (0 = no limit) |

### isPasteStart

Checks if a buffer starts with the paste start marker (ESC[200~).

```typescript
function isPasteStart(buffer: Uint8Array): boolean
```

```typescript
import { isPasteStart } from 'blecsd';

const buf = Buffer.from('\x1b[200~Hello\x1b[201~');
console.log(isPasteStart(buf)); // true
```

### mightBePasteStart

Checks if a buffer might be the beginning of a paste start marker. Used for incomplete sequence detection.

```typescript
function mightBePasteStart(buffer: Uint8Array): boolean
```

### findPasteEnd

Finds the paste end marker in a buffer.

```typescript
function findPasteEnd(buffer: Uint8Array): number
```

**Returns:** Index of the end marker, or -1 if not found.

### extractPasteContent

Extracts pasted text from a buffer containing paste markers. Returns the text between ESC[200~ and ESC[201~.

```typescript
function extractPasteContent(
  buffer: Uint8Array,
  config?: Partial<PasteConfig>,
): PasteParseResult
```

```typescript
import { extractPasteContent } from 'blecsd';

const buf = Buffer.from('\x1b[200~Hello World\x1b[201~');
const result = extractPasteContent(buf);
// { pasteStarted: true, pasteEnded: true, text: 'Hello World', consumed: 24 }
```

### createPasteState

Creates initial paste state for the multi-chunk state machine.

```typescript
function createPasteState(config?: Partial<PasteConfig>): PasteState
```

```typescript
import { createPasteState } from 'blecsd';

const state = createPasteState({ sanitize: true, maxLength: 1024 });
```

### processPasteBuffer

Processes a buffer chunk through the paste state machine. Handles multi-chunk paste content, accumulating until the end marker arrives.

```typescript
function processPasteBuffer(state: PasteState, buffer: Uint8Array): PasteProcessResult
```

```typescript
import { createPasteState, processPasteBuffer } from 'blecsd';

let state = createPasteState();

// First chunk: paste start + partial content
const result1 = processPasteBuffer(state, Buffer.from('\x1b[200~Hello'));
state = result1.state;
// state.isPasting === true, no event yet

// Second chunk: rest of content + paste end
const result2 = processPasteBuffer(state, Buffer.from(' World\x1b[201~'));
state = result2.state;
// result2.event.text === 'Hello World'
```

### enableBracketedPaste

Returns the escape sequence to enable bracketed paste mode.

```typescript
function enableBracketedPaste(): string
```

```typescript
import { enableBracketedPaste } from 'blecsd';

process.stdout.write(enableBracketedPaste());
```

### disableBracketedPaste

Returns the escape sequence to disable bracketed paste mode.

```typescript
function disableBracketedPaste(): string
```

## Zod Schemas

### PasteEventSchema / PasteConfigSchema

```typescript
import { PasteEventSchema, PasteConfigSchema } from 'blecsd';

const result = PasteEventSchema.safeParse(event);
if (result.success) {
  console.log('Valid paste event');
}
```

## See Also

- [Input Sanitize](./input-sanitize.md) - Sanitizing untrusted text input
- [Key Parser](./key-parser.md) - Keyboard event parsing
