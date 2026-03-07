# ProgressBar Component

The ProgressBar component provides visual progress indication with customizable appearance. It supports both horizontal and vertical orientations.

## Import

```typescript
import {
  attachProgressBarBehavior,
  isProgressBar,
  getProgress,
  setProgress,
  incrementProgress,
  decrementProgress,
  completeProgress,
  getProgressPercentage,
  onProgressChange,
  onProgressComplete,
  setProgressBarDisplay,
  renderProgressString,
  ProgressOrientation,
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, setProgress, onProgressComplete } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach progress bar behavior
attachProgressBarBehavior(world, eid, {
  min: 0,
  max: 100,
  value: 0,
});

// Listen for completion
onProgressComplete(eid, () => {
  console.log('Download complete!');
});

// Update progress
setProgress(world, eid, 50);
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `value` | `number` | `0` | Initial value |
| `orientation` | `ProgressOrientation` | `Horizontal` | Bar direction |
| `showPercentage` | `boolean` | `false` | Show percentage text |

## Orientation

```typescript
import { ProgressOrientation, attachProgressBarBehavior } from 'blecsd/components';

// Horizontal (default)
attachProgressBarBehavior(world, eid, {
  orientation: ProgressOrientation.Horizontal,
});

// Vertical
attachProgressBarBehavior(world, eid, {
  orientation: ProgressOrientation.Vertical,
});
```

## Display Configuration

Default appearance:
- Fill character: `█`
- Empty character: `░`

Customize with:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, setProgressBarDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 0 });

setProgressBarDisplay(world, eid, {
  fillChar: '▓',
  emptyChar: '░',
  fillFg: 0x00ff00ff,
  fillBg: 0x000000ff,
  emptyFg: 0x666666ff,
  emptyBg: 0x000000ff,
});
```

## Functions

### Behavior Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, isProgressBar, ProgressOrientation } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach with options
attachProgressBarBehavior(world, eid, {
  min: 0,
  max: 100,
  value: 25,
  orientation: ProgressOrientation.Horizontal,
  showPercentage: true,
});

// Check if entity is progress bar
if (isProgressBar(world, eid)) {
  // Handle progress bar
}
```

### Value Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, getProgress, setProgress, incrementProgress, decrementProgress, completeProgress, resetProgress } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 25 });

// Get current value
const value = getProgress(eid);

// Set value
setProgress(world, eid, 50);

// Increment by amount
incrementProgress(world, eid, 10);

// Decrement by amount
decrementProgress(world, eid, 5);

// Set to max (complete)
completeProgress(world, eid);

// Reset to min
resetProgress(world, eid);
```

### Range Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, getProgressMin, getProgressMax, getProgressPercentage, setProgressRange, isProgressComplete } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Get min/max
const min = getProgressMin(eid);
const max = getProgressMax(eid);

// Get percentage (0-1)
const pct = getProgressPercentage(eid);

// Set range
setProgressRange(world, eid, 0, 200);

// Check if complete
if (isProgressComplete(eid)) {
  // Progress reached max
}
```

### Orientation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, getProgressOrientation, setProgressOrientation, ProgressOrientation } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 0 });

// Get orientation
const orient = getProgressOrientation(eid);

// Set orientation
setProgressOrientation(world, eid, ProgressOrientation.Vertical);
```

### Display

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, setShowPercentage, isShowingPercentage, getProgressFillChar, getProgressEmptyChar, setProgressBarDisplay, getProgressBarDisplay, clearProgressBarDisplay, renderProgressString } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Show/hide percentage
setShowPercentage(world, eid, true);
if (isShowingPercentage(eid)) {
  // Include percentage in render
}

// Get fill character based on orientation
const fillChar = getProgressFillChar(eid);
const emptyChar = getProgressEmptyChar(eid);

// Set display configuration first
setProgressBarDisplay(world, eid, {
  fillChar: '█',
  emptyChar: '░',
  fillFg: 0x00ff00ff,
});

