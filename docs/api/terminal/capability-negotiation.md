# Capability Negotiation

Dynamic terminal capability negotiation that queries the terminal for modern features at startup. Detects advanced capabilities like truecolor, Kitty keyboard protocol, graphics protocols, synchronized output, hyperlinks, and styled underlines.

Supports three timing strategies:
- **eager**: Query immediately on creation (default)
- **lazy**: Query on first capability access
- **skip**: Use environment detection only, no escape sequence queries

## Quick Start

```typescript
import {
  createCapabilityNegotiator,
  getTerminalCapabilities,
  hasCapability,
} from 'blecsd';

// Simple: use the default negotiator
const caps = await getTerminalCapabilities();
console.log(`Truecolor: ${caps.truecolor}`);
console.log(`Graphics: ${caps.graphics}`);

// Check a single capability
if (await hasCapability('truecolor')) {
  // Use 24-bit colors
}

// Advanced: custom negotiator
const negotiator = createCapabilityNegotiator({
  timing: 'lazy',
  timeout: 200,
});
const caps2 = await negotiator.getCapabilities();
negotiator.destroy();
```

## Constants

```typescript
import {
  DEFAULT_QUERY_TIMEOUT,
  MIN_QUERY_TIMEOUT,
  MAX_QUERY_TIMEOUT,
  KittyKeyboardLevel,
  GraphicsProtocol,
  NegotiationTiming,
} from 'blecsd';

DEFAULT_QUERY_TIMEOUT; // 100ms
MIN_QUERY_TIMEOUT;     // 10ms
MAX_QUERY_TIMEOUT;     // 5000ms
```

### KittyKeyboardLevel

```typescript
const KittyKeyboardLevel = {
  DISABLED: 0,
  DISAMBIGUATE: 1,
  REPORT_EVENTS: 2,
  REPORT_ALTERNATES: 4,
  REPORT_ALL: 8,
  REPORT_TEXT: 16,
} as const;
```

### GraphicsProtocol

```typescript
const GraphicsProtocol = {
  NONE: 'none',
  KITTY: 'kitty',
  ITERM2: 'iterm2',
  SIXEL: 'sixel',
} as const;
```

### NegotiationTiming

```typescript
const NegotiationTiming = {
  EAGER: 'eager',
  LAZY: 'lazy',
  SKIP: 'skip',
} as const;
```

## Types

### TerminalCapabilities

The full set of detected terminal capabilities.

```typescript
interface TerminalCapabilities {
  readonly truecolor: boolean;
  readonly kittyKeyboard: KittyKeyboardLevelValue | false;
  readonly graphics: GraphicsProtocolValue | false;
  readonly focusEvents: boolean;
  readonly bracketedPaste: boolean;
  readonly synchronizedOutput: boolean;
  readonly hyperlinks: boolean;
  readonly styledUnderlines: boolean;
  readonly primaryDA: PrimaryDAResponse | null;
  readonly secondaryDA: SecondaryDAResponse | null;
  readonly terminalType: number | null;
  readonly firmwareVersion: number | null;
}
```

### NegotiatorConfig

```typescript
interface NegotiatorConfig {
  readonly timeout?: number;                              // Query timeout in ms (default: 100)
  readonly timing?: NegotiationTimingValue;               // Timing strategy (default: 'eager')
  readonly input?: NodeJS.ReadStream;                     // Custom input stream
  readonly output?: NodeJS.WriteStream;                   // Custom output stream
  readonly forceCapabilities?: Partial<TerminalCapabilities>; // Force specific capabilities (testing)
}
```

### CapabilityNegotiator

```typescript
interface CapabilityNegotiator {
  getCapabilities(): Promise<TerminalCapabilities>;
  getCachedCapabilities(): TerminalCapabilities | null;
  renegotiate(): Promise<TerminalCapabilities>;
  isNegotiated(): boolean;
  getTimeout(): number;
  setTimeout(timeout: number): void;
  destroy(): void;
}
```

## Functions

### createCapabilityNegotiator

Creates a capability negotiator that queries the terminal for capabilities and caches the results.

```typescript
function createCapabilityNegotiator(config?: NegotiatorConfig): CapabilityNegotiator
```

```typescript
import { createCapabilityNegotiator } from 'blecsd';

// Eager negotiation (default)
const negotiator = createCapabilityNegotiator();
const caps = await negotiator.getCapabilities();

if (caps.truecolor) {
  console.log('Truecolor supported!');
}
if (caps.kittyKeyboard) {
  console.log(`Kitty keyboard level: ${caps.kittyKeyboard}`);
}

negotiator.destroy();
```

```typescript
// Lazy negotiation
const negotiator = createCapabilityNegotiator({
  timing: 'lazy',
  timeout: 200,
});
const caps = await negotiator.getCapabilities(); // Negotiated on first access
```

```typescript
// Skip negotiation, environment detection only
const negotiator = createCapabilityNegotiator({ timing: 'skip' });
const caps = await negotiator.getCapabilities(); // Returns immediately
```

```typescript
// Force capabilities for testing
const negotiator = createCapabilityNegotiator({
  forceCapabilities: { truecolor: true, kittyKeyboard: 8 },
});
```

### getDefaultNegotiator

Gets the default (singleton) capability negotiator. Creates one with eager timing on first call.

```typescript
function getDefaultNegotiator(): CapabilityNegotiator
```

### resetDefaultNegotiator

Resets the default negotiator. For testing purposes.

```typescript
function resetDefaultNegotiator(): void
```

### getTerminalCapabilities

Gets terminal capabilities using the default negotiator.

```typescript
function getTerminalCapabilities(): Promise<TerminalCapabilities>
```

```typescript
import { getTerminalCapabilities } from 'blecsd';

const caps = await getTerminalCapabilities();
console.log(`Truecolor: ${caps.truecolor}`);
console.log(`Graphics: ${caps.graphics}`);
```

### hasCapability

Checks if a specific capability is supported.

```typescript
function hasCapability(capability: keyof TerminalCapabilities): Promise<boolean>
```

```typescript
import { hasCapability } from 'blecsd';

if (await hasCapability('truecolor')) {
  // Use 24-bit colors
}
```

### capabilityQuery

Query generators for manual terminal probing.

```typescript
const capabilityQuery = {
  primaryDA: () => string,
  secondaryDA: () => string,
  xtversion: () => string,
  kittyKeyboard: () => string,
} as const;
```

## Environment Detection

The negotiator detects capabilities from environment variables before sending any queries:

| Capability | Detection Method |
|-----------|-----------------|
| Truecolor | `COLORTERM=truecolor/24bit`, known terminals (iTerm, Kitty, Alacritty, etc.), VTE 3600+ |
| Kitty Keyboard | `KITTY_WINDOW_ID`, WezTerm, foot terminal |
| Graphics (Kitty) | `KITTY_WINDOW_ID` |
| Graphics (iTerm2) | `TERM_PROGRAM=iTerm.app` |
| Graphics (Sixel) | TERM containing "sixel", DA1 attribute 4 |
| Sync Output | Known modern terminals, Kitty, Windows Terminal |
| Hyperlinks | Known modern terminals, VTE 5000+ |

## Zod Schema

```typescript
import { NegotiatorConfigSchema } from 'blecsd';

NegotiatorConfigSchema.safeParse({ timeout: 200, timing: 'lazy' });
```

## See Also

- [GPU Probe](./gpu-probe.md) - GPU-accelerated terminal detection
- [Kitty Protocol](./kitty-protocol.md) - Kitty keyboard protocol
- [Graphics Backend](./graphics-backend.md) - Terminal graphics protocols
