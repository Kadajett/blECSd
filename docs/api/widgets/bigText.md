# BigText Widget

The BigText widget renders large ASCII art text using bitmap fonts.

## Overview

BigText uses the bitmap font system from `blecsd/widgets/fonts`. Load a font with `loadFont` and pass it into the widget configuration.

```typescript
import { loadFont } from 'blecsd/widgets/fonts';

const font = loadFont('terminus-14-bold');
// BigText widget configuration will accept a bitmap font.
```

---

## Fonts

See [Bitmap Fonts](../fonts.md) for available fonts and rendering helpers.
