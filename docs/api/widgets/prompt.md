# Prompt Widget

A text input dialog with submit/cancel key bindings, optional validation, and a Promise-based convenience API.

## Overview

```typescript
import { createPrompt, prompt } from 'blecsd';

const world = createWorld();

// Promise-based usage
const name = await prompt(world, 'Enter your name:', {
  defaultValue: 'World',
});

if (name !== null) {
  console.log('Hello,', name);
}

// Widget-based usage
const p = createPrompt(world, {
  message: 'Enter filename:',
  placeholder: 'untitled.txt',
});

p.onSubmit((value) => console.log('Saved as:', value));
p.onCancel(() => console.log('Cancelled'));
```

---

## Configuration

### PromptConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `message` | `string` | `''` | Message/label displayed above the input |
| `defaultValue` | `string` | `''` | Default value pre-filled in the input |
| `placeholder` | `string` | `''` | Placeholder text when input is empty |
| `validator` | `PromptValidator` | - | Validator function for input |
| `width` | `number` | `40` | Width of the dialog |
| `height` | `number` | `5` | Height of the dialog |
| `left` | `number` | `0` | Left position |
| `top` | `number` | `0` | Top position |
| `fg` | `string \| number` | - | Foreground color |
| `bg` | `string \| number` | - | Background color |
| `border` | `PromptBorderConfig` | - | Border configuration |
| `padding` | `number \| PaddingConfig` | - | Padding |

### PromptValidator

```typescript
type PromptValidator = (value: string) => boolean | string;
```

Returns `true` if valid, or a string error message if invalid. Returning `false` also blocks submission.

### Zod Schema

```typescript
import { PromptConfigSchema } from 'blecsd';

const config = PromptConfigSchema.parse({
  message: 'Enter name:',
  width: 50,
});
```

---

## Factory Function

### createPrompt

Creates a Prompt widget.

```typescript
import { createPrompt } from 'blecsd';

const p = createPrompt(world, {
  message: 'Enter your name:',
  defaultValue: 'World',
  border: { type: 'line', ch: 'single' },
  padding: 1,
});

p.onSubmit((value) => console.log('Name:', value));
p.onCancel(() => console.log('Cancelled'));
```

**Parameters:**
- `world: World` - The ECS world
- `config?: PromptConfig` - Widget configuration

**Returns:** `PromptWidget`

---

## PromptWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide

```typescript
show(): PromptWidget
hide(): PromptWidget
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): PromptWidget
```

Moves the dialog by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): PromptWidget
```

Sets the absolute position.

### center

```typescript
center(screenWidth: number, screenHeight: number): PromptWidget
```

Centers the dialog within the given screen dimensions.

### setMessage / getMessage

```typescript
setMessage(message: string): PromptWidget
getMessage(): string
```

Gets or sets the prompt label text.

### setValue / getValue

```typescript
setValue(value: string): PromptWidget
getValue(): string
```

Gets or sets the current input value.

```typescript
p.setValue('Alice');
console.log(p.getValue()); // 'Alice'
```

### submit

```typescript
submit(): PromptWidget
```

Triggers submit with the current value. Runs the validator first if one is configured. If validation fails, the submit callbacks are not called.

### cancel

```typescript
cancel(): PromptWidget
```

Triggers cancel, calling all registered onCancel callbacks.

### onSubmit

```typescript
onSubmit(cb: (value: string) => void): PromptWidget
```

Registers a callback for when the user submits (Enter key).

### onCancel

```typescript
onCancel(cb: () => void): PromptWidget
```

Registers a callback for when the user cancels (Escape key).

### destroy

```typescript
destroy(): void
```

Destroys the prompt widget and cleans up all state.

---

## Convenience Function

### prompt

A Promise-based API that creates a prompt and resolves with the result.

```typescript
import { prompt } from 'blecsd';

const value = await prompt(world, 'Enter filename:', {
  defaultValue: 'untitled.txt',
  validator: (v) => v.length > 0 || 'Filename cannot be empty',
});

if (value !== null) {
  // User submitted
  console.log('Filename:', value);
} else {
  // User cancelled (Escape)
  console.log('Cancelled');
}
```

**Parameters:**
- `world: World` - The ECS world
- `message: string` - The prompt message
- `options?: Omit<PromptConfig, 'message'>` - Additional configuration

**Returns:** `Promise<string | null>` - Resolves with the input value on submit, or `null` on cancel. The prompt widget is automatically destroyed after resolution.

---

## Utility Functions

### isPrompt

```typescript
import { isPrompt } from 'blecsd';

if (isPrompt(entity)) {
  // Entity is a prompt widget
}
```

**Parameters:**
- `eid: Entity` - The entity ID

**Returns:** `boolean`

### handlePromptKey

```typescript
import { handlePromptKey } from 'blecsd';

handlePromptKey(promptWidget, 'return');  // triggers submit
handlePromptKey(promptWidget, 'escape');  // triggers cancel
```

**Parameters:**
- `widget: PromptWidget` - The prompt widget
- `key: string` - Key name (`'return'`, `'enter'`, or `'escape'`)

**Returns:** `boolean` - true if the key was handled

---

## Examples

### With Validation

```typescript
import { createPrompt } from 'blecsd';

const p = createPrompt(world, {
  message: 'Enter port number:',
  defaultValue: '3000',
  validator: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return 'Must be a number';
    if (num < 1 || num > 65535) return 'Port must be 1-65535';
    return true;
  },
});

p.onSubmit((value) => {
  const port = parseInt(value, 10);
  startServer(port);
});
```

### Centered Dialog

```typescript
import { createPrompt } from 'blecsd';

const p = createPrompt(world, {
  message: 'Search:',
  width: 50,
  border: { type: 'line', ch: 'rounded' },
  padding: 1,
});

p.center(80, 24).show();
```

---

## See Also

- [Question Widget](./question.md) - Yes/no confirmation dialogs
- [Message Widget](./message.md) - Temporary notifications
- [Modal Widget](./modal.md) - Overlay dialogs
