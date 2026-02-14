# Terminal Graphics Capability Negotiation Protocol
## RFC-Style Proposal for Standardized Graphics Discovery

### 1. Abstract

This proposal defines a standardized protocol for terminal emulators to advertise their graphics capabilities to client applications. The Graphics Capability Request/Response (GCREQ/GCRES) protocol enables applications to query terminal support for Sixel, Kitty graphics protocol, iTerm2 inline images, and related features through a single, reliable mechanism. This eliminates the need for fragile heuristic-based detection and enables graceful degradation across diverse terminal environments.

**Key benefits:**
- Eliminates unreliable environment variable probing
- Provides structured, machine-readable capability data
- Backward compatible with existing terminals
- Enables future graphics protocol extensions without breaking changes

### 2. Problem Statement

Modern terminal applications require graphics capabilities (inline images, animations, transparency) but lack a standardized way to discover what a given terminal supports. This forces applications to use fragile, unreliable detection methods:

#### 2.1 Current Detection Methods and Their Problems

| Method | Example | Problem |
|--------|---------|---------|
| **TERM_PROGRAM env var** | `TERM_PROGRAM=iTerm.app` | Not standardized; not always set; can be spoofed; doesn't indicate specific capabilities |
| **KITTY_WINDOW_ID env var** | `KITTY_WINDOW_ID=1` | Kitty-specific; other terminals don't set it; presence doesn't guarantee graphics support |
| **Test sequence probing** | Send `\x1b_Ga=q,i=1\x1b\\` and wait for response | Slow (200-500ms timeout); unreliable (some terminals silently ignore); pollutes output on failure |
| **DA1/DA2/DA3 queries** | `CSI c`, `CSI > c`, `CSI = c` | Only identifies VT emulation level, not graphics protocols; limited response codes |
| **XTVERSION** | `CSI > q` | Returns terminal name/version string; requires parsing arbitrary strings; no structured capability data |
| **Terminal type sniffing** | Parse `$TERM` variable | Only indicates terminfo database entry; `xterm-256color` could be any of 50+ terminals |

#### 2.2 Real-World Detection Code (blECSd Example)

Current blECSd detection logic requires multiple fallbacks:

```typescript
// Step 1: Check environment variables (unreliable)
const termProgram = process.env.TERM_PROGRAM;
const termVersion = process.env.TERM_PROGRAM_VERSION;
const kittyWindowId = process.env.KITTY_WINDOW_ID;

if (kittyWindowId) {
  // Assume Kitty graphics protocol, but no way to know:
  // - Max image dimensions
  // - Animation support
  // - Compression format support
  return { protocol: 'kitty', /* ...guessed defaults */ };
}

// Step 2: Try test sequence (slow, unreliable)
const testResponse = await sendSequenceWithTimeout(
  '\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\',
  250 // ms
);

if (testResponse?.includes('OK')) {
  // Kitty responded, but still don't know max dimensions, etc.
  return { protocol: 'kitty' };
}

// Step 3: XTVERSION query (parsing nightmare)
const version = await queryXTVERSION();
if (version?.includes('WezTerm')) {
  // WezTerm supports both Sixel and iTerm2...
  // but which should we use? What are the limits?
  return { protocols: ['sixel', 'iterm2'] };
}

// Step 4: Give up, use ASCII art
return { protocol: 'none' };
```

#### 2.3 Problems This Creates

1. **Slow startup**: Multiple sequential queries with timeouts (500ms+ total)
2. **False negatives**: Terminal supports graphics but detection fails
3. **False positives**: Detection succeeds but terminal has bugs/limitations
4. **Wasted resources**: Applications send graphics that terminals can't display
5. **Degraded UX**: Applications fall back to ASCII when graphics would work
6. **Maintenance burden**: Every application reimplements heuristic detection
7. **Version drift**: New terminal releases break detection assumptions

### 3. Current Landscape

Terminal graphics support is fragmented across emulators:

| Terminal | Sixel | Kitty | iTerm2 | Unicode Block | Notes |
|----------|-------|-------|--------|---------------|-------|
| **kitty** | ✓ | ✓ | ✗ | ✓ | Full Kitty protocol, Sixel via `kitten icat` |
| **iTerm2** | ✗ | ✗ | ✓ | ✓ | Proprietary inline images protocol |
| **WezTerm** | ✓ | ✓ | ✓ | ✓ | Supports all three major protocols |
| **foot** | ✓ | ✗ | ✗ | ✓ | Sixel-only, fast and lightweight |
| **mlterm** | ✓ | ✗ | ✗ | ✓ | High-quality Sixel renderer |
| **xterm** | ✓* | ✗ | ✗ | ✓ | Compile-time option, often disabled |
| **alacritty** | ✗ | ✗ | ✗ | ✓ | No graphics support (as of v0.13) |
| **contour** | ✓ | ✗ | ✗ | ✓ | Sixel with modern architecture |
| **konsole** | ✓ | ✗ | ✗ | ✓ | Sixel support added in KDE Frameworks 5.92 |
| **mintty** | ✓ | ✗ | ✗ | ✓ | Windows terminal with Sixel |
| **tmux** | ✓* | ✓* | ✓* | ✓ | Passthrough mode required (varies by version) |

*Notes:*
- **xterm**: Sixel support must be compiled with `--enable-sixel-graphics`
- **tmux**: Graphics passthrough added in v3.3+ via `allow-passthrough on`
- **Unicode Block**: All modern terminals support block/shade/braille characters
- Feature detection tells applications which protocols to attempt and expected limitations

### 4. Proposed Protocol

