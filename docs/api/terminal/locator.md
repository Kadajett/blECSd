# Terminfo File Locator

Locates compiled terminfo files on the filesystem using standard search paths. Supports both first-character directory structure (x/xterm) and hexadecimal directory structure (78/xterm).

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfo, listTerminals, getTerminfoSearchPaths } from 'blecsd';

// Find terminfo file for a terminal
const path = findTerminfo('xterm-256color');
if (path) {
  console.log(`Found at: ${path}`);
}

// List available terminals
const terminals = listTerminals();
console.log(`Found ${terminals.length} terminals`);

// Get search paths
const paths = getTerminfoSearchPaths();
console.log('Search paths:', paths);
```

---

## Search Path Order

The locator searches these locations in order:

1. `TERMINFO` environment variable (if set)
2. `~/.terminfo` (user's personal database)
3. `TERMINFO_DIRS` paths (colon-separated, if set)
4. Additional paths from config
5. System paths:
   - `/etc/terminfo`
   - `/lib/terminfo`
   - `/usr/share/terminfo`
   - `/usr/lib/terminfo`
   - `/usr/share/lib/terminfo`

---

## findTerminfo

Finds the terminfo file for a terminal.

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfo } from 'blecsd';

const path = findTerminfo('xterm-256color');
if (path) {
  console.log(`Found terminfo at: ${path}`);
} else {
  console.log('Terminal not found');
}
```

**Parameters:**
- `terminal` - Terminal name (e.g., "xterm-256color")
- `config` - Optional LocatorConfig

**Returns:** `string | null`

---

## findTerminfoDetailed

Finds a terminfo file with detailed search information.

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfoDetailed } from 'blecsd';

const result = findTerminfoDetailed('xterm-256color');

if (result.path) {
  console.log(`Found at: ${result.path}`);
} else {
  console.log('Not found. Searched:');
  for (const path of result.searchedPaths) {
    console.log(`  ${path}`);
  }
}
```

**Parameters:**
- `terminal` - Terminal name
- `config` - Optional LocatorConfig

**Returns:** `LocatorResult`

---

## getTerminfoPath

Gets the terminfo path for a terminal, throwing if not found.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTerminfoPath } from 'blecsd';

try {
  const path = getTerminfoPath('xterm-256color');
  console.log(`Path: ${path}`);
} catch (err) {
  console.error('Terminal not found');
}
```

**Parameters:**
- `terminal` - Terminal name
- `config` - Optional LocatorConfig

**Returns:** `string`

**Throws:** Error if terminal not found

---

## getTerminfoSearchPaths

Gets the ordered list of terminfo search paths.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTerminfoSearchPaths } from 'blecsd';

const paths = getTerminfoSearchPaths();
console.log('Search paths:');
for (const path of paths) {
  console.log(`  ${path}`);
}
```

**Parameters:**
- `config` - Optional LocatorConfig

**Returns:** `readonly string[]`

---

## getExistingSearchPaths

Gets all existing terminfo search paths. Filters out paths that don't exist on the filesystem.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getExistingSearchPaths } from 'blecsd';

const paths = getExistingSearchPaths();
console.log(`Found ${paths.length} terminfo directories`);
```

**Parameters:**
- `config` - Optional LocatorConfig

**Returns:** `readonly string[]`

---

## listTerminals

Lists all available terminal definitions in the terminfo database.

<!-- blecsd-doccheck:ignore -->
```typescript
import { listTerminals } from 'blecsd';

const terminals = listTerminals();
console.log(`Found ${terminals.length} terminals:`);

// Filter to xterm variants
const xterms = terminals.filter(t => t.startsWith('xterm'));
console.log('xterm variants:', xterms);
```

**Parameters:**
- `config` - Optional LocatorConfig

**Returns:** `readonly string[]` - Sorted, unique terminal names

---

## listTerminalsMatching

Lists terminals matching a pattern with wildcards.

<!-- blecsd-doccheck:ignore -->
```typescript
import { listTerminalsMatching } from 'blecsd';

// Find all xterm variants
const xterms = listTerminalsMatching('xterm*');

// Find all 256-color terminals
const color256 = listTerminalsMatching('*-256color');

// Single character wildcard
const vtTerms = listTerminalsMatching('vt???');
```

**Parameters:**
- `pattern` - Pattern with `*` (any chars) and `?` (single char) wildcards
- `config` - Optional LocatorConfig

**Returns:** `readonly string[]`

---

## terminalExists

