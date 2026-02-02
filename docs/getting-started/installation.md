# Installation

## Requirements

- Node.js 18+
- A terminal with 256-color support (most modern terminals)

## Install

```bash
npm install blecsd
# or
pnpm add blecsd
# or
yarn add blecsd
```

## TypeScript Configuration

blECSd ships with type definitions. For the best experience, enable strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Verify Installation

Create `test.ts`:

```typescript
import { createWorld, setPosition, getPosition } from 'blecsd';
import { addEntity } from 'bitecs';

const world = createWorld();
const entity = addEntity(world);

setPosition(world, entity, 10, 5);
const pos = getPosition(world, entity);

console.log(`Position: ${pos?.x}, ${pos?.y}`);
```

Run:

```bash
npx tsx test.ts
```

Expected output:

```
Position: 10, 5
```

## Terminal Compatibility

blECSd works with any terminal that supports ANSI escape sequences. Truecolor (24-bit) support is recommended:

| Terminal | Truecolor | Notes |
|----------|-----------|-------|
| iTerm2 | Yes | Recommended for macOS |
| Kitty | Yes | GPU-accelerated |
| Alacritty | Yes | Cross-platform |
| Windows Terminal | Yes | Recommended for Windows |
| VS Code Terminal | Yes | Works well |
| macOS Terminal.app | No | 256 colors only |

blECSd does not handle terminal capability detection automatically. Use the detection utilities if you need to check capabilities:

```typescript
import { getTerminalInfo } from 'blecsd/terminal';

const info = getTerminalInfo();
console.log(info.colorDepth); // 24, 8, or 4
```

## Troubleshooting

### "Cannot find module 'blecsd'"

Verify the package is installed:

```bash
npm ls blecsd
```

### "Cannot find module 'bitecs'"

blECSd has bitecs as a peer dependency. Install it:

```bash
npm install bitecs
```

### Colors appear wrong

Your terminal may not support truecolor. Check:

```bash
echo $COLORTERM
```

If empty or not `truecolor`, your terminal is limited to 256 colors. blECSd still works, but colors will be approximated.
