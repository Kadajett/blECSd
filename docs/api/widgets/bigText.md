# BigText Widget

The BigText widget renders large ASCII art text using bitmap fonts.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBigText } from 'blecsd/widgets';
import { loadFont } from 'blecsd/widgets/bigText';

const world = createWorld();
const eid = addEntity(world);

const font = loadFont('./fonts/terminus-14-bold.json');

const bigText = createBigText(world, eid, {
  text: 'HELLO',
  font,
  fg: '#ffffff',
});
```

---

## Factory Function

### createBigText

Creates a new BigText widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'blecsd';
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { loadFont } from 'blecsd/widgets/bigText';

const font = loadFont('./fonts/terminus-14-bold.json');
```

---

## Fonts

See [Bitmap Fonts](../fonts.md) for available built-in fonts and rendering helpers.
