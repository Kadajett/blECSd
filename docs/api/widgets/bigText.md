# BigText Widget

The BigText widget renders large ASCII art text using bitmap fonts.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBigText } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);

const bigText = createBigText(world, eid, {
  text: 'HELLO',
  font: 'terminus-14-bold',
  fg: '#ffffff',
});
```

---

## Factory Function

### createBigText

Creates a new BigText widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBigText } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);

const bigText = createBigText(world, eid, {
  text: 'BIG',
  font: 'terminus-14-bold',
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - BigText configuration

**Returns:** `BigTextWidget`

---

## Configuration

### BigTextConfig

```typescript
interface BigTextConfig {
  text: string;
  font?: string | FontDefinition;
  fg?: string | number;
  bg?: string | number;
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string | 'auto';
  height?: number | string | 'auto';
  shrink?: boolean;
}
```

---

## Helpers

### loadFont

Loads a bitmap font definition from a JSON file path.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBigText, loadFont } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);

// Use a built-in font name (string)
const bigText = createBigText(world, eid, {
  text: 'HELLO',
  font: 'terminus-14-bold',
});

// Or load a custom font from a JSON file:
// const font = loadFont('./fonts/my-custom-font.json');
// createBigText(world, addEntity(world), { text: 'HELLO', font });
console.log('loadFont available:', typeof loadFont);
```

---

## Fonts

See [Bitmap Fonts](../fonts.md) for available built-in fonts and rendering helpers.
