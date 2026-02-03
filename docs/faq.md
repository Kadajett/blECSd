# FAQ & Troubleshooting

Common questions and solutions for working with blECSd.

## General Questions

### What is blECSd?

blECSd is a high-performance terminal UI library built on TypeScript and bitECS. It provides ECS components, widgets, systems, and terminal I/O utilities for building terminal applications, dashboards, and games.

### Is blECSd related to the original blessed library?

blECSd is inspired by the original blessed library's architecture but is a complete rewrite using modern TypeScript and an Entity Component System (ECS) design. It is **not** backwards compatible with blessed.

### Should I use blECSd or Ink/Textual?

| Use blECSd when you need: | Use Ink when you need: | Use Textual when you need: |
|---------------------------|------------------------|----------------------------|
| High-performance rendering | React-style development | Python ecosystem |
| Physics-based animations | Familiar JSX syntax | CSS-like styling |
| Game development features | Simple CLI tools | Rapid prototyping |
| Fine-grained control | Component reusability | Built-in theming |
| Virtualized large datasets | Quick iteration | Rich widget library |

blECSd excels at performance-critical applications, games, and situations where you need precise control over rendering.

### Can I use blECSd in the browser?

No. blECSd is terminal-only and requires Node.js TTY streams. For browser-based terminal UIs, consider xterm.js.

### What Node.js versions are supported?

Node.js 18+ is required. LTS versions are recommended.

## ECS Questions

### Do I need to understand ECS to use blECSd?

For basic usage, no. The widget API hides ECS details:

```typescript
const panel = createPanel(world, entity, { title: 'Hello' });
panel.setTitle('New Title');
```

For advanced usage and custom systems, understanding ECS helps. See the [Architecture Guide](./contributing/ARCHITECTURE.md).

### What is the difference between components and widgets?

**Components** are low-level data stores:
```typescript
setPosition(world, eid, 10, 20);  // Sets raw data
```

**Widgets** are factory functions that configure multiple components:
```typescript
const panel = createPanel(world, entity, config);  // Sets up Position, Dimensions, Border, etc.
```

### Can I mix blECSd with other ECS libraries?

Yes, if they use bitECS. blECSd components are standard bitECS components. You can add your own components and systems alongside blECSd's.

### How do I handle large datasets?

Use virtualization. Only create entities for visible items:

```typescript
// Data: 10,000 items
const items = loadItems();

// Only render visible portion
const visible = items.slice(viewportStart, viewportStart + viewportSize);
for (const [i, item] of visible.entries()) {
  const eid = getOrCreateEntity(viewportStart + i);
  setContent(world, eid, item.name);
}
```

See the [VirtualizedList widget](./api/widgets/virtualizedList.md) for built-in support.

## Terminal Compatibility

### Which terminals are supported?

| Terminal | Support | Notes |
|----------|---------|-------|
| iTerm2 | Full | Recommended for macOS |
| Kitty | Full | Best performance |
| Alacritty | Full | Fast, GPU-accelerated |
| Windows Terminal | Full | Recommended for Windows |
| GNOME Terminal | Full | Good Linux default |
| Konsole | Full | KDE default |
| xterm | Good | Basic but reliable |
| Terminal.app | Limited | Missing some features |
| cmd.exe | Limited | Use Windows Terminal instead |
| PowerShell | Limited | Use Windows Terminal instead |

### What terminal features does blECSd use?

| Feature | Required | Optional |
|---------|----------|----------|
| ANSI colors | Yes | - |
| Cursor positioning | Yes | - |
| Alternate screen | No | Recommended |
| Mouse input | No | For mouse support |
| True color (24-bit) | No | For full color palette |
| Unicode | No | For special characters |
| Bracketed paste | No | For safe pasting |

### How do I check terminal capabilities?

```typescript
import { detectTerminal, getCapabilities } from 'blecsd';

const term = detectTerminal();
console.log(term.name);           // 'xterm-256color'
console.log(term.trueColor);      // true/false
console.log(term.unicode);        // true/false

const caps = getCapabilities();
console.log(caps.colors);         // 256 or 16777216
console.log(caps.mouse);          // true/false
```

### Why don't colors look right?

1. **Check color support**: Your terminal may only support 256 or 16 colors
2. **Check TERM variable**: `echo $TERM` should show something like `xterm-256color`
3. **Force true color**: Set `COLORTERM=truecolor` environment variable
4. **Theme conflicts**: Some terminal themes override colors

