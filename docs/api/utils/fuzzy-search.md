# Fuzzy Search

Fuzzy string matching with scoring, highlighting, and filtering support for building searchable lists and command palettes.

## Import

```typescript
import {
  fuzzyMatch,
  fuzzySearch,
  fuzzySearchBy,
  fuzzyFilter,
  fuzzyTest,
  highlightMatch,
  FuzzyOptionsSchema,
} from 'blecsd';
```

## Types

### FuzzyOptions

Options for fuzzy matching behavior.

```typescript
interface FuzzyOptions {
  readonly caseSensitive?: boolean;       // Default: false
  readonly threshold?: number;            // Min score 0-1 (default: 0)
  readonly limit?: number;               // Max results (default: unlimited)
  readonly consecutiveBonus?: number;     // Bonus for consecutive matches (default: 0.3)
  readonly wordBoundaryBonus?: number;    // Bonus for boundary matches (default: 0.2)
  readonly prefixBonus?: number;          // Bonus for prefix match (default: 0.5)
  readonly gapPenalty?: number;           // Penalty per gap character (default: 0.1)
}
```

### FuzzyMatch\<T\>

A single fuzzy match result.

```typescript
interface FuzzyMatch<T = string> {
  readonly item: T;                    // The original item
  readonly text: string;               // The string that was matched against
  readonly score: number;              // Match score (0-1, higher is better)
  readonly indices: readonly number[]; // Indices of matched characters
}
```

### FuzzySearchOptions\<T\>

Options with a text extractor for searching object arrays.

```typescript
interface FuzzySearchOptions<T> extends FuzzyOptions {
  readonly getText?: (item: T) => string;
}
```

## Schemas

### FuzzyOptionsSchema

Zod schema for validating fuzzy options at runtime.

```typescript
import { FuzzyOptionsSchema } from 'blecsd';

const validated = FuzzyOptionsSchema.parse({ threshold: 0.5 });
```

## Functions

### fuzzyMatch

Calculates the fuzzy match score for a query against a single text string.

```typescript
function fuzzyMatch(
  query: string,
  text: string,
  options?: FuzzyOptions,
): FuzzyMatch<string> | null
```

**Parameters:**
- `query` - The search query
- `text` - The text to search in
- `options` - Matching options

**Returns:** Match result with score and indices, or `null` if no match.

**Example:**
```typescript
import { fuzzyMatch } from 'blecsd';

const result = fuzzyMatch('app', 'application');
// { item: 'application', text: 'application', score: 0.9, indices: [0, 1, 2] }

fuzzyMatch('xyz', 'application'); // null
```

### fuzzySearch

Performs fuzzy search on an array of strings. Returns results sorted by score (highest first).

```typescript
function fuzzySearch(
  query: string,
  items: readonly string[],
  options?: FuzzyOptions,
): FuzzyMatch<string>[]
```

**Parameters:**
- `query` - The search query
- `items` - Array of strings to search
- `options` - Search options

**Returns:** Array of matches sorted by score (highest first).

**Example:**
```typescript
import { fuzzySearch } from 'blecsd';

const items = ['apple', 'application', 'banana', 'apply'];
const results = fuzzySearch('app', items);
// [
//   { item: 'apple', score: 0.9, indices: [0, 1, 2], ... },
//   { item: 'apply', score: 0.9, indices: [0, 1, 2], ... },
//   { item: 'application', score: 0.7, indices: [0, 1, 2], ... },
// ]
```

### fuzzySearchBy

Performs fuzzy search on an array of objects, using a text extractor function.

```typescript
function fuzzySearchBy<T>(
  query: string,
  items: readonly T[],
  options: FuzzySearchOptions<T>,
): FuzzyMatch<T>[]
```

**Parameters:**
- `query` - The search query
- `items` - Array of objects to search
- `options` - Search options with `getText` extractor

**Returns:** Array of matches with original item objects, sorted by score.

**Example:**
```typescript
import { fuzzySearchBy } from 'blecsd';

interface Command { name: string; shortcut: string }
const commands: Command[] = [
  { name: 'Open File', shortcut: 'Ctrl+O' },
  { name: 'Open Recent', shortcut: 'Ctrl+Shift+O' },
  { name: 'Save', shortcut: 'Ctrl+S' },
];

const results = fuzzySearchBy('open', commands, {
  getText: (cmd) => cmd.name,
});
// Returns matches with original Command objects
```

### fuzzyFilter

Filters items by fuzzy match and returns only the matching strings (not full match objects).

```typescript
function fuzzyFilter(
  query: string,
  items: readonly string[],
  options?: FuzzyOptions,
): string[]
```

**Parameters:**
- `query` - The search query
- `items` - Array of strings to filter
- `options` - Search options

**Returns:** Array of matching strings.

**Example:**
```typescript
import { fuzzyFilter } from 'blecsd';

const items = ['apple', 'application', 'banana'];
const filtered = fuzzyFilter('app', items);
// ['apple', 'application']
```

### fuzzyTest

Checks whether a string matches a fuzzy query.

```typescript
function fuzzyTest(
  query: string,
  text: string,
  options?: FuzzyOptions,
): boolean
```

**Parameters:**
- `query` - The search query
- `text` - The text to check
- `options` - Match options

**Returns:** `true` if the text matches the query.

**Example:**
```typescript
import { fuzzyTest } from 'blecsd';

fuzzyTest('app', 'application'); // true
fuzzyTest('xyz', 'application'); // false
```

### highlightMatch

Highlights matched characters in a string using a custom highlight function.

```typescript
function highlightMatch(
  text: string,
  indices: readonly number[],
  highlight?: (char: string) => string,
): string
```

**Parameters:**
- `text` - The original text
- `indices` - The matched character indices (from `FuzzyMatch.indices`)
- `highlight` - Function to wrap matched characters (default: wraps in brackets)

**Returns:** Text with highlighted matches.

**Example:**
```typescript
import { fuzzyMatch, highlightMatch } from 'blecsd';

const match = fuzzyMatch('app', 'application');
if (match) {
  const highlighted = highlightMatch(match.text, match.indices, (c) => `\x1b[1m${c}\x1b[0m`);
  // Bold ANSI highlighting on matched characters
}
```

## Usage Example

```typescript
import { fuzzySearch, highlightMatch } from 'blecsd';

const files = ['README.md', 'package.json', 'src/index.ts', 'src/utils/rope.ts'];

const results = fuzzySearch('rop', files, { threshold: 0.3 });
for (const result of results) {
  const display = highlightMatch(result.text, result.indices, (c) => `[${c}]`);
  console.log(`${display} (score: ${result.score.toFixed(2)})`);
}
// src/utils/[r][o][p]e.ts (score: 0.65)
```

---

## Related

- [Virtual Scrollback](./virtual-scrollback.md) - Scrollback buffer for searchable history
