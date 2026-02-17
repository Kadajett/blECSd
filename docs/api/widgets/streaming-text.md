# Streaming Text Widget

Efficiently renders text that streams in character-by-character or chunk-by-chunk. Designed for real-time output like terminal logs, LLM responses, or any content that arrives incrementally.

## Overview

```typescript
import { createStreamingText, StreamingTextConfigSchema } from 'blecsd/widgets';
import { createStreamingState, appendToState, clearState, getStreamVisibleLines, scrollToLine, wrapLine, stripAnsiSequences } from 'blecsd/widgets';
import { addEntity, createWorld } from 'blecsd/core';

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
const config = StreamingTextConfigSchema.parse({
  maxLines: 5000,
  wrapWidth: 120,
  autoScroll: true,
});
void config;
```

---

## Factory Function

### createStreamingText

Creates a streaming text widget attached to an existing entity.

```typescript
const stEid = addEntity(world);
const stWidget = createStreamingText(world, stEid, {
  wrapWidth: 80,
  maxLines: 5000,
  autoScroll: true,
});
void stWidget;
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to attach to
- `config?: Partial<StreamingTextConfig>` - Optional configuration

**Returns:** `StreamingTextWidget`

---

## StreamingTextWidget Interface

### eid

The underlying entity ID.

```typescript
const stA = createStreamingText(world, addEntity(world));
console.log(stA.eid);
```

### append

Appends text to the buffer. Handles partial lines (text without a trailing newline is buffered until a newline arrives). Automatically wraps lines and evicts old content if `maxLines` is exceeded.

```typescript
const stB = createStreamingText(world, addEntity(world));
stB.append('Hello ');
stB.append('world\n');
// Buffer now contains: "Hello world"
```

### appendLine

Appends a complete line (adds newline automatically).

```typescript
const stC = createStreamingText(world, addEntity(world));
stC.appendLine('This is a full line');
```

### clear

Clears all content from the buffer.

```typescript
const stD = createStreamingText(world, addEntity(world));
stD.clear();
```

### getState

Returns the full internal state, including lines, scroll position, and configuration.

```typescript
const stE = createStreamingText(world, addEntity(world));
const stState = stE.getState();
void stState;
```

### getVisibleLines

Returns only the lines visible in the current viewport (based on scrollTop and viewportHeight).

```typescript
const stF = createStreamingText(world, addEntity(world));
const visible = stF.getVisibleLines();
void visible;
```

### getProgress

Returns streaming progress information.

```typescript
const stG = createStreamingText(world, addEntity(world));
const progress = stG.getProgress();
console.log(progress.totalBytes);
console.log(progress.totalLines);
console.log(progress.visibleLines);
console.log(progress.isAutoScrolling);
console.log(progress.isStreaming);
```

### consumeDirty

Gets and clears the dirty region. Returns information about what changed since the last call, allowing incremental re-renders.

```typescript
const stH = createStreamingText(world, addEntity(world));
const dirty = stH.consumeDirty();
if (dirty) {
  if (dirty.fullRedraw) {
    // Re-render everything
  } else {
    // Only re-render from dirty.startLine for dirty.lineCount lines
    void dirty.startLine; void dirty.lineCount;
  }
}
```

### scrollTo / scrollBy / scrollToBottom / scrollToTop

```typescript
const stI = createStreamingText(world, addEntity(world));
stI.scrollTo(10);
stI.scrollBy(5);
stI.scrollToBottom();
stI.scrollToTop();
```

Scroll control. `scrollBy` takes positive values to scroll down and negative to scroll up.

### setViewportHeight

```typescript
const stJ = createStreamingText(world, addEntity(world));
stJ.setViewportHeight(24);
```

Sets the viewport height in lines.

### setWrapWidth

```typescript
const stK = createStreamingText(world, addEntity(world));
stK.setWrapWidth(120);
```

Changes the wrap width. Re-wraps all existing content with the new width.

### setAutoScroll

```typescript
const stL = createStreamingText(world, addEntity(world));
stL.setAutoScroll(false);
```

Enables or disables auto-scrolling on new content.

### startStream / endStream

```typescript
const stM = createStreamingText(world, addEntity(world));
stM.startStream();
stM.appendLine('streaming...');
stM.endStream();
```

Marks the beginning and end of a streaming session. `endStream` flushes any remaining partial line in the buffer.

---

## Pure State Functions

These functions operate on `StreamingTextState` objects and can be used independently of the widget.

### createStreamingState

```typescript
const state = createStreamingState({ wrapWidth: 120 }, 24);
void state;
```

**Parameters:**
- `config?: Partial<StreamingTextConfig>` - Configuration
- `viewportHeight?: number` - Initial viewport height (default: 24)

**Returns:** `StreamingTextState`

### appendToState

```typescript
let stateA = createStreamingState();
stateA = appendToState(stateA, 'Hello world\n');
void stateA;
```

Appends text to a state object, handling wrapping, eviction, and auto-scroll.

### clearState

```typescript
let stateB = createStreamingState();
stateB = appendToState(stateB, 'some content\n');
stateB = clearState(stateB);
void stateB;
```

### getStreamVisibleLines

```typescript
const stateC = createStreamingState();
const visibleLines = getStreamVisibleLines(stateC);
void visibleLines;
```

### scrollToLine

```typescript
let stateD = createStreamingState();
stateD = appendToState(stateD, 'Line 1\nLine 2\nLine 3\n');
stateD = scrollToLine(stateD, 1);
void stateD;
```

---

## Helper Functions

### wrapLine

```typescript
const wrappedLines = wrapLine('Hello World, this is a long line', 10);
// ['Hello Worl', 'd, this is', ' a long li', 'ne']
void wrappedLines;
```

### stripAnsiSequences

```typescript
const clean = stripAnsiSequences('\x1b[31mRed text\x1b[0m');
// 'Red text'
void clean;
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
  readonly config: { maxLines: number; wrapWidth: number; autoScroll: boolean; stripAnsi: boolean };
  readonly partialLine: string;
  readonly dirty: { startLine: number; lineCount: number; fullRedraw: boolean } | null;
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

### Manual Scroll with Progress

```typescript
const streamEx = createStreamingText(world, addEntity(world), {
  autoScroll: false,
});

streamEx.startStream();
streamEx.appendLine('Line 1');
streamEx.appendLine('Line 2');
streamEx.endStream();

// User scrolls manually
streamEx.scrollBy(1);

const progress = streamEx.getProgress();
console.log(`${progress.totalLines} total lines`);
```

### Incremental Rendering

```typescript
const streamEx2 = createStreamingText(world, addEntity(world));
streamEx2.appendLine('Updated content');

function renderFrame() {
  const dirty = streamEx2.consumeDirty();
  if (!dirty) return; // Nothing changed

  if (dirty.fullRedraw) {
    const lines = streamEx2.getVisibleLines();
    void lines; // Re-render everything
  } else {
    void dirty.startLine; void dirty.lineCount;
    // Only re-render from dirty.startLine for dirty.lineCount lines
  }
}
renderFrame();
```

---

## See Also

- [Log Widget](./log.md) - Append-only log with timestamps
- [Content Manipulation](./content-manipulation.md) - Line-level content editing
