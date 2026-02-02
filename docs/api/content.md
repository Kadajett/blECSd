# Content Component

The Content component stores text content for entities, with support for text alignment, wrapping, and markup tag parsing.

## TextAlign Enum

Defines horizontal text alignment.

```typescript
import { TextAlign } from 'blecsd';

// Available alignments
TextAlign.Left   // 0 - Left-aligned text (default)
TextAlign.Center // 1 - Center-aligned text
TextAlign.Right  // 2 - Right-aligned text
```

---

## TextVAlign Enum

Defines vertical text alignment.

```typescript
import { TextVAlign } from 'blecsd';

// Available alignments
TextVAlign.Top    // 0 - Top-aligned text (default)
TextVAlign.Middle // 1 - Vertically centered text
TextVAlign.Bottom // 2 - Bottom-aligned text
```

---

## Content Component

The Content component stores content metadata using bitecs SoA (Structure of Arrays) pattern. String content is stored in a separate `ContentStore` since bitecs uses typed arrays.

```typescript
import { Content } from 'blecsd';

// Component arrays
Content.contentId  // Uint32Array - Reference to text in ContentStore
Content.length     // Uint32Array - Content length in characters
Content.hash       // Uint32Array - Content hash for change detection (djb2 algorithm)
Content.wrap       // Uint8Array  - Text wrap (0=no, 1=yes)
Content.align      // Uint8Array  - Horizontal alignment (TextAlign enum)
Content.valign     // Uint8Array  - Vertical alignment (TextVAlign enum)
Content.parseTags  // Uint8Array  - Parse markup tags (0=no, 1=yes)
```

---

## Functions

### hasContent

Checks if an entity has a Content component.

```typescript
import { createWorld, hasContent, setContent } from 'blecsd';

const world = createWorld();
const eid = 1;

hasContent(world, eid); // false

setContent(world, eid, 'Hello, World!');
hasContent(world, eid); // true
```

---

### setContent

Sets or updates text content on an entity. Adds the Content component if not already present.

```typescript
import { createWorld, setContent, TextAlign, TextVAlign } from 'blecsd';

const world = createWorld();
const eid = 1;

// Set simple text content
setContent(world, eid, 'Hello, World!');

// Set content with options
setContent(world, eid, 'Centered text', {
  align: TextAlign.Center,
  valign: TextVAlign.Middle,
  wrap: true,
  parseTags: true,
});

// Update existing content (preserves options unless specified)
setContent(world, eid, 'New text');
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `text` - The text content
- `options` - Optional configuration
  - `wrap` - Whether to wrap text at container boundaries
  - `align` - Horizontal alignment (TextAlign enum)
  - `valign` - Vertical alignment (TextVAlign enum)
  - `parseTags` - Whether to parse markup tags in content

**Returns:** The entity ID for chaining

---

### getContent

Gets the text content for an entity.

```typescript
import { createWorld, setContent, getContent } from 'blecsd';

const world = createWorld();
const eid = 1;

getContent(world, eid); // '' (no content)

setContent(world, eid, 'Hello, World!');
getContent(world, eid); // 'Hello, World!'
```

---

### setText

Sets text content, stripping any ANSI escape codes. Use this when you want to store plain text without formatting codes.

```typescript
import { createWorld, setText, getText } from 'blecsd';

const world = createWorld();
const eid = 1;

// ANSI codes are stripped
setText(world, eid, '\x1b[31mRed Text\x1b[0m');
getText(world, eid); // 'Red Text'

// Accepts same options as setContent
setText(world, eid, '\x1b[32mGreen\x1b[0m', {
  align: TextAlign.Center,
  wrap: true,
});
```

**Returns:** The entity ID for chaining

---

### getText

Gets text content with ANSI codes stripped. Use this to get plain text for display width calculations or logging.

```typescript
import { createWorld, setContent, getText } from 'blecsd';

const world = createWorld();
const eid = 1;

getText(world, eid); // '' (no content)

// Content may contain ANSI codes
setContent(world, eid, '\x1b[31mRed\x1b[0m and \x1b[32mGreen\x1b[0m');
getText(world, eid); // 'Red and Green'
```

---

### getContentData

Gets full content data for an entity.

```typescript
import { createWorld, setContent, getContentData, TextAlign, TextVAlign } from 'blecsd';

const world = createWorld();
const eid = 1;

getContentData(world, eid); // undefined (no content)

setContent(world, eid, 'Sample text', {
  align: TextAlign.Center,
  valign: TextVAlign.Top,
  wrap: true,
  parseTags: false,
});

const data = getContentData(world, eid);
// data = {
//   text: 'Sample text',
//   length: 11,
//   hash: 3847291564,  // djb2 hash for change detection
//   wrap: true,
//   align: TextAlign.Center,
//   valign: TextVAlign.Top,
//   parseTags: false
// }
```

**Returns:** `ContentData | undefined`

---

### appendContent

Appends text to an entity's existing content.

```typescript
import { createWorld, setContent, appendContent, getContent } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, 'Hello');
appendContent(world, eid, ', World!');

getContent(world, eid); // 'Hello, World!'
```

**Returns:** The entity ID for chaining

---

### clearContent

Clears the content of an entity. Removes the text but keeps the component.

```typescript
import { createWorld, setContent, clearContent, getContent, hasContent } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, 'Some text');
clearContent(world, eid);

getContent(world, eid);  // ''
hasContent(world, eid);  // true (component still exists)
```

**Returns:** The entity ID for chaining

---

### getContentLength

Gets the content length in characters.

```typescript
import { createWorld, setContent, getContentLength } from 'blecsd';

const world = createWorld();
const eid = 1;