// Get display configuration
const display = getProgressBarDisplay(eid);

// Clear display (revert to defaults)
clearProgressBarDisplay(eid);

// Render to string
const str = renderProgressString(eid, 20);
// Returns: "██████████░░░░░░░░░░" (50%)
```

### Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, onProgressChange, onProgressComplete, clearProgressBarCallbacks } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachProgressBarBehavior(world, eid, { min: 0, max: 100, value: 0 });

// Value changed
const unsub1 = onProgressChange(eid, (value, percentage) => {
  console.log(`Progress: ${percentage * 100}%`);
});

// Progress completed (reached max)
const unsub2 = onProgressComplete(eid, () => {
  console.log('Complete!');
});

// Cleanup
unsub1();
unsub2();

// Clear all callbacks
clearProgressBarCallbacks(eid);
```

## Example: Download Progress

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachProgressBarBehavior,
  setProgress,
  onProgressChange,
  onProgressComplete,
  setProgressBarDisplay,
} from 'blecsd/components';

const world = createWorld();
const downloadProgress = addEntity(world);

attachProgressBarBehavior(world, downloadProgress, {
  min: 0,
  max: 100,
  showPercentage: true,
});

setProgressBarDisplay(world, downloadProgress, {
  fillChar: '█',
  emptyChar: '░',
  fillFg: 0x0088ffff,
});

onProgressChange(downloadProgress, (value, pct) => {
  console.log(`Downloading: ${Math.round(pct * 100)}%`);
});

onProgressComplete(downloadProgress, () => {
  console.log('Download complete!');
});

// Simulate download
async function download() {
  for (let i = 0; i <= 100; i += 10) {
    setProgress(world, downloadProgress, i);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## Example: Multi-bar Progress

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import type { Entity } from 'blecsd/core';
import { attachProgressBarBehavior, setProgressBarDisplay, setProgress } from 'blecsd/components';

const world = createWorld();
const stages = ['Download', 'Extract', 'Install', 'Configure'];
const progressBars: Entity[] = [];

stages.forEach((stage, index) => {
  const bar = addEntity(world);
  attachProgressBarBehavior(world, bar, {
    min: 0,
    max: 100,
  });

  // Color code by stage
  const colors = [0x00aaffff, 0x00ff00ff, 0xffaa00ff, 0xff00ffff];
  setProgressBarDisplay(world, bar, {
    fillFg: colors[index],
  });

  progressBars.push(bar);
});

// Update specific stage
function updateStage(stageIndex: number, progress: number) {
  setProgress(world, progressBars[stageIndex]!, progress);
}
```

## Example: Vertical Health Bar

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachProgressBarBehavior, setProgressBarDisplay, decrementProgress, getProgress, isProgressComplete, ProgressOrientation } from 'blecsd/components';

const world = createWorld();
const healthBar = addEntity(world);

attachProgressBarBehavior(world, healthBar, {
  min: 0,
  max: 100,
  value: 100,
  orientation: ProgressOrientation.Vertical,
});

setProgressBarDisplay(world, healthBar, {
  fillFg: 0xff0000ff,  // Red
  emptyFg: 0x330000ff, // Dark red
});

// Update on damage
function takeDamage(amount: number) {
  decrementProgress(world, healthBar, amount);

  if (isProgressComplete(healthBar) === false && getProgress(healthBar) <= 0) {
    console.log('Game over!');
  }
}
```

## Related

- [Slider Component](./slider.md) - Interactive range selection
- [Loading Widget](../widgets/loading.md) - Indeterminate progress
- [Form Component](./form.md) - Form container

## Namespace API

The `progressBar` namespace groups all related functions into a single import:

```typescript
import { progressBar } from 'blecsd/components';

// Available methods: attach,is,render,get,set,reset,complete,increment, ...
```

This is equivalent to importing individual functions but provides better discoverability. See the [namespace pattern](../index.md#namespace-pattern) for details.