The Graphics Capability Request/Response (GCREQ/GCRES) protocol uses a new Operating System Command (OSC) sequence for querying capabilities and a structured response format.

#### 4.1 Graphics Capability Request (GCREQ)

**Sequence**: `OSC 7777 ; ? ST`

- **Full byte sequence**: `\x1b ] 7777 ; ? \x1b \\`
  - `\x1b ]` = OSC (Operating System Command)
  - `7777` = Graphics capability query command number
  - `;` = Parameter separator
  - `?` = Query indicator
  - `\x1b \\` = ST (String Terminator)

**Alternative C1 format**: `\x9d 7777 ; ? \x9c`
  - `\x9d` = OSC as single C1 byte
  - `\x9c` = ST as single C1 byte

**Rationale for OSC 7777**:
- OSC sequences are designed for terminal-to-host communication
- 7777 is currently unallocated in common terminal emulators
- Higher numbers (7000+) are typically reserved for terminal-specific extensions
- Applications can easily detect responses without interference from other OSC handlers

**Alternative Design Considered**: `CSI ? 7777 c` (extending DA mechanism)
- **Rejected** because DA sequences are traditionally limited to device attributes
- OSC provides more flexibility for structured data responses
- DA responses are historically terse numeric codes, not key-value pairs

#### 4.2 Graphics Capability Response (GCRES)

**Sequence**: `OSC 7777 ; <capabilities> ST`

**Format**: Semicolon-separated `key=value` pairs

**Example Response**:
```
\x1b]7777;protocols=kitty,sixel;maxw=8192;maxh=8192;depth=24;anim=1;alpha=1;compose=1;cellw=9;cellh=18;unicode=braille,sextant,block\x1b\\
```

**Readable breakdown**:
```
protocols=kitty,sixel    # Supported graphics protocols
maxw=8192                # Maximum image width (pixels)
maxh=8192                # Maximum image height (pixels)
depth=24                 # Color depth (bits per pixel)
anim=1                   # Animation support (boolean)
alpha=1                  # Transparency/alpha channel support
compose=1                # Compositing/layering support
cellw=9                  # Character cell width (pixels)
cellh=18                 # Character cell height (pixels)
unicode=braille,sextant,block  # Unicode graphics character sets
```

#### 4.3 Capability Fields

Complete field specification:

| Field | Type | Required | Description | Valid Values |
|-------|------|----------|-------------|--------------|
| `protocols` | `string[]` | **Yes** | Comma-separated list of supported graphics protocols | `sixel`, `kitty`, `iterm2`, `none` |
| `maxw` | `int` | **Yes** | Maximum image width in pixels | `1` to `65535` |
| `maxh` | `int` | **Yes** | Maximum image height in pixels | `1` to `65535` |
| `depth` | `int` | **Yes** | Color depth in bits per pixel | `1`, `2`, `4`, `8`, `15`, `16`, `24`, `32` |
| `cellw` | `int` | **Yes** | Character cell width in pixels | `1` to `255` |
| `cellh` | `int` | **Yes** | Character cell height in pixels | `1` to `255` |
| `anim` | `bool` | No | Animation support (1=yes, 0=no) | `0`, `1` |
| `alpha` | `bool` | No | Transparency/alpha channel support | `0`, `1` |
| `compose` | `bool` | No | Image compositing/layering support | `0`, `1` |
| `unicode` | `string[]` | No | Supported Unicode graphics character sets | `braille`, `sextant`, `block`, `box`, `shade` |
| `sixel_colors` | `int` | No | Number of Sixel color registers | `2` to `4096` |
| `sixel_geo` | `string` | No | Sixel geometry (WxH) | e.g., `1024x768` |
| `kitty_version` | `int` | No | Kitty graphics protocol version | `1` to `999` |
| `compress` | `string[]` | No | Supported compression formats | `zlib`, `none` |
| `passthrough` | `bool` | No | Whether terminal is a multiplexer with passthrough (tmux, screen) | `0`, `1` |

**Field Encoding Rules**:
- Boolean values: `0` (false) or `1` (true)
- Integer values: decimal ASCII, no leading zeros (except `0` itself)
- String lists: comma-separated, no spaces, case-sensitive
- Missing optional fields: assume sensible defaults (see Section 4.4)

#### 4.4 Default Values for Missing Optional Fields

When a terminal omits optional fields, applications should assume:

| Field | Default | Rationale |
|-------|---------|-----------|
| `anim` | `0` | Animations are rare; require explicit support |
| `alpha` | `0` | Transparency requires explicit support |
| `compose` | `0` | Layering is uncommon; assume single-image mode |
| `unicode` | `block,shade` | All modern terminals support basic block/shade |
| `sixel_colors` | `256` | Safe default for most Sixel implementations |
| `compress` | `none` | Uncompressed is universally supported |
| `passthrough` | `0` | Most terminals are not multiplexers |

#### 4.5 Response Validation

Applications MUST validate GCRES responses:

1. **Syntax validation**: Must match `OSC 7777 ; <key=value> [; <key=value>]* ST`
2. **Required fields**: `protocols`, `maxw`, `maxh`, `depth`, `cellw`, `cellh` must be present
3. **Value range checks**: Integers must be in valid ranges (see Section 4.3)
4. **Consistency checks**:
   - If `protocols=none`, other graphics fields should be minimal
   - If `protocols` includes `sixel`, `sixel_colors` and `sixel_geo` are recommended
   - `depth` should be consistent with `protocols` (e.g., Sixel typically uses 8-bit)

Invalid responses MUST be discarded and treated as "no response" (fallback to heuristics).

### 5. Backwards Compatibility

The GCREQ/GCRES protocol is designed for seamless backwards compatibility with existing terminal emulators.

