# Throttled Resize

Wraps the base resize handler with throttling and debouncing to prevent overwhelming the system during rapid terminal resize events (e.g., dragging the terminal edge).

Strategy:
- Throttle resize events to a maximum rate (default 30/sec)
- During rapid resize: update dimensions only (skip full relayout)
- On resize end (debounce): perform full relayout

## Quick Start

```typescript
import {
  createThrottledResize,
  throttleResize,
  debounceResize,
} from 'blecsd';

// Full throttled resize handler with ECS world integration
const handler = createThrottledResize(world, (width, height, isFinal) => {
  if (isFinal) {
    performFullLayout(world);
  } else {
    updateDimensions(width, height);
  }
}, { maxRate: 30, debounceMs: 150 });

// Clean up
handler.dispose();
```

## Types

### ThrottledResizeConfig

```typescript
interface ThrottledResizeConfig {
  readonly maxRate: number;            // Max events per second (default: 30)
  readonly debounceMs: number;         // Debounce delay before full relayout (default: 150)
  readonly showIntermediate: boolean;  // Show intermediate state during resize (default: true)
}
```

### ThrottledResizeState

```typescript
interface ThrottledResizeState {
  readonly world: World;
  readonly config: ThrottledResizeConfig;
  readonly isResizing: boolean;
  readonly lastWidth: number;
  readonly lastHeight: number;
  dispose(): void;
}
```

### ResizeCallback

```typescript
type ResizeCallback = (width: number, height: number, isFinal: boolean) => void;
```

## Functions

### createThrottledResize

Creates a throttled resize handler that listens to SIGWINCH. During rapid resize, emits intermediate callbacks at a throttled rate. After resize stops (debounce), emits a final callback for full relayout.

```typescript
function createThrottledResize(
  world: World,
  onResize: ResizeCallback,
  config?: Partial<ThrottledResizeConfig>,
): ThrottledResizeState
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `world` | `World` | The ECS world |
| `onResize` | `ResizeCallback` | Callback for resize events (intermediate and final) |
| `config` | `Partial<ThrottledResizeConfig>` | Optional configuration |

```typescript
import { createThrottledResize } from 'blecsd';

const handler = createThrottledResize(world, (width, height, isFinal) => {
  if (isFinal) {
    performFullLayout(world);
  } else {
    updateDimensions(width, height);
  }
}, { maxRate: 30, debounceMs: 150 });

// Clean up when done
handler.dispose();
```

### throttleResize

Creates a simple throttle function for resize events. Useful when you need just the throttling without the full handler.

```typescript
function throttleResize<T extends (...args: unknown[]) => void>(fn: T, maxRate: number): T
```

```typescript
import { throttleResize } from 'blecsd';

const throttledRender = throttleResize(render, 30);
process.stdout.on('resize', throttledRender);
```

### debounceResize

Creates a debounced resize handler that waits for resize to stop.

```typescript
function debounceResize<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): { fn: T; cancel: () => void }
```

```typescript
import { debounceResize } from 'blecsd';

const { fn: debouncedLayout, cancel } = debounceResize(fullRelayout, 150);
process.stdout.on('resize', debouncedLayout);

// Clean up
cancel();
```

## See Also

- [Resize](./resize.md) - Base resize event handling
