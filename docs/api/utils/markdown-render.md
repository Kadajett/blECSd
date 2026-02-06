# Markdown Render

Streaming markdown parser with block-level caching, syntax highlighting for code blocks, and virtualized rendered output.

## Import

```typescript
import {
  parseMarkdown,
  parseMarkdownCached,
  parseInline,
  createMarkdownCache,
  clearMarkdownCache,
  invalidateLines,
  renderBlock,
  renderMarkdown,
  getVisibleMarkdown,
  getTotalLineCount,
  getMarkdownStats,
  DEFAULT_PARSE_BATCH,
} from 'blecsd';
```

## Types

### BlockType

Block-level element types.

```typescript
type BlockType = 'paragraph' | 'heading' | 'code' | 'list' | 'blockquote' | 'table' | 'hr' | 'html';
```

### InlineType

Inline element types.

```typescript
type InlineType = 'text' | 'bold' | 'italic' | 'code' | 'link' | 'image' | 'strikethrough';
```

### InlineElement

An inline element within a block.

```typescript
interface InlineElement {
  readonly type: InlineType;
  readonly content: string;
  readonly href?: string;
  readonly title?: string;
  readonly children?: readonly InlineElement[];
}
```

### MarkdownBlock

A parsed markdown block.

```typescript
interface MarkdownBlock {
  readonly type: BlockType;
  readonly source: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly data: BlockData;
  readonly hash: number;
}
```

### BlockData

Union of block-specific data types:

```typescript
type BlockData =
  | HeadingData
  | CodeData
  | ListData
  | TableData
  | ParagraphData
  | BlockquoteData
  | HrData
  | HtmlData;
```

#### HeadingData

```typescript
interface HeadingData {
  readonly kind: 'heading';
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
  readonly inline: readonly InlineElement[];
}
```

#### CodeData

```typescript
interface CodeData {
  readonly kind: 'code';
  readonly language: string;
  readonly code: string;
  readonly highlighted?: readonly (readonly Token[])[];
}
```

#### ListData

```typescript
interface ListData {
  readonly kind: 'list';
  readonly ordered: boolean;
  readonly start?: number;
  readonly items: readonly ListItem[];
}

interface ListItem {
  readonly content: string;
  readonly inline: readonly InlineElement[];
  readonly indent: number;
  readonly checked?: boolean;
}
```

#### TableData

```typescript
interface TableData {
  readonly kind: 'table';
  readonly headers: readonly TableCell[];
  readonly alignments: readonly ('left' | 'center' | 'right' | null)[];
  readonly rows: readonly (readonly TableCell[])[];
}

interface TableCell {
  readonly content: string;
  readonly inline: readonly InlineElement[];
}
```

#### ParagraphData / BlockquoteData / HrData / HtmlData

```typescript
interface ParagraphData {
  readonly kind: 'paragraph';
  readonly text: string;
  readonly inline: readonly InlineElement[];
}

interface BlockquoteData {
  readonly kind: 'blockquote';
  readonly content: string;
  readonly blocks: readonly MarkdownBlock[];
}

interface HrData { readonly kind: 'hr'; }
interface HtmlData { readonly kind: 'html'; readonly html: string; }
```

### RenderedLine

A single rendered output line.

```typescript
interface RenderedLine {
  readonly content: string;
  readonly style: LineStyle;
  readonly blockIndex: number;
  readonly lineInBlock: number;
}
```

### LineStyle

Style information for a rendered line.

```typescript
interface LineStyle {
  readonly fg?: number;
  readonly bg?: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly dim?: boolean;
}
```

### MarkdownParseResult

```typescript
interface MarkdownParseResult {
  readonly blocks: readonly MarkdownBlock[];
  readonly parseTimeMs: number;
}
```

### MarkdownCache

Cache for incremental parsing.

```typescript
interface MarkdownCache {
  blocks: Map<string, MarkdownBlock>;
  sourceHash: number;
  highlightCaches: Map<string, HighlightCache>;
  renderedLines: RenderedLine[] | null;
}
```