#### 5.1 Behavior in Non-Supporting Terminals

Terminals that do not implement GCREQ/GCRES will:
1. **Receive** `OSC 7777 ; ? ST` sequence
2. **Ignore** it (per ECMA-48: unrecognized OSC commands are silently discarded)
3. **Not respond** (no output, no error)

This is safe because:
- OSC sequences are explicitly designed for extensibility
- The `7777` command number is unallocated in current terminals
- Applications already use timeouts for terminal queries (DA, XTVERSION, etc.)

#### 5.2 Application Detection Flow

Applications use a **query with timeout + fallback** approach:

```
┌─────────────────────────────────────┐
│ Send: OSC 7777 ; ? ST               │
│ Start 250ms timeout timer           │
└─────────────┬───────────────────────┘
              │
              ├─── Response received ────────────────┐
              │    within 250ms                      │
              │                                      ▼
              │                          ┌───────────────────────┐
              │                          │ Parse GCRES response  │
              │                          │ Validate fields       │
              │                          └───────────┬───────────┘
              │                                      │
              │                                      ├─── Valid ────────────┐
              │                                      │                      │
              │                                      │                      ▼
              │                                      │          ┌──────────────────────┐
              │                                      │          │ Use advertised caps  │
              │                                      │          └──────────────────────┘
              │                                      │
              │                                      └─── Invalid ──────────┐
              │                                                             │
              └─── Timeout (no response) ───────────────────────────────────┤
                                                                            │
                                                                            ▼
                                                           ┌────────────────────────────┐
                                                           │ Fallback to heuristics:    │
                                                           │ - Check TERM_PROGRAM       │
                                                           │ - Check KITTY_WINDOW_ID    │
                                                           │ - Query XTVERSION          │
                                                           │ - Probe with test graphics │
                                                           └────────────────────────────┘
```

**Timeout recommendation**: 250ms is sufficient for local terminals; remote/SSH connections may need 500ms-1s.

#### 5.3 Incremental Adoption Path

Applications can adopt GCREQ/GCRES immediately without breaking compatibility:

**Phase 1** (now): Applications query GCREQ, fall back to heuristics on timeout
**Phase 2** (terminal adoption): Terminals implement GCRES, applications get instant detection
**Phase 3** (maturity): Most terminals support GCRES, heuristics are rarely needed
**Phase 4** (future): Heuristic detection code can be deprecated/removed

This allows terminals and applications to adopt independently, at their own pace.

### 6. Security Considerations

The GCREQ/GCRES protocol introduces minimal security risk, but implementations must guard against specific attack vectors.

#### 6.1 Response Injection Attacks

**Attack**: Malicious sequences embedded in pasted text or `cat`'ed files could inject fake GCRES responses:

```bash
# Attacker creates file with embedded response
echo -e "Normal text\n\x1b]7777;protocols=kitty;maxw=99999;...\x1b\\" > evil.txt

# Victim runs application that queries graphics capabilities
# Simultaneously, victim (or automated process) runs:
cat evil.txt

# Application receives fake GCRES and may misbehave
```

**Mitigations**:

1. **Request ID tagging** (recommended):
   - Applications include a random nonce in requests: `OSC 7777 ; ? ; id=<random> ST`
   - Terminals echo the `id` in responses: `OSC 7777 ; id=<random> ; protocols=... ST`
   - Applications reject responses without matching `id`

   ```typescript
   const requestId = crypto.randomUUID();
   send(`\x1b]7777;?;id=${requestId}\x1b\\`);
   // Only accept response with `id=${requestId}`
   ```

2. **Strict response timing**:
   - Only accept GCRES within the timeout window (250ms) after GCREQ
   - Ignore GCRES responses outside of active query periods

3. **Response deduplication**:
   - Only process the first GCRES response per query
   - Ignore subsequent GCRES responses (likely injected)

4. **Input mode awareness**:
   - Query GCREQ during application startup, before accepting user input
   - Do not query while raw terminal input is being processed

#### 6.2 Timing Side-Channels

**Attack**: Malicious applications could infer terminal capabilities by measuring response timing:

```typescript
// Attacker measures how long terminal takes to respond
const start = Date.now();
send('\x1b]7777;?\x1b\\');
// Fast response (< 10ms) = terminal implements GCRES
// Slow timeout (250ms) = terminal does not implement GCRES
const elapsed = Date.now() - start;
// Attacker now knows terminal identity/version
```

**Risk assessment**: Low impact
- Terminal identity is already exposed via TERM, TERM_PROGRAM, XTVERSION
- User fingerprinting is already possible via many other vectors
- Graphics capability detection does not reveal sensitive information

**Mitigations** (if needed):
- Terminals can add random jitter (0-50ms) to response timing
- Applications can ignore timing differences (only use response content)

#### 6.3 Denial of Service

**Attack**: Malicious application floods terminal with GCREQ queries:

```typescript
// Spam terminal with capability queries
while (true) {
  send('\x1b]7777;?\x1b\\');
}
```

**Mitigations**:
- Terminals should rate-limit GCRES responses (e.g., max 10 per second)
- Terminals may cache responses and de-duplicate identical requests
- Query processing should be lightweight (< 1ms CPU time)

#### 6.4 Buffer Overflow

**Attack**: Malicious application sends excessively long GCREQ sequences:

```typescript
send('\x1b]7777;?' + 'A'.repeat(1000000) + '\x1b\\');
```

**Mitigations**:
- Terminals should limit OSC sequence length (e.g., 4KB max)
- Malformed or oversized sequences should be discarded silently
- No dynamic memory allocation based on sequence length

