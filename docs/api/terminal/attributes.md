# Attribute Encoding API

Convert internal attribute representations to ANSI SGR escape sequences.

## Overview

The attribute encoding module provides functions to convert `Attribute` objects (internal representation of terminal styles and colors) to SGR (Select Graphic Rendition) escape sequences that terminals understand. This is the inverse of `attrCode()` which parses SGR sequences into attributes.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createAttribute,
  attrCode,
  codeAttr,
  sgrReset,
  TextStyle,
  ColorType,
} from 'blecsd';

// Create an attribute with bold + red foreground
let attr = createAttribute();
attr = attrCode([1, 31], attr);

// Convert back to SGR string
const sgr = codeAttr(attr);
// sgr = '\x1b[1;31m'

// Apply to terminal output
process.stdout.write(sgr + 'Bold red text' + sgrReset());
```

## Functions

### codeAttr

Converts an attribute to an SGR escape sequence string.

<!-- blecsd-doccheck:ignore -->
```typescript
import { codeAttr, createAttribute, attrCode, TextStyle, ColorType } from 'blecsd';

// Basic usage
const attr = attrCode([1, 31], createAttribute()); // bold red
const sgr = codeAttr(attr);
// sgr = '\x1b[1;31m'

// With reset prefix
const sgrWithReset = codeAttr(attr, { includeReset: true });
// sgrWithReset = '\x1b[0;1;31;49m'

// With color depth reduction
const sgr16 = codeAttr(attr, { colorDepth: '16' });
```

**Parameters:**
- `attr` - The Attribute to convert
- `options` - Optional conversion options:
  - `colorDepth` - Maximum color depth: `'truecolor'`, `'256'`, `'16'`, or `'none'`
  - `includeReset` - Include reset code (0) at start

**Returns:** SGR escape sequence string (e.g., `'\x1b[1;31m'`)

### attrToSgrCodes

Converts an attribute to an array of SGR code numbers.

<!-- blecsd-doccheck:ignore -->
```typescript
import { attrToSgrCodes, createAttribute, attrCode } from 'blecsd';

const attr = attrCode([1, 31], createAttribute());
const codes = attrToSgrCodes(attr);
// codes = [1, 31]

// With 256-color
const attr256 = {
  fg: { type: ColorType.COLOR_256, value: 196 },
  bg: { type: ColorType.DEFAULT, value: 0 },
  styles: TextStyle.BOLD,
};
const codes256 = attrToSgrCodes(attr256);
// codes256 = [1, 38, 5, 196]
```

**Parameters:**
- `attr` - The Attribute to convert
- `options` - Same options as `codeAttr`

**Returns:** Array of SGR code numbers

### sgrReset

Returns the SGR reset sequence.

<!-- blecsd-doccheck:ignore -->
```typescript
import { sgrReset } from 'blecsd';

const reset = sgrReset();
// reset = '\x1b[0m'

// Usage
process.stdout.write('\x1b[1;31mRed bold' + sgrReset() + ' normal');
```

## Color Depth Reduction

When targeting terminals with limited color support, use the `colorDepth` option:

<!-- blecsd-doccheck:ignore -->
```typescript
import { codeAttr, ColorType, packRgb, TextStyle } from 'blecsd';

const attr = {
  fg: { type: ColorType.RGB, value: packRgb(255, 128, 0) }, // Orange
  bg: { type: ColorType.DEFAULT, value: 0 },
  styles: TextStyle.NONE,
};

// Full truecolor (default)
codeAttr(attr);
// '\x1b[38;2;255;128;0m'

// Reduce to 256-color palette
codeAttr(attr, { colorDepth: '256' });
// '\x1b[38;5;214m'

// Reduce to basic 16-color
codeAttr(attr, { colorDepth: '16' });
// '\x1b[91m' or similar basic code

// No colors (styles only)
codeAttr(attr, { colorDepth: 'none' });
// '\x1b[39m' (default foreground)
```

### Color Depth Values

| Depth | Description |
|-------|-------------|
| `'truecolor'` | Full 24-bit RGB (default) |
| `'256'` | 256-color palette |
| `'16'` | Basic 16 ANSI colors |
| `'none'` | Default colors only |

## Types

### OutputColorDepth

```typescript
type OutputColorDepth = 'truecolor' | '256' | '16' | 'none';
```

### CodeAttrOptions

```typescript
interface CodeAttrOptions {
  /** Maximum color depth to output. Defaults to 'truecolor'. */
  colorDepth?: OutputColorDepth;
  /** Include reset code at start. Defaults to false. */
  includeReset?: boolean;
}
```

## Roundtrip Example

Parse SGR and convert back:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createAttribute,
  parseSgrString,
  codeAttr,
  attributesEqual,
} from 'blecsd';

// Parse SGR string
const attr1 = createAttribute();
parseSgrString('\x1b[1;4;38;5;196m', attr1);

// Convert back to SGR
const sgr = codeAttr(attr1);

// Parse again to verify roundtrip
const attr2 = createAttribute();
parseSgrString(sgr, attr2);

// Attributes should match
console.log(attributesEqual(attr1, attr2)); // true
```

## Style Codes Reference

| Style | SGR Code |
|-------|----------|
| Bold | 1 |
| Dim | 2 |
| Italic | 3 |
| Underline | 4 |
| Blink | 5 |
| Rapid Blink | 6 |
| Inverse | 7 |
| Hidden | 8 |
| Strikethrough | 9 |
| Double Underline | 21 |
| Overline | 53 |

## Color Codes Reference

### Foreground Colors

| Type | Format |
|------|--------|
| Basic (0-7) | `30-37` |
| Bright (8-15) | `90-97` |
| 256-color | `38;5;N` |
| RGB | `38;2;R;G;B` |
| Default | `39` |

### Background Colors

| Type | Format |
|------|--------|
| Basic (0-7) | `40-47` |
| Bright (8-15) | `100-107` |
| 256-color | `48;5;N` |
| RGB | `48;2;R;G;B` |
| Default | `49` |

## Best Practices

1. **Check terminal capabilities** before using truecolor or 256-color modes.

2. **Use `includeReset: true`** when you need to ensure a clean slate before applying new styles.

3. **Cache converted strings** when rendering repeatedly with the same attributes.

4. **Test with reduced color depth** to ensure your application works on older terminals.
