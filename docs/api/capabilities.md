# Terminal Capability Negotiation

Dynamic capability negotiation queries the terminal for modern features at startup. This module enables detection of advanced terminal capabilities like truecolor, Kitty keyboard protocol, graphics protocols, and synchronized output.

## Overview

```typescript
import { createCapabilityNegotiator, getTerminalCapabilities } from 'blecsd';

// Quick access to capabilities
const caps = await getTerminalCapabilities();

if (caps.truecolor) {
  console.log('24-bit color supported!');
}

if (caps.kittyKeyboard) {
  console.log(`Kitty keyboard level: ${caps.kittyKeyboard}`);
}

// Or create a custom negotiator
const negotiator = createCapabilityNegotiator({
  timeout: 200,
  timing: 'lazy',
});

const capabilities = await negotiator.getCapabilities();
```

---

## Constants

### Timeouts

```typescript
import {
  DEFAULT_QUERY_TIMEOUT,  // 100ms
  MIN_QUERY_TIMEOUT,      // 10ms
  MAX_QUERY_TIMEOUT,      // 5000ms
} from 'blecsd';
```

### KittyKeyboardLevel

Kitty keyboard protocol enhancement levels.

```typescript
import { KittyKeyboardLevel } from 'blecsd';

KittyKeyboardLevel.DISABLED           // 0 - Legacy mode
KittyKeyboardLevel.DISAMBIGUATE       // 1 - Disambiguate escape codes
KittyKeyboardLevel.REPORT_EVENTS      // 2 - Report press/repeat/release
KittyKeyboardLevel.REPORT_ALTERNATES  // 4 - Report alternate keys
KittyKeyboardLevel.REPORT_ALL         // 8 - Report all keys as escape codes
KittyKeyboardLevel.REPORT_TEXT        // 16 - Report associated text
```

### GraphicsProtocol

Graphics protocol types.

```typescript
import { GraphicsProtocol } from 'blecsd';

GraphicsProtocol.NONE    // 'none' - No graphics support
GraphicsProtocol.KITTY   // 'kitty' - Kitty graphics protocol
GraphicsProtocol.ITERM2  // 'iterm2' - iTerm2 inline images
GraphicsProtocol.SIXEL   // 'sixel' - Sixel graphics
```

### NegotiationTiming

Negotiation timing strategies.

```typescript
import { NegotiationTiming } from 'blecsd';

NegotiationTiming.EAGER  // 'eager' - Query immediately on creation
NegotiationTiming.LAZY   // 'lazy' - Query on first capability access
NegotiationTiming.SKIP   // 'skip' - Environment detection only
```

---

## createCapabilityNegotiator

Creates a capability negotiator instance.

```typescript
import { createCapabilityNegotiator } from 'blecsd';

// Default: eager negotiation with 100ms timeout
const negotiator = createCapabilityNegotiator();

// Custom configuration
const customNegotiator = createCapabilityNegotiator({
  timeout: 200,          // Query timeout in ms
  timing: 'lazy',        // Negotiation timing strategy
  forceCapabilities: {   // Force specific capabilities (testing)
    truecolor: true,
  },
});
```

**Parameters:**
- `config` - Negotiator configuration
  - `timeout` - Query timeout in milliseconds (default: 100)
  - `timing` - Negotiation timing strategy (default: 'eager')
  - `input` - Custom input stream (default: process.stdin)
  - `output` - Custom output stream (default: process.stdout)
  - `forceCapabilities` - Force specific capabilities (for testing)

**Returns:** `CapabilityNegotiator`

---

## CapabilityNegotiator Methods

### getCapabilities

Gets the negotiated terminal capabilities. If timing is 'lazy' and negotiation hasn't run, triggers it.

```typescript
const caps = await negotiator.getCapabilities();

console.log(`Truecolor: ${caps.truecolor}`);
console.log(`Kitty keyboard: ${caps.kittyKeyboard}`);
console.log(`Graphics: ${caps.graphics}`);
```