### 7. Reference Implementation

This section provides pseudocode and TypeScript examples for implementing GCREQ/GCRES in blECSd.

#### 7.1 Application-Side Implementation (TypeScript)

```typescript
import { randomUUID } from 'crypto';

/**
 * Graphics capability structure returned by terminal query.
 */
interface GraphicsCapabilities {
  protocols: readonly ('sixel' | 'kitty' | 'iterm2' | 'none')[];
  maxWidth: number;
  maxHeight: number;
  colorDepth: number;
  cellWidth: number;
  cellHeight: number;
  supportsAnimation: boolean;
  supportsAlpha: boolean;
  supportsCompositing: boolean;
  unicodeGraphics: readonly ('braille' | 'sextant' | 'block' | 'box' | 'shade')[];
  sixelColors?: number;
  sixelGeometry?: { width: number; height: number };
  kittyVersion?: number;
  compressionFormats: readonly ('zlib' | 'none')[];
  isPassthrough: boolean;
}

/**
 * Query terminal graphics capabilities using GCREQ/GCRES protocol.
 * Falls back to heuristic detection if terminal doesn't respond.
 */
async function queryGraphicsCapabilities(
  timeoutMs: number = 250
): Promise<GraphicsCapabilities> {
  // Generate unique request ID to prevent injection attacks
  const requestId = randomUUID();

  // Construct GCREQ sequence with request ID
  const gcreq = `\x1b]7777;?;id=${requestId}\x1b\\`;

  // Send query and wait for response
  const response = await sendSequenceWithTimeout(gcreq, timeoutMs);

  // Parse response if received
  if (response) {
    const capabilities = parseGCRES(response, requestId);
    if (capabilities) {
      return capabilities;
    }
  }

  // Fallback to heuristic detection
  return detectGraphicsCapabilitiesHeuristic();
}

/**
 * Parse GCRES response and validate fields.
 */
function parseGCRES(
  response: string,
  expectedRequestId: string
): GraphicsCapabilities | null {
  // Expected format: \x1b]7777;key=value;key=value;...\x1b\\
  const match = response.match(/^\x1b\]7777;(.*?)\x1b\\$/);
  if (!match) {
    return null; // Invalid format
  }

  // Parse key=value pairs
  const fields = new Map<string, string>();
  for (const pair of match[1].split(';')) {
    const [key, value] = pair.split('=', 2);
    if (key && value !== undefined) {
      fields.set(key, value);
    }
  }

  // Validate request ID (prevent injection)
  if (fields.get('id') !== expectedRequestId) {
    return null; // Request ID mismatch
  }

  // Validate required fields
  const protocols = fields.get('protocols')?.split(',') || [];
  const maxw = parseInt(fields.get('maxw') || '', 10);
  const maxh = parseInt(fields.get('maxh') || '', 10);
  const depth = parseInt(fields.get('depth') || '', 10);
  const cellw = parseInt(fields.get('cellw') || '', 10);
  const cellh = parseInt(fields.get('cellh') || '', 10);

  if (
    protocols.length === 0 ||
    !Number.isInteger(maxw) || maxw < 1 ||
    !Number.isInteger(maxh) || maxh < 1 ||
    !Number.isInteger(depth) || depth < 1 ||
    !Number.isInteger(cellw) || cellw < 1 ||
    !Number.isInteger(cellh) || cellh < 1
  ) {
    return null; // Missing or invalid required fields
  }

  // Parse optional fields with defaults
  const anim = fields.get('anim') === '1';
  const alpha = fields.get('alpha') === '1';
  const compose = fields.get('compose') === '1';
  const unicode = fields.get('unicode')?.split(',') || ['block', 'shade'];
  const sixelColors = parseInt(fields.get('sixel_colors') || '256', 10);
  const sixelGeo = fields.get('sixel_geo');
  const kittyVersion = parseInt(fields.get('kitty_version') || '0', 10);
  const compress = fields.get('compress')?.split(',') || ['none'];
  const passthrough = fields.get('passthrough') === '1';

  // Parse Sixel geometry (WxH format)
  let sixelGeometry: { width: number; height: number } | undefined;
  if (sixelGeo) {
    const [w, h] = sixelGeo.split('x').map(Number);
    if (Number.isInteger(w) && Number.isInteger(h)) {
      sixelGeometry = { width: w, height: h };
    }
  }

  return {
    protocols: protocols as GraphicsCapabilities['protocols'],
    maxWidth: maxw,
    maxHeight: maxh,
    colorDepth: depth,
    cellWidth: cellw,
    cellHeight: cellh,
    supportsAnimation: anim,
    supportsAlpha: alpha,
    supportsCompositing: compose,
    unicodeGraphics: unicode as GraphicsCapabilities['unicodeGraphics'],
    sixelColors: protocols.includes('sixel') ? sixelColors : undefined,
    sixelGeometry,
    kittyVersion: protocols.includes('kitty') && kittyVersion > 0 ? kittyVersion : undefined,
    compressionFormats: compress as GraphicsCapabilities['compressionFormats'],
    isPassthrough: passthrough,
  };
}

/**
 * Fallback heuristic detection (existing logic).
 * Used when terminal doesn't support GCREQ/GCRES.
 */
function detectGraphicsCapabilitiesHeuristic(): Promise<GraphicsCapabilities> {
  // Existing blECSd heuristic detection logic
  // (Check TERM_PROGRAM, KITTY_WINDOW_ID, XTVERSION, etc.)
  // ...
}

/**
 * Helper: Send escape sequence to terminal and wait for response.
 */
async function sendSequenceWithTimeout(
  sequence: string,
  timeoutMs: number
): Promise<string | null> {
  // Implementation depends on terminal I/O handling
  // (Read from stdin, write to stdout, set up response handlers)
  // ...
}
```

