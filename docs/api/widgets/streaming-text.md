# Streaming Text Widget

Efficiently renders text that streams in character-by-character or chunk-by-chunk. Designed for real-time output like terminal logs, LLM responses, or any content that arrives incrementally.

## Overview

```typescript
import { createStreamingText, addEntity, createWorld } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const stream = createStreamingText(world, eid, {
  wrapWidth: 80,
  maxLines: 5000,
  autoScroll: true,
});

// Stream content incrementally
stream.startStream();
stream.append('Loading');
stream.append('...');
stream.appendLine(' done!');
stream.endStream();
```

---

## Configuration

### StreamingTextConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxLines` | `number` | `10000` | Maximum lines to retain (0 = unlimited) |
| `wrapWidth` | `number` | `80` | Width for line wrapping in columns |
| `autoScroll` | `boolean` | `true` | Auto-scroll to bottom on new content |
| `stripAnsi` | `boolean` | `false` | Strip ANSI escape sequences |

### Zod Schema

```typescript
import { StreamingTextConfigSchema } from 'blecsd';

const config = StreamingTextConfigSchema.parse({
  maxLines: 5000,
  wrapWidth: 120,
  autoScroll: true,
});
```

---

## Factory Function

### createStreamingText

Creates a streaming text widget attached to an existing entity.

```typescript
import { createStreamingText, addEntity } from 'blecsd';

const eid = addEntity(world);
const stream = createStreamingText(world, eid, {
  wrapWidth: 80,
  maxLines: 5000,
  autoScroll: true,
});
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to attach to
- `config?: Partial<StreamingTextConfig>` - Optional configuration

**Returns:** `StreamingTextWidget`

---

## StreamingTextWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### append

```typescript
append(text: string): StreamingTextWidget
```

Appends text to the buffer. Handles partial lines (text without a trailing newline is buffered until a newline arrives). Automatically wraps lines and evicts old content if `maxLines` is exceeded.

```typescript
stream.append('Hello ');
stream.append('world\n');
// Buffer now contains: "Hello world"
```

### appendLine

```typescript
appendLine(text: string): StreamingTextWidget
```

Appends a complete line (adds newline automatically).

```typescript
stream.appendLine('This is a full line');
```

### clear

```typescript
clear(): StreamingTextWidget
```

Clears all content from the buffer.

### getState

```typescript
getState(): StreamingTextState
```

Returns the full internal state, including lines, scroll position, and configuration.

### getVisibleLines

```typescript
getVisibleLines(): readonly string[]
```

Returns only the lines visible in the current viewport (based on scrollTop and viewportHeight).

### getProgress

```typescript
getProgress(): StreamProgress
```

Returns streaming progress information.

```typescript
const progress = stream.getProgress();
console.log(progress.totalBytes);      // Total bytes received
console.log(progress.totalLines);      // Total lines in buffer
console.log(progress.visibleLines);    // Lines in viewport
console.log(progress.isAutoScrolling); // Auto-scroll enabled
console.log(progress.isStreaming);     // Stream currently active
```

### consumeDirty

```typescript
consumeDirty(): StreamDirtyRegion | null
```

Gets and clears the dirty region. Returns information about what changed since the last call, allowing incremental re-renders.

```typescript
const dirty = stream.consumeDirty();
if (dirty) {
  if (dirty.fullRedraw) {
    // Re-render everything
  } else {
    // Only re-render from dirty.startLine for dirty.lineCount lines
  }
}
```

### scrollTo / scrollBy / scrollToBottom / scrollToTop

```typescript
scrollTo(line: number): StreamingTextWidget
scrollBy(delta: number): StreamingTextWidget
scrollToBottom(): StreamingTextWidget
scrollToTop(): StreamingTextWidget
```

Scroll control. `scrollBy` takes positive values to scroll down and negative to scroll up.

### setViewportHeight

```typescript
setViewportHeight(height: number): StreamingTextWidget
```

Sets the viewport height in lines.

### setWrapWidth

```typescript
setWrapWidth(width: number): StreamingTextWidget
```

Changes the wrap width. Re-wraps all existing content with the new width.

### setAutoScroll

```typescript
setAutoScroll(enabled: boolean): StreamingTextWidget
```

Enables or disables auto-scrolling on new content.

### startStream / endStream

```typescript
startStream(): StreamingTextWidget
endStream(): StreamingTextWidget
```

Marks the beginning and end of a streaming session. `endStream` flushes any remaining partial line in the buffer.

---

## Pure State Functions

These functions operate on `StreamingTextState` objects and can be used independently of the widget.

### createStreamingState

```typescript
import { createStreamingState } from 'blecsd';

