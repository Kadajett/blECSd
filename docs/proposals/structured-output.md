# Proposal: Structured Terminal Output Protocol (STOP)

**Author:** blECSd project
**Status:** Draft
**Created:** 2026-02-13

## Abstract

Current terminal emulators process a stream of characters and ANSI escape sequences. Applications "paint characters at positions" with no way to express semantic meaning. A code block is just characters with color attributes. A table is just aligned text. An image is a proprietary escape sequence that varies by terminal.

This proposal defines a Structured Terminal Output Protocol (STOP) that allows applications to emit semantic blocks alongside traditional character output. Terminal emulators that support STOP render these blocks natively with rich formatting, accessibility, and interaction. Emulators that don't support STOP see graceful plain-text fallback.

## Motivation

### Problems with current terminal output

1. **No semantics**: A terminal emulator cannot distinguish a Python code block from a log message. Copy-paste, search, and accessibility all suffer.

2. **No structured data**: Tables are rendered as aligned text. Resizing the terminal breaks alignment. Screen readers see character soup.

3. **No standard for rich content**: Images, links, and interactive elements use incompatible proprietary escape sequences (iTerm2 inline images, OSC 8 links, Kitty graphics protocol).

4. **AI tools are blocked**: LLM-powered tools produce structured output (markdown, JSON, tool results, conversation threads) that gets flattened to character streams. The terminal has no concept of "this is a code block" or "this is a collapsible section."

5. **Accessibility is an afterthought**: Screen readers must parse raw character grids to infer structure. If the terminal knew "this is a table with 3 columns," accessibility would be trivial.

### Why now?

Every developer tool is integrating LLMs. The output of these tools is inherently structured: streaming markdown, tool-use results, conversation threads, workflow visualizations. The terminal is the primary interface for developers, but it has no way to express this structure. blECSd fills this gap at the library level, but a protocol-level solution would benefit the entire ecosystem.

## Design Principles

1. **Graceful degradation**: Applications using STOP must work in terminals that don't support it. Fallback text is always provided.

2. **Opt-in negotiation**: Terminals advertise STOP support via capability queries. Applications check before emitting structured blocks.

3. **Escape-sequence compatible**: STOP uses standard OSC (Operating System Command) escape sequences, which existing terminals silently ignore.

4. **Composable**: Blocks can be nested. A collapsible section can contain a table that contains code blocks.

5. **Streamable**: Blocks can be opened, incrementally appended to, and closed. This supports LLM streaming output natively.

## Protocol Specification

### Capability Negotiation

Applications query STOP support using a Device Attributes query:

```
# Application sends:
\x1b]7770;query\x07

# Terminal responds (if supported):
\x1b]7770;version=1;features=code,table,image,collapse,markdown\x07

# Terminal responds (if not supported):
(no response, or ignored)
```

The `features` field lists which block types the terminal supports. Applications fall back to plain text for unsupported types.

### Block Structure

Every STOP block follows this pattern:

```
\x1b]7771;<block-type>;<block-id>;<attributes>\x07
<fallback content (visible in non-STOP terminals)>
\x1b]7772;<block-id>\x07
```

- `7771` opens a block
- `7772` closes a block
- `block-id` is a unique identifier for the block (used for streaming updates)
- `attributes` is a semicolon-separated key=value list

### Block Types

#### Code Block

```
\x1b]7771;code;blk1;lang=python;title=example.py\x07
def hello():
    print("Hello, world!")
\x1b]7772;blk1\x07
```

Attributes:
- `lang` (required): Language identifier for syntax highlighting
- `title` (optional): Filename or description
- `line-start` (optional): Starting line number for display

Terminal rendering: Syntax-highlighted code with copy button, line numbers, and language indicator.

Fallback: The code text is displayed as-is (already readable).

#### Table

```
\x1b]7771;table;blk2;cols=Name,Age,City;align=l,r,l\x07
Alice	30	Portland
Bob	25	Seattle
Carol	35	Denver
\x1b]7772;blk2\x07
```

