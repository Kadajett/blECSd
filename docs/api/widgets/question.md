# Question Widget

A yes/no confirmation dialog with customizable button text, keyboard bindings, and Promise-based convenience functions.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createQuestion, ask, confirm } from 'blecsd';

const world = createWorld();

// Promise-based usage
if (await confirm(world, 'Delete this file?')) {
  deleteFile();
}

// Or with custom options
const answer = await ask(world, 'Save changes?', {
  yesText: 'Save',
  noText: 'Discard',
});

// Widget-based usage
const q = createQuestion(world, {
  message: 'Are you sure?',
  defaultAnswer: true,
});

q.onConfirm((answer) => {
  if (answer) doSomething();
});
```

---

## Configuration

### QuestionConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `message` | `string` | `'Are you sure?'` | The question message |
| `yesText` | `string` | `'Yes'` | Text for the yes button |
| `noText` | `string` | `'No'` | Text for the no button |
| `defaultAnswer` | `boolean` | `true` | Default selected answer (true = Yes) |
| `width` | `number` | `40` | Dialog width |
| `height` | `number` | `5` | Dialog height |
| `left` | `number` | `0` | Left position |
| `top` | `number` | `0` | Top position |
| `fg` | `string \| number` | - | Foreground color |
| `bg` | `string \| number` | - | Background color |
| `border` | `QuestionBorderConfig` | - | Border configuration |
| `padding` | `number \| PaddingConfig` | - | Padding |

### Zod Schema

<!-- blecsd-doccheck:ignore -->
```typescript
import { QuestionConfigSchema } from 'blecsd';

const config = QuestionConfigSchema.parse({
  message: 'Are you sure?',
  yesText: 'Confirm',
  noText: 'Cancel',
});
```

---

## Factory Function

### createQuestion

Creates a Question widget for yes/no confirmation dialogs.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createQuestion } from 'blecsd';

const question = createQuestion(world, {
  message: 'Save changes?',
  yesText: 'Save',
  noText: 'Discard',
  defaultAnswer: true,
  border: { type: 'line', ch: 'rounded' },
});

question.onConfirm((answer) => {
  if (answer) saveFile();
});

question.onCancel(() => {
  // User pressed Escape
});
```

**Parameters:**
- `world: World` - The ECS world
- `config?: QuestionConfig` - Widget configuration

**Returns:** `QuestionWidget`

---

## QuestionWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide

```typescript
show(): QuestionWidget
hide(): QuestionWidget
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): QuestionWidget
```

Moves the dialog by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): QuestionWidget
```

Sets the absolute position.

### center

```typescript
center(screenWidth: number, screenHeight: number): QuestionWidget
```

Centers the dialog within the given screen dimensions.

### setMessage / getMessage

```typescript
setMessage(message: string): QuestionWidget
getMessage(): string
```

Gets or sets the question message text.

### selectYes / selectNo

```typescript
selectYes(): QuestionWidget
selectNo(): QuestionWidget
```

Changes the currently highlighted selection.

### getSelectedAnswer

```typescript
getSelectedAnswer(): boolean
```

Returns the currently selected answer (`true` for Yes, `false` for No).

### confirm

```typescript
confirm(): QuestionWidget
```

Confirms the currently selected answer, firing all onConfirm callbacks with the selected value.

### cancel

```typescript
cancel(): QuestionWidget
```

Cancels the dialog, firing all onCancel callbacks.

### onConfirm

```typescript
onConfirm(cb: (answer: boolean) => void): QuestionWidget
```

Registers a callback for when the dialog is confirmed.

### onCancel

```typescript
onCancel(cb: () => void): QuestionWidget
```

Registers a callback for when the dialog is cancelled.

### destroy

```typescript
destroy(): void
```

Destroys the question widget and cleans up all state.

---

## Convenience Functions

### ask

Displays a question dialog and returns a Promise resolving to the user's answer.

<!-- blecsd-doccheck:ignore -->
```typescript
import { ask } from 'blecsd';

const answer = await ask(world, 'Save changes before closing?', {
  yesText: 'Save',
  noText: 'Discard',
});

if (answer) {
  saveFile();
}
```

**Parameters:**
- `world: World` - The ECS world
- `message: string` - The question message
- `options?: Partial<QuestionConfig>` - Additional options

**Returns:** `Promise<boolean>` - Resolves to `true` (yes) or `false` (no/cancel). The widget is automatically destroyed after resolution.

### confirm

Shorthand for a simple yes/no dialog with default button text.

<!-- blecsd-doccheck:ignore -->
```typescript
import { confirm } from 'blecsd';

if (await confirm(world, 'Delete this file?')) {
  deleteFile();
}
```

**Parameters:**
- `world: World` - The ECS world
- `message: string` - The confirmation message

**Returns:** `Promise<boolean>`

---

## Utility Functions

### isQuestion

<!-- blecsd-doccheck:ignore -->
```typescript
import { isQuestion } from 'blecsd';

if (isQuestion(world, entity)) {
  // Entity is a question widget
}
```

### handleQuestionKey

Handles keyboard input for a question widget.

<!-- blecsd-doccheck:ignore -->
```typescript
import { handleQuestionKey } from 'blecsd';

handleQuestionKey(questionWidget, 'y');       // Selects yes and confirms
handleQuestionKey(questionWidget, 'n');       // Selects no and confirms
handleQuestionKey(questionWidget, 'enter');   // Confirms current selection
handleQuestionKey(questionWidget, 'escape');  // Cancels
```

**Supported keys:**
- `y` / `Y` - Select Yes and confirm
- `n` / `N` - Select No and confirm
- `enter` / `return` - Confirm the current selection
- `escape` - Cancel

**Returns:** `boolean` - true if the key was handled

---

## Examples

### Confirmation Before Destructive Action

<!-- blecsd-doccheck:ignore -->
```typescript
import { ask } from 'blecsd';

async function handleDelete(world, filename) {
  const confirmed = await ask(world, `Delete "${filename}"?`, {
    yesText: 'Delete',
    noText: 'Keep',
    defaultAnswer: false,  // Default to "No" for safety
  });

  if (confirmed) {
    fs.unlinkSync(filename);
  }
}
```

### Centered Question Dialog

<!-- blecsd-doccheck:ignore -->
```typescript
import { createQuestion } from 'blecsd';

const q = createQuestion(world, {
  message: 'Exit without saving?',
  width: 40,
  height: 5,
  border: { type: 'line', ch: 'rounded' },
  padding: 1,
});

q.center(80, 24).show();
```

---

## See Also

- [Prompt Widget](./prompt.md) - Text input dialogs
- [Message Widget](./message.md) - Temporary notifications
- [Modal Widget](./modal.md) - Overlay dialogs
