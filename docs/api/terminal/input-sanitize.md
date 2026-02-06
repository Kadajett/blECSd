# Input Sanitize

Sanitizes user-provided or network-received text by stripping C0/C1 control characters, null bytes, invalid UTF-8 sequences, and enforcing length limits. Designed for networked games and applications with user-generated content.

## Quick Start

```typescript
import {
  sanitizeTextInput,
  sanitizeTextInputDetailed,
  stripNullBytes,
  stripControlChars,
  isValidUtf8String,
  hasControlChars,
} from 'blecsd';

// Basic sanitization
const safe = sanitizeTextInput(userInput);

// With length limit and no Unicode
const limited = sanitizeTextInput(userInput, {
  maxLength: 100,
  allowUnicode: false,
});

// Detailed result with metadata
const result = sanitizeTextInputDetailed(networkMessage, { maxLength: 256 });
if (result.modified) {
  console.warn(`Input sanitized: ${result.strippedCount} chars removed`);
}
```

## Types

### InputSanitizeOptions

```typescript
interface InputSanitizeOptions {
  readonly allowUnicode: boolean;       // Allow non-ASCII Unicode (default: true)
  readonly maxLength: number;           // Max string length (default: 0 = no limit)
  readonly stripControl: boolean;       // Remove C0/C1 control chars (default: true)
  readonly stripNull: boolean;          // Remove null bytes (default: true)
  readonly allowTab: boolean;           // Allow tab even when stripping controls (default: true)
  readonly allowNewline: boolean;       // Allow LF/CR even when stripping controls (default: true)
  readonly replacementChar: string;     // Replacement for invalid sequences (default: '\uFFFD')
}
```

### SanitizeResult

```typescript
interface SanitizeResult {
  readonly text: string;
  readonly modified: boolean;
  readonly strippedCount: number;
  readonly truncated: boolean;
  readonly originalLength: number;
}
```

### DEFAULT_INPUT_SANITIZE_OPTIONS

```typescript
const DEFAULT_INPUT_SANITIZE_OPTIONS: InputSanitizeOptions = {
  allowUnicode: true,
  maxLength: 0,
  stripControl: true,
  stripNull: true,
  allowTab: true,
  allowNewline: true,
  replacementChar: '\uFFFD',
};
```

## Functions

### sanitizeTextInput

Sanitizes untrusted text input by removing control characters, null bytes, and invalid sequences.

```typescript
function sanitizeTextInput(input: string, options?: Partial<InputSanitizeOptions>): string
```

```typescript
import { sanitizeTextInput } from 'blecsd';

const safe = sanitizeTextInput(userInput);

const limited = sanitizeTextInput(userInput, {
  maxLength: 100,
  allowUnicode: false,
});
```

### sanitizeTextInputDetailed

Sanitizes text input and returns detailed metadata about changes.

```typescript
function sanitizeTextInputDetailed(
  input: string,
  options?: Partial<InputSanitizeOptions>,
): SanitizeResult
```

```typescript
import { sanitizeTextInputDetailed } from 'blecsd';

const result = sanitizeTextInputDetailed(networkMessage, { maxLength: 256 });
if (result.modified) {
  console.warn(`Input sanitized: ${result.strippedCount} chars removed`);
}
```

### stripNullBytes

Strips all null bytes (0x00) from a string.

```typescript
function stripNullBytes(input: string): string
```

```typescript
import { stripNullBytes } from 'blecsd';

stripNullBytes('hello\x00world'); // 'helloworld'
```

### stripControlChars

Strips C0 control characters (0x01-0x1F), optionally preserving tab and newline.

```typescript
function stripControlChars(input: string, allowTab?: boolean, allowNewline?: boolean): string
```

```typescript
import { stripControlChars } from 'blecsd';

stripControlChars('hello\x07world', true, true); // 'helloworld'
```

### stripC1Controls

Strips C1 control characters (0x80-0x9F) from a string.

```typescript
function stripC1Controls(input: string): string
```

```typescript
import { stripC1Controls } from 'blecsd';

stripC1Controls('hello\x85world'); // 'helloworld'
```

### replaceInvalidUtf16

Replaces lone surrogates (invalid UTF-16) with the replacement character.

```typescript
function replaceInvalidUtf16(input: string, replacement?: string): string
```

### restrictToAscii

Restricts a string to printable ASCII characters (0x20-0x7E) plus tab, newline, and carriage return.

```typescript
function restrictToAscii(input: string, replacement?: string): string
```

```typescript
import { restrictToAscii } from 'blecsd';

restrictToAscii('cafe\u0301'); // 'caf\uFFFD'
```

### isValidUtf8String

Validates that a string contains only valid UTF-8 compatible content.

```typescript
function isValidUtf8String(input: string): boolean
```

```typescript
import { isValidUtf8String } from 'blecsd';

isValidUtf8String('hello');       // true
isValidUtf8String('hello\uD800'); // false (lone surrogate)
```

### hasControlChars

Checks if a string contains any control characters (C0 or C1).

```typescript
function hasControlChars(input: string): boolean
```

### hasNullBytes

Checks if a string contains null bytes.

```typescript
function hasNullBytes(input: string): boolean
```

## Zod Schema

```typescript
import { InputSanitizeOptionsSchema } from 'blecsd';

const result = InputSanitizeOptionsSchema.safeParse({
  maxLength: 256,
  allowUnicode: true,
});
```

## See Also

- [Bracketed Paste](./bracketed-paste.md) - Paste event sanitization
