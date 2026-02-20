# Clipboard Manager

Efficient, async clipboard operations that never block the UI. Supports large text selections (1MB+) with progress tracking and streaming paste for huge content. Uses the OSC 52 protocol for system clipboard access.

## Quick Start

```typescript
import { createClipboardManager, chunkText, streamPaste } from 'blecsd/terminal';

const cm = createClipboardManager();
const largeText = 'A'.repeat(1000);

// Copy small text (instant)
await cm.copy('Hello World');

// Copy large text with progress tracking
await cm.copy(largeText, (progress) => {
  console.log(`${progress.percentage}% complete`);
});

// Read internal buffer
console.log(cm.getBuffer());

// Clean up
cm.cancel();
```

## Types

### ClipboardProgress

```typescript
interface ClipboardProgress {
  readonly processed: number;
  readonly total: number;
  readonly percentage: number;    // 0-100
  readonly complete: boolean;
}
```

### ClipboardResult

```typescript
interface ClipboardResult {
  readonly success: boolean;
  readonly error?: string;
  readonly bytesProcessed: number;
  readonly elapsedMs: number;
}
```

### ClipboardManagerConfig

```typescript
interface ClipboardManagerConfig {
  readonly chunkSize: number;   // Chunk size for large ops (default: 64KB)
  readonly maxSize: number;     // Max clipboard size (default: 10MB)
  readonly useOSC52: boolean;   // Use OSC 52 for system clipboard (default: true)
}
```

### ClipboardManager

```typescript
interface ClipboardManager {
  copy(text: string, onProgress?: (progress: ClipboardProgress) => void): Promise<ClipboardResult>;
  writeToTerminal(text: string): ClipboardResult;
  requestRead(): void;
  clear(): void;
  getBuffer(): string;
  cancel(): void;
}
```

## Functions

### createClipboardManager

Creates a clipboard manager for efficient copy/paste operations.

```typescript
function createClipboardManager(config?: Partial<ClipboardManagerConfig>): ClipboardManager
```

```typescript
import { createClipboardManager } from 'blecsd/terminal';

const cm = createClipboardManager({ chunkSize: 32 * 1024, maxSize: 5 * 1024 * 1024 });
const largeText = 'A'.repeat(1000);

// Copy with progress
await cm.copy(largeText, (progress) => {
  console.log('copy progress:', progress.percentage, '%');
});
```

The manager's methods:

| Method | Description |
|--------|-------------|
| `copy(text, onProgress?)` | Async copy, chunks large text with progress |
| `writeToTerminal(text)` | Sync write via OSC 52 |
| `requestRead()` | Request clipboard read from terminal |
| `clear()` | Clear clipboard |
| `getBuffer()` | Get internal buffer content |
| `cancel()` | Cancel any ongoing operation |

### chunkText

Splits text into chunks for streaming paste.

```typescript
function chunkText(text: string, chunkSize: number): readonly string[]
```

```typescript
import { chunkText } from 'blecsd/terminal';

const largeText = 'A'.repeat(1000);
const chunks = chunkText(largeText, 64 * 1024);
for (const chunk of chunks) {
  console.log('chunk length:', chunk.length);
}
```

### streamPaste

Streams text content in chunks, yielding to the event loop between chunks. Useful for pasting large content without blocking the UI.

```typescript
function streamPaste(
  text: string,
  onChunk: (chunk: string, progress: ClipboardProgress) => void,
  chunkSize?: number,
): Promise<void>
```

```typescript
import { streamPaste } from 'blecsd/terminal';

const largeText = 'A'.repeat(1000);
await streamPaste(largeText, (chunk, progress) => {
  console.log('stream chunk length:', chunk.length, 'progress:', progress.percentage, '%');
});
```

## See Also

- [Bracketed Paste](./bracketed-paste.md) - Paste event detection and parsing
