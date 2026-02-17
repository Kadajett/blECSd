# Modal Widget

A modal overlay/backdrop system with support for stacking multiple modals, backdrop click-to-close, escape key handling, and input blocking.

## Overview

```typescript
import { createWorld } from 'blecsd/core';
import { createModal, closeAllModals, openModal } from 'blecsd/widgets';

const world = createWorld();

// Create and show a modal
const modal = openModal(world, {
  content: 'Are you sure?',
  width: 40,
  height: 10,
  backdrop: true,
  closeOnEscape: true,
});

modal.onClose(() => {
  console.log('Modal closed');
});
```

---

## Configuration

### ModalConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `backdrop` | `boolean` | `true` | Show a backdrop overlay |
| `backdropColor` | `string \| number` | `'#000000'` | Backdrop color |
| `backdropOpacity` | `number` | `0.5` | Backdrop opacity (0-1) |
| `closeOnBackdropClick` | `boolean` | `true` | Close when backdrop is clicked |
| `closeOnEscape` | `boolean` | `true` | Close when Escape is pressed |
| `width` | `number` | `40` | Modal width |
| `height` | `number` | `10` | Modal height |
| `left` | `number` | `0` | Left position |
| `top` | `number` | `0` | Top position |
| `fg` | `string \| number` | - | Foreground color |
| `bg` | `string \| number` | - | Background color |
| `border` | `ModalBorderConfig` | - | Border configuration |
| `padding` | `number \| PaddingConfig` | - | Padding for content area |
| `content` | `string` | - | Initial content text |

### Zod Schema

```typescript
import { ModalConfigSchema } from 'blecsd/widgets';

const result = ModalConfigSchema.safeParse({
  backdrop: true,
  closeOnEscape: true,
  width: 50,
  height: 20,
  content: 'Hello',
});
```

---

## Factory Functions

### createModal

Creates a Modal widget in a hidden state. Call `show()` to display it.

```typescript
import { createWorld } from 'blecsd/core';
import { createModal } from 'blecsd/widgets';

const world = createWorld();
const modal = createModal(world, {
  width: 50,
  height: 20,
  content: 'Dialog content here',
  backdrop: true,
  closeOnEscape: true,
  border: { type: 'line', ch: 'rounded' },
});

modal.show();
```

**Parameters:**
- `world: World` - The ECS world
- `config?: ModalConfig` - Widget configuration

**Returns:** `ModalWidget`

### openModal

Creates a modal and immediately shows it.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, {
  content: 'Hello World!',
  width: 30,
  height: 8,
});
// Modal is already visible
```

**Parameters:**
- `world: World` - The ECS world
- `config?: ModalConfig` - Widget configuration

**Returns:** `ModalWidget` (already visible)

---

## ModalWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide

```typescript
show(): ModalWidget
hide(): ModalWidget
```

`show()` makes the modal visible and pushes it onto the modal stack, firing onOpen callbacks. `hide()` hides the modal and removes it from the stack (without firing onClose callbacks).

### move

```typescript
move(dx: number, dy: number): ModalWidget
```

Moves the modal by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): ModalWidget
```

Sets the absolute position.

### center

```typescript
center(termWidth: number, termHeight: number): ModalWidget
```

Centers the modal within the given terminal dimensions.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, { content: 'Centered', width: 40, height: 10 });
modal.center(80, 24);
```

### setContent / getContent

```typescript
setContent(text: string): ModalWidget
getContent(): string
```

Gets or sets the text content of the modal.

### close

```typescript
close(): void
```

Closes the modal. Hides it, removes it from the modal stack, and fires all onClose callbacks. Has no effect if the modal is already closed.

### isOpen

```typescript
isOpen(): boolean
```

Returns whether the modal is currently open.

### onClose

```typescript
onClose(cb: () => void): ModalWidget
```

Registers a callback for when the modal is closed.

### onOpen

```typescript
onOpen(cb: () => void): ModalWidget
```

Registers a callback for when the modal is opened.

### destroy

```typescript
destroy(): void
```

Destroys the widget. If the modal is open, it is closed first (firing onClose callbacks), then the entity is removed from the world.

---

## Stack Management Functions

### closeModal

Closes a specific modal by entity ID.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, closeModal } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, { content: 'Example', width: 30, height: 8 });
const modalEid = modal.eid;
closeModal(world, modalEid);
```

