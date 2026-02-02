# Spinner Component

The Spinner component provides animated character sequences for loading indicators and other cyclic animations. Uses the SoA (Structure of Arrays) pattern for efficient storage.

## Overview

```typescript
import { createWorld, addEntity } from 'bitecs';
import { addSpinner, updateSpinner, getSpinnerChar } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Add spinner with default animation
addSpinner(world, entity);

// In game loop
function update(deltaMs: number) {
  updateSpinner(entity, deltaMs);
  const char = getSpinnerChar(entity); // Current frame character
}
```

---

## Spinner Component

The Spinner component stores animation state using SoA for performance.

```typescript
import { Spinner } from 'blecsd';

// Component arrays
Spinner.frame      // Uint8Array   - Current frame index
Spinner.frameCount // Uint8Array   - Total number of frames
Spinner.interval   // Uint16Array  - Time between frames (ms)
Spinner.elapsed    // Float32Array - Accumulated time since last frame
```

---

## Constants

### Spinner Character Sets

Pre-defined character arrays for common spinner styles.

```typescript
import {
  DEFAULT_SPINNER_CHARS,    // ['|', '/', '-', '\\']
  DOTS_SPINNER_CHARS,       // ['.  ', '.. ', '...', ' ..', '  .', '   ']
  BRAILLE_SPINNER_CHARS,    // Unicode braille sequence
  BLOCK_SPINNER_CHARS,      // Unicode block sequence
} from 'blecsd';
```

### Default Interval

```typescript
import { DEFAULT_SPINNER_INTERVAL } from 'blecsd';

// DEFAULT_SPINNER_INTERVAL = 100 (milliseconds)
```

---

## Functions

### addSpinner

Adds a Spinner component to an entity.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { addSpinner, BRAILLE_SPINNER_CHARS } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Default spinner
addSpinner(world, entity);

// Custom spinner
addSpinner(world, entity, {
  frames: BRAILLE_SPINNER_CHARS,
  interval: 80,
});

