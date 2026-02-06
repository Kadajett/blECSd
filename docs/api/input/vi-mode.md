# Vi Mode API

Vi-style navigation mode for scrollable elements. Provides vi key bindings for scrolling, cursor movement, and search within scrollable content.

## Quick Start

```typescript
import { createViState, createViConfig, processViKey } from 'blecsd';

const state = createViState();
const config = createViConfig({ enabled: true, viewportHeight: 40 });

// Process a key press
const [action, newState] = processViKey(keyEvent, state, config);
if (action.type === 'scroll') {
  scrollBy(world, eid, 0, action.amount);
}
```

## Types

### ViModeState

```typescript
type ViModeState = 'normal' | 'search' | 'command';
```

### ViAction

Actions produced by processing vi keys.

```typescript
type ViAction =
  | { readonly type: 'scroll'; readonly direction: 'up' | 'down' | 'left' | 'right'; readonly amount: number }
  | { readonly type: 'jump'; readonly target: 'top' | 'bottom' | 'high' | 'middle' | 'low' }
  | { readonly type: 'page'; readonly direction: 'up' | 'down'; readonly amount: 'half' | 'full' }
  | { readonly type: 'search'; readonly query: string; readonly direction: 'forward' | 'backward' }
  | { readonly type: 'searchNext'; readonly direction: 'forward' | 'backward' }
  | { readonly type: 'enterSearch' }
  | { readonly type: 'exitSearch' }
  | { readonly type: 'searchInput'; readonly char: string }
  | { readonly type: 'none' };
```

### ViModeConfig

```typescript
interface ViModeConfig {
  readonly enabled: boolean;         // default: false
  readonly scrollStep: number;       // default: 1
  readonly horizontalStep: number;   // default: 1
  readonly viewportHeight: number;   // viewport lines for H/M/L calculations
}
```

### ViState

Internal vi mode state.

```typescript
interface ViState {
  readonly mode: ViModeState;
  readonly searchBuffer: string;
  readonly lastSearch: string;
  readonly lastSearchDirection: 'forward' | 'backward';
  readonly countPrefix: number;
  readonly gPending: boolean;
}
```

## Functions

### createViState

Creates initial vi mode state.

```typescript
function createViState(): ViState;
```

### createViConfig

Creates a vi mode configuration with defaults.

```typescript
function createViConfig(config?: Partial<ViModeConfig>): ViModeConfig;
```

### processViKey

Processes a key event in vi mode and returns the resulting action and new state.

```typescript
function processViKey(
  key: KeyEvent,
  state: ViState,
  config: ViModeConfig
): [ViAction, ViState];
```

**Parameters:**
- `key` - The key event to process
- `state` - Current vi state
- `config` - Vi mode configuration

**Returns:** Tuple of `[action, newState]`.

### isViKey

Checks if a key event should be consumed by vi mode. Use this to prevent vi keys from bubbling to other handlers.

```typescript
function isViKey(key: KeyEvent, state: ViState, config: ViModeConfig): boolean;
```

### resolvePageAmount

Resolves a vi page action to a concrete scroll amount.

```typescript
function resolvePageAmount(amount: 'half' | 'full', viewportHeight: number): number;
```

```typescript
import { resolvePageAmount } from 'blecsd';

const lines = resolvePageAmount('half', 40); // 20
const fullPage = resolvePageAmount('full', 40); // 39
```

### resolveJumpTarget

Resolves a vi jump target to a line number.

```typescript
function resolveJumpTarget(
  target: 'top' | 'bottom' | 'high' | 'middle' | 'low',
  scrollTop: number,
  viewportHeight: number,
  totalLines: number
): number;
```

## Supported Key Bindings

### Normal Mode

| Key | Action |
|-----|--------|
| `j` | Scroll down |
| `k` | Scroll up |
| `h` | Scroll left |
| `l` | Scroll right |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `H` | Jump to high (top of viewport) |
| `M` | Jump to middle of viewport |
| `L` | Jump to low (bottom of viewport) |
| `Ctrl+d` | Half page down |
| `Ctrl+u` | Half page up |
| `Ctrl+f` | Full page down |
| `Ctrl+b` | Full page up |
| `/` | Enter search mode |
| `n` | Next search result |
| `N` | Previous search result |
| `1-9` | Count prefix (e.g., `5j` scrolls down 5) |

### Search Mode

| Key | Action |
|-----|--------|
| Characters | Append to search buffer |
| `Enter` | Execute search |
| `Escape` | Cancel search |
| `Backspace` | Delete last character |

## Usage Example

```typescript
import {
  createViState,
  createViConfig,
  processViKey,
  isViKey,
  resolvePageAmount,
  resolveJumpTarget,
} from 'blecsd';

let viState = createViState();
const viConfig = createViConfig({
  enabled: true,
  scrollStep: 1,
  viewportHeight: 40,
});

function handleKey(keyEvent: KeyEvent) {
  // Check if vi mode wants this key
  if (!isViKey(keyEvent, viState, viConfig)) {
    handleNormalKey(keyEvent);
    return;
  }

  const [action, newState] = processViKey(keyEvent, viState, viConfig);
  viState = newState;

  switch (action.type) {
    case 'scroll':
      scrollBy(action.direction, action.amount);
      break;
    case 'jump': {
      const line = resolveJumpTarget(
        action.target, scrollTop, viewportHeight, totalLines
      );
      scrollToLine(line);
      break;
    }
    case 'page': {
      const amount = resolvePageAmount(action.amount, viewportHeight);
      scrollBy(action.direction, amount);
      break;
    }
    case 'search':
      performSearch(action.query, action.direction);
      break;
    case 'searchNext':
      findNextMatch(action.direction);
      break;
    case 'enterSearch':
      showSearchBar();
      break;
    case 'exitSearch':
      hideSearchBar();
      break;
  }
}
```