### closeAllModals

Closes all currently open modals in reverse stack order (most recent first).

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, closeAllModals } from 'blecsd/widgets';

const world = createWorld();
openModal(world, { content: 'Modal 1', width: 30, height: 8 });
closeAllModals(world);
```

### isModalOpen

Returns whether any modal is currently open.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, isModalOpen } from 'blecsd/widgets';

const world = createWorld();
openModal(world, { content: 'Example', width: 30, height: 8 });
if (isModalOpen(world)) {
  // Block background input
}
```

### getModalStack

Returns the stack of currently open modal entity IDs. The last element is the topmost (most recently opened) modal.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, getModalStack } from 'blecsd/widgets';

const world = createWorld();
openModal(world, { content: 'Example', width: 30, height: 8 });
const stack = getModalStack(world);
const topmost = stack[stack.length - 1];
```

---

## Event Handlers

### handleModalBackdropClick

Handles a backdrop click event. Closes the modal if `closeOnBackdropClick` is enabled.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, handleModalBackdropClick } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, { content: 'Example', width: 30, height: 8 });
const modalEid = modal.eid;
const wasClosed = handleModalBackdropClick(world, modalEid);
```

**Returns:** `boolean` - true if the modal was closed

### handleModalEscape

Handles an Escape key event for a modal. Closes the modal if `closeOnEscape` is enabled.

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, handleModalEscape, getModalStack } from 'blecsd/widgets';

const world = createWorld();
openModal(world, { content: 'Example', width: 30, height: 8, closeOnEscape: true });
const stack = getModalStack(world);
if (stack.length > 0) {
  handleModalEscape(world, stack[stack.length - 1]);
}
```

**Returns:** `boolean` - true if the modal was closed

---

## Utility Functions

### isModal

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { openModal, isModal } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, { content: 'Example', width: 30, height: 8 });
const entity = modal.eid;
if (isModal(world, entity)) {
  // Entity is a modal widget
}
```

---

## Examples

### Stacked Modals

```typescript
import { createWorld } from 'blecsd/core';
import { openModal, getModalStack, closeAllModals } from 'blecsd/widgets';

const world = createWorld();

const first = openModal(world, {
  content: 'First modal',
  width: 40,
  height: 10,
});

const second = openModal(world, {
  content: 'Second modal (on top)',
  width: 30,
  height: 8,
});

const stack = getModalStack(world);
console.log(stack.length); // 2

// Close all at once
closeAllModals(world);
```

### Confirmation Modal with Callback

```typescript
import { createWorld } from 'blecsd/core';
import { openModal } from 'blecsd/widgets';

const world = createWorld();
const modal = openModal(world, {
  content: 'Are you sure you want to delete this?',
  width: 50,
  height: 8,
  closeOnEscape: true,
  border: { type: 'line', ch: 'double' },
  padding: 1,
});

modal.center(80, 24).onClose(() => {
  console.log('Modal dismissed');
});
```

### Input Blocking Pattern

```typescript
import { createWorld } from 'blecsd/core';
import { isModalOpen, getModalStack, handleModalEscape } from 'blecsd/widgets';

const world = createWorld();

function handleKeyPress(key: string) {
  // Block all input when a modal is open, except Escape
  if (isModalOpen(world)) {
    if (key === 'escape') {
      const stack = getModalStack(world);
      if (stack.length > 0) {
        handleModalEscape(world, stack[stack.length - 1]);
      }
    }
    return; // Block all other keys
  }

  // Normal key handling...
}
```

---

## See Also

- [Message Widget](./message.md) - Temporary notifications
- [Question Widget](./question.md) - Yes/no confirmation dialogs
- [Prompt Widget](./prompt.md) - Text input dialogs
