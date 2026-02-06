# Syntax Highlight

Line-based incremental syntax highlighting with state tracking. Only changed lines and affected multi-line constructs are re-processed, with visible-first highlighting for responsive display.

## Import

```typescript
import {
  // Cache management
  createHighlightCache,
  clearHighlightCache,
  setGrammar,
  getHighlightStats,
  // Invalidation
  invalidateLines,
  invalidateLine,
  invalidateAllLines,
  // Tokenization
  tokenizeLine,
  // Highlighting
  highlightWithCache,
  highlightVisibleFirst,
  continueHighlight,
  // Language detection
  detectLanguage,
  detectLanguageFromContent,
  getGrammarByName,
  // Grammars
  GRAMMAR_JAVASCRIPT,
  GRAMMAR_PYTHON,
  GRAMMAR_RUST,
  GRAMMAR_GO,
  GRAMMAR_SHELL,
  GRAMMAR_JSON,
  GRAMMAR_PLAINTEXT,
  GRAMMARS,
  // Constants
  EMPTY_STATE,
  DEFAULT_HIGHLIGHT_BATCH,
} from 'blecsd';
```

## Types

### TokenType

```typescript
type TokenType =
  | 'keyword' | 'string' | 'number' | 'comment'
  | 'operator' | 'punctuation' | 'identifier' | 'function'
  | 'type' | 'constant' | 'variable' | 'property'
  | 'builtin' | 'regexp' | 'escape' | 'tag'
  | 'attribute' | 'text';
```

### Token

A token represents a highlighted span of text.

```typescript
interface Token {
  readonly type: TokenType;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}
```

### LineState

State for tracking multi-line constructs across lines.

```typescript
interface LineState {
  readonly inString: string | null;
  readonly inComment: boolean;
  readonly templateDepth: number;
  readonly commentDepth: number;
}
```

### LineEntry

A cached line entry with tokens and state.

```typescript
interface LineEntry {
  readonly text: string;
  readonly tokens: readonly Token[];
  readonly startState: LineState;
  readonly endState: LineState;
}
```

### Grammar

Language grammar definition.

```typescript
interface Grammar {
  readonly name: string;
  readonly extensions: readonly string[];
  readonly keywords: ReadonlySet<string>;
  readonly builtins: ReadonlySet<string>;
  readonly types: ReadonlySet<string>;
  readonly constants: ReadonlySet<string>;
  readonly operators: RegExp;
  readonly lineComment: string | null;
  readonly blockCommentStart: string | null;
  readonly blockCommentEnd: string | null;
  readonly stringDelimiters: readonly string[];
  readonly templateLiteralStart: string | null;
  readonly templateLiteralEnd: string | null;
  readonly numberPattern: RegExp;
  readonly identifierPattern: RegExp;
  readonly nestedComments: boolean;
}
```

### HighlightCache

Highlight cache for a document.

```typescript
interface HighlightCache {
  grammar: Grammar;
  readonly entries: Map<number, LineEntry>;
  readonly dirty: Set<number>;
  lineCount: number;
  fullInvalidate: boolean;
}
```

### HighlightResult

Result of visible-first highlighting.

```typescript
interface HighlightResult {
  readonly lines: readonly LineEntry[];
  readonly hasMore: boolean;
  readonly nextLine: number;
  readonly timeMs: number;
}
```

### HighlightStats

```typescript
interface HighlightStats {
  readonly cachedLines: number;
  readonly dirtyLines: number;
  readonly grammar: string;
  readonly lineCount: number;
  readonly fullInvalidate: boolean;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_HIGHLIGHT_BATCH` | `100` | Default batch size for background highlighting |
| `EMPTY_STATE` | `{ inString: null, inComment: false, templateDepth: 0, commentDepth: 0 }` | Initial empty line state |

## Built-in Grammars