Attributes:
- `cols` (required): Comma-separated column headers
- `align` (optional): Column alignment (`l`, `r`, `c`)
- `sortable` (optional): `true` to enable column sorting
- `border` (optional): Border style (`none`, `single`, `double`, `rounded`)

Terminal rendering: Properly aligned table with headers, borders, and optional sorting.

Fallback: Tab-separated values with column headers visible.

#### Collapsible Section

```
\x1b]7771;collapse;blk3;title=Debug Output;open=false\x07
[debug] Loaded 42 modules
[debug] Cache hit ratio: 0.95
[debug] Memory usage: 128MB
\x1b]7772;blk3\x07
```

Attributes:
- `title` (required): Section header text
- `open` (optional): Initial state (`true` or `false`, default `true`)

Terminal rendering: Clickable header that expands/collapses content.

Fallback: All content visible with the title as a plain-text header.

#### Image

```
\x1b]7771;image;blk4;src=data:image/png;base64,...;width=40;height=20;alt=Architecture diagram\x07
[Architecture diagram: see image]
\x1b]7772;blk4\x07
```

Attributes:
- `src` (required): Data URI or file path
- `width` (optional): Width in columns
- `height` (optional): Height in rows
- `alt` (required): Alt text for accessibility
- `format` (optional): `sixel`, `kitty`, `iterm2`, `braille` for format hints

Terminal rendering: Inline image using the terminal's best available method.

Fallback: Alt text in brackets.

#### Markdown

```
\x1b]7771;markdown;blk5\x07
# Hello World

This is **bold** and *italic* text with `inline code`.

- Item one
- Item two
\x1b]7772;blk5\x07
```

Attributes: None required.

Terminal rendering: Rich markdown with formatting, colors, and structure.

Fallback: Raw markdown text (already readable by convention).

#### Progress

```
\x1b]7771;progress;blk6;value=42;max=100;label=Downloading\x07
Downloading: 42/100 (42%)
\x1b]7772;blk6\x07
```

Attributes:
- `value` (required): Current value
- `max` (required): Maximum value
- `label` (optional): Description text
- `style` (optional): `bar`, `spinner`, `percentage`

Terminal rendering: Animated progress bar with percentage and ETA.

Fallback: Text representation.

#### Link

```
\x1b]7771;link;blk7;href=https://example.com;title=Example Site\x07
Example Site (https://example.com)
\x1b]7772;blk7\x07
```

This extends OSC 8 with STOP semantics (block-based, composable, fallback-aware).

### Streaming Updates

STOP supports incremental updates to open blocks, which is critical for LLM streaming output:

```
# Open a streaming block
\x1b]7771;markdown;blk8;stream=true\x07

# Append content (can be sent multiple times)
\x1b]7773;blk8\x07
# Hello
\x1b]7774;blk8\x07

\x1b]7773;blk8\x07
This is streaming **markdown** content
\x1b]7774;blk8\x07

# Close the block when done
\x1b]7772;blk8\x07
```

- `7773` begins an append operation
- `7774` ends an append operation

The terminal incrementally re-renders the block as content arrives. For markdown blocks, this means syntax highlighting and formatting update in real time as the LLM generates output.

### Nesting

Blocks can be nested:

```
\x1b]7771;collapse;blk9;title=API Response\x07
\x1b]7771;code;blk10;lang=json\x07
{"status": "ok", "data": [1, 2, 3]}
\x1b]7772;blk10\x07
\x1b]7772;blk9\x07
```

The inner code block is displayed inside the collapsible section.

### Error Handling

If a terminal encounters an unknown block type, it:
1. Ignores the opening escape sequence
2. Renders the fallback content as plain text
3. Ignores the closing escape sequence

If a block is opened but never closed (application crash), the terminal treats all subsequent output as part of the fallback content until a new block opens or the session ends.

## Implementation in blECSd

blECSd would be the reference implementation for STOP:

1. **Detection**: Query terminal STOP support during initialization. Store supported features in world state.

2. **Dual rendering**: Each widget renders both a STOP block (when supported) and plain-text fallback (always). The output system selects the appropriate rendering path.

