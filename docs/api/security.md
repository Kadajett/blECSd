# Security - Escape Sequence Sanitization

The security module provides utilities for sanitizing terminal escape sequences from untrusted input. This is essential for preventing escape sequence injection attacks when displaying user-provided content.

## Overview

When displaying user input in terminal applications, malicious escape sequences can:
- Change the window title
- Access the clipboard
- Clear the screen
- Reposition the cursor to overwrite content
- Execute terminal-specific commands

The sanitization utilities help prevent these attacks by stripping or filtering dangerous sequences.

## Functions

### sanitizeForTerminal

Sanitizes a string for safe terminal output by removing or filtering escape sequences.

```typescript
function sanitizeForTerminal(input: string, options?: SanitizeOptions): string
```

**Parameters:**
- `input` - Untrusted input string to sanitize
- `options` - Optional sanitization options

**Returns:** Sanitized string safe for terminal output

**Example:**
```typescript
import { sanitizeForTerminal } from 'blecsd/terminal';

// Strip all escape sequences (safest, default)
const safe = sanitizeForTerminal(userInput);

// Allow color codes only
const colored = sanitizeForTerminal(userInput, {
  stripAllEscapes: false,
  allowColors: true,
});

// Allow both colors and cursor movement
const interactive = sanitizeForTerminal(userInput, {
  stripAllEscapes: false,
  allowColors: true,
  allowCursor: true,
});

// Replace stripped sequences with a placeholder
const marked = sanitizeForTerminal(userInput, {
  replacementChar: '?',
});
```

### containsEscapeSequences

Checks if a string contains any escape sequences or dangerous control characters.

```typescript
function containsEscapeSequences(input: string): boolean
```

**Example:**
```typescript
import { containsEscapeSequences } from 'blecsd/terminal';

if (containsEscapeSequences(userInput)) {
  console.warn('Input contains potentially dangerous escape sequences');
}
```

### isSafeForTerminal

Checks if a string is safe for terminal output (no escape sequences).

```typescript
function isSafeForTerminal(input: string): boolean
```

**Example:**
```typescript
import { isSafeForTerminal } from 'blecsd/terminal';

if (isSafeForTerminal(userInput)) {
  process.stdout.write(userInput);
} else {
  process.stdout.write(sanitizeForTerminal(userInput));
}
```

### extractEscapeSequences

Extracts all escape sequences from a string for analysis or logging.

```typescript
function extractEscapeSequences(input: string): string[]
```

**Example:**
```typescript
import { extractEscapeSequences } from 'blecsd/terminal';

const sequences = extractEscapeSequences(suspiciousInput);
console.log('Found sequences:', sequences.length);
// Log for security audit
sequences.forEach(seq => console.log('Sequence:', JSON.stringify(seq)));
```

### categorizeEscapeSequences

Categorizes escape sequences by type for detailed analysis.

```typescript
function categorizeEscapeSequences(input: string): {
  csi: string[];   // Control Sequence Introducer
  osc: string[];   // Operating System Command
  dcs: string[];   // Device Control String
  apc: string[];   // Application Program Command
  sos: string[];   // Start of String
  pm: string[];    // Privacy Message
  other: string[];
}
```

**Example:**
```typescript
import { categorizeEscapeSequences } from 'blecsd/terminal';

const categories = categorizeEscapeSequences(input);

if (categories.osc.length > 0) {
  console.warn('Input contains OSC sequences (title/clipboard access)');
}
if (categories.dcs.length > 0) {
  console.warn('Input contains DCS sequences (device control)');
}
```

## Classes

### SafeStringBuilder

A builder class for combining trusted and untrusted content safely.

```typescript
class SafeStringBuilder {
  constructor(defaultOptions?: SanitizeOptions)
  append(trusted: string): this
  appendUntrusted(untrusted: string, options?: SanitizeOptions): this
  clear(): this
  toString(): string
  get length(): number
}
```

**Example:**
```typescript
import { SafeStringBuilder } from 'blecsd/terminal';

const builder = new SafeStringBuilder();
const output = builder
  .append('\x1b[1m')           // Trusted: bold on
  .appendUntrusted(userName)   // Sanitized user input
  .append('\x1b[0m')           // Trusted: reset
  .append(': ')
  .appendUntrusted(message)    // Sanitized message
  .toString();

process.stdout.write(output);
```

**With custom default options:**
```typescript
// Allow colors in all untrusted content by default
const builder = new SafeStringBuilder({
  stripAllEscapes: false,
  allowColors: true,
});

builder
  .appendUntrusted(coloredInput)  // Colors preserved
  .appendUntrusted(otherInput, { stripAllEscapes: true });  // Override for this one
```

## Types

### SanitizeOptions

Options for controlling sanitization behavior.

```typescript
interface SanitizeOptions {
  /** Allow SGR (color/style) escape sequences. Default: false */
  allowColors?: boolean;

  /** Allow cursor movement sequences. Default: false */
  allowCursor?: boolean;

  /** Strip ALL escape sequences regardless of other options. Default: true */
  stripAllEscapes?: boolean;

  /** Replace stripped sequences with this character. Default: '' */
  replacementChar?: string;
}
```

## Constants

### DEFAULT_SANITIZE_OPTIONS

The default sanitization options (most restrictive).

```typescript
const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeOptions> = {
  allowColors: false,
  allowCursor: false,
  stripAllEscapes: true,
  replacementChar: '',
};
```

## Security Considerations

### Dangerous Sequence Types

The following sequence types are always stripped (even when `stripAllEscapes: false`):

| Type | Code | Risk |
|------|------|------|
| OSC | `ESC ]` | Window title, clipboard access |
| DCS | `ESC P` | Device control commands |
| APC | `ESC _` | Application program commands |
| SOS | `ESC X` | Start of string |
| PM | `ESC ^` | Privacy messages |

### Safe Sequence Types (when allowed)

| Type | Code | When Allowed |
|------|------|--------------|
| SGR | `ESC [ ... m` | `allowColors: true` |
| Cursor | `ESC [ ... A/B/C/D/H/etc` | `allowCursor: true` |

### Best Practices

1. **Default to strictest sanitization** - Use default options unless you specifically need colors or cursor control.

2. **Use SafeStringBuilder** - When combining trusted and untrusted content, use the builder to ensure clear separation.

3. **Log suspicious input** - Use `extractEscapeSequences` or `categorizeEscapeSequences` to audit suspicious input.

4. **Validate before display** - Use `isSafeForTerminal` to check input before deciding how to handle it.

```typescript
// Recommended pattern
import { isSafeForTerminal, sanitizeForTerminal } from 'blecsd/terminal';

function displayUserMessage(message: string): void {
  if (isSafeForTerminal(message)) {
    // Safe to display as-is
    process.stdout.write(message);
  } else {
    // Contains escape sequences - sanitize and optionally log
    console.warn('Sanitizing user input with escape sequences');
    process.stdout.write(sanitizeForTerminal(message));
  }
}
```
