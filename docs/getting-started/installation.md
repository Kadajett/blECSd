# Installation

## Requirements

- Node.js 18+
- A terminal with 256-color support

### Supported Terminals

| Terminal | Platform | Truecolor | Notes |
|----------|----------|-----------|-------|
| iTerm2 | macOS | Yes | Recommended for macOS |
| Kitty | Linux, macOS | Yes | GPU-accelerated |
| Alacritty | All | Yes | Cross-platform, GPU-accelerated |
| Windows Terminal | Windows | Yes | Recommended for Windows |
| GNOME Terminal | Linux | Yes | Default on many Linux distros |
| Konsole | Linux | Yes | KDE default |
| VS Code Terminal | All | Yes | Works well |
| Hyper | All | Yes | Electron-based |
| Terminal.app | macOS | No | 256 colors only |
| xterm | All | Partial | Depends on configuration |

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

## When NOT to Use blECSd

blECSd is not the right choice for every project. Consider alternatives if:

| Scenario | Recommendation |
|----------|----------------|
| Building a TUI application (forms, menus, dialogs) | Use [Ink](https://github.com/vadimdemedes/ink), [blessed](https://github.com/chjj/blessed), or [Textual](https://textual.textualize.io/) |
| Need browser support | blECSd is terminal-only; use a canvas/WebGL game library |
| Building a simple CLI tool | Use [inquirer](https://github.com/SBoudrias/Inquirer.js) or [prompts](https://github.com/terkelg/prompts) |
| Need GUI widgets out of the box | blECSd provides primitives, not ready-made widgets |
| Working with non-ECS architecture | blECSd is built around bitECS; OOP patterns will fight the library |

### Limitations

- **No browser support**: Terminal-only library
- **No built-in widgets**: You build UI from components and systems
- **ECS learning curve**: Requires understanding Entity Component System patterns
- **Terminal-dependent features**: Some capabilities vary by terminal emulator

## Terminal Capability Detection

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
