# GPU Probe

Detects whether the host terminal is GPU-accelerated and reports which optimization strategies are supported. This is the practical approach to GPU rendering for a terminal library: detect the host's capabilities and optimize output accordingly.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  detectGpuCapabilities,
  formatGpuReport,
  wrapSyncOutput,
} from 'blecsd';

const caps = detectGpuCapabilities();

if (caps.isGpuAccelerated) {
  console.log(`GPU terminal: ${caps.terminal}`);
  console.log('Strategies:', caps.strategies.join(', '));
}

// Wrap frame output in synchronized output to prevent tearing
const frame = buildFrameContent();
process.stdout.write(wrapSyncOutput(frame));
```

## Types

### GpuTerminal

Known GPU-accelerated terminal emulators.

```typescript
type GpuTerminal =
  | 'alacritty'
  | 'kitty'
  | 'ghostty'
  | 'warp'
  | 'wezterm'
  | 'contour'
  | 'rio'
  | 'unknown';
```

### GpuCapabilities

GPU rendering capabilities detected from the host terminal.

```typescript
interface GpuCapabilities {
  readonly isGpuAccelerated: boolean;
  readonly terminal: GpuTerminal;
  readonly syncOutput: boolean;
  readonly kittyGraphics: boolean;
  readonly sixelGraphics: boolean;
  readonly unicodeSupport: boolean;
  readonly strategies: readonly RenderStrategy[];
}
```

### RenderStrategy

Rendering strategies recommended based on terminal capabilities.

```typescript
type RenderStrategy =
  | 'sync-output'
  | 'diff-rendering'
  | 'cursor-jump'
  | 'sgr-coalesce'
  | 'kitty-graphics'
  | 'sixel-graphics'
  | 'bulk-scroll';
```

## Functions

### detectGpuCapabilities

Detects GPU-accelerated terminal capabilities from environment variables. This is a synchronous, best-effort detection that checks known environment variables. No escape sequences are sent.

```typescript
function detectGpuCapabilities(): GpuCapabilities
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectGpuCapabilities } from 'blecsd';

const caps = detectGpuCapabilities();
if (caps.isGpuAccelerated) {
  console.log(`GPU terminal detected: ${caps.terminal}`);
  console.log('Strategies:', caps.strategies.join(', '));
}
```

### formatGpuReport

Returns a human-readable report of GPU capabilities.

```typescript
function formatGpuReport(caps: GpuCapabilities): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectGpuCapabilities, formatGpuReport } from 'blecsd';

console.log(formatGpuReport(detectGpuCapabilities()));
```

### syncOutputBegin

Generates the synchronized output begin sequence (CSI ?2026h). Supported by all GPU-accelerated terminals.

```typescript
function syncOutputBegin(): string
```

### syncOutputEnd

Generates the synchronized output end sequence (CSI ?2026l).

```typescript
function syncOutputEnd(): string
```

### wrapSyncOutput

Wraps content in synchronized output sequences. This prevents tearing when the terminal redraws mid-frame.

```typescript
function wrapSyncOutput(content: string): string
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { wrapSyncOutput } from 'blecsd';

const frame = buildFrameContent();
process.stdout.write(wrapSyncOutput(frame));
```

## Terminal Detection

The probe detects terminals by checking environment variables:

| Terminal | Detection Method |
|----------|-----------------|
| Alacritty | `ALACRITTY_LOG` or `ALACRITTY_SOCKET` |
| Kitty | `KITTY_PID` or `KITTY_WINDOW_ID` |
| Ghostty | `GHOSTTY_RESOURCES_DIR` |
| Warp | `TERM_PROGRAM=WarpTerminal` |
| WezTerm | `TERM_PROGRAM=WezTerm` |
| Contour | `TERM_PROGRAM=contour` |
| Rio | `TERM_PROGRAM=rio` |

## See Also

- [Capability Negotiation](./capability-negotiation.md) - Dynamic terminal capability detection
- [Optimized Output](./optimized-output.md) - Output buffer with escape sequence optimization