// Custom frames
addSpinner(world, entity, {
  frames: ['[   ]', '[=  ]', '[== ]', '[===]'],
  interval: 150,
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID
- `options` - Optional configuration
  - `frames` - Array of frame characters (default: DEFAULT_SPINNER_CHARS)
  - `interval` - Animation interval in ms (default: 100)

---

### removeSpinner

Removes a Spinner component from an entity.

```typescript
import { removeSpinner, hasSpinner } from 'blecsd';

removeSpinner(world, entity);
hasSpinner(world, entity); // false
```

---

### hasSpinner

Checks if an entity has a Spinner component.

```typescript
import { hasSpinner, addSpinner } from 'blecsd';

hasSpinner(world, entity); // false

addSpinner(world, entity);
hasSpinner(world, entity); // true
```

---

### getSpinnerChar

Gets the current spinner character for an entity.

```typescript
import { addSpinner, getSpinnerChar } from 'blecsd';

addSpinner(world, entity, { frames: ['A', 'B', 'C'] });

const char = getSpinnerChar(entity); // 'A' (first frame)
```

**Returns:** Current frame character, or empty string if no spinner

---

### getSpinnerData

Gets all spinner data for an entity.

```typescript
import { addSpinner, getSpinnerData } from 'blecsd';

addSpinner(world, entity, {
  frames: ['A', 'B', 'C'],
  interval: 150,
});

const data = getSpinnerData(entity);
// data = {
//   frame: 0,
//   frameCount: 3,
//   interval: 150,
//   elapsed: 0,
//   frames: ['A', 'B', 'C'],
// }
```

**Returns:** `SpinnerData | null`

---

### setSpinnerInterval

Sets the spinner animation interval.

```typescript
import { setSpinnerInterval } from 'blecsd';

setSpinnerInterval(entity, 50);  // Faster
setSpinnerInterval(entity, 200); // Slower
```

---

### setSpinnerFrames

Sets the spinner frame characters.

```typescript
import { setSpinnerFrames, DOTS_SPINNER_CHARS } from 'blecsd';

setSpinnerFrames(entity, DOTS_SPINNER_CHARS);

// Resets frame index if out of bounds
```

---

### advanceSpinnerFrame

Manually advances the spinner to the next frame.

```typescript
import { advanceSpinnerFrame, getSpinnerChar } from 'blecsd';

addSpinner(world, entity, { frames: ['A', 'B', 'C'] });

getSpinnerChar(entity); // 'A'
advanceSpinnerFrame(entity);
getSpinnerChar(entity); // 'B'
advanceSpinnerFrame(entity);
getSpinnerChar(entity); // 'C'
advanceSpinnerFrame(entity);
getSpinnerChar(entity); // 'A' (wraps around)
```

**Returns:** The new frame index

---

### updateSpinner

Updates a spinner's elapsed time and potentially advances the frame. Call this each frame with delta time.

```typescript
import { updateSpinner, getSpinnerChar } from 'blecsd';

addSpinner(world, entity, { interval: 100 });

// Accumulate time
updateSpinner(entity, 50);  // Returns false (not enough time)
updateSpinner(entity, 60);  // Returns true (frame changed at 110ms)

// Check for frame change
const frameChanged = updateSpinner(entity, deltaMs);
if (frameChanged) {
  // Re-render spinner character
}
```

**Parameters:**
- `eid` - Entity ID
- `deltaMs` - Time elapsed since last update (milliseconds)

**Returns:** `boolean` - true if frame changed

---

### resetSpinner

Resets a spinner to its initial state.

```typescript
import { resetSpinner, advanceSpinnerFrame, getSpinnerChar } from 'blecsd';

addSpinner(world, entity, { frames: ['A', 'B', 'C'] });

advanceSpinnerFrame(entity);
advanceSpinnerFrame(entity);
getSpinnerChar(entity); // 'C'

resetSpinner(entity);
getSpinnerChar(entity); // 'A' (back to first frame)
```

---

## Types

### SpinnerOptions

Configuration options for adding a spinner.

```typescript
interface SpinnerOptions {
  frames?: readonly string[];  // Frame characters
  interval?: number;           // Animation interval (ms)
}
```

### SpinnerData

Full spinner data returned by getSpinnerData.

```typescript
interface SpinnerData {
  frame: number;               // Current frame index
  frameCount: number;          // Total frames
  interval: number;            // Animation interval (ms)
  elapsed: number;             // Elapsed time since last frame
  frames: readonly string[];   // Frame characters
}
```

---

## Examples

### Basic Spinner Animation

```typescript
import { createWorld, addEntity } from 'bitecs';
import { addSpinner, updateSpinner, getSpinnerChar } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

addSpinner(world, entity);

let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const deltaMs = now - lastTime;
  lastTime = now;

  if (updateSpinner(entity, deltaMs)) {
    // Frame changed, update display
    const char = getSpinnerChar(entity);
    console.log(`\r${char} Loading...`);
  }

  requestAnimationFrame(gameLoop);
}
```

### Multiple Spinner Styles

```typescript
import {
  addSpinner,
  DEFAULT_SPINNER_CHARS,
  DOTS_SPINNER_CHARS,
  BRAILLE_SPINNER_CHARS,
  BLOCK_SPINNER_CHARS,
} from 'blecsd';

// Classic ASCII spinner
addSpinner(world, entity1, { frames: DEFAULT_SPINNER_CHARS });

// Dots animation
addSpinner(world, entity2, { frames: DOTS_SPINNER_CHARS });

// Unicode braille (smooth animation)
addSpinner(world, entity3, { frames: BRAILLE_SPINNER_CHARS });

// Unicode blocks
addSpinner(world, entity4, { frames: BLOCK_SPINNER_CHARS });
```

### Custom Progress Spinner

```typescript
import { addSpinner, updateSpinner, getSpinnerChar } from 'blecsd';

const progressFrames = [
  '[          ]',
  '[==        ]',
  '[====      ]',
  '[======    ]',
  '[========  ]',
  '[==========]',
  '[  ========]',
  '[    ======]',
  '[      ====]',
  '[        ==]',
];

addSpinner(world, entity, {
  frames: progressFrames,
  interval: 100,
});
```

### Batch Spinner Updates

```typescript
import { updateSpinner, getSpinnerChar } from 'blecsd';

const spinnerEntities = [entity1, entity2, entity3];

function updateAllSpinners(deltaMs: number) {
  for (const eid of spinnerEntities) {
    if (updateSpinner(eid, deltaMs)) {
      // Render updated spinner
      renderSpinner(eid, getSpinnerChar(eid));
    }
  }
}
```

---

## See Also

- [Loading Widget](../widgets/loading.md) - Higher-level loading indicator
- [Animation Component](./animation.md) - Sprite-based animation
- [Content Component](../content.md) - Text content display
