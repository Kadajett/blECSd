# Loading Widget

The Loading widget displays an animated spinner with a customizable message. It provides a simple way to show loading or processing state in terminal applications.

## Overview

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading, showLoading, hideLoading } from 'blecsd/widgets';

const world = createWorld();

// Create a loading widget
const loading = createLoading(world, {
  message: 'Processing...',
  x: 10,
  y: 5,
});

// Use convenience functions
const loader = showLoading(world, 'Please wait...');
hideLoading(loader);
```

---

## Constants

### Default Values

```typescript
import { DEFAULT_LOADING_FG, DEFAULT_LOADING_BG } from 'blecsd/widgets';

// DEFAULT_LOADING_FG = 0xffffffff (white)
// DEFAULT_LOADING_BG = 0x00000000 (transparent)
```

### Spinner Character Sets

The Loading widget uses the Spinner component which provides multiple character sets.

```typescript
import {
  DEFAULT_SPINNER_CHARS,
  DOTS_SPINNER_CHARS,
  BRAILLE_SPINNER_CHARS,
  BLOCK_SPINNER_CHARS,
  DEFAULT_SPINNER_INTERVAL,
} from 'blecsd/components';

// DEFAULT_SPINNER_CHARS  = ['|', '/', '-', '\\']
// DOTS_SPINNER_CHARS     = ['.  ', '.. ', '...', ' ..', '  .', '   ']
// BRAILLE_SPINNER_CHARS  = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
// BLOCK_SPINNER_CHARS    = ['▖', '▘', '▝', '▗']
// DEFAULT_SPINNER_INTERVAL = 100 (ms)
```

---

## Factory Function

### createLoading

Creates a new loading widget with the specified configuration.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';
import { BRAILLE_SPINNER_CHARS } from 'blecsd/components';

const world = createWorld();

// Basic loading
const loading = createLoading(world);

// Custom configuration
const customLoading = createLoading(world, {
  message: 'Saving...',
  x: 20,
  y: 10,
  spinnerChars: BRAILLE_SPINNER_CHARS,
  interval: 80,
  visible: true,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional configuration object
  - `x` - X position (default: 0)
  - `y` - Y position (default: 0)
  - `message` - Loading message (default: 'Loading...')
  - `spinnerChars` - Animation characters (default: DEFAULT_SPINNER_CHARS)
  - `interval` - Animation interval in ms (default: 100)
  - `style` - Style configuration with `fg` and `bg` colors
  - `width` - Width (auto-calculated if not specified)
  - `visible` - Initial visibility (default: true)

**Returns:** `LoadingWidget` interface

---

## LoadingWidget Interface

The loading widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
console.log(loading.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the loading widget.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.show();
```

**Returns:** `LoadingWidget` for chaining

#### hide

Hides the loading widget.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.hide();
```

**Returns:** `LoadingWidget` for chaining

#### isVisible

Checks if the loading widget is visible.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
const visible = loading.isVisible(); // boolean
```

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.setPosition(20, 15);
```

**Returns:** `LoadingWidget` for chaining

#### move

Moves the loading widget by a relative amount.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.move(5, -3); // Move right 5, up 3
```

**Returns:** `LoadingWidget` for chaining

#### getPosition

Gets the current position.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
const pos = loading.getPosition();
// pos = { x: 0, y: 0 }
```

---

### Message Methods

#### setMessage

Sets the loading message.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.setMessage('Processing step 2...');
```

**Returns:** `LoadingWidget` for chaining

#### getMessage

Gets the current message.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world, { message: 'Processing step 2...' });
const msg = loading.getMessage(); // 'Processing step 2...'
```

---

### Animation Methods

#### setSpinnerChars

Sets the spinner animation characters.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';
import { BRAILLE_SPINNER_CHARS } from 'blecsd/components';

const world = createWorld();
const loading = createLoading(world);
loading.setSpinnerChars(BRAILLE_SPINNER_CHARS);

// Or use custom characters
loading.setSpinnerChars(['[   ]', '[=  ]', '[== ]', '[===]', '[ ==]', '[  =]']);
```

**Returns:** `LoadingWidget` for chaining

#### setInterval

Sets the animation interval in milliseconds.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.setInterval(50); // Faster animation
loading.setInterval(200); // Slower animation
```

**Returns:** `LoadingWidget` for chaining

#### getSpinnerChar

Gets the current spinner character.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
const char = loading.getSpinnerChar(); // Current frame character
```

#### reset

Resets the spinner animation to the first frame.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.reset();
```

**Returns:** `LoadingWidget` for chaining

---

### Lifecycle Methods

#### destroy

Destroys the loading widget and removes all associated components.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world);
loading.destroy();
```

---

## Helper Functions

### showLoading

Creates and shows a loading indicator. Convenience function for quick loading display.

```typescript
import { createWorld } from 'blecsd/core';
import { showLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = showLoading(world, 'Saving changes...');
// ... do work ...
loading.destroy();
```

**Parameters:**
- `world` - The ECS world
- `message` - Loading message
- `config` - Optional additional configuration

**Returns:** `LoadingWidget`

---

### hideLoading