**Returns:** `Promise<TerminalCapabilities>`

### getCachedCapabilities

Gets cached capabilities without triggering negotiation.

```typescript
const cached = negotiator.getCachedCapabilities();

if (cached === null) {
  console.log('Not yet negotiated');
}
```

**Returns:** `TerminalCapabilities | null`

### renegotiate

Forces re-negotiation of capabilities. Useful after SIGWINCH or terminal reconnection.

```typescript
const newCaps = await negotiator.renegotiate();
```

**Returns:** `Promise<TerminalCapabilities>`

### isNegotiated

Checks if capabilities have been negotiated.

```typescript
if (negotiator.isNegotiated()) {
  // Can use getCachedCapabilities safely
}
```

### getTimeout / setTimeout

Gets or sets the query timeout.

```typescript
const timeout = negotiator.getTimeout();

negotiator.setTimeout(200);
```

### destroy

Cleans up resources.

```typescript
negotiator.destroy();
```

---

## Convenience Functions

### getTerminalCapabilities

Gets terminal capabilities using the default negotiator.

```typescript
import { getTerminalCapabilities } from 'blecsd';

const caps = await getTerminalCapabilities();
console.log(`Truecolor: ${caps.truecolor}`);
```

### hasCapability

Checks if a specific capability is supported.

```typescript
import { hasCapability } from 'blecsd';

if (await hasCapability('truecolor')) {
  // Use 24-bit colors
}

if (await hasCapability('kittyKeyboard')) {
  // Enable Kitty keyboard protocol
}
```

### getDefaultNegotiator

Gets the default capability negotiator instance.

```typescript
import { getDefaultNegotiator } from 'blecsd';

const negotiator = getDefaultNegotiator();
const caps = await negotiator.getCapabilities();
```

### resetDefaultNegotiator

Resets the default negotiator. For testing purposes.

```typescript
import { resetDefaultNegotiator } from 'blecsd';

resetDefaultNegotiator();
```

---

## Query Generators

Manual query generators for capability detection.

```typescript
import { capabilityQuery } from 'blecsd';

// Primary Device Attributes (DA1)
const da1 = capabilityQuery.primaryDA();  // '\x1b[c'

// Secondary Device Attributes (DA2)
const da2 = capabilityQuery.secondaryDA();  // '\x1b[>c'

// XTVERSION query
const xtversion = capabilityQuery.xtversion();  // '\x1b[>q'

// Kitty keyboard protocol query
const kitty = capabilityQuery.kittyKeyboard();  // '\x1b[?u'
```

---

## Types

### TerminalCapabilities

```typescript
interface TerminalCapabilities {
  /** True if terminal supports 24-bit RGB colors */
  readonly truecolor: boolean;

  /** Kitty keyboard protocol level, or false if not supported */
  readonly kittyKeyboard: KittyKeyboardLevelValue | false;

  /** Graphics protocol supported, or false if none */
  readonly graphics: GraphicsProtocolValue | false;

  /** True if terminal supports focus events */
  readonly focusEvents: boolean;

  /** True if terminal supports bracketed paste mode */
  readonly bracketedPaste: boolean;

  /** True if terminal supports synchronized output */
  readonly synchronizedOutput: boolean;

  /** True if terminal supports OSC 8 hyperlinks */
  readonly hyperlinks: boolean;

  /** True if terminal supports styled underlines */
  readonly styledUnderlines: boolean;

  /** Primary DA response if available */
  readonly primaryDA: PrimaryDAResponse | null;

  /** Secondary DA response if available */
  readonly secondaryDA: SecondaryDAResponse | null;

  /** Terminal type identifier from DA2 */
  readonly terminalType: number | null;

  /** Firmware version from DA2 */
  readonly firmwareVersion: number | null;
}
```

### NegotiatorConfig