#### 7.2 Terminal-Side Implementation (Pseudocode)

```
# Terminal emulator receives input stream
function processInputByte(byte):
  if currentState == NORMAL_TEXT:
    if byte == ESC:
      currentState = ESC_RECEIVED
      return
    else:
      displayCharacter(byte)
      return

  if currentState == ESC_RECEIVED:
    if byte == ']':  # OSC start
      currentState = OSC_SEQUENCE
      oscBuffer = ""
      return
    else:
      # Handle other escape sequences (CSI, etc.)
      ...

  if currentState == OSC_SEQUENCE:
    if byte == ESC:
      currentState = OSC_RECEIVED_ESC  # Expect backslash for ST
      return
    elif byte == '\x07':  # BEL can also terminate OSC
      handleOSCSequence(oscBuffer)
      currentState = NORMAL_TEXT
      return
    else:
      oscBuffer += byte
      return

  if currentState == OSC_RECEIVED_ESC:
    if byte == '\\':  # ST (String Terminator)
      handleOSCSequence(oscBuffer)
      currentState = NORMAL_TEXT
      return
    else:
      # Invalid sequence, reset
      currentState = NORMAL_TEXT
      return

# Handle complete OSC sequence
function handleOSCSequence(buffer):
  parts = buffer.split(';')
  command = parts[0]

  if command == "7777":
    # Graphics capability query
    handleGraphicsCapabilityQuery(parts[1:])
    return

  # Handle other OSC commands (title set, color queries, etc.)
  ...

# Generate GCRES response
function handleGraphicsCapabilityQuery(params):
  # Check if this is a query (contains '?')
  if '?' not in params:
    return  # Ignore non-query sequences

  # Extract request ID if present
  requestId = ""
  for param in params:
    if param.startsWith("id="):
      requestId = param.split('=', 1)[1]

  # Build capability response
  response = buildGraphicsCapabilityResponse(requestId)

  # Send response to application
  writeToMaster(response)

# Build GCRES response string
function buildGraphicsCapabilityResponse(requestId):
  caps = []

  # Always include request ID if provided (security)
  if requestId:
    caps.append(f"id={requestId}")

  # Required fields
  caps.append(f"protocols={','.join(SUPPORTED_PROTOCOLS)}")
  caps.append(f"maxw={MAX_IMAGE_WIDTH}")
  caps.append(f"maxh={MAX_IMAGE_HEIGHT}")
  caps.append(f"depth={COLOR_DEPTH}")
  caps.append(f"cellw={CELL_WIDTH_PIXELS}")
  caps.append(f"cellh={CELL_HEIGHT_PIXELS}")

  # Optional fields
  if SUPPORTS_ANIMATION:
    caps.append("anim=1")
  if SUPPORTS_ALPHA:
    caps.append("alpha=1")
  if SUPPORTS_COMPOSITING:
    caps.append("compose=1")

  caps.append(f"unicode={','.join(UNICODE_GRAPHICS_SETS)}")

  if 'sixel' in SUPPORTED_PROTOCOLS:
    caps.append(f"sixel_colors={SIXEL_COLOR_REGISTERS}")
    caps.append(f"sixel_geo={SIXEL_MAX_WIDTH}x{SIXEL_MAX_HEIGHT}")

  if 'kitty' in SUPPORTED_PROTOCOLS:
    caps.append(f"kitty_version={KITTY_PROTOCOL_VERSION}")

  if len(COMPRESSION_FORMATS) > 0:
    caps.append(f"compress={','.join(COMPRESSION_FORMATS)}")

  # Construct response: OSC 7777 ; <caps> ST
  response = f"\x1b]7777;{';'.join(caps)}\x1b\\"
  return response
```

#### 7.3 Example Terminal Responses

**Kitty terminal**:
```
\x1b]7777;id=550e8400-e29b-41d4-a716-446655440000;protocols=kitty,sixel;maxw=8192;maxh=8192;depth=24;anim=1;alpha=1;compose=1;cellw=9;cellh=18;unicode=braille,sextant,block;sixel_colors=256;kitty_version=1;compress=zlib\x1b\\
```

**WezTerm terminal**:
```
\x1b]7777;id=550e8400-e29b-41d4-a716-446655440000;protocols=sixel,kitty,iterm2;maxw=4096;maxh=4096;depth=32;anim=1;alpha=1;compose=1;cellw=8;cellh=16;unicode=braille,sextant,block,box,shade;sixel_colors=256;kitty_version=1;compress=zlib\x1b\\
```

**foot terminal** (Sixel-only):
```
\x1b]7777;id=550e8400-e29b-41d4-a716-446655440000;protocols=sixel;maxw=2048;maxh=2048;depth=8;cellw=8;cellh=16;unicode=braille,block;sixel_colors=256;sixel_geo=2048x2048\x1b\\
```

**alacritty terminal** (no graphics support):
```
\x1b]7777;id=550e8400-e29b-41d4-a716-446655440000;protocols=none;maxw=0;maxh=0;depth=24;cellw=7;cellh=14;unicode=block,shade\x1b\\
```

### 8. Comparison with Existing Mechanisms

This section compares GCREQ/GCRES with existing terminal query mechanisms.

