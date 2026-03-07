# Styling and Theming

Every visual element in blECSd is an entity with data stored in typed arrays. Styling means writing numbers into those arrays — foreground colors, background colors, bold flags, opacity values. This guide covers every layer of that process: raw component access, the color system, themes, stylesheets, style inheritance, layout, borders, shadows, effects, and the patterns that tie them together.

## Table of Contents

- [How does the style system work?](#how-does-the-style-system-work)
- [How do colors work?](#how-do-colors-work)
- [How do themes work?](#how-do-themes-work)
- [How do stylesheets work?](#how-do-stylesheets-work)
- [How does style inheritance work?](#how-does-style-inheritance-work)
- [How does layout work?](#how-does-layout-work)
- [How do borders, shadows, and effects work?](#how-do-borders-shadows-and-effects-work)
- [Common patterns and recipes](#common-patterns-and-recipes)
- [Performance considerations](#performance-considerations)
- [Coming from other libraries?](#coming-from-other-libraries)

---

**Setup Note:** Examples below use manual component manipulation for clarity. For new projects, use `createApp()` for streamlined setup:

```typescript
import { createApp } from 'blecsd';
const { world, run, stop } = createApp();
// ... style your entities ...
await run();
```

---

## How does the style system work?

The `Renderable` component is the single source of truth for visual appearance. It stores style data in SoA (Structure of Arrays) typed arrays:

```typescript
Renderable.fg          // Uint32Array — foreground color (packed RGBA)
Renderable.bg          // Uint32Array — background color (packed RGBA)
Renderable.bold        // Uint8Array  — bold flag (0 or 1)
Renderable.underline   // Uint8Array  — underline flag (0 or 1)
Renderable.blink       // Uint8Array  — blink flag (0 or 1)
Renderable.inverse     // Uint8Array  — inverse flag (0 or 1)
Renderable.transparent // Uint8Array  — transparent background flag
Renderable.opacity     // Uint8Array  — alpha blending (0-255)
Renderable.visible     // Uint8Array  — visibility flag (0 or 1)
Renderable.dirty       // Uint8Array  — needs-redraw flag (0 or 1)
```

An entity without a `Renderable` component is invisible to the rendering system.

### Setting styles directly

The `setStyle` function is the standard way to apply visual properties:

```typescript
import { setStyle } from 'blecsd/components';

setStyle(world, entity, {
  fg: '#ff0000',       // Hex string — parsed to packed RGBA
  bg: 0x000000ff,      // Pre-packed RGBA number
  bold: true,
  underline: false,
  opacity: 0.8,        // 0-1 range, converted to 0-255 internally
});
```

`setStyle` accepts colors as hex strings (`'#RRGGBB'`, `'#RGB'`, `'#RRGGBBAA'`) or pre-packed 32-bit RGBA integers. Internally, hex strings pass through `parseColor()` which calls `hexToColor()`:

```typescript
import { packColor, hexToColor } from 'blecsd/components';

const red = packColor(255, 0, 0);           // 0xFF_FF0000
const blue = hexToColor('#0000ff');          // 0xFF_0000FF
const transparent = packColor(0, 0, 0, 0);  // 0x00_000000
```

The packing format is `ARGB` stored as a 32-bit unsigned integer: `(alpha << 24) | (red << 16) | (green << 8) | blue`. Use `unpackColor()` to extract components:

```typescript
import { unpackColor } from 'blecsd/components';

const { r, g, b, a } = unpackColor(0xff_ff0000);
// r=255, g=0, b=0, a=255
```

### Defaults

```typescript
const DEFAULT_FG = packColor(255, 255, 255);  // White, fully opaque
const DEFAULT_BG = packColor(0, 0, 0, 0);     // Black, fully transparent
```

If no foreground is set, text renders white. If no background is set, the terminal's default background shows through.

---

## How do colors work?

blECSd has two independent color systems serving different purposes:

1. **Packed RGBA colors** — used by the component layer (`Renderable`, `Border`, `Shadow`). Colors are 32-bit integers. This is the primary system.

2. **256-color / truecolor terminal system** — used by the terminal rendering layer. Handles ANSI escape sequences, palette lookup, and capability-based downgrading.

### Packed RGBA (component layer)

Every color in the ECS is a packed 32-bit RGBA integer. You create them with `packColor` or `hexToColor`:

```typescript
import { packColor, hexToColor } from 'blecsd/components';

// Direct RGBA values
const red = packColor(255, 0, 0);
const semiTransparent = packColor(255, 255, 255, 128);

// From hex strings
const coral = hexToColor('#ff7f50');
const withAlpha = hexToColor('#ff7f5080');
```

### Named colors (256-color palette)

The terminal color module provides named color lookups that resolve to 256-color palette indices:

```typescript
import { nameToColor, cssNameToColor } from 'blecsd/style';

nameToColor('red');         // 1 (ANSI red)
nameToColor('brightcyan');  // 14
nameToColor('orange');      // 208 (nearest in color cube)

cssNameToColor('coral');       // Nearest 256-color match for RGB(255, 127, 80)
cssNameToColor('rebeccapurple'); // Nearest match for RGB(102, 51, 153)
```

Supported name categories:

| Category | Examples | Index Range |
|----------|----------|-------------|
| Basic ANSI | `black`, `red`, `green`, `blue`, `white` | 0–7 |
| Bright variants | `brightred`, `lightgreen`, `lightwhite` | 8–15 |
| Dark variants | `darkred`, `darkblue`, `darkgray` | Same as basic (0–7) |
| HTML aliases | `maroon`, `navy`, `teal`, `silver`, `orange` | Various |
| Special | `default`, `transparent`, `inherit` | N/A (returns null) |
| CSS/X11 names | `coral`, `salmon`, `steelblue`, `rebeccapurple` | Nearest 256-color match |

> **Note:** CSS color names are matched to the nearest 256-color palette entry at runtime. The results are cached for performance.

#### Color aliases

Common alternate names map to canonical colors:

```typescript
nameToColor('crimson');   // Maps to 'red' → 1
nameToColor('emerald');   // Maps to 'green' → 2
nameToColor('pink');      // Maps to 'lightmagenta' → 13
nameToColor('gold');      // Maps to 'yellow' → 3
```

### The 256-color palette

The palette has three regions:

| Range | Count | Description |
|-------|-------|-------------|
| 0–15 | 16 | Standard ANSI colors (8 basic + 8 bright) |
| 16–231 | 216 | 6×6×6 color cube (R/G/B levels: 0, 95, 135, 175, 215, 255) |
| 232–255 | 24 | Grayscale ramp (8 to 238 in steps of 10) |

```typescript
import { colorCubeIndex, grayscaleIndex, COLORS, ANSI } from 'blecsd/terminal';

// Named constants for standard colors
const fg = COLORS.RED;           // 9
const bg = ANSI.DARK_BLUE;      // 4

// Color cube: specify R, G, B levels (0-5 each)
const brightRed = colorCubeIndex(5, 0, 0);  // Index 196
const paleGreen = colorCubeIndex(2, 5, 2);  // Index 114

// Grayscale: step 0 (darkest) to 23 (lightest)
const darkGray = grayscaleIndex(3);   // Index 235
const lightGray = grayscaleIndex(18); // Index 250
```

### Truecolor (24-bit RGB)

For terminals that support it, truecolor provides 16.7 million colors with automatic downgrading:

```typescript
import { createTruecolorSupport, rgb, hex, fg, bg } from 'blecsd/terminal';

// Convenience functions (use default singleton)
const red = rgb(255, 0, 0);
const blue = hex('#0066ff');

// Generate escape sequences — auto-downgrades based on terminal
process.stdout.write(fg(red) + 'Red text' + '\x1b[0m');

// Create a custom instance with forced depth
const truecolor = createTruecolorSupport({ forceDepth: 256 });
const color = truecolor.rgb(128, 200, 50);
process.stdout.write(truecolor.fg(color) + 'Forced 256-color' + '\x1b[0m');
```

Each `Color` object pre-computes representations at every depth:

```typescript
const c = rgb(200, 100, 50);
c.rgb;       // 0xC86432 (packed 24-bit)
c.r;         // 200
c.g;         // 100
c.b;         // 50
c.color256;  // Nearest 256-color palette index
c.color16;   // Nearest 16-color ANSI index
c.color8;    // Nearest 8-color ANSI index
```

The `fg()` and `bg()` functions select the right SGR escape format based on detected terminal depth:

| Depth | Method | Escape Format |
|-------|--------|---------------|
| Truecolor (24-bit) | `\x1b[38;2;R;G;Bm` | Full RGB |
| 256-color | `\x1b[38;5;Nm` | Palette index |
| 16-color | `\x1b[3Nm` / `\x1b[9Nm` | ANSI code |
| 8-color | `\x1b[3Nm` | Basic ANSI |
| Mono | *(empty string)* | No color |

Detection uses `COLORTERM` and `TERM` environment variables. Override with `setDepth()`:

```typescript
import { getDefaultTruecolor, ColorDepthLevel } from 'blecsd/terminal';

const tc = getDefaultTruecolor();
tc.setDepth(ColorDepthLevel.PALETTE_256); // Force 256-color mode
tc.resetDepth();                          // Back to auto-detection
```

### Color manipulation

The `blend` module provides color math operations that work on RGB values:

```typescript
import { mix, lighten, darken, saturate, desaturate, grayscale } from 'blecsd/style';

// Mix two colors (0 = all first, 1 = all second, 0.5 = equal)
const purple = mix({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.5);

// Lighten/darken (0 = no change, 1 = white/black)
const lightRed = lighten({ r: 255, g: 0, b: 0 }, 0.3);
const darkRed = darken({ r: 255, g: 0, b: 0 }, 0.3);

// Saturation
const vibrant = saturate({ r: 180, g: 150, b: 150 }, 0.5);
const muted = desaturate({ r: 255, g: 0, b: 0 }, 0.5);
const gray = grayscale({ r: 255, g: 0, b: 0 }); // Perceptual luminance weights
```

For 256-color palette operations:

```typescript
import { blend, lighten256, darken256, gradient256 } from 'blecsd/style';
import { COLORS } from 'blecsd/terminal';

const mixed = blend(COLORS.RED, COLORS.BLUE, 0.5);
const lighter = lighten256(COLORS.GREEN, 0.3);
const steps = gradient256(COLORS.RED, COLORS.BLUE, 5); // 5-color gradient
```

#### Hue operations

```typescript
import { rotateHue, complement, invert } from 'blecsd/style';

const green = rotateHue({ r: 255, g: 0, b: 0 }, 120);  // Red → Green
const cyan = complement({ r: 255, g: 0, b: 0 });        // Red → Cyan
const inverted = invert({ r: 255, g: 0, b: 0 });        // → { r: 0, g: 255, b: 255 }
```

#### Contrast and accessibility

```typescript
import { contrastRatio, isReadable, luminance } from 'blecsd/style';

const ratio = contrastRatio(
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 }
); // 21 (maximum contrast)

isReadable(textColor, backgroundColor);        // WCAG AA (4.5:1)
isReadable(textColor, backgroundColor, 7);     // WCAG AAA (7:1)
isReadable(textColor, backgroundColor, 3);     // Large text (3:1)
```

> **Note:** Terminal colors behave differently from web colors. The user's terminal theme can remap ANSI colors 0–15, so `COLORS.RED` might not look red on every machine. Use truecolor or 256-color cube indices for predictable results.

---

## How do themes work?

A theme is a `Theme` object containing a color palette, border defaults, focus styles, and per-widget style overrides. Themes are registered globally and activated per-world.

### Theme structure

```typescript
interface Theme {
  name: string;
  colors: ThemeColors;     // 11 semantic color slots
  borders: ThemeBorders;   // Default border style, fg, bg
  focus: ThemeFocus;       // Focus highlight colors
  widgets: ThemeWidgetStyles; // Per-widget color overrides
}
```

The `ThemeColors` palette provides semantic color names:

| Color | Purpose | Default Theme Value |
|-------|---------|-------------------|
| `primary` | Brand/accent actions | Blue (33, 150, 243) |
| `secondary` | Secondary actions | Purple (156, 39, 176) |
| `accent` | Highlights, badges | Amber (255, 193, 7) |
| `background` | Default background | Near black (18, 18, 18) |
| `foreground` | Default text color | Near white (238, 238, 238) |
| `error` | Error states | Red (244, 67, 54) |
| `warning` | Warning states | Orange (255, 152, 0) |
| `success` | Success states | Green (76, 175, 80) |
| `info` | Info states | Blue (33, 150, 243) |
| `muted` | Disabled/secondary text | Gray (117, 117, 117) |
| `border` | Border lines | Dark gray (66, 66, 66) |

All color values are packed RGBA integers.

### Built-in themes

blECSd ships with 9 themes:

| Factory Function | Name | Description |
|-----------------|------|-------------|
| `createDefaultTheme()` | `'default'` | Neutral dark theme |
| `createDarkTheme()` | `'dark'` | Optimized for low-light |
| `createLightTheme()` | `'light'` | Bright backgrounds |
| `createHighContrastTheme()` | `'high-contrast'` | Maximum accessibility (pure B/W) |
| `createSolarizedTheme()` | `'solarized'` | Solarized Dark palette |
| `createMonokaiTheme()` | `'monokai'` | Monokai Pro palette |
| `createNordTheme()` | `'nord'` | Arctic color palette |
| `createDraculaTheme()` | `'dracula'` | Dark purple palette |
| `createGruvboxTheme()` | `'gruvbox'` | Retro warm palette |

### Registering and activating themes

```typescript
import {
  registerTheme,
  setActiveTheme,
  getActiveTheme,
  createDarkTheme,
  applyThemeToAll,
} from 'blecsd/style';

// Register one or more themes
registerTheme(createDarkTheme());

// Activate a theme for a specific world
setActiveTheme(world, 'dark');

// Apply to all existing entities with Renderable
applyThemeToAll(world);

// Read the active theme
const theme = getActiveTheme(world);
console.log(theme.colors.primary);
```

`applyThemeToAll` sets `Renderable.fg` to `theme.colors.foreground` and `Renderable.bg` to `theme.colors.background` for every entity that has a `Renderable` component, then marks them dirty.

### Creating custom themes

The simplest way: start from defaults and override what you need.

```typescript
import { createTheme, packColor, registerTheme } from 'blecsd/style';

const custom = createTheme('corporate', {
  colors: {
    primary: packColor(0, 102, 204),
    accent: packColor(255, 165, 0),
  },
});

registerTheme(custom);
```

`createTheme` fills any missing fields from the default theme.

### Extending an existing theme

To base a theme on a registered non-default theme:

```typescript
import { registerTheme, extendTheme, createNordTheme, packColor } from 'blecsd/style';

registerTheme(createNordTheme());

const warmNord = extendTheme('nord', 'warm-nord', {
  colors: {
    accent: packColor(255, 140, 0),
  },
  widgets: {
    button: {
      bg: packColor(255, 140, 0),
    },
  },
});

registerTheme(warmNord);
```

`extendTheme` performs a deep merge — you can override any nested property without providing the full structure.

### Serializing themes

Themes can be saved and loaded as JSON:

```typescript
import { serializeTheme, deserializeTheme, createDarkTheme } from 'blecsd/style';

const json = serializeTheme(createDarkTheme());
// Store somewhere...

const restored = deserializeTheme(json); // Validated with Zod
registerTheme(restored);
```

### Applying theme to a single entity

```typescript
import { applyTheme } from 'blecsd/style';

applyTheme(world, newEntity);  // Uses active theme's foreground/background
```

### Using theme colors in widgets

Themes don't auto-apply to widgets created after `applyThemeToAll`. You need to read theme colors explicitly:

```typescript
import { getActiveTheme } from 'blecsd/style';
import { createBox } from 'blecsd/widgets';

const theme = getActiveTheme(world);

const errorBox = createBox(world, addEntity(world), {
  fg: theme.colors.foreground,
  bg: theme.colors.error,
  width: 40,
  height: 5,
  content: 'Something went wrong',
  border: { type: 'line', fg: theme.colors.error },
});
```

> **Warning:** `applyThemeToAll` only sets `fg` and `bg` from `theme.colors.foreground`/`background`. It does not apply widget-specific styles (`theme.widgets.button`, etc.), border colors, or focus styles. Those require manual wiring per your application's needs.

---

## How do stylesheets work?

Stylesheets provide CSS-like declarative styling with selectors and specificity cascading. Rules match entities by tag, class name, or entity ID.

### Creating a stylesheet

```typescript
import { createStylesheet, addRule } from 'blecsd/style';

let sheet = createStylesheet('main');

// Tag selector (lowest specificity = 1)
sheet = addRule(sheet, {
  selector: { tag: 'button' },
  style: { fg: '#ffffff', bg: '#0066cc' },
});

// Class selector (medium specificity = 10)
sheet = addRule(sheet, {
  selector: { className: 'danger' },
  style: { bg: '#cc0000' },
});

// Entity ID selector (highest specificity = 100)
sheet = addRule(sheet, {
  selector: { entityId: 42 },
  style: { bold: true },
});
```

Stylesheets are immutable — `addRule` returns a new stylesheet.

### Selectors and specificity

| Selector Type | Specificity | How It Matches |
|--------------|-------------|----------------|
| `tag` | 1 | Matches entity's `userData.tag` or `entityData.widgetTag` |
| `className` | 10 | Matches against `userData.classes` array or `entityData.styleClasses` |
| `entityId` | 100 | Exact entity ID match |

Multiple selector fields combine with AND logic and additive specificity:

```typescript
// Specificity = 11 (tag:1 + className:10)
{ selector: { tag: 'button', className: 'primary' }, style: { ... } }

// Specificity = 110 (className:10 + entityId:100)
{ selector: { className: 'danger', entityId: 42 }, style: { ... } }
```

When specificity ties, rules with higher `priority` win. When priority also ties, later rules win (source order).

### Applying stylesheets

```typescript
import { applyStylesheet, applyStylesheetToEntity } from 'blecsd/style';

// Apply to all entities with Renderable
const result = applyStylesheet(world, sheet);
console.log(`Styled ${result.entitiesStyled} entities`);

// Apply to a single newly-created entity
applyStylesheetToEntity(world, newEntity, sheet);
```

### Debugging selectors

```typescript
import { getMatchingRules } from 'blecsd/style';

const matches = getMatchingRules(world, entity, sheet);
for (const { rule, specificity } of matches) {
  console.log(`Selector: ${JSON.stringify(rule.selector)}, specificity: ${specificity}`);
}
```

### Style properties

Stylesheet rules accept the same properties as `setStyle`:

```typescript
interface StyleProperties {
  fg?: string | number;      // Foreground color
  bg?: string | number;      // Background color
  bold?: boolean;
  underline?: boolean;
  blink?: boolean;
  inverse?: boolean;
  transparent?: boolean;
  opacity?: number;          // 0-1
}
```

All inputs are validated with Zod schemas (`StylePropertiesSchema`, `StyleSelectorSchema`, `StyleRuleSchema`, `StylesheetSchema`).

---

## How does style inheritance work?

blECSd cascades certain style properties from parent entities to children through the entity hierarchy. This happens in `computeInheritedStyle()`, which walks up the ancestor chain and merges styles.

### Which properties inherit?

| Property | Inherits? | Rationale |
|----------|-----------|-----------|
| `fg` | **Yes** | Text color cascades (like CSS `color`) |
| `bold` | **Yes** | Text weight cascades |
| `underline` | **Yes** | Text decoration cascades |
| `blink` | **Yes** | Text decoration cascades |
| `inverse` | **Yes** | Video attribute cascades |
| `bg` | **No** | Background is local to each element |
| `transparent` | **No** | Transparency is per-element |
| `opacity` | **No** | Opacity is per-element |

### How inheritance resolves

For inheriting properties: if the child has a non-default value, it wins. Otherwise, the parent's value is used. For boolean properties like `bold`, `true` from any ancestor makes the child bold (OR logic).

```typescript
import { setStyle, appendChild } from 'blecsd/components';

// Parent: red text, dark background
setStyle(world, parent, { fg: '#ff0000', bg: '#333333' });

// Child: no fg set, its own background
setStyle(world, child, { bg: '#000000' });
appendChild(world, parent, child);

// Resolved child style:
// fg = '#ff0000'  (inherited from parent)
// bg = '#000000'  (local — bg doesn't inherit)
```

### Computing inherited styles

```typescript
import { computeInheritedStyle, resolveStyle } from 'blecsd/style';

// These are identical — resolveStyle is an alias
const style = computeInheritedStyle(world, entity);
const same = resolveStyle(world, entity);

// Check where a property comes from
import { findPropertySource } from 'blecsd/style';
const source = findPropertySource(world, entity, 'fg');
// Returns the entity ID that provides the fg value (could be self or ancestor)
```

### Cache behavior

Computed styles are cached per-entity with a generation counter. The cache is invalidated when:

- `invalidateStyleCache(entity)` is called (clears one entity)
- `invalidateAllStyleCaches()` is called (clears everything, increments generation)

The rendering system should call `precomputeStyles()` before drawing to batch-warm the cache:

```typescript
import { precomputeStyles } from 'blecsd/style';
import { getAllEntities } from 'blecsd/core';

precomputeStyles(world, getAllEntities(world));
```

> **Warning:** Changing a parent's style does not automatically invalidate children's caches. You must call `invalidateAllStyleCaches()` after changing styles that should cascade, or call `invalidateStyleCache()` on each affected descendant.

---

## How does layout work?

blECSd provides three layout approaches. None use external dependencies like Yoga — everything is custom-built with data-oriented ECS design.

### Layer 1: The core layout engine (`layoutSystem`)

The lowest level. It walks the entity tree in parent-before-child order, accumulates absolute positions from relative offsets, and writes results into `ComputedLayout` typed arrays.

```typescript
ComputedLayout.x       // Float32Array — absolute screen column
ComputedLayout.y       // Float32Array — absolute screen row
ComputedLayout.width   // Float32Array — computed width in cells
ComputedLayout.height  // Float32Array — computed height in cells
ComputedLayout.valid   // Uint8Array   — 0 = needs recompute, 1 = valid
```

#### Registering the system

```typescript
import { layoutSystem } from 'blecsd/systems';
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
```

#### How dimensions resolve

Entities need `Position` and `Dimensions` components. Dimension values can be:

- **Absolute** — a plain number (e.g., `40` cells)
- **Percentage** — encoded as a special value, resolved against parent size
- **Auto** — uses content size (or 0 if no content measurement available)

Min/max constraints are applied after resolution:

```typescript
import { setDimensions } from 'blecsd/components';

setDimensions(world, entity, 40, 10);           // 40×10 cells
setDimensions(world, entity, '50%', '100%');     // Half parent width, full height
setDimensions(world, entity, 'auto', 'auto');    // Content-sized
```

#### Absolute vs. relative positioning

```typescript
import { setPosition } from 'blecsd/components';

// Relative (default): position is offset from parent
setPosition(world, entity, 5, 3);

// Absolute: position is in screen coordinates
import { Position } from 'blecsd/components';
Position.absolute[entity] = 1;
setPosition(world, entity, 10, 0);
```

#### Reading computed layout

```typescript
import { getComputedLayout, getComputedBounds } from 'blecsd/systems';

const layout = getComputedLayout(world, entity);
// { x: 15, y: 8, width: 40, height: 10 }

const bounds = getComputedBounds(world, entity);
// { left: 15, top: 8, right: 54, bottom: 17 }
```

#### On-demand computation

```typescript
import { computeLayoutNow } from 'blecsd/systems';

// Compute layout for a single entity outside the system loop
const layout = computeLayoutNow(world, entity);
```

### Layer 2: The Layout widget

The `Layout` widget wraps entities in an auto-layout container with three modes: **inline** (flow), **grid**, and **flex**.

#### Inline (flow) layout

Children flow left-to-right, wrapping to the next line when they exceed the container width:

```typescript
import { createLayout, createBox } from 'blecsd/widgets';

const layout = createLayout(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
  layout: 'inline',
  gap: 1,
  wrap: true,
});

// Add 10-cell-wide children — they'll wrap after 7 fit per row
for (let i = 0; i < 20; i++) {
  const child = createBox(world, addEntity(world), { width: 10, height: 3 });
  layout.append(child.eid);
}

layout.recalculate();
```

#### Grid layout

Children placed into a fixed-column grid. Column widths and row heights are computed from the maximum child dimensions in each column/row:

```typescript
const grid = createLayout(world, addEntity(world), {
  width: 60,
  height: 40,
  layout: 'grid',
  cols: 3,    // 3 columns
  gap: 2,     // 2-cell gap between items
});
```

#### Flex layout (basic)

The Layout widget's flex mode supports `direction`, `justify`, and `align`:

```typescript
const toolbar = createLayout(world, addEntity(world), {
  width: 80,
  height: 3,
  layout: 'flex',
  direction: 'row',
  justify: 'space-between',
  align: 'center',
  gap: 1,
});
```

| Justify | Behavior |
|---------|----------|
| `'start'` | Pack to start of main axis |
| `'center'` | Center along main axis |
| `'end'` | Pack to end of main axis |
| `'space-between'` | Distribute free space between items |

| Align | Behavior |
|-------|----------|
| `'start'` | Align to cross-axis start |
| `'center'` | Center on cross axis |
| `'end'` | Align to cross-axis end |

Layout mode data is stored in typed arrays (like everything else):

```typescript
Layout.mode       // Uint8Array  — 0=inline, 1=grid, 2=flex
Layout.gap        // Float32Array
Layout.wrap       // Uint8Array  — 0=no, 1=yes
Layout.justify    // Uint8Array  — 0=start, 1=center, 2=end, 3=space-between
Layout.align      // Uint8Array  — 0=start, 1=center, 2=end
Layout.cols       // Uint8Array  — grid column count
Layout.direction  // Uint8Array  — 0=row, 1=column
```

### Layer 3: FlexContainer widget

A more complete flexbox implementation with `flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, `space-around`, `space-evenly`, and multi-line wrapping.

```typescript
import { createFlexContainer, addFlexChild } from 'blecsd/widgets';

const flex = createFlexContainer(world, addEntity(world), {
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 2,
  wrap: 'wrap',
  width: 80,
  height: 24,
});

// Children with flex properties
const sidebar = addEntity(world);
setDimensions(world, sidebar, 20, 20);
flex.addChild(sidebar, { flex: 0, flexShrink: 0, flexBasis: 20 });

const main = addEntity(world);
setDimensions(world, main, 40, 20);
flex.addChild(main, { flex: 2, flexBasis: 'auto' });

const aside = addEntity(world);
setDimensions(world, aside, 20, 20);
flex.addChild(aside, { flex: 1, alignSelf: 'start' });

flex.layout(); // Compute and apply positions
```

#### FlexContainer capabilities

| Feature | Layout Widget Flex | FlexContainer |
|---------|-------------------|---------------|
| Direction | `row`, `column` | `row`, `column` |
| Justify | `start`, `center`, `end`, `space-between` | + `space-around`, `space-evenly` |
| Align | `start`, `center`, `end` | + `stretch` |
| Wrapping | Boolean wrap | `'nowrap'` / `'wrap'` with line tracking |
| Flex grow/shrink | No | Yes (`flex`, `flexShrink`) |
| Flex basis | No | Yes (number or `'auto'`) |
| Align self | No | Yes (per-child override) |
| Multi-line | Basic wrap | True multi-line with per-line cross-size |

#### Flex child options

```typescript
interface FlexChildOptions {
  flex?: number;        // Grow factor (default: 0 = don't grow)
  flexShrink?: number;  // Shrink factor (default: 1)
  flexBasis?: number | 'auto'; // Initial size before flex (default: 'auto')
  alignSelf?: 'start' | 'center' | 'end' | 'stretch'; // Override container align
}
```

When `flex` values are set, free space is distributed proportionally. A child with `flex: 2` gets twice the extra space as one with `flex: 1`. When items overflow, `flexShrink` determines who gives up space first.

### Layer 4: Constraint layout

Inspired by Ratatui's layout system. Pure functions that split a rectangular area into sub-rectangles using constraints. No entities or components involved — just geometry.

```typescript
import { layoutHorizontal, layoutVertical, fixed, percentage, ratio, min, max } from 'blecsd/systems';

const screen = { x: 0, y: 0, width: 120, height: 40 };

// Vertical split: header, content, footer
const rows = layoutVertical(world, screen, [
  fixed(2),          // Header: exactly 2 rows
  percentage(90),    // Content: 90% of remaining
  fixed(1),          // Footer: exactly 1 row
]);
// rows[0] = { x: 0, y: 0, width: 120, height: 2 }
// rows[1] = { x: 0, y: 2, width: 120, height: 36 }
// rows[2] = { x: 0, y: 38, width: 120, height: 1 }

// Horizontal split within content area
const cols = layoutHorizontal(world, rows[1], [
  fixed(30),         // Sidebar: 30 columns
  min(20),           // Main: at least 20, gets remaining space
]);

// Ratio-based split
const thirds = layoutHorizontal(world, screen, [
  ratio(1, 3),       // 1/3
  ratio(2, 3),       // 2/3
]);
```

#### Constraint types

| Type | Factory | Behavior |
|------|---------|----------|
| Fixed | `fixed(n)` | Exactly `n` cells (capped at available space) |
| Percentage | `percentage(p)` | `p%` of total available space |
| Min | `min(n)` | At least `n` cells; receives surplus from remaining space |
| Max | `max(n)` | Up to `n` cells; receives surplus from remaining space (capped) |
| Ratio | `ratio(a, b)` | `a/b` of total available space |

Remaining space after fixed/percentage/ratio allocations is distributed among `min`/`max` constraints equally, with leftover cells dealt one-per-item.

#### Nested constraints

Constraint layout composes naturally — the output `Rect` of one split becomes the input area of the next:

```typescript
const screen = { x: 0, y: 0, width: 100, height: 30 };

// Top-level vertical split
const [header, body, footer] = layoutVertical(world, screen, [
  fixed(1),
  min(10),
  fixed(1),
]);

// Split body horizontally
const [sidebar, content] = layoutHorizontal(world, body, [
  percentage(25),
  percentage(75),
]);

// Split content vertically for panels
const [editor, terminal] = layoutVertical(world, content, [
  ratio(2, 3),
  ratio(1, 3),
]);
```

### Which layout approach should I use?

| Approach | Best For | Limitations |
|----------|----------|-------------|
| `layoutSystem` | Custom layout algorithms, absolute positioning | Manual position math |
| `Layout` widget | Simple flow, grids, basic flex | No flex-grow/shrink, no align-self |
| `FlexContainer` | Responsive adaptive layouts | More setup, state stored in Map |
| Constraint layout | Screen region splitting (like tmux/vim splits) | Pure geometry — no entity management |

These approaches can be combined. Use constraint layout to define screen regions, then place Layout or FlexContainer widgets in those regions.

---

## How do borders, shadows, and effects work?

### Borders

Borders draw box-drawing characters (or background fills) around entities. The `Border` component stores type, per-side flags, colors, and character codepoints in typed arrays.

```typescript
import { setBorder, setBorderChars, BorderType } from 'blecsd/components';
import {
  BORDER_SINGLE,
  BORDER_DOUBLE,
  BORDER_ROUNDED,
  BORDER_BOLD,
  BORDER_ASCII,
} from 'blecsd/components';

// Enable a single-line border
setBorder(world, entity, { type: BorderType.Line });
setBorderChars(world, entity, BORDER_SINGLE);

// Styled border with custom colors
setBorder(world, entity, {
  type: BorderType.Line,
  fg: '#00ffff',
  bg: '#000000',
});
setBorderChars(world, entity, BORDER_ROUNDED);
```

Available charsets:

| Preset | Characters |
|--------|-----------|
| `BORDER_SINGLE` | `┌ ┐ └ ┘ ─ │` |
| `BORDER_DOUBLE` | `╔ ╗ ╚ ╝ ═ ║` |
| `BORDER_ROUNDED` | `╭ ╮ ╰ ╯ ─ │` |
| `BORDER_BOLD` | `┏ ┓ ┗ ┛ ━ ┃` |
| `BORDER_ASCII` | `+ + + + - \|` |

Custom character sets implement the `BorderCharset` interface:

```typescript
const customBorder: BorderCharset = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
};
setBorderChars(world, entity, customBorder);
```

Per-side control is available through the raw component:

```typescript
import { Border } from 'blecsd/components';

Border.left[entity] = 1;    // Enable left border
Border.right[entity] = 1;   // Enable right border
Border.top[entity] = 0;     // Disable top border
Border.bottom[entity] = 0;  // Disable bottom border
```

Through the widget API, borders are configured declaratively:

```typescript
const box = createBox(world, addEntity(world), {
  width: 30,
  height: 10,
  border: {
    type: 'line',
    ch: 'rounded',
    fg: '#00ff00',
    bg: '#000000',
  },
});
```

### Padding

Padding adds internal spacing between an entity's border and its content. Values are in terminal cells (characters).

```typescript
import { setPadding, getPadding } from 'blecsd/components';

// Uniform padding
setPadding(world, entity, { left: 2, top: 1, right: 2, bottom: 1 });

// Through widget config
const box = createBox(world, addEntity(world), {
  padding: 2,              // All sides = 2
  // or
  padding: { left: 3, top: 1, right: 3, bottom: 1 },
});
```

Padding values are stored in `Uint8Array`, so the maximum is 255 cells per side.

> **Note:** There is no CSS-style margin. The layout system positions elements using their Position component. Use explicit position offsets or gap settings for spacing between elements.

### Shadows

Shadows render on the right and bottom edges of elements. Configurable offset, color, opacity, and character style.

```typescript
import { setShadow, SHADOW_CHAR_MEDIUM, SHADOW_CHAR_LIGHT } from 'blecsd/components';

// Enable shadow with defaults (offset 1,1, dark gray, 50% opacity)
setShadow(world, entity, { enabled: true });

// Custom shadow
setShadow(world, entity, {
  enabled: true,
  offsetX: 2,
  offsetY: 1,
  color: '#333333',
  opacity: 180,         // 0-255
  char: SHADOW_CHAR_MEDIUM,
  blendWithBg: true,
});
```

Shadow characters: `SHADOW_CHAR_LIGHT` (light shade), `SHADOW_CHAR_MEDIUM` (medium shade), `SHADOW_CHAR_DARK` (dark shade / full block).

### Effects

The effects system manages state-based visual changes: focus, hover, press, and disabled.

```typescript
import { setEffects, applyFocusEffect, removeFocusEffect, syncEffects } from 'blecsd/core';
import { packColor } from 'blecsd/components';

setEffects(world, entity, {
  focus: { fg: packColor(255, 255, 0) },         // Yellow text when focused
  hover: { bg: packColor(80, 80, 80) },          // Gray background on hover
  press: { bg: packColor(40, 40, 40) },          // Darker on press
  disabled: { fg: packColor(128, 128, 128) },    // Gray when disabled
  combineEffects: true,                           // Layer effects vs replace
});

// Manual effect control
applyFocusEffect(world, entity);
removeFocusEffect(world, entity);

// Sync effects with current entity state
syncEffects(world, entity);
```

Effects preserve and restore the original style. When a focus effect is removed, the entity reverts to its pre-focus appearance.

---

## Common patterns and recipes

### Themed panel with styled sub-regions

```typescript
import { getActiveTheme } from 'blecsd/style';
import { createPanel, createBox } from 'blecsd/widgets';

const theme = getActiveTheme(world);

const panel = createPanel(world, addEntity(world), {
  left: 5,
  top: 2,
  width: 60,
  height: 20,
  title: 'Dashboard',
  fg: theme.colors.foreground,
  bg: theme.widgets.panel.bg,
  padding: 1,
  style: {
    title: {
      fg: theme.widgets.panel.headerFg,
      bg: theme.widgets.panel.headerBg,
      align: 'center',
    },
    border: {
      type: 'line',
      ch: theme.borders.style === 'heavy' ? 'bold' : 'single',
      fg: theme.colors.border,
    },
  },
});
```

### Sidebar + main content with constraint layout

```typescript
import { layoutHorizontal, layoutVertical, fixed, min, percentage } from 'blecsd/systems';

function buildAppLayout(screenWidth: number, screenHeight: number) {
  const screen = { x: 0, y: 0, width: screenWidth, height: screenHeight };

  const [header, body, statusBar] = layoutVertical(world, screen, [
    fixed(1),
    min(10),
    fixed(1),
  ]);

  const [sidebar, content] = layoutHorizontal(world, body, [
    fixed(25),
    min(30),
  ]);

  return { header, sidebar, content, statusBar };
}
```

### Gradient text effect

```typescript
import { gradient, mix } from 'blecsd/style';
import { packColor } from 'blecsd/components';

const from = { r: 255, g: 0, b: 0 };
const to = { r: 0, g: 0, b: 255 };
const steps = gradient(from, to, text.length);

// Apply per-character colors (requires character-level entities or custom rendering)
steps.forEach((rgb, i) => {
  const color = packColor(rgb.r, rgb.g, rgb.b);
  // Use color for character at index i
});
```

### Runtime theme switching

```typescript
import {
  registerTheme,
  setActiveTheme,
  applyThemeToAll,
  createDarkTheme,
  createLightTheme,
  invalidateAllStyleCaches,
} from 'blecsd/style';

registerTheme(createDarkTheme());
registerTheme(createLightTheme());

function toggleTheme(world: World, currentTheme: string): string {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  setActiveTheme(world, next);
  applyThemeToAll(world);
  invalidateAllStyleCaches();
  return next;
}
```

### Conditional styling with stylesheets

```typescript
import { createStylesheet, addRule, applyStylesheet } from 'blecsd/style';

let sheet = createStylesheet('states');

// Normal buttons
sheet = addRule(sheet, {
  selector: { tag: 'button' },
  style: { fg: '#ffffff', bg: '#336699' },
});

// Danger buttons override background
sheet = addRule(sheet, {
  selector: { tag: 'button', className: 'danger' },
  style: { bg: '#cc0000' },
});

// A specific button gets bold
sheet = addRule(sheet, {
  selector: { entityId: submitButton },
  style: { bold: true },
});

applyStylesheet(world, sheet);
```

---

## Performance considerations

### Color packing

Pre-compute packed colors outside hot loops. `packColor` is cheap but adds up:

```typescript
// Good: compute once
const RED = packColor(255, 0, 0);
const BG = packColor(30, 30, 30);

// Bad: recompute every frame
for (const entity of entities) {
  setStyle(world, entity, { fg: packColor(255, 0, 0) }); // allocation each call
}
```

### Style inheritance cache

`computeInheritedStyle` caches results with a generation counter. Each call to `invalidateAllStyleCaches()` increments the generation and forces recomputation. For large entity trees:

- Call `precomputeStyles(world, entities)` once before rendering
- Minimize calls to `invalidateAllStyleCaches()` — batch style changes and invalidate once
- For single-entity changes, prefer `invalidateStyleCache(entity)` over the global invalidation

### Layout system

The `layoutSystem` recursively walks the entity tree every frame. Optimizations already in place:

- Screen dimensions are cached per frame
- Query results are processed via iterators (no intermediate arrays except for root collection)
- Computed values stored in packed `Float32Array`/`Uint8Array`

To reduce work:

- Use `ComputedLayout.valid` to skip entities that haven't changed
- Keep entity hierarchies shallow when possible (fewer ancestor traversals)
- Use `invalidateLayout` selectively rather than `invalidateAllLayouts`

### Stylesheet application

`applyStylesheet` iterates all entities and checks all rules for each. This is O(entities × rules). For large worlds:

- Apply stylesheets once at setup, not every frame
- Use `applyStylesheetToEntity` for newly created entities
- Keep rule count reasonable (tens, not thousands)

### FlexContainer state

`FlexContainer` stores its state in a `Map<Entity, FlexContainerState>` outside the ECS typed arrays. This is necessary for storing variable-length child lists but breaks the data-oriented pattern. For layouts with many flex containers, consider using the simpler `Layout` widget or constraint layout where possible.

### Typed array capacity

All component stores pre-allocate `Float32Array` and `Uint8Array` with a default capacity of 10,000 entities. If your application has more entities, you may need to configure larger arrays. Entity IDs beyond the array bounds will silently write out of range.

---

## Coming from other libraries?

### From blessed/blessed-contrib

| blessed | blECSd |
|---------|--------|
| `element.style.fg = 'red'` | `setStyle(world, eid, { fg: '#ff0000' })` |
| `element.style.border.fg = 'cyan'` | `setBorder(world, eid, { fg: '#00ffff' })` |
| `new Box({ parent: screen })` | `createBox(world, addEntity(world), { ... })` |
| `element.padding = { left: 2 }` | `setPadding(world, eid, { left: 2 })` |
| `screen.render()` | Dirty flag + render system |
| Inherited styles via `style` object | `computeInheritedStyle(world, eid)` |

Key differences:
- blECSd uses packed 32-bit RGBA integers, not named color strings
- No DOM-like tree traversal — parent/child via `Hierarchy` component
- No box model (no margin, no `position: relative` in the CSS sense)
- Layout is explicit, not automatic — you call `recalculate()` or `layout()`

### From Ink (React-based)

| Ink | blECSd |
|-----|--------|
| `<Box flexDirection="row">` | `createFlexContainer(world, eid, { direction: 'row' })` |
| `<Box width="50%">` | `setDimensions(world, eid, '50%', 'auto')` |
| `<Text color="red">` | `setStyle(world, eid, { fg: '#ff0000' })` |
| React reconciler | Manual entity creation + `markDirty` |
| `useStdout`, `useInput` hooks | Input system + event bus |

Key differences:
- No React. No virtual DOM. No reconciliation.
- State is in typed arrays, not React state
- Layout requires explicit `recalculate()` / `layout()` calls
- You manage the entity lifecycle (create, destroy) yourself

### From Ratatui (Rust)

| Ratatui | blECSd |
|---------|--------|
| `Layout::default().constraints([...])` | `layoutVertical(world, area, [...])` |
| `Constraint::Percentage(50)` | `percentage(50)` |
| `Constraint::Length(10)` | `fixed(10)` |
| `Constraint::Min(5)` | `min(5)` |
| `Constraint::Ratio(1, 3)` | `ratio(1, 3)` |
| `Style::default().fg(Color::Red)` | `setStyle(world, eid, { fg: '#ff0000' })` |
| `Block::new().borders(Borders::ALL)` | `setBorder(world, eid, { type: BorderType.Line })` |
| Frame-based immediate rendering | Retained-mode ECS with dirty flags |

The constraint layout system is directly inspired by Ratatui and should feel familiar. The main difference is that blECSd is retained-mode — entities persist between frames and are only redrawn when marked dirty.

---

The style system is intentionally lower-level than CSS. There's no cascading stylesheet engine running every frame, no layout reflow, no box model with margin collapse. The philosophy is explicit, predictable, data-oriented styling that you control. When you set a color, it stays until you change it. When you position an element, it stays there until you move it. The ECS takes care of efficient storage and rendering — you take care of the design decisions.