### Why doesn't mouse input work?

1. **Enable mouse**: Call `program.enableMouse()`
2. **Check terminal**: Some terminals don't support mouse protocols
3. **Check SSH**: Mouse may not work over SSH without proper forwarding
4. **Check tmux/screen**: May need additional configuration

For tmux, add to `.tmux.conf`:
```
set -g mouse on
```

## Common Errors

### "Cannot find module 'blecsd'"

**Cause**: Library not installed or not built.

**Solution**:
```bash
pnpm install
pnpm build
```

### "process.stdin.setRawMode is not a function"

**Cause**: Not running in a TTY (e.g., piped input).

**Solution**: Ensure you're running in a real terminal, not redirected:
```bash
# Wrong
echo "input" | node app.js

# Correct
node app.js
```

### "Maximum call stack size exceeded"

**Cause**: Circular parent-child relationships or recursive rendering.

**Solution**: Check hierarchy setup:
```typescript
// Wrong: circular reference
setParent(world, parent, child);
setParent(world, child, parent);

// Correct: proper tree
setParent(world, child, parent);
```

### "Entity X does not exist"

**Cause**: Using an entity ID after it was removed.

**Solution**: Check entity lifecycle:
```typescript
const eid = addEntity(world);
// ... use entity ...
removeEntity(world, eid);
// Don't use eid after this!
```

### "Screen buffer overflow"

**Cause**: Writing outside terminal bounds.

**Solution**: Check position and dimensions:
```typescript
const { columns, rows } = process.stdout;
// Ensure x < columns and y < rows
```

### Performance issues with many entities

**Cause**: Too many entities or expensive system operations.

**Solutions**:
1. Use virtualization for large lists
2. Add dirty tracking to skip unchanged entities
3. Reduce system complexity
4. Profile with `--prof` flag

## Debugging

### How do I debug terminal output?

Write to stderr (doesn't interfere with terminal UI):
```typescript
console.error('Debug:', value);
```

Or log to a file:
```typescript
import { appendFileSync } from 'fs';
function log(msg: string) {
  appendFileSync('debug.log', msg + '\n');
}
```

### How do I inspect ECS state?

```typescript
import { getAllEntities } from 'bitecs';

function debugWorld(world: World): void {
  const entities = getAllEntities(world);
  console.error(`Entities: ${entities.length}`);

  for (const eid of entities) {
    console.error(`${eid}: pos=(${Position.x[eid]}, ${Position.y[eid]})`);
  }
}
```

### How do I recover from a crash?

If your app crashes and leaves the terminal in a bad state:

```bash
# Reset terminal
reset

# Or manually restore
echo -e '\e[?1049l\e[?25h\e[0m'
```

Add cleanup to your app:
```typescript
process.on('SIGINT', cleanup);
process.on('uncaughtException', (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});

function cleanup() {
  program.showCursor();
  program.normalBuffer();
  process.stdin.setRawMode(false);
}
```

## Performance

### How fast is blECSd?

With proper virtualization:
- **10,000+ items**: Smooth scrolling at 60fps
- **Entity operations**: Microseconds per operation
- **System updates**: Depends on entity count and complexity

### How do I optimize my app?

1. **Virtualize large lists**: Only render visible items
2. **Use dirty tracking**: Skip unchanged entities in render
3. **Minimize entity count**: Combine elements where possible
4. **Profile first**: Use `--prof` to find actual bottlenecks
5. **Batch updates**: Update many entities, then render once

### Memory usage seems high

1. **Check entity count**: More entities = more memory
2. **Check component capacity**: Default is 10,000 entities
3. **Clear unused entities**: `removeEntity(world, eid)`
4. **Watch for event listener leaks**: Unsubscribe when done

## Getting Help

### Where can I get help?

1. **Documentation**: You're here!
2. **GitHub Issues**: Report bugs or ask questions
3. **Examples**: Check `examples/` for working code
4. **Source Code**: Read the implementation

### How do I report a bug?

Open a GitHub issue with:

1. blECSd version
2. Node.js version
3. Terminal and OS
4. Minimal reproduction code
5. Expected vs actual behavior
6. Error messages (if any)

### How do I request a feature?

Open a GitHub issue with:

1. Clear description of the feature
2. Use case (why is this useful?)
3. Proposed API (if you have ideas)
4. Willingness to help implement