getContentLength(world, eid); // 0 (no content)

setContent(world, eid, 'Hello');
getContentLength(world, eid); // 5
```

---

### getContentHash

Gets the content hash for change detection. Uses the djb2 algorithm.

```typescript
import { createWorld, setContent, getContentHash } from 'blecsd';

const world = createWorld();
const eid = 1;

const hash1 = getContentHash(world, eid); // 0 (no content)

setContent(world, eid, 'Hello');
const hash2 = getContentHash(world, eid); // Non-zero hash value

setContent(world, eid, 'Hello');
const hash3 = getContentHash(world, eid); // Same as hash2

setContent(world, eid, 'World');
const hash4 = getContentHash(world, eid); // Different from hash2
```

---

### setTextAlign

Sets the horizontal text alignment.

```typescript
import { createWorld, setContent, setTextAlign, TextAlign } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, 'Centered text');
setTextAlign(world, eid, TextAlign.Center);

// Returns entity ID for chaining
```

---

### setTextVAlign

Sets the vertical text alignment.

```typescript
import { createWorld, setContent, setTextVAlign, TextVAlign } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, 'Middle-aligned text');
setTextVAlign(world, eid, TextVAlign.Middle);

// Returns entity ID for chaining
```

---

### setTextWrap

Sets whether text should wrap at container boundaries.

```typescript
import { createWorld, setContent, setTextWrap } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, 'Long text that might need wrapping');
setTextWrap(world, eid, true);

// Returns entity ID for chaining
```

---

### isTextWrapped

Checks if text wrapping is enabled for an entity.

```typescript
import { createWorld, setContent, setTextWrap, isTextWrapped } from 'blecsd';

const world = createWorld();
const eid = 1;

isTextWrapped(world, eid); // false (no content)

setContent(world, eid, 'Some text');
isTextWrapped(world, eid); // false (default)

setTextWrap(world, eid, true);
isTextWrapped(world, eid); // true
```

---

### setParseTags

Sets whether to parse markup tags in content.

```typescript
import { createWorld, setContent, setParseTags } from 'blecsd';

const world = createWorld();
const eid = 1;

setContent(world, eid, '{bold}Important{/bold}');
setParseTags(world, eid, true);

// Returns entity ID for chaining
```

---

### isParsingTags

Checks if tag parsing is enabled for an entity.

```typescript
import { createWorld, setContent, setParseTags, isParsingTags } from 'blecsd';

const world = createWorld();
const eid = 1;

isParsingTags(world, eid); // false (no content)

setContent(world, eid, 'Some text');
isParsingTags(world, eid); // false (default)

setParseTags(world, eid, true);
isParsingTags(world, eid); // true
```

---

### resetContentStore

Resets the content store. Primarily used for testing.

```typescript
import { resetContentStore } from 'blecsd';

beforeEach(() => {
  resetContentStore();
});
```

---

## Types

### ContentOptions

Options for setting content.

```typescript
interface ContentOptions {
  wrap?: boolean;        // Whether to wrap text at container boundaries
  align?: TextAlign;     // Horizontal text alignment
  valign?: TextVAlign;   // Vertical text alignment
  parseTags?: boolean;   // Whether to parse markup tags
}
```

### ContentData

Data returned by getContentData.

```typescript
interface ContentData {
  readonly text: string;        // Text content
  readonly length: number;      // Content length in characters
  readonly hash: number;        // Content hash for change detection
  readonly wrap: boolean;       // Whether text wrapping is enabled
  readonly align: TextAlign;    // Horizontal alignment
  readonly valign: TextVAlign;  // Vertical alignment
  readonly parseTags: boolean;  // Whether tag parsing is enabled
}
```

---

## contentStore

The global `ContentStore` instance that manages string storage. Since bitecs uses typed arrays, strings must be stored separately and referenced by ID.

```typescript
import { contentStore } from 'blecsd';

// Generally you should use the helper functions instead of accessing directly
// The store is exposed for advanced use cases
```

---

## Usage Examples

### Basic Text Display

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, getContent } from 'blecsd';

const world = createWorld();
const textEntity = addEntity(world);

setContent(world, textEntity, 'Hello, Terminal!');
console.log(getContent(world, textEntity)); // 'Hello, Terminal!'
```

### Centered Title

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, TextAlign, TextVAlign } from 'blecsd';

const world = createWorld();
const titleEntity = addEntity(world);

setContent(world, titleEntity, 'Game Title', {
  align: TextAlign.Center,
  valign: TextVAlign.Middle,
});
```

### Wrapping Text Block

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, appendContent, TextAlign } from 'blecsd';

const world = createWorld();
const paragraphEntity = addEntity(world);

setContent(world, paragraphEntity, 'This is a long paragraph that should wrap ', {
  wrap: true,
  align: TextAlign.Left,
});

appendContent(world, paragraphEntity, 'when it reaches the container boundary.');
```

### Change Detection

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, getContentHash } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setContent(world, entity, 'Initial text');
const hash1 = getContentHash(world, entity);

// Later, check if content changed
setContent(world, entity, 'Updated text');
const hash2 = getContentHash(world, entity);

if (hash1 !== hash2) {
  console.log('Content changed, re-render needed');
}
```

### Styled Text with Tags

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setContent, setParseTags } from 'blecsd';

const world = createWorld();
const styledEntity = addEntity(world);

setContent(world, styledEntity, '{red-fg}Error:{/red-fg} Something went wrong', {
  parseTags: true,
});
```

---

## See Also

- [Label Component](./label.md) - Text labels for entities
- [Position Component](./position.md) - Entity positioning
- [Entity Factories](./entities.md) - Creating entities with components
