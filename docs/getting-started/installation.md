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

## When to Use blECSd

blECSd excels at:

| Scenario | Why blECSd |
|----------|------------|
| Complex TUI applications | ECS scales to thousands of UI elements with consistent performance |
| Dashboards and monitoring tools | Efficient updates and rendering for real-time data |
| File managers and dev tools | Rich interaction patterns (focus, drag, keyboard navigation) |
| Terminal games | Full animation system, state machines, high frame rates |
| Applications needing animations | Physics-based transitions, momentum scrolling, spring dynamics |

## When NOT to Use blECSd

Consider alternatives for these scenarios:

| Scenario | Recommendation |
|----------|----------------|
| Simple CLI prompts | Use [inquirer](https://github.com/SBoudrias/Inquirer.js) or [prompts](https://github.com/terkelg/prompts) |
| Need browser support | blECSd is terminal-only; use a web UI library |
| Prefer React-style composition | Use [Ink](https://github.com/vadimdemedes/ink) for React-in-terminal |
| Want ready-made widgets with no setup | blECSd provides primitives you compose into widgets |
| Unfamiliar with ECS and don't want to learn | blECSd is built around bitECS; the paradigm is different from OOP |

### Limitations

- **No browser support**: Terminal-only library
- **Primitives over widgets**: You compose UI from components (though entity factories help)
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