| Mechanism | Purpose | Query Sequence | Response Format | Limitations |
|-----------|---------|----------------|-----------------|-------------|
| **DA1** | Primary Device Attributes | `CSI c` (`\x1b[c`) | `CSI ? <params> c` | VT emulation level only; no graphics info; limited to ~6 numeric codes |
| **DA2** | Secondary Device Attributes | `CSI > c` (`\x1b[>c`) | `CSI > <version> ; <firmware> ; <keyboard> c` | Firmware version; keyboard type; no structured capability data |
| **DA3** | Tertiary Device Attributes | `CSI = c` (`\x1b[=c`) | DCS with unit ID | Rarely implemented; intended for hardware identification |
| **XTVERSION** | XTerm version string | `CSI > q` (`\x1b[>q`) | `DCS > \| <version-string> ST` | Arbitrary text; requires string parsing; no standardized format |
| **DECRQSS** | Request Status String | `DCS $ q <setting> ST` | `DCS 1 $ r <value> ST` | Query specific settings (colors, margins); one setting at a time |
| **XTGETTCAP** | Query terminfo capability | `DCS + q <cap> ST` | `DCS 1 + r <hex-value> ST` | Requires terminfo knowledge; hex-encoded; complex parsing |
| **ENV vars** | Environment metadata | N/A (read `$TERM_PROGRAM`, etc.) | Arbitrary strings | Not always set; spoofable; no capability data |
| **GCREQ/GCRES** | Graphics capabilities | `OSC 7777 ; ? ST` | `OSC 7777 ; key=value ; ... ST` | **None of the above limitations** |

#### 8.1 Why Existing Mechanisms Are Insufficient

**DA1/DA2/DA3**: Designed for VT100-era device identification
- Limited to numeric codes (e.g., `CSI ? 1 ; 2 c` = "VT100 with AVO")
- Cannot express complex capabilities like graphics protocols
- No extensibility without breaking backward compatibility
- Different terminals use overlapping codes inconsistently

**XTVERSION**: Returns unstructured version string
- Example: `DCS > | XTerm(370) ST`
- Requires regex parsing and version-specific logic
- Terminals may return arbitrary strings ("WezTerm 20230712-072601-f4abf8fd")
- No guarantee of capability data (version ≠ features)

**DECRQSS**: Designed for querying terminal settings
- One setting per query (slow for multiple capabilities)
- Limited to settings that have DEC parameter names
- No standard for graphics capability settings
- Response format varies by setting type

**XTGETTCAP**: Queries terminfo database
- Requires knowing exact terminfo capability names (`Ss`, `Se`, `setrgbf`, etc.)
- Response is hex-encoded (e.g., `44 43 53 = "DCS"`)
- Terminfo database may not reflect runtime capabilities
- Not all terminals support XTGETTCAP

**Why GCREQ/GCRES is necessary**:
- Structured, machine-readable format (key=value pairs)
- Extensible without breaking compatibility (add new fields)
- Single query returns all graphics capabilities
- Terminal-agnostic (works across all emulators with or without implementation)

### 9. Adoption Path

This section outlines a realistic roadmap for GCREQ/GCRES adoption across the terminal ecosystem.

#### 9.1 Phase 1: Proposal and Community Review (Months 1-3)

**Goals:**
- Present proposal to terminal emulator maintainers
- Gather feedback on protocol design
- Refine specification based on real-world concerns

