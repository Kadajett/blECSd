# Log Widget

An append-only scrollable log display optimized for log messages, console output, and other streaming text content.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createLog, addEntity } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const log = createLog(world, eid, {
  width: 80,
  height: 20,
  scrollback: 500,
  timestamps: true,
  border: { type: 'line' },
});

log.log('Server started on port %d', 3000);
log.log('Connection from %s', '192.168.1.1');
```

---

## Configuration

### LogConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `left` | `number \| string \| keyword` | - | Left position |
| `top` | `number \| string \| keyword` | - | Top position |
| `right` | `number \| string \| keyword` | - | Right position |
| `bottom` | `number \| string \| keyword` | - | Bottom position |
| `width` | `number \| string \| 'auto'` | `'auto'` | Width |
| `height` | `number \| string \| 'auto'` | `'auto'` | Height |
| `fg` | `string \| number` | - | Foreground color |
| `bg` | `string \| number` | - | Background color |
| `border` | `BorderConfig` | - | Border configuration |
| `padding` | `number \| PaddingConfig` | - | Padding |
| `scrollbar` | `boolean \| ScrollbarConfig` | - | Scrollbar configuration |
| `mouse` | `boolean` | `true` | Enable mouse wheel scrolling |
| `keys` | `boolean` | `true` | Enable keyboard scrolling |
| `scrollback` | `number` | `1000` | Maximum lines to keep |
| `scrollOnInput` | `boolean` | `true` | Auto-scroll to bottom on new content |
| `timestamps` | `boolean` | `false` | Add timestamps to log entries |
| `timestampFormat` | `string` | `'HH:mm:ss'` | Timestamp format string |

### ScrollbarConfig

```typescript
interface ScrollbarConfig {
  readonly mode?: 'auto' | 'visible' | 'hidden';
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly trackChar?: string;
  readonly thumbChar?: string;
}
```

### Zod Schema

<!-- blecsd-doccheck:ignore -->
```typescript
import { LogConfigSchema } from 'blecsd';

const validated = LogConfigSchema.parse({
  width: 80,
  height: 20,
  scrollback: 500,
  timestamps: true,
});
```

---

## Factory Function

### createLog

Creates a Log widget attached to an existing entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createLog, addEntity } from 'blecsd';

const eid = addEntity(world);
const log = createLog(world, eid, {
  width: 80,
  height: 20,
  scrollback: 500,
  timestamps: true,
  timestampFormat: 'HH:mm:ss.SSS',
});
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to attach to
- `config?: LogConfig` - Widget configuration

**Returns:** `LogWidget`

---

## LogWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### log

```typescript
log(...args: unknown[]): LogWidget
```

Logs a message with optional printf-style interpolation. Supports `%s` (string), `%d`/`%i` (integer), `%f` (float), and `%j`/`%o`/`%O` (JSON).

```typescript
log.log('Hello %s, you have %d messages', 'Alice', 5);
log.log({ user: 'bob', action: 'login' });
```

### clear

```typescript
clear(): LogWidget
```

Clears all log entries and scrolls to top.

### getLines

```typescript
getLines(): readonly string[]
```

Returns a copy of all lines in the log.

### getLineCount

```typescript
getLineCount(): number
```

Returns the number of lines currently in the log.

### show / hide

```typescript
show(): LogWidget
hide(): LogWidget
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): LogWidget
```

Moves the widget by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): LogWidget
```

Sets the absolute position.

### focus / blur / isFocused

```typescript
focus(): LogWidget
blur(): LogWidget
isFocused(): boolean
```

Focus management.

### append / getChildren

```typescript
append(child: Entity): LogWidget
getChildren(): Entity[]
```

Hierarchy management for child entities.

### Scrolling Methods

```typescript
scrollTo(x: number, y: number): LogWidget
scrollBy(dx: number, dy: number): LogWidget
setScrollPerc(percX: number, percY: number): LogWidget
getScrollPerc(): ScrollPercentage
getScroll(): ScrollPosition
setViewport(width: number, height: number): LogWidget
getScrollable(): ScrollableData | undefined
scrollToTop(): LogWidget
scrollToBottom(): LogWidget
scrollToLeft(): LogWidget
scrollToRight(): LogWidget
canScroll(): boolean
canScrollX(): boolean
canScrollY(): boolean
isAtTop(): boolean
isAtBottom(): boolean
isAtLeft(): boolean
isAtRight(): boolean
```

Full scrolling API. All scroll methods return `this` for chaining.

### destroy

```typescript
destroy(): void
```

Destroys the widget and removes the entity from the world.

---

## Utility Functions

### isLog

<!-- blecsd-doccheck:ignore -->
```typescript
import { isLog } from 'blecsd';

if (isLog(world, entity)) {
  // Entity is a log widget
}
```

### isMouseScrollEnabled

<!-- blecsd-doccheck:ignore -->
```typescript
import { isMouseScrollEnabled } from 'blecsd';

if (isMouseScrollEnabled(world, entity)) {
  // Mouse scrolling is active
}
```

### isKeysScrollEnabled

<!-- blecsd-doccheck:ignore -->
```typescript
import { isKeysScrollEnabled } from 'blecsd';

if (isKeysScrollEnabled(world, entity)) {
  // Keyboard scrolling is active
}
```

### getScrollback

<!-- blecsd-doccheck:ignore -->
```typescript
import { getScrollback } from 'blecsd';

const limit = getScrollback(world, entity);
// Returns 0 if no limit
```

---

## Examples

### Application Log Viewer

<!-- blecsd-doccheck:ignore -->
```typescript
import { createLog, addEntity, createWorld } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const appLog = createLog(world, eid, {
  width: 80,
  height: 20,
  scrollback: 2000,
  timestamps: true,
  timestampFormat: 'HH:mm:ss',
  border: { type: 'line', ch: 'single' },
  scrollbar: { mode: 'auto' },
});

appLog.log('Application started');
appLog.log('Config loaded from %s', '/etc/app.conf');
appLog.log('Listening on port %d', 8080);
```

### Printf-Style Logging

```typescript
log.log('String: %s', 'hello');
log.log('Integer: %d', 42);
log.log('Float: %f', 3.14);
log.log('JSON: %j', { key: 'value' });
log.log('Progress: %d%%', 75);     // "Progress: 75%"
```

### Controlling Scroll

```typescript
const log = createLog(world, eid, {
  width: 80,
  height: 10,
  scrollOnInput: false,  // Don't auto-scroll
});

// Manually scroll
log.scrollToTop();
log.scrollBy(0, 5);

const perc = log.getScrollPerc();
console.log(`Scrolled ${perc.y}% vertically`);
```

---

## See Also

- [Streaming Text](./streaming-text.md) - For character-by-character streaming
- [Content Manipulation](./content-manipulation.md) - Line-level content editing
- [ScrollableText Widget](./scrollableText.md) - General scrollable text display