```typescript
interface NegotiatorConfig {
  /** Query timeout in milliseconds (default: 100) */
  readonly timeout?: number;

  /** Negotiation timing strategy (default: eager) */
  readonly timing?: NegotiationTimingValue;

  /** Custom input stream (default: process.stdin) */
  readonly input?: NodeJS.ReadableStream;

  /** Custom output stream (default: process.stdout) */
  readonly output?: NodeJS.WritableStream;

  /** Force specific capabilities (for testing) */
  readonly forceCapabilities?: Partial<TerminalCapabilities>;
}
```

---

## Environment Detection

The module automatically detects capabilities from environment variables:

| Environment Variable | Detected Capability |
|---------------------|-------------------|
| `COLORTERM=truecolor` | truecolor |
| `COLORTERM=24bit` | truecolor |
| `KITTY_WINDOW_ID` | truecolor, kittyKeyboard, graphics (kitty), synchronizedOutput, hyperlinks |
| `TERM_PROGRAM=iTerm.app` | truecolor, graphics (iterm2), hyperlinks |
| `TERM_PROGRAM=WezTerm` | kittyKeyboard, synchronizedOutput |
| `TERM=alacritty` | truecolor |
| `WT_SESSION` | truecolor, synchronizedOutput |
| `VTE_VERSION >= 3600` | truecolor |
| `VTE_VERSION >= 5000` | hyperlinks |
| `TERM=foot` | kittyKeyboard |

---

## Examples

### Basic Usage

```typescript
import { getTerminalCapabilities } from 'blecsd';

async function setupTerminal() {
  const caps = await getTerminalCapabilities();

  if (caps.truecolor) {
    console.log('Using 24-bit color mode');
  } else {
    console.log('Falling back to 256 colors');
  }

  if (caps.synchronizedOutput) {
    console.log('Using synchronized output for flicker-free rendering');
  }
}
```

### Custom Negotiation

```typescript
import { createCapabilityNegotiator, NegotiationTiming } from 'blecsd';

// Lazy negotiation with longer timeout
const negotiator = createCapabilityNegotiator({
  timing: NegotiationTiming.LAZY,
  timeout: 500,
});

// Capabilities are queried on first access
const caps = await negotiator.getCapabilities();

// Clean up when done
negotiator.destroy();
```

### Skip Active Queries

```typescript
import { createCapabilityNegotiator, NegotiationTiming } from 'blecsd';

// Use only environment detection (no terminal queries)
const negotiator = createCapabilityNegotiator({
  timing: NegotiationTiming.SKIP,
});

// Returns immediately with environment-detected capabilities
const caps = await negotiator.getCapabilities();
```

### Testing with Forced Capabilities

```typescript
import { createCapabilityNegotiator, GraphicsProtocol, KittyKeyboardLevel } from 'blecsd';

// Force specific capabilities for testing
const negotiator = createCapabilityNegotiator({
  timing: 'skip',
  forceCapabilities: {
    truecolor: true,
    kittyKeyboard: KittyKeyboardLevel.REPORT_ALL,
    graphics: GraphicsProtocol.KITTY,
    synchronizedOutput: true,
  },
});

const caps = await negotiator.getCapabilities();
// All forced capabilities are now set
```

### Re-negotiation on Terminal Change

```typescript
import { getDefaultNegotiator } from 'blecsd';

const negotiator = getDefaultNegotiator();

// Initial capabilities
let caps = await negotiator.getCapabilities();

// Handle SIGWINCH (terminal resize/move)
process.on('SIGWINCH', async () => {
  // Re-negotiate capabilities
  caps = await negotiator.renegotiate();
  console.log('Capabilities updated');
});
```

---

## See Also

- [Terminal Detection](./detection.md) - Basic terminal detection
- [Response Parser](./response-parser.md) - Parsing terminal responses
- [Terminfo (Tput)](./terminfo.md) - Terminal capabilities via terminfo
