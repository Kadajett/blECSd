# Message Widget

Displays temporary notifications with auto-dismiss, click/key dismiss, and styled message types (info, warning, error, success).

## Overview

```typescript
import { createMessage, showInfo, showError, showWarning, showSuccess } from 'blecsd';

const world = createWorld();

// Create a typed message
const msg = createMessage(world, {
  content: 'File saved successfully',
  type: 'success',
  timeout: 2000,
});

// Or use convenience functions
const info = showInfo(world, 'Operation completed');
const error = showError(world, 'Connection failed');
```

---

## Configuration

### MessageConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | `string` | `''` | Message text |
| `type` | `'info' \| 'warning' \| 'error' \| 'success'` | `'info'` | Message type for preset styling |
| `timeout` | `number` | `3000` | Auto-dismiss timeout in ms (0 = manual only) |
| `dismissOnClick` | `boolean` | `true` | Dismiss when clicked |
| `dismissOnKey` | `boolean` | `true` | Dismiss on any key press |
| `left` | `number \| string \| 'center'` | - | Left position |
| `top` | `number \| string \| 'center'` | - | Top position |
| `width` | `number` | auto | Width (auto-calculated from content) |
| `height` | `number` | auto | Height (auto-calculated from content) |
| `fg` | `string \| number` | per type | Foreground color (overrides type style) |
| `bg` | `string \| number` | per type | Background color (overrides type style) |
| `border` | `BorderConfig` | - | Border configuration |
| `padding` | `number` | `1` | Padding around content |
| `infoStyle` | `MessageStyleConfig` | built-in | Custom info style |
| `warningStyle` | `MessageStyleConfig` | built-in | Custom warning style |
| `errorStyle` | `MessageStyleConfig` | built-in | Custom error style |
| `successStyle` | `MessageStyleConfig` | built-in | Custom success style |

### MessageStyleConfig

```typescript
interface MessageStyleConfig {
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly borderFg?: string | number;
}
```

### Zod Schema

```typescript
import { MessageConfigSchema } from 'blecsd';

const validated = MessageConfigSchema.parse({
  content: 'Hello',
  type: 'info',
  timeout: 5000,
});
```

---

## Default Type Styles

| Type | Foreground | Background | Border |
|------|-----------|------------|--------|
| `info` | `#ffffff` | `#2196f3` | `#64b5f6` |
| `warning` | `#000000` | `#ff9800` | `#ffb74d` |
| `error` | `#ffffff` | `#f44336` | `#e57373` |
| `success` | `#ffffff` | `#4caf50` | `#81c784` |

---

## Factory Function

### createMessage

Creates a Message widget with the given configuration.

```typescript
import { createMessage } from 'blecsd';

const msg = createMessage(world, {
  content: 'Changes saved',
  type: 'success',
  timeout: 3000,
  border: { type: 'line', ch: 'rounded' },
});
```

**Parameters:**
- `world: World` - The ECS world
- `config?: MessageConfig` - Widget configuration

**Returns:** `MessageWidget`

---

## MessageWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### setContent

```typescript
setContent(text: string): MessageWidget
```

Sets the message text. Returns `this` for chaining.

### getContent

```typescript
getContent(): string
```

Gets the current message text.

### show / hide

```typescript
show(): MessageWidget
hide(): MessageWidget
```

Controls visibility of the message.

### move

```typescript
move(dx: number, dy: number): MessageWidget
```

Moves the message by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): MessageWidget
```

Sets the absolute position.

### center

```typescript
center(screenWidth: number, screenHeight: number): MessageWidget
```

Centers the message on screen given the terminal dimensions.

```typescript
msg.center(80, 24);
```

### dismiss

```typescript
dismiss(): void
```

Manually dismisses the message. Hides it, clears the auto-dismiss timer, and fires the onDismiss callback.

### isDismissed

```typescript
isDismissed(): boolean
```

Returns whether the message has been dismissed.

### onDismiss

```typescript
onDismiss(callback: () => void): MessageWidget
```

Registers a callback that fires when the message is dismissed.

### destroy

```typescript
destroy(): void
```

Destroys the widget, clears timers, and removes the entity from the world.

---

## Convenience Functions

### showInfo

```typescript
import { showInfo } from 'blecsd';

const msg = showInfo(world, 'Operation completed', { timeout: 5000 });
```

**Parameters:**
- `world: World` - The ECS world
- `text: string` - Message text
- `options?: Omit<MessageConfig, 'content' | 'type'>` - Additional options

**Returns:** `MessageWidget`

### showWarning

```typescript
import { showWarning } from 'blecsd';

const msg = showWarning(world, 'This action cannot be undone');
```

### showError

```typescript
import { showError } from 'blecsd';

const msg = showError(world, 'Failed to save file');
```

### showSuccess

```typescript
import { showSuccess } from 'blecsd';

const msg = showSuccess(world, 'File saved successfully');
```

---

## Utility Functions

### isMessage

```typescript
import { isMessage } from 'blecsd';

if (isMessage(world, entity)) {
  // Entity is a message widget
}
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID

**Returns:** `boolean`

### isDismissOnClick

```typescript
import { isDismissOnClick } from 'blecsd';

if (isDismissOnClick(world, entity)) {
  // Click dismiss is enabled
}
```

### isDismissOnKey

```typescript
import { isDismissOnKey } from 'blecsd';

if (isDismissOnKey(world, entity)) {
  // Key dismiss is enabled
}
```

### handleMessageClick

```typescript
import { handleMessageClick } from 'blecsd';

const wasDismissed = handleMessageClick(world, entity);
```

Dismisses the message if `dismissOnClick` is enabled and the message is not already dismissed.

**Returns:** `boolean` - true if the message was dismissed

### handleMessageKey

```typescript
import { handleMessageKey } from 'blecsd';

const wasDismissed = handleMessageKey(world, entity);
```

Dismisses the message if `dismissOnKey` is enabled and the message is not already dismissed.

**Returns:** `boolean` - true if the message was dismissed

---

## Examples

### Notification with Callback

```typescript
import { createMessage } from 'blecsd';

const msg = createMessage(world, {
  content: 'Download complete!',
  type: 'success',
  timeout: 3000,
});

msg.center(80, 24).onDismiss(() => {
  console.log('Message was dismissed');
});
```

### Manual Dismiss Only

```typescript
import { createMessage } from 'blecsd';

const msg = createMessage(world, {
  content: 'Critical error: please restart',
  type: 'error',
  timeout: 0,           // No auto-dismiss
  dismissOnClick: false, // Must call dismiss() manually
  dismissOnKey: false,
});

// Later, when resolved:
msg.dismiss();
```

### Custom Styled Message

```typescript
import { createMessage } from 'blecsd';

const msg = createMessage(world, {
  content: 'Custom notification',
  fg: '#000000',
  bg: '#e0e0e0',
  border: { type: 'line', ch: 'double', fg: '#888888' },
  padding: 2,
  timeout: 5000,
});
```

---

## See Also

- [Modal Widget](./modal.md) - For persistent overlay dialogs
- [Question Widget](./question.md) - Yes/no confirmation dialogs
- [Prompt Widget](./prompt.md) - Text input dialogs
