# Lazy Initialization API

Startup time optimization through lazy loading and deferred initialization. Subsystems are initialized on first use rather than at import time, enabling fast time-to-first-render. Also provides terminal capability detection with caching.

## Quick Start

```typescript
import { lazy, registerSubsystem, InitPriority, initSubsystemsUpTo } from 'blecsd';

// Create a lazy value
const config = lazy(() => parseTerminfo());
const value = config.get(); // Only computed on first call

// Register subsystems with priority
registerSubsystem('input', InitPriority.CRITICAL, () => setupInput());
registerSubsystem('debug', InitPriority.LOW, () => setupDebug());

// Initialize critical systems first for fast startup
initSubsystemsUpTo(InitPriority.CRITICAL);

// Later, initialize everything else
initSubsystemsUpTo(InitPriority.LOW);
```

## Types

### InitPriority

Initialization priority levels. Systems are initialized in priority order.

```typescript
const InitPriority = {
  CRITICAL: 0,  // Input handling, must be ready immediately
  HIGH: 1,      // Rendering, layout
  NORMAL: 2,    // Widgets, interactions
  LOW: 3,       // Debugging, profiling, optional features
} as const;

type InitPriorityLevel = 0 | 1 | 2 | 3;
```

### LazyInitFn

```typescript
type LazyInitFn<T> = () => T;
```

### LazyValue

```typescript
interface LazyValue<T> {
  get(): T;
  isInitialized(): boolean;
  reset(): void;
}
```

### SubsystemEntry

```typescript
interface SubsystemEntry {
  readonly name: string;
  readonly priority: InitPriorityLevel;
  init(): void;
  readonly initialized: boolean;
  readonly initTimeMs: number | null;
}
```

### StartupReport

```typescript
interface StartupReport {
  readonly totalMs: number;
  readonly subsystems: readonly {
    readonly name: string;
    readonly priority: InitPriorityLevel;
    readonly initTimeMs: number;
    readonly lazy: boolean;
  }[];
  readonly timeToFirstInit: number;
}
```

### TerminalCapabilities

```typescript
interface TerminalCapabilities {
  readonly term: string;
  readonly trueColor: boolean;
  readonly color256: boolean;
  readonly unicode: boolean;
  readonly width: number;
  readonly height: number;
  readonly cachedAt: number;
}
```

## Lazy Value Functions

### lazy

Creates a lazily initialized value that is computed on first access.

```typescript
function lazy<T>(factory: LazyInitFn<T>): LazyValue<T>;
```

```typescript
import { lazy } from 'blecsd';

const expensiveConfig = lazy(() => {
  return parseTerminfo(); // Only runs on first .get()
});

const config = expensiveConfig.get();
console.log(expensiveConfig.isInitialized()); // true
expensiveConfig.reset(); // Back to uninitialized
```

## Subsystem Registry Functions

### registerSubsystem

Registers a subsystem for managed initialization. Duplicate names are ignored.

```typescript
function registerSubsystem(name: string, priority: InitPriorityLevel, initFn: () => void): void;
```

### initSubsystem

Initializes a specific subsystem by name.

```typescript
function initSubsystem(name: string): number | null;
```

**Returns:** Time taken in ms, or null if not found or already initialized.

### initSubsystemsUpTo

Initializes all subsystems up to and including the given priority level, in priority order.

```typescript
function initSubsystemsUpTo(maxPriority?: InitPriorityLevel): number;
```

**Returns:** Total time taken in ms.

```typescript
import { initSubsystemsUpTo, InitPriority } from 'blecsd';

// Fast startup: only critical systems
initSubsystemsUpTo(InitPriority.CRITICAL);

// Later, initialize everything
initSubsystemsUpTo(InitPriority.LOW);
```

### getStartupReport

Gets a startup timing report.

```typescript
function getStartupReport(): StartupReport;
```

### formatStartupReport

Formats a startup report as a human-readable string.

```typescript
function formatStartupReport(report: StartupReport): string;
```

```typescript
import { getStartupReport, formatStartupReport } from 'blecsd';

const report = getStartupReport();
console.log(formatStartupReport(report));
// Startup Report
// ========================================
// Total init time: 12.3ms
// Time to first init: 0.5ms
//
//   [CRITICAL] input: 2.1ms
//   [HIGH] renderer: 5.4ms
//   [LOW] debug: (lazy)
```

### resetSubsystems

Resets all subsystem registrations. Used for testing.

```typescript
function resetSubsystems(): void;
```

## Terminal Capability Functions

### detectCapabilities

Detects terminal capabilities, using cache if available and recent.

```typescript
function detectCapabilities(maxAge?: number): TerminalCapabilities;
```

**Parameters:**
- `maxAge` - Maximum cache age in ms (default: 60000)

```typescript
import { detectCapabilities } from 'blecsd';

const caps = detectCapabilities();
if (caps.trueColor) {
  enableTrueColorMode();
}
console.log(`Terminal: ${caps.width}x${caps.height}`);
```

### clearCapabilityCache

Clears the terminal capability cache.

```typescript
function clearCapabilityCache(): void;
```

## Usage Example

```typescript
import {
  lazy,
  registerSubsystem,
  InitPriority,
  initSubsystemsUpTo,
  getStartupReport,
  formatStartupReport,
  detectCapabilities,
} from 'blecsd';

// Lazy-load expensive resources
const spriteSheet = lazy(() => loadSpriteSheet('assets/sprites.png'));
const soundBank = lazy(() => loadSounds('assets/sounds/'));

// Register subsystems
registerSubsystem('terminal', InitPriority.CRITICAL, () => {
  const caps = detectCapabilities();
  configureTerminal(caps);
});

registerSubsystem('input', InitPriority.CRITICAL, () => {
  setupInputHandling();
});

registerSubsystem('renderer', InitPriority.HIGH, () => {
  initializeRenderer();
});

registerSubsystem('debug-overlay', InitPriority.LOW, () => {
  setupDebugOverlay();
});

// Staged initialization for fast startup
initSubsystemsUpTo(InitPriority.CRITICAL); // Input ready immediately
renderFirstFrame(); // Can render before everything is loaded
initSubsystemsUpTo(InitPriority.LOW); // Load the rest

// Report
console.log(formatStartupReport(getStartupReport()));
```