**Actions:**
1. **Open issues on key terminal repositories:**
   - [kitty](https://github.com/kovidgoyal/kitty)
   - [WezTerm](https://github.com/wez/wezterm)
   - [foot](https://codeberg.org/dnkl/foot)
   - [iTerm2](https://github.com/gnachman/iTerm2)
   - [alacritty](https://github.com/alacritty/alacritty)
   - [xterm](https://invisible-island.net/xterm/)

2. **Post to mailing lists:**
   - `xterm@invisible-island.net`
   - Terminal emulator community forums/Discord servers

3. **Write reference implementation** in blECSd (application-side)
   - Demonstrates practical usage
   - Proves protocol works with current heuristic fallback

4. **Create test suite:**
   - Test vectors for parsers
   - Malformed input handling
   - Security edge cases

**Metrics:**
- 5+ terminal maintainers provide feedback
- No major blocking concerns raised
- At least one terminal maintainer expresses interest in implementation

#### 9.2 Phase 2: Early Implementation (Months 4-9)

**Goals:**
- Get GCREQ/GCRES working in 1-2 terminals
- Prove the protocol in real-world use
- Identify and fix any unforeseen issues

**Actions:**
1. **Implement in kitty** (ideal first candidate):
   - Already has extensive graphics support
   - Maintainer (Kovid Goyal) is responsive to protocol proposals
   - Large user base provides good testing coverage

2. **Implement in WezTerm** (second candidate):
   - Supports multiple graphics protocols (Sixel, Kitty, iTerm2)
   - Actively developed with modern codebase
   - Cross-platform (Linux, macOS, Windows)

3. **Application-side adoption:**
   - blECSd uses GCREQ/GCRES as primary detection method
   - Other image libraries (notcurses, timg, chafa) add support
   - Terminal-based image viewers adopt the protocol

4. **Documentation and examples:**
   - Write integration guides for application developers
   - Provide copy-paste code snippets for common languages
   - Document terminal-side implementation patterns

**Metrics:**
- 2+ terminals ship with GCREQ/GCRES support
- 3+ applications use GCREQ/GCRES for graphics detection
- Zero critical bugs or security issues found

#### 9.3 Phase 3: Broad Adoption (Months 10-24)

**Goals:**
- GCREQ/GCRES becomes the standard method for graphics detection
- Heuristic fallback is rarely needed
- Libraries default to GCREQ/GCRES

**Actions:**
1. **Expand terminal coverage:**
   - foot, iTerm2, contour, tmux, konsole add support
   - Multiplexers (tmux, screen, zellij) implement passthrough

2. **Application ecosystem adoption:**
   - Image viewers: `timg`, `chafa`, `catimg`, `viu`
   - TUI frameworks: `notcurses`, `ncurses`, `termion`, `crossterm`
   - Plotting libraries: `plotille`, `termplotlib`, `asciichart`
   - Terminal media players: `mpv`, `ffmpeg` (terminal output)

3. **Distro packaging:**
   - Major Linux distributions ship updated terminals with GCREQ/GCRES
   - macOS iTerm2 nightly builds include support
   - Windows Terminal evaluates graphics support + GCREQ/GCRES

**Metrics:**
- 70%+ of active terminal users have GCREQ/GCRES-capable terminal
- 50%+ of graphics-capable applications use GCREQ/GCRES
- Heuristic fallback success rate drops below 30%

#### 9.4 Phase 4: Maturity and Deprecation (Months 24+)

**Goals:**
- GCREQ/GCRES is ubiquitous
- Heuristic detection is legacy code
- New terminals must implement GCREQ/GCRES to be considered "graphics-capable"

**Actions:**
1. **Deprecate heuristic detection:**
   - Applications print warnings when falling back to heuristics
   - Documentation recommends GCREQ/GCRES as only method
   - Legacy detection code moved to compatibility shims

2. **Expand protocol capabilities:**
   - Add new fields for future graphics features (e.g., GPU acceleration, video support)
   - Version the protocol if breaking changes are needed
   - Maintain backward compatibility via protocol negotiation

3. **Standardization:**
   - Submit GCREQ/GCRES to ECMA TC-1 (terminal standards committee)
   - Publish as informational RFC
   - Include in future VT emulation specifications

**Metrics:**
- 95%+ of graphics queries use GCREQ/GCRES
- New terminal emulators implement GCREQ/GCRES from day one
- Heuristic detection code removed from most libraries

#### 9.5 Adoption Challenges and Mitigations

| Challenge | Risk Level | Mitigation |
|-----------|------------|------------|
| **Maintainer pushback** | Medium | Emphasize backward compatibility; offer to contribute patches |
| **OSC number collision** | Low | 7777 is currently unused; willing to change if conflict found |
| **Multiplexer complexity** | Medium | Provide passthrough reference implementation for tmux/screen |
| **Legacy terminal support** | Low | Heuristic fallback ensures no breakage |
| **Security concerns** | Low | Request ID prevents injection; no new attack surface |
| **Testing burden** | Medium | Provide test suite and CI integration examples |
| **Cross-platform differences** | Low | Protocol is OS-agnostic (works on Linux, macOS, Windows, BSD) |

### 10. References

This proposal builds upon decades of terminal standards and modern graphics protocols:

#### 10.1 Terminal Standards

- **ECMA-48** (5th Edition, 1991): Control Functions for Coded Character Sets
  - https://www.ecma-international.org/publications-and-standards/standards/ecma-48/
  - Defines CSI, OSC, DCS sequences and their semantics

- **ISO/IEC 6429:1992**: Control Functions for Coded Character Sets
  - ISO version of ECMA-48 (identical content)

- **VT100 User Guide** (DEC, 1978): Original VT100 terminal specification
  - https://vt100.net/docs/vt100-ug/
  - Established device attribute (DA) query mechanism

- **VT220 Programmer Reference Manual** (DEC, 1984)
  - https://vt100.net/docs/vt220-rm/
  - Introduced DA2 (secondary device attributes)

- **XTerm Control Sequences** (Thomas E. Dickey, ongoing)
  - https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
  - Comprehensive reference for modern terminal escape sequences
  - Documents XTVERSION, DECRQSS, and other query mechanisms

#### 10.2 Graphics Protocol Documentation

- **Kitty Graphics Protocol**
  - https://sw.kovidgoyal.net/kitty/graphics-protocol/
  - Modern bitmap graphics protocol with animation and compositing

- **iTerm2 Inline Images Protocol**
  - https://iterm2.com/documentation-images.html
  - Base64-encoded image embedding via OSC sequences

- **Sixel Graphics Standard**
  - https://en.wikipedia.org/wiki/Sixel
  - DEC VT320 bitmap graphics format (1980s)
  - https://www.vt100.net/docs/vt3xx-gp/chapter14.html (VT330/340 Graphics Programming)

- **ReGIS Graphics** (DEC, 1970s)
  - https://vt100.net/docs/vt3xx-gp/chapter2.html
  - Vector graphics language (historical reference)

#### 10.3 Terminal Emulator Documentation

- **kitty**: https://sw.kovidgoyal.net/kitty/
- **WezTerm**: https://wezfurlong.org/wezterm/
- **foot**: https://codeberg.org/dnkl/foot
- **iTerm2**: https://iterm2.com/
- **alacritty**: https://github.com/alacritty/alacritty
- **xterm**: https://invisible-island.net/xterm/
- **tmux graphics passthrough**: https://github.com/tmux/tmux/wiki/FAQ#how-do-i-use-rgb-colour

#### 10.4 Related Proposals and Discussions

- **Synchronized Output Mode** (OSC 2026):
  - https://gist.github.com/christianparpart/d8a62cc1ab659194337d73e399004036
  - Recent example of successful OSC-based protocol standardization

- **Hyperlinks in Terminals** (OSC 8):
  - https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
  - Widely-adopted OSC extension for clickable URLs

- **Terminal Working Group** (proposal for ongoing standards coordination):
  - https://gitlab.freedesktop.org/terminal-wg/specifications
  - Potential venue for GCREQ/GCRES standardization

#### 10.5 Relevant Academic Work

- **"The TTY demystified"** (Linus Åkesson, 2008)
  - https://www.linusakesson.net/programming/tty/
  - Excellent explanation of terminal I/O architecture

- **"Terminal Emulator Security"** (Andrea Barisani, 2003)
  - Documents historical terminal escape sequence vulnerabilities
  - Informs security considerations in this proposal

---

## Appendix A: Complete Example Exchange

**Application sends GCREQ:**
```
Hex:  1B 5D 37 37 37 37 3B 3F 3B 69 64 3D 35 35 30 65 ...
      38 34 30 30 2D 65 32 39 62 2D 34 31 64 34 2D 61 ...
      37 31 36 2D 34 34 36 36 35 35 34 34 30 30 30 30 ...
      1B 5C

ASCII: ESC ] 7 7 7 7 ; ? ; i d = 5 5 0 e 8 4 0 0 - e 2 9 b ...
       ESC \
```

**Terminal responds with GCRES:**
```
Hex:  1B 5D 37 37 37 37 3B 69 64 3D 35 35 30 65 38 34 ...
      30 30 2D 65 32 39 62 2D 34 31 64 34 2D 61 37 31 ...
      36 2D 34 34 36 36 35 35 34 34 30 30 30 30 3B 70 ...
      72 6F 74 6F 63 6F 6C 73 3D 6B 69 74 74 79 2C 73 ...
      69 78 65 6C 3B 6D 61 78 77 3D 38 31 39 32 3B 6D ...
      61 78 68 3D 38 31 39 32 3B 64 65 70 74 68 3D 32 ...
      34 3B 61 6E 69 6D 3D 31 3B 61 6C 70 68 61 3D 31 ...
      3B 63 6F 6D 70 6F 73 65 3D 31 3B 63 65 6C 6C 77 ...
      3D 39 3B 63 65 6C 6C 68 3D 31 38 3B 75 6E 69 63 ...
      6F 64 65 3D 62 72 61 69 6C 6C 65 2C 73 65 78 74 ...
      61 6E 74 2C 62 6C 6F 63 6B 1B 5C

ASCII: ESC ] 7 7 7 7 ; i d = 5 5 0 e 8 4 0 0 - e 2 9 b ...
       p r o t o c o l s = k i t t y , s i x e l ; ...
       m a x w = 8 1 9 2 ; m a x h = 8 1 9 2 ; ...
       d e p t h = 2 4 ; a n i m = 1 ; a l p h a = 1 ; ...
       c o m p o s e = 1 ; c e l l w = 9 ; c e l l h = 1 8 ; ...
       u n i c o d e = b r a i l l e , s e x t a n t , b l o c k ...
       ESC \
```

**Parsed capabilities:**
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "protocols": ["kitty", "sixel"],
  "maxWidth": 8192,
  "maxHeight": 8192,
  "colorDepth": 24,
  "cellWidth": 9,
  "cellHeight": 18,
  "supportsAnimation": true,
  "supportsAlpha": true,
  "supportsCompositing": true,
  "unicodeGraphics": ["braille", "sextant", "block"]
}
```

---

## Appendix B: ASCII Diagram of Query Flow

```
Application                                Terminal
    |                                          |
    |  OSC 7777 ; ? ; id=<uuid> ST             |
    |----------------------------------------->|
    |                                          |
    |                                          | Parse query
    |                                          | Extract request ID
    |                                          | Build capability response
    |                                          |
    |  OSC 7777 ; id=<uuid> ; protocols=... ST |
    |<-----------------------------------------|
    |                                          |
    | Parse response                           |
    | Validate request ID                      |
    | Extract capabilities                     |
    |                                          |
    | Use advertised graphics protocol         |
    |                                          |
```

**With timeout/fallback:**

```
Application                                Terminal (no GCREQ support)
    |                                          |
    |  OSC 7777 ; ? ; id=<uuid> ST             |
    |----------------------------------------->|
    |                                          | (ignores unknown OSC)
    |                                          |
    | Start 250ms timeout                      |
    | ...waiting...                            |
    | ...waiting...                            |
    | Timeout expires                          |
    |                                          |
    | Fallback to heuristic detection:         |
    | - Check $TERM_PROGRAM                    |
    | - Query XTVERSION                        |
    | - Probe with test graphics               |
    |                                          |
```

---

## Appendix C: Security Test Vectors

**Test 1: Response injection via paste**
```bash
# Attacker creates malicious file
echo -e "Innocent text\n\x1b]7777;protocols=kitty;maxw=9999;...\x1b\\" > inject.txt

# Victim runs application that queries capabilities
app_query_graphics &

# Simultaneously paste malicious content
cat inject.txt

# Expected: Application ignores injected response (wrong/missing request ID)
```

**Test 2: Request ID mismatch**
```
App sends:  \x1b]7777;?;id=aaaa-bbbb-cccc\x1b\\
Terminal:   \x1b]7777;id=aaaa-bbbb-cccc;protocols=...\x1b\\  (valid)
Attacker:   \x1b]7777;id=xxxx-yyyy-zzzz;protocols=...\x1b\\  (rejected)
```

**Test 3: Malformed responses**
```
\x1b]7777;\x1b\\                           # Empty response (rejected: missing required fields)
\x1b]7777;protocols=kitty\x1b\\            # Missing maxw, maxh, etc. (rejected)
\x1b]7777;maxw=999999999999\x1b\\          # Integer overflow (rejected)
\x1b]7777;protocols=<script>alert()</script>\x1b\\  # Injection attempt (rejected)
```

---

**Document Version**: 1.0
**Date**: 2026-02-13
**Author**: blECSd Project
**Status**: Proposal
