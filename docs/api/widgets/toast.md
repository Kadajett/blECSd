# Toast Widget

Non-blocking notification widget that auto-dismisses. Multiple toasts can be stacked at various positions on the screen.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createToast, showSuccessToast, showErrorToast } from 'blecsd';

const world = createWorld();

// Create a typed toast
const toast = createToast(world, {
  content: 'File saved successfully',
  type: 'success',
  position: 'top-right',
  timeout: 2000,
}, 80, 24);

// Or use convenience functions
const success = showSuccessToast(world, 'Operation completed', {}, 80, 24);
const error = showErrorToast(world, 'Connection failed', {}, 80, 24);
```

---

## Configuration

### ToastConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | `string` | `''` | Toast message text |
| `type` | `ToastType` | `'info'` | Toast type for preset styling |
| `timeout` | `number` | `3000` | Auto-dismiss timeout in ms (0 = manual only) |
| `position` | `ToastPosition` | `'top-right'` | Position on screen |
| `fg` | `string \| number` | per type | Foreground color (overrides type style) |
| `bg` | `string \| number` | per type | Background color (overrides type style) |
| `border` | `ToastBorderConfig` | - | Border configuration |
| `padding` | `number` | `1` | Padding around content |
| `width` | `number` | auto | Width (auto-calculated from content) |
| `infoStyle` | `ToastStyleConfig` | built-in | Custom info style |
| `successStyle` | `ToastStyleConfig` | built-in | Custom success style |
| `warningStyle` | `ToastStyleConfig` | built-in | Custom warning style |
| `errorStyle` | `ToastStyleConfig` | built-in | Custom error style |

### ToastType

```typescript
type ToastType = 'info' | 'success' | 'warning' | 'error';
```

### ToastPosition

```typescript
type ToastPosition =
  | 'top-right'
  | 'top-center'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left';
```

### ToastStyleConfig

```typescript
interface ToastStyleConfig {
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly borderFg?: string | number;
}
```

### Zod Schema

<!-- blecsd-doccheck:ignore -->
```typescript
import { ToastConfigSchema } from 'blecsd';

const validated = ToastConfigSchema.parse({
  content: 'Hello',
  type: 'info',
  position: 'top-right',
  timeout: 5000,
});
```

---

## Default Type Styles

| Type | Foreground | Background | Border |
|------|-----------|------------|--------|
| `info` | `#ffffff` | `#2196f3` | `#64b5f6` |
| `success` | `#ffffff` | `#4caf50` | `#81c784` |
| `warning` | `#000000` | `#ff9800` | `#ffb74d` |
| `error` | `#ffffff` | `#f44336` | `#e57373` |

---

## Factory Function

### createToast

Creates a Toast widget with the given configuration.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createToast } from 'blecsd';

const toast = createToast(world, {
  content: 'Changes saved',
  type: 'success',
  position: 'top-right',
  timeout: 3000,
}, 80, 24);
```

**Parameters:**
- `world: World` - The ECS world
- `config?: ToastConfig` - Widget configuration
- `screenWidth?: number` - Screen width for positioning (default: 80)
- `screenHeight?: number` - Screen height for positioning (default: 24)

**Returns:** `ToastWidget`

---

## ToastWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### setContent

```typescript
setContent(text: string): ToastWidget
```

Sets the toast text. Returns `this` for chaining.

### getContent

```typescript
getContent(): string
```

Gets the current toast text.

### show / hide

```typescript
show(): ToastWidget
hide(): ToastWidget
```

Controls visibility of the toast.

### move

```typescript
move(dx: number, dy: number): ToastWidget
```

Moves the toast by a relative offset.

### dismiss

```typescript
dismiss(): void
```

Manually dismisses the toast. Hides it, removes it from the position stack, repositions remaining toasts, clears the auto-dismiss timer, and fires the onDismiss callback.

### isDismissed

```typescript
isDismissed(): boolean
```

Returns whether the toast has been dismissed.

### onDismiss

```typescript
onDismiss(callback: () => void): ToastWidget
```

Registers a callback that fires when the toast is dismissed.

### destroy

```typescript
destroy(): void
```

Destroys the widget, clears timers, removes from position tracking, and removes the entity from the world.

---

## Convenience Functions

### showInfoToast

<!-- blecsd-doccheck:ignore -->
```typescript
import { showInfoToast } from 'blecsd';