const state = createStreamingState({ wrapWidth: 120 }, 24);
```

**Parameters:**
- `config?: Partial<StreamingTextConfig>` - Configuration
- `viewportHeight?: number` - Initial viewport height (default: 24)

**Returns:** `StreamingTextState`

### appendToState

```typescript
import { appendToState } from 'blecsd';

let state = createStreamingState();
state = appendToState(state, 'Hello world\n');
```

Appends text to a state object, handling wrapping, eviction, and auto-scroll.

### clearState

```typescript
import { clearState } from 'blecsd';

state = clearState(state);
```

### getStreamVisibleLines

```typescript
import { getStreamVisibleLines } from 'blecsd';

const visible = getStreamVisibleLines(state);
```

### scrollToLine / scrollByLines

```typescript
import { scrollToLine, scrollByLines } from 'blecsd';

state = scrollToLine(state, 100);
state = scrollByLines(state, -5);
```

---

## Helper Functions

### wrapLine

```typescript
import { wrapLine } from 'blecsd';

const lines = wrapLine('Hello World, this is a long line', 10);
// ['Hello Worl', 'd, this is', ' a long li', 'ne']
```

### stripAnsiSequences

```typescript
import { stripAnsiSequences } from 'blecsd';

const clean = stripAnsiSequences('\x1b[31mRed text\x1b[0m');
// 'Red text'
```

---

## Types

### StreamingTextState

```typescript
interface StreamingTextState {
  readonly lines: readonly string[];
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly totalBytes: number;
  readonly isStreaming: boolean;
  readonly config: StreamingTextConfig;
  readonly partialLine: string;
  readonly dirty: StreamDirtyRegion | null;
}
```

### StreamProgress

```typescript
interface StreamProgress {
  readonly totalBytes: number;
  readonly totalLines: number;
  readonly visibleLines: number;
  readonly isAutoScrolling: boolean;
  readonly isStreaming: boolean;
}
```

### StreamDirtyRegion

```typescript
interface StreamDirtyRegion {
  readonly startLine: number;
  readonly lineCount: number;
  readonly fullRedraw: boolean;
}
```

---

## Examples

### Streaming from an Async Source

```typescript
import { createStreamingText, addEntity, createWorld } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const stream = createStreamingText(world, eid, {
  wrapWidth: 80,
  maxLines: 10000,
  autoScroll: true,
});

stream.startStream();
for await (const chunk of asyncSource) {
  stream.append(chunk);
}
stream.endStream();
```

### Manual Scroll with Progress

```typescript
const stream = createStreamingText(world, eid, {
  autoScroll: false,
});

// User scrolls manually
stream.scrollBy(10);

const progress = stream.getProgress();
console.log(`${progress.totalLines} total lines`);
```

### Incremental Rendering

```typescript
function renderFrame() {
  const dirty = stream.consumeDirty();
  if (!dirty) return; // Nothing changed

  if (dirty.fullRedraw) {
    renderAllLines(stream.getVisibleLines());
  } else {
    renderPartialUpdate(dirty.startLine, dirty.lineCount);
  }
}
```

---

## See Also

- [Log Widget](./log.md) - Append-only log with timestamps
- [Content Manipulation](./content-manipulation.md) - Line-level content editing