Hides and destroys a loading widget.

```typescript
import { createWorld } from 'blecsd/core';
import { showLoading, hideLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = showLoading(world, 'Working...');
// ... do work ...
hideLoading(loading);
```

---

### setLoadingMessage

Updates the message on a loading widget.

```typescript
import { createWorld } from 'blecsd/core';
import { showLoading, setLoadingMessage } from 'blecsd/widgets';

const world = createWorld();
const loading = showLoading(world, 'Step 1...');
// ... step 1 complete ...
setLoadingMessage(loading, 'Step 2...');
loading.destroy();
```

---

### isLoadingWidget

Checks if an entity is a loading widget.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { isLoadingWidget } from 'blecsd/widgets';

const world = createWorld();
const entity = addEntity(world);
const isLoading = isLoadingWidget(world, entity); // boolean
```

---

### updateLoadingAnimation

Updates a loading widget's animation. Should be called each frame with delta time.

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading, updateLoadingAnimation } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world, { message: 'Loading assets...' });

let lastTime = Date.now();
let running = true;

function gameLoop() {
  const now = Date.now();
  const deltaMs = now - lastTime;
  lastTime = now;

  // Update loading animation
  updateLoadingAnimation(world, loading.eid, deltaMs);

  if (running) {
    setTimeout(gameLoop, 16);
  }
}

gameLoop();
running = false; // stop after first iteration for this example
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID of the loading widget
- `deltaMs` - Time elapsed since last update in milliseconds

**Returns:** `boolean` - true if animation frame changed

---

## Types

### LoadingConfig

Configuration for creating a loading widget.

```typescript
interface LoadingConfig {
  readonly x?: number;
  readonly y?: number;
  readonly message?: string;
  readonly spinnerChars?: readonly string[];
  readonly interval?: number;
  readonly style?: LoadingStyleConfig;
  readonly width?: number;
  readonly visible?: boolean;
}
```

### LoadingStyleConfig

Style configuration for loading widget.

```typescript
interface LoadingStyleConfig {
  readonly fg?: number;  // Foreground color
  readonly bg?: number;  // Background color
}
```

### LoadingWidget

The loading widget interface.

```typescript
interface LoadingWidget {
  readonly eid: Entity;
  show(): LoadingWidget;
  hide(): LoadingWidget;
  isVisible(): boolean;
  move(dx: number, dy: number): LoadingWidget;
  setPosition(x: number, y: number): LoadingWidget;
  getPosition(): { x: number; y: number };
  setMessage(message: string): LoadingWidget;
  getMessage(): string;
  setSpinnerChars(chars: readonly string[]): LoadingWidget;
  setInterval(ms: number): LoadingWidget;
  getSpinnerChar(): string;
  reset(): LoadingWidget;
  destroy(): void;
}
```

---

## Zod Schemas

Zod schemas are provided for runtime validation.

```typescript
import { LoadingConfigSchema, LoadingStyleConfigSchema } from 'blecsd/widgets';

// Validate configuration
const result = LoadingConfigSchema.safeParse({
  message: 'Processing...',
  x: 10,
  y: 5,
});
```

---

## Examples

### Basic Loading Indicator

```typescript
import { createWorld } from 'blecsd/core';
import { showLoading, hideLoading } from 'blecsd/widgets';

const world = createWorld();

const loading = showLoading(world, 'Saving document...');
// ... perform save work here ...
hideLoading(loading);
```

### Multi-Step Progress

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';

const world = createWorld();
const loading = createLoading(world, {
  message: 'Initializing...',
  x: 10,
  y: 5,
});

loading.setMessage('Step 1: Loading data...');
// ... step 1 work ...

loading.setMessage('Step 2: Processing...');
// ... step 2 work ...

loading.setMessage('Step 3: Saving results...');
// ... step 3 work ...

loading.destroy();
```

### Custom Spinner Animation

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';
import { BRAILLE_SPINNER_CHARS } from 'blecsd/components';

const world = createWorld();

// Use braille spinner for unicode terminals
const loading = createLoading(world, {
  message: 'Processing...',
  spinnerChars: BRAILLE_SPINNER_CHARS,
  interval: 80,
});

// Or create a custom progress bar spinner
const progressLoading = createLoading(world, {
  message: 'Loading',
  spinnerChars: [
    '[    ]',
    '[=   ]',
    '[==  ]',
    '[=== ]',
    '[====]',
    '[ ===]',
    '[  ==]',
    '[   =]',
  ],
  interval: 150,
});
```

### Method Chaining

```typescript
import { createWorld } from 'blecsd/core';
import { createLoading } from 'blecsd/widgets';
import { DOTS_SPINNER_CHARS } from 'blecsd/components';

const world = createWorld();

const loading = createLoading(world)
  .setMessage('Processing data...')
  .setPosition(20, 10)
  .setSpinnerChars(DOTS_SPINNER_CHARS)
  .setInterval(150)
  .show();
```

---

## See Also

- [Spinner Component](../components/spinner.md) - Underlying spinner component
- [Position Component](../position.md) - Entity positioning
- [Renderable Component](../renderable.md) - Visibility control