const toast = showInfoToast(world, 'Operation completed', {}, 80, 24);
```

**Parameters:**
- `world: World` - The ECS world
- `text: string` - Toast text
- `options?: Omit<ToastConfig, 'content' | 'type'>` - Additional options
- `screenWidth?: number` - Screen width (default: 80)
- `screenHeight?: number` - Screen height (default: 24)

**Returns:** `ToastWidget`

### showSuccessToast

<!-- blecsd-doccheck:ignore -->
```typescript
import { showSuccessToast } from 'blecsd';

const toast = showSuccessToast(world, 'File saved successfully', {}, 80, 24);
```

### showWarningToast

<!-- blecsd-doccheck:ignore -->
```typescript
import { showWarningToast } from 'blecsd';

const toast = showWarningToast(world, 'Unsaved changes', {}, 80, 24);
```

### showErrorToast

<!-- blecsd-doccheck:ignore -->
```typescript
import { showErrorToast } from 'blecsd';

const toast = showErrorToast(world, 'Connection lost', {}, 80, 24);
```

---

## Utility Functions

### isToast

<!-- blecsd-doccheck:ignore -->
```typescript
import { isToast } from 'blecsd';

if (isToast(world, entity)) {
  // Entity is a toast widget
}
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID

**Returns:** `boolean`

---

## Toast Stacking

Multiple toasts at the same position are automatically stacked:

<!-- blecsd-doccheck:ignore -->
```typescript
import { showSuccessToast, showInfoToast } from 'blecsd';

// These will stack vertically
const toast1 = showSuccessToast(world, 'First notification', { position: 'top-right' }, 80, 24);
const toast2 = showInfoToast(world, 'Second notification', { position: 'top-right' }, 80, 24);
const toast3 = showSuccessToast(world, 'Third notification', { position: 'top-right' }, 80, 24);

// When toast1 is dismissed, toast2 and toast3 automatically reposition
toast1.dismiss();
```

Toasts are spaced by `TOAST_STACK_SPACING` (1 line) between each notification.

---

## Examples

### Notification with Callback

<!-- blecsd-doccheck:ignore -->
```typescript
import { createToast } from 'blecsd';

const toast = createToast(world, {
  content: 'Download complete!',
  type: 'success',
  position: 'bottom-right',
  timeout: 3000,
}, 80, 24);

toast.onDismiss(() => {
  console.log('Toast was dismissed');
  showNextNotification();
});
```

### Persistent Toast (Manual Dismiss)

<!-- blecsd-doccheck:ignore -->
```typescript
import { createToast } from 'blecsd';

const toast = createToast(world, {
  content: 'Critical: Server disconnected',
  type: 'error',
  position: 'top-center',
  timeout: 0, // Never auto-dismiss
}, 80, 24);

// Later, when reconnected:
toast.dismiss();
```

### Custom Styled Toast

<!-- blecsd-doccheck:ignore -->
```typescript
import { createToast } from 'blecsd';

const toast = createToast(world, {
  content: 'Custom notification',
  fg: '#000000',
  bg: '#e0e0e0',
  border: { type: 'line', ch: 'single', fg: '#888888' },
  padding: 2,
  position: 'top-left',
  timeout: 5000,
}, 80, 24);
```

### Multi-Stack Toasts

<!-- blecsd-doccheck:ignore -->
```typescript
import { showSuccessToast, showErrorToast } from 'blecsd';

// Top-right stack for success messages
showSuccessToast(world, 'File 1 saved', { position: 'top-right' }, 80, 24);
showSuccessToast(world, 'File 2 saved', { position: 'top-right' }, 80, 24);

// Bottom-left stack for errors
showErrorToast(world, 'Network error', { position: 'bottom-left' }, 80, 24);
showErrorToast(world, 'Timeout', { position: 'bottom-left' }, 80, 24);
```

---

## See Also

- [Message Widget](./message.md) - For modal notifications
- [Modal Widget](./modal.md) - For persistent overlay dialogs
