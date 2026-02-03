# Backends Module

Terminal encoding backends that convert a PixelFramebuffer into terminal output. All backends implement the `RendererBackend` interface.

**Import:** `import { three } from 'blecsd'` or `import * from 'blecsd/3d/backends'`

## RendererBackend Interface

```typescript
interface RendererBackend {
  readonly type: BackendType;
  readonly capabilities: BackendCapabilities;
  encode(fb: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput;
  getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number };
}
```

### BackendCapabilities

```typescript
interface BackendCapabilities {
  readonly pixelsPerCellX: number;  // Horizontal pixels per terminal cell
  readonly pixelsPerCellY: number;  // Vertical pixels per terminal cell
  readonly supportsColor: boolean;
  readonly supportsTrueColor: boolean;
  readonly supportsAlpha: boolean;
}
```

### EncodedOutput

```typescript
interface EncodedOutput {
  readonly cells?: ReadonlyArray<{
    x: number; y: number; char: string; fg: number; bg: number;
  }>;
  readonly escape?: string;
  readonly cursorX?: number;
  readonly cursorY?: number;
}
```

Cell-based backends (braille, halfblock, sextant) return `cells`. Escape-based backends (sixel, kitty) return `escape`.

## Backends

### Braille

Maps 2x4 pixel blocks to Unicode braille characters (U+2800 range). Universal terminal support.

```typescript
const backend = three.createBrailleBackend();
// 2 pixels wide, 4 pixels tall per terminal cell
// Capabilities: { pixelsPerCellX: 2, pixelsPerCellY: 4 }
```

**Resolution:** For a 60x20 cell viewport, effective resolution is 120x80 pixels.

### Half-block

Uses Unicode half-block characters (upper/lower half). Each cell can display two independent colors.

```typescript
const backend = three.createHalfBlockBackend();
// 1 pixel wide, 2 pixels tall per terminal cell
// Capabilities: { pixelsPerCellX: 1, pixelsPerCellY: 2 }
```

### Sextant

Uses Unicode 13 legacy computing sextant characters (2x3 dot pattern per cell).

```typescript
const backend = three.createSextantBackend();
// 2 pixels wide, 3 pixels tall per terminal cell
// Capabilities: { pixelsPerCellX: 2, pixelsPerCellY: 3 }
```

### Sixel

DEC sixel bitmap protocol. Requires terminal support (xterm with sixel, mlterm, foot, WezTerm).

```typescript
const backend = three.createSixelBackend({ maxColors: 256 });
```

Returns `escape` string containing DCS sixel sequences.

### Kitty Graphics Protocol

GPU-accelerated image display in Kitty terminal. True color with alpha support.

```typescript
const backend = three.createKittyBackend();
```

Returns `escape` string containing Kitty graphics protocol sequences with base64-encoded RGBA data.

## Auto-Detection

### `detectBestBackend(): BackendType`

Detects the best available backend based on terminal capabilities. Preference order: kitty > sixel > braille.

```typescript
const backendType = three.detectBestBackend();
const backend = three.createBackend(backendType);
```

### `createBackend(type): RendererBackend`

Factory function to create a backend by type string.

## Zod Schemas

- `BackendTypeSchema` - `'braille' | 'halfblock' | 'sextant' | 'sixel' | 'kitty'`
- `BackendPreferenceSchema` - `'auto' | BackendType`
- `BackendSelectionSchema` - Validated backend selection
- `BackendCapabilitiesSchema` - Capabilities object
- `BrailleConfigSchema`, `HalfBlockConfigSchema`, `SextantConfigSchema` - Per-backend config
- `SixelConfigSchema` - `{ maxColors: number }`
- `KittyConfigSchema` - Kitty-specific options
- `EncodedCellSchema` - Single encoded cell
- `EncodedOutputSchema` - Full encoded output