| Grammar | Languages |
|---------|-----------|
| `GRAMMAR_JAVASCRIPT` | .js, .jsx, .ts, .tsx, .mjs, .cjs |
| `GRAMMAR_PYTHON` | .py, .pyw, .pyi |
| `GRAMMAR_RUST` | .rs (with nested comments) |
| `GRAMMAR_GO` | .go |
| `GRAMMAR_SHELL` | .sh, .bash, .zsh, .fish |
| `GRAMMAR_JSON` | .json, .jsonc, .json5 |
| `GRAMMAR_PLAINTEXT` | .txt, .text (no highlighting) |

## Functions

### createHighlightCache

Creates a new highlight cache for a grammar.

```typescript
function createHighlightCache(grammar: Grammar): HighlightCache
```

### clearHighlightCache

Clears all entries from the cache.

```typescript
function clearHighlightCache(cache: HighlightCache): void
```

### setGrammar

Changes the grammar used for highlighting. Invalidates all lines if the grammar changed.

```typescript
function setGrammar(cache: HighlightCache, grammar: Grammar): void
```

### getHighlightStats

Gets statistics about the highlight cache.

```typescript
function getHighlightStats(cache: HighlightCache): HighlightStats
```

### invalidateLines / invalidateLine / invalidateAllLines

Marks lines as dirty so they are re-tokenized on the next highlight pass.

```typescript
function invalidateLines(cache: HighlightCache, start: number, end: number): void
function invalidateLine(cache: HighlightCache, line: number): void
function invalidateAllLines(cache: HighlightCache): void
```

### tokenizeLine

Tokenizes a single line given a grammar and starting state.

```typescript
function tokenizeLine(grammar: Grammar, line: string, startState: LineState): LineEntry
```

### highlightWithCache

Highlights full text, caching results. Re-tokenizes only dirty or state-changed lines.

```typescript
function highlightWithCache(cache: HighlightCache, text: string): readonly LineEntry[]
```

### highlightVisibleFirst

Highlights visible lines first for responsive display, returning continuation info for background processing.

```typescript
function highlightVisibleFirst(
  cache: HighlightCache,
  text: string,
  startLine: number,
  endLine: number,
): HighlightResult
```

### continueHighlight

Continues highlighting from a specific line in batches.

```typescript
function continueHighlight(
  cache: HighlightCache,
  text: string,
  startLine: number,
  batchSize?: number,
): HighlightResult
```

### detectLanguage

Detects the language from a file extension.

```typescript
function detectLanguage(filename: string): Grammar
```

### detectLanguageFromContent

Detects the language from content heuristics (shebangs, common patterns).

```typescript
function detectLanguageFromContent(content: string): Grammar
```

### getGrammarByName

Gets a grammar by name, supporting aliases (e.g., "ts", "py", "rs").

```typescript
function getGrammarByName(name: string): Grammar
```

## Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createHighlightCache, highlightVisibleFirst, continueHighlight,
  detectLanguage, GRAMMAR_JAVASCRIPT, tokenizeLine, EMPTY_STATE,
} from 'blecsd';

// Detect language and create cache
const grammar = detectLanguage('app.ts');
const cache = createHighlightCache(grammar);

// Highlight visible lines first (responsive)
const result = highlightVisibleFirst(cache, sourceCode, 0, 40);
for (const line of result.lines) {
  for (const token of line.tokens) {
    // Apply color based on token.type
    renderToken(token.text, token.type);
  }
}

// Continue in the background
if (result.hasMore) {
  let next = result.nextLine;
  while (true) {
    const batch = continueHighlight(cache, sourceCode, next, 100);
    next = batch.nextLine;
    if (!batch.hasMore) break;
  }
}

// Tokenize a single line
const entry = tokenizeLine(GRAMMAR_JAVASCRIPT, 'const x = 42;', EMPTY_STATE);
// entry.tokens: [keyword "const", text " ", identifier "x", ...]
```

---

## Related

- [Virtualized Line Store](./virtualized-line-store.md) - Large text content storage
- [Fold Regions](./fold-regions.md) - Collapsible document regions
