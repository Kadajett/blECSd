# Kitty Keyboard Protocol

Implements the Kitty keyboard protocol for modern keyboard disambiguation with key release events. Provides progressive enhancement with legacy fallback, ESC vs Alt-key disambiguation, and rich modifier support (including Super, Hyper, CapsLock, NumLock).

See the [Kitty keyboard protocol specification](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) for the full protocol reference.

## Quick Start

```typescript
import {
  KittyFlags,
  generatePushSequence,
  generatePopSequence,
  generateQuerySequence,
  parseKittyKeyEvent,
  parseKittyQueryResponse,
  kittyKeyToName,
  createKittyConfig,
  createKittyProtocolState,
  activateProtocol,
  deactivateProtocol,
} from 'blecsd';

// Enable Kitty keyboard protocol
const flags = KittyFlags.DISAMBIGUATE | KittyFlags.REPORT_EVENTS;
process.stdout.write(generatePushSequence(flags));

// Parse incoming key events
const event = parseKittyKeyEvent(buffer);
if (event) {
  const name = kittyKeyToName(event);
  console.log(`${event.eventType}: ${name}`);
  if (event.isRelease) {
    console.log('Key released');
  }
}

// Disable when done
process.stdout.write(generatePopSequence());
```

## Types

### KittyProtocolLevel

Protocol enhancement level flags (can be combined with bitwise OR).

```typescript
type KittyProtocolLevel = 0 | 1 | 2 | 4 | 8 | 16;
```

### KittyFlags

```typescript
const KittyFlags = {
  NONE: 0,             // Disabled (legacy mode)
  DISAMBIGUATE: 1,     // Disambiguate escape codes
  REPORT_EVENTS: 2,    // Report press/repeat/release
  REPORT_ALTERNATE: 4, // Report alternate keys
  REPORT_ALL: 8,       // Report all keys as escape codes
  REPORT_TEXT: 16,     // Report associated text
} as const;
```

### KittyEventType

```typescript
type KittyEventType = 'press' | 'repeat' | 'release';
```

### KittyModifiers

Extended modifier information with left/right distinction.

```typescript
interface KittyModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly super: boolean;
  readonly hyper: boolean;
  readonly meta: boolean;
  readonly capsLock: boolean;
  readonly numLock: boolean;
}
```

### KittyKeyEvent

Extended key event from the Kitty keyboard protocol.

```typescript
interface KittyKeyEvent {
  readonly keyCode: number;                   // Unicode codepoint
  readonly shiftedKey: number | undefined;    // Shifted key codepoint
  readonly baseKey: number | undefined;       // Base layout key codepoint
  readonly eventType: KittyEventType;
  readonly isRepeat: boolean;
  readonly isRelease: boolean;
  readonly text: string;                      // Text produced by this key
  readonly modifiers: KittyModifiers;
  readonly rawParams: string;                 // Raw CSI parameters
}
```

### KittyConfig

```typescript
interface KittyConfig {
  readonly flags: number;       // Protocol flags (default: DISAMBIGUATE | REPORT_EVENTS)
  readonly escTimeout: number;  // ESC disambiguation timeout in ms (default: 50)
}
```

### KittyProtocolState

```typescript
interface KittyProtocolState {
  readonly active: boolean;
  readonly pushedFlags: number;
  readonly detectedLevel: number | undefined;
}
```

## Functions

### Escape Sequence Generation

#### generatePushSequence

Generates the CSI sequence to enable (push) Kitty keyboard mode.

```typescript
function generatePushSequence(flags: number): string
```

```typescript
import { generatePushSequence, KittyFlags } from 'blecsd';

const seq = generatePushSequence(KittyFlags.DISAMBIGUATE | KittyFlags.REPORT_EVENTS);
process.stdout.write(seq);
```

#### generatePopSequence

Generates the CSI sequence to disable (pop) Kitty keyboard mode.

```typescript
function generatePopSequence(): string
```

#### generateQuerySequence

Generates the CSI sequence to query the current keyboard mode.

```typescript
function generateQuerySequence(): string
```

### Parsing

#### isKittyResponse

Checks if a buffer contains a Kitty protocol query response.

```typescript
function isKittyResponse(buffer: Uint8Array): boolean
```

#### parseKittyQueryResponse

Parses a query response to extract supported flags.

```typescript
function parseKittyQueryResponse(buffer: Uint8Array): number | undefined
```

```typescript
import { parseKittyQueryResponse, KittyFlags } from 'blecsd';

const flags = parseKittyQueryResponse(responseBuffer);
if (flags !== undefined && (flags & KittyFlags.REPORT_EVENTS)) {
  console.log('Key release events supported');
}
```

#### isKittyKeyEvent

Checks if a buffer contains a Kitty keyboard event (CSI ... u or CSI ... ~).

```typescript
function isKittyKeyEvent(buffer: Uint8Array): boolean
```

#### parseKittyKeyEvent

Parses a Kitty keyboard event from a buffer.

```typescript
function parseKittyKeyEvent(buffer: Uint8Array): KittyKeyEvent | undefined
```

```typescript
import { parseKittyKeyEvent } from 'blecsd';

const event = parseKittyKeyEvent(buffer);
if (event?.isRelease) {
  console.log('Key released:', String.fromCodePoint(event.keyCode));
}
```

#### kittyKeyToName

Converts a Kitty key event to a human-readable key name. Handles special keys, function keys, keypad keys, modifier keys, and printable characters.

```typescript
function kittyKeyToName(event: KittyKeyEvent): string
```

```typescript
import { parseKittyKeyEvent, kittyKeyToName } from 'blecsd';

const event = parseKittyKeyEvent(buffer);
if (event) console.log(kittyKeyToName(event)); // e.g., 'a', 'escape', 'f1'
```

### State Management

#### createKittyConfig

Creates a Kitty protocol configuration with defaults.

```typescript
function createKittyConfig(config?: Partial<KittyConfig>): KittyConfig
```

#### createKittyProtocolState

Creates initial protocol state.

```typescript
function createKittyProtocolState(): KittyProtocolState
```

#### updateProtocolState

Updates protocol state after a query response.

```typescript
function updateProtocolState(state: KittyProtocolState, detectedFlags: number): KittyProtocolState
```

#### activateProtocol

Activates the protocol (after push sequence sent).

```typescript
function activateProtocol(state: KittyProtocolState, flags: number): KittyProtocolState
```

#### deactivateProtocol

Deactivates the protocol (after pop sequence sent).

```typescript
function deactivateProtocol(state: KittyProtocolState): KittyProtocolState
```

### Detection

#### isKittySupported

Checks if Kitty keyboard protocol is supported based on capabilities.

```typescript
function isKittySupported(capabilities: { kittyKeyboard: number | false }): boolean
```

## See Also

- [Key Parser](./key-parser.md) - Legacy ANSI key event parsing
- [Capability Negotiation](./capability-negotiation.md) - Detecting terminal capabilities