3. **Streaming integration**: The streaming text widget (`streamingMarkdown.ts`) emits STOP streaming markdown blocks when the terminal supports it, falling back to ANSI-formatted text otherwise.

4. **Widget mapping**: Each blECSd widget maps naturally to STOP blocks:
   - `streamingMarkdown` -> `markdown` block with `stream=true`
   - `table` / `listTable` -> `table` block
   - `accordion` / `collapsible` -> `collapse` block
   - `image` -> `image` block
   - `progressBar` / `gauge` -> `progress` block
   - `canvas` -> `image` block (rendered to bitmap)

5. **Graceful fallback**: Since blECSd already renders to plain ANSI, the fallback path is the current rendering code. STOP is an enhancement layer, not a replacement.

## Comparison with Existing Approaches

| Feature | ANSI | OSC 8 | Kitty Protocol | STOP |
|---------|------|-------|----------------|------|
| Text formatting | Yes | No | No | Yes |
| Hyperlinks | No | Yes | No | Yes |
| Images | No | No | Yes | Yes |
| Code blocks | No | No | No | Yes |
| Tables | No | No | No | Yes |
| Collapsible sections | No | No | No | Yes |
| Streaming updates | No | No | Partial | Yes |
| Graceful fallback | N/A | Partial | No | Yes |
| Accessibility | No | No | No | Yes |
| Composable/nested | No | No | No | Yes |

## Accessibility Benefits

With STOP, terminal emulators can provide:

- **Screen reader support**: "Table with 3 columns and 5 rows. Column 1: Name. Row 1: Alice."
- **Keyboard navigation**: Tab between blocks, Enter to expand/collapse, arrow keys within tables.
- **Search**: "Find all code blocks in Python" becomes possible because the terminal knows block boundaries and types.
- **Copy-paste**: Copy a code block without line numbers. Copy a table as CSV. Copy markdown as formatted text.

## Security Considerations

- **Data URIs in images**: Terminals should enforce size limits on data URIs to prevent memory exhaustion.
- **Nesting depth**: Maximum nesting depth should be enforced (recommended: 16 levels).
- **Block ID uniqueness**: Block IDs should be validated to prevent spoofing or replay attacks in shared sessions.
- **Content sanitization**: Fallback content must not contain escape sequences that could break out of the STOP block structure. Terminals should strip `\x1b]777` sequences from fallback content.

## Migration Path

1. **Phase 1**: blECSd implements STOP output alongside existing ANSI rendering. Applications opt in per-widget.
2. **Phase 2**: Terminal emulators add STOP parsing. Initial focus on `code`, `table`, and `collapse` blocks.
3. **Phase 3**: Community adoption. STOP becomes a standard that multiple TUI libraries and terminal emulators support.
4. **Phase 4**: Advanced features: interactive blocks (editable tables, form inputs), block-level undo, collaborative editing.

## Open Questions

1. **OSC number range**: The `7770-7779` range is arbitrary. Coordination with terminal emulator maintainers is needed to avoid conflicts.

2. **Binary content**: Should STOP support binary payloads (for images) or require base64 encoding? Base64 is simpler but 33% larger.

3. **Block replacement**: Should applications be able to replace an entire block's content (not just append)? This would enable progress bars and status displays.

4. **Event callbacks**: Should terminals be able to send events back to the application when users interact with blocks (click a table row, expand a section)? This would enable true interactive terminal UIs but adds significant complexity.

5. **Versioning**: How should the protocol version? Semantic versioning of the feature set, or per-block-type versioning?

## References

- [OSC 8 Hyperlinks](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda)
- [Kitty Graphics Protocol](https://sw.kovidgoyal.net/kitty/graphics-protocol/)
- [iTerm2 Inline Images](https://iterm2.com/documentation-images.html)
- [Sixel Graphics](https://en.wikipedia.org/wiki/Sixel)
- [Terminal WG on structured output](https://gitlab.freedesktop.org/terminal-wg/specifications)