Checks if a terminal exists in the terminfo database.

<!-- blecsd-doccheck:ignore -->
```typescript
import { terminalExists } from 'blecsd';

if (terminalExists('xterm-256color')) {
  console.log('Terminal is available');
}
```

**Parameters:**
- `terminal` - Terminal name
- `config` - Optional LocatorConfig

**Returns:** `boolean`

---

## getCurrentTerminal

Gets the current terminal name from the TERM environment variable.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getCurrentTerminal } from 'blecsd';

const term = getCurrentTerminal();
console.log(`Current terminal: ${term}`);
```

**Returns:** `string` - TERM value or 'dumb' as fallback

---

## findCurrentTerminfo

Finds the terminfo file for the current terminal.

<!-- blecsd-doccheck:ignore -->
```typescript
import { findCurrentTerminfo } from 'blecsd';

const path = findCurrentTerminfo();
if (path) {
  console.log(`Current terminal terminfo: ${path}`);
}
```

**Parameters:**
- `config` - Optional LocatorConfig

**Returns:** `string | null`

---

## Types

### LocatorConfig

Configuration for terminfo file location.

```typescript
interface LocatorConfig {
  /** Additional search paths to check */
  readonly additionalPaths?: readonly string[];
  /** Whether to skip system paths (useful for testing) */
  readonly skipSystemPaths?: boolean;
  /** Custom home directory (useful for testing) */
  readonly homeDir?: string;
}
```

### LocatorResult

Result of a terminfo file search.

```typescript
interface LocatorResult {
  /** Path to the found terminfo file, or null if not found */
  readonly path: string | null;
  /** All paths that were searched */
  readonly searchedPaths: readonly string[];
  /** Terminal name that was searched for */
  readonly terminal: string;
}
```

---

## Directory Structure

Terminfo databases use two directory naming conventions:

### First-Character Directory (Most Common)

```
/usr/share/terminfo/
├── a/
│   └── ansi
├── v/
│   ├── vt100
│   └── vt220
└── x/
    ├── xterm
    └── xterm-256color
```

### Hexadecimal Directory (Some Systems)

```
/usr/share/terminfo/
├── 61/
│   └── ansi      (61 = 'a')
├── 76/
│   ├── vt100     (76 = 'v')
│   └── vt220
└── 78/
    ├── xterm     (78 = 'x')
    └── xterm-256color
```

The locator checks both conventions for each search path.

---

## Examples

### Loading Terminfo for Current Terminal

<!-- blecsd-doccheck:ignore -->
```typescript
import { findCurrentTerminfo, parseTerminfo, toTerminfoData, createTput } from 'blecsd';
import { readFileSync } from 'fs';

const path = findCurrentTerminfo();
if (!path) {
  throw new Error('Cannot find terminfo for current terminal');
}

const buffer = readFileSync(path);
const result = parseTerminfo(buffer);

if (result.success) {
  const data = toTerminfoData(result.data);
  const tput = createTput({ data });

  console.log(`Loaded ${data.name}`);
  console.log(`Max colors: ${tput.getNumber('max_colors')}`);
}
```

### Finding Terminal with Fallbacks

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfo } from 'blecsd';

function findTerminalWithFallbacks(terminals: string[]): string | null {
  for (const term of terminals) {
    const path = findTerminfo(term);
    if (path) {
      return path;
    }
  }
  return null;
}

const path = findTerminalWithFallbacks([
  'xterm-256color',
  'xterm-color',
  'xterm',
  'vt100',
]);
```

### Custom Search Paths

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfo, listTerminals } from 'blecsd';

// Add application-specific terminfo directory
const config = {
  additionalPaths: ['/opt/myapp/terminfo'],
};

const path = findTerminfo('custom-terminal', config);
const allTerminals = listTerminals(config);
```

### Debugging Search Issues

<!-- blecsd-doccheck:ignore -->
```typescript
import { findTerminfoDetailed } from 'blecsd';

const result = findTerminfoDetailed('xterm-256color');

console.log(`Terminal: ${result.terminal}`);
console.log(`Found: ${result.path ?? 'NOT FOUND'}`);
console.log(`\nSearched locations:`);

for (const searchPath of result.searchedPaths) {
  console.log(`  ${searchPath}`);
}
```

---

## See Also

- [Parser](./parser.md) - Binary terminfo format parser
- [Tput](./tput.md) - High-level capability interface
- [Capabilities](../capabilities.md) - Runtime capability negotiation
