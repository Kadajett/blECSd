# Tmux Pass-Through

The `tmux` namespace provides utilities for wrapping escape sequences in tmux pass-through format. This allows escape sequences to reach the underlying terminal when running inside a tmux session.

## Overview

When running inside tmux, some escape sequences are intercepted and handled by tmux rather than being passed to the underlying terminal. To send sequences directly to the terminal, they must be wrapped in tmux's DCS (Device Control String) pass-through format:

```
DCS tmux; <sequence with doubled ESCs> ST
```

Where:
- `DCS` = `ESC P` (`\x1bP`)
- `ST` = `ESC \` (`\x1b\\`)
- All `ESC` characters in the sequence must be doubled

## Functions

### tmux.wrap

Wraps an escape sequence for tmux pass-through.

```typescript
function wrap(sequence: string): string
```

**Parameters:**
- `sequence` - The escape sequence(s) to wrap

**Returns:** The wrapped sequence for tmux pass-through

**Example:**
```typescript
import { tmux, title } from 'blecsd/terminal';

// Wrap a title sequence for tmux pass-through
const titleSeq = title.set('My App');
const wrapped = tmux.wrap(titleSeq);

// Write to terminal
process.stdout.write(wrapped);
```

### tmux.unwrap

Extracts the original sequence from a tmux pass-through wrapper.

```typescript
function unwrap(wrapped: string): string | null
```

**Parameters:**
- `wrapped` - The wrapped sequence

**Returns:** The original sequence, or `null` if not a valid tmux pass-through

**Example:**
```typescript
import { tmux } from 'blecsd/terminal';

const wrapped = '\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\';
const original = tmux.unwrap(wrapped);
// original = '\x1b]0;Title\x07'
```

### tmux.isWrapped

Checks if a sequence is already wrapped for tmux pass-through.

```typescript
function isWrapped(sequence: string): boolean
```

**Example:**
```typescript
import { tmux } from 'blecsd/terminal';

if (tmux.isWrapped(sequence)) {
  // Already wrapped, use as-is
  process.stdout.write(sequence);
} else {
  // Needs wrapping
  process.stdout.write(tmux.wrap(sequence));
}
```

### tmux.wrapIf

Conditionally wraps a sequence for tmux only if needed.

```typescript
function wrapIf(sequence: string, inTmux: boolean): string
```

**Parameters:**
- `sequence` - The escape sequence(s) to potentially wrap
- `inTmux` - Whether currently running inside tmux

**Returns:** The sequence, wrapped if in tmux and not already wrapped

**Example:**
```typescript
import { tmux, title, isTmux } from 'blecsd/terminal';

// Automatically handle tmux detection
const seq = tmux.wrapIf(title.set('App'), isTmux());
process.stdout.write(seq);
```

### tmux.begin / tmux.end

Returns the DCS prefix and ST suffix for manual pass-through mode.

```typescript
function begin(): string  // Returns '\x1bPtmux;'
function end(): string    // Returns '\x1b\\'
```

**Example:**
```typescript
import { tmux } from 'blecsd/terminal';

// Manual pass-through mode (for streaming)
process.stdout.write(tmux.begin());

// Write content with doubled ESCs
const content = mySequence.replace(/\x1b/g, '\x1b\x1b');
process.stdout.write(content);

process.stdout.write(tmux.end());
```

## Constants

### tmux.PT_START

The DCS introducer for tmux pass-through.

```typescript
const PT_START = '\x1bPtmux;'
```

## Usage Patterns

### Basic Usage

```typescript
import { tmux, title, cursor, isTmux } from 'blecsd/terminal';

// Check if running in tmux
const inTmux = isTmux();

// Build the sequence
const seq = cursor.hide() + title.set('My App');

// Wrap if necessary
const output = inTmux ? tmux.wrap(seq) : seq;

process.stdout.write(output);
```

### With wrapIf Helper

```typescript
import { tmux, title, isTmux } from 'blecsd/terminal';

// Simpler approach using wrapIf
const seq = tmux.wrapIf(title.set('My App'), isTmux());
process.stdout.write(seq);
```

### Combining Multiple Sequences

```typescript
import { tmux, title, cursor, screen, isTmux } from 'blecsd/terminal';

// Combine all sequences first, then wrap once
const sequences = [
  cursor.hide(),
  screen.alternateBuffer.enter(),
  title.set('My App'),
].join('');

const output = tmux.wrapIf(sequences, isTmux());
process.stdout.write(output);
```

### Round-Trip Verification

```typescript
import { tmux } from 'blecsd/terminal';

const original = '\x1b[1m\x1b[31mHello\x1b[0m';
const wrapped = tmux.wrap(original);
const unwrapped = tmux.unwrap(wrapped);

console.assert(unwrapped === original, 'Round-trip failed');
```

## When to Use Tmux Pass-Through

Use tmux pass-through for sequences that:

1. **Set window/icon title** - OSC 0, 1, 2 sequences
2. **Access clipboard** - OSC 52 sequences
3. **Query terminal capabilities** - DA, DSR queries
4. **Use terminal-specific features** - Sixel graphics, iTerm2 inline images, etc.

**Note:** Most CSI sequences (cursor movement, colors, etc.) work fine without pass-through in modern tmux versions.

## Detection

Use `isTmux()` from the detection module to check if running inside tmux:

```typescript
import { isTmux } from 'blecsd/terminal';

if (isTmux()) {
  console.log('Running inside tmux');
}
```

This checks the `TMUX` environment variable.