### VisibleMarkdown

Result of a virtualized visible-lines query.

```typescript
interface VisibleMarkdown {
  readonly lines: readonly RenderedLine[];
  readonly totalLines: number;
  readonly startIndex: number;
  readonly endIndex: number;
}
```

### MarkdownStats

```typescript
interface MarkdownStats {
  readonly blockCount: number;
  readonly lineCount: number;
  readonly headingCount: number;
  readonly codeBlockCount: number;
  readonly listCount: number;
  readonly tableCount: number;
  readonly linkCount: number;
}
```

## Functions

### parseMarkdown

Parses a markdown string into blocks.

```typescript
function parseMarkdown(source: string): MarkdownParseResult
```

**Parameters:**
- `source` - Raw markdown text

**Returns:** Parse result with blocks and timing.

**Example:**
```typescript
import { parseMarkdown } from 'blecsd';

const result = parseMarkdown('# Hello\n\nSome **bold** text.');
console.log(result.blocks.length); // 2 (heading + paragraph)
console.log(result.parseTimeMs);   // e.g. 0.5
```

### parseInline

Parses inline markdown elements (bold, italic, code, links, images, strikethrough).

```typescript
function parseInline(text: string): readonly InlineElement[]
```

**Example:**
```typescript
import { parseInline } from 'blecsd';

const elements = parseInline('Hello **world** and `code`');
// [{ type: 'text', content: 'Hello ' },
//  { type: 'bold', content: 'world', ... },
//  { type: 'text', content: ' and ' },
//  { type: 'code', content: 'code' }]
```

### createMarkdownCache / clearMarkdownCache

Creates and clears the incremental parsing cache.

```typescript
function createMarkdownCache(): MarkdownCache
function clearMarkdownCache(cache: MarkdownCache): void
```

### parseMarkdownCached

Parses markdown with caching. On unchanged source, returns cached result instantly.

```typescript
function parseMarkdownCached(cache: MarkdownCache, source: string): MarkdownParseResult
```

### invalidateLines

Invalidates cached blocks that overlap a line range, forcing reparse on next call.

```typescript
function invalidateLines(cache: MarkdownCache, startLine: number, endLine: number): void
```

### renderBlock

Renders a single block to output lines.

```typescript
function renderBlock(block: MarkdownBlock, cache: MarkdownCache): readonly RenderedLine[]
```

### renderMarkdown

Renders all blocks to output lines, caching the result.

```typescript
function renderMarkdown(result: MarkdownParseResult, cache: MarkdownCache): readonly RenderedLine[]
```

### getVisibleMarkdown

Gets visible lines for virtualized rendering.

```typescript
function getVisibleMarkdown(
  result: MarkdownParseResult,
  cache: MarkdownCache,
  startLine: number,
  count: number,
): VisibleMarkdown
```

**Parameters:**
- `result` - Parse result
- `cache` - Markdown cache
- `startLine` - First visible line index
- `count` - Number of lines to return

**Returns:** Visible lines with total count and range info.

### getTotalLineCount

Gets the total rendered line count.

```typescript
function getTotalLineCount(result: MarkdownParseResult, cache: MarkdownCache): number
```

### getMarkdownStats

Gets statistics about parsed markdown.

```typescript
function getMarkdownStats(result: MarkdownParseResult): MarkdownStats
```

## Usage Example

```typescript
import {
  parseMarkdownCached,
  createMarkdownCache,
  getVisibleMarkdown,
} from 'blecsd';

const cache = createMarkdownCache();
const source = '# Title\n\nParagraph text.\n\n```ts\nconst x = 1;\n```';

const result = parseMarkdownCached(cache, source);

// Render only visible lines (virtualized)
const visible = getVisibleMarkdown(result, cache, 0, 10);
for (const line of visible.lines) {
  console.log(line.content);
}
```

---

## Related

- [Diff Render](./diff-render.md) - Diff computation and rendering
- [Fast Wrap](./fast-wrap.md) - Word wrapping with caching
