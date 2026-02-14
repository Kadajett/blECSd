# Accessibility

Foundational accessibility features for terminal UIs. Provides ARIA-like roles and labels to make terminal applications more accessible to screen readers and assistive technologies.

## Quick Start

```typescript
import {
  createWorld,
  addEntity,
  setAccessibleRole,
  setAccessibleLabel,
  announce,
} from 'blecsd';

const world = createWorld();

// Create accessible button
const button = addEntity(world);
setAccessibleRole(world, button, 'button');
setAccessibleLabel(world, button, 'Submit form');

// Create accessible list
const list = addEntity(world);
setAccessibleRole(world, list, 'list');
setAccessibleLabel(world, list, 'User list');

// Announce status changes to screen readers
announce('Form submitted successfully');
```

## API Reference

### Types

#### AccessibleRole

ARIA-like roles for terminal UI elements. Provides semantic meaning to UI components for screen readers and assistive technologies.

**Available Roles:**
- `'button'` - Clickable button element
- `'checkbox'` - Toggle/checkbox element
- `'list'` - List container
- `'listitem'` - Item within a list
- `'textbox'` - Text input field
- `'dialog'` - Modal dialog or popup
- `'menu'` - Menu container
- `'menuitem'` - Item within a menu
- `'tree'` - Tree/hierarchical view
- `'treeitem'` - Item within a tree

#### Accessible Component

Structure of Arrays component for accessibility data.

**Properties:**
- `role` - Numeric representation of AccessibleRole
- `labelId` - Index into label storage map

### Functions

#### setAccessibleRole

Sets the accessible role for an entity. Automatically adds the Accessible component if not present.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `role` - The accessible role

**Example:**
```typescript
import { setAccessibleRole } from 'blecsd';

setAccessibleRole(world, buttonEntity, 'button');
setAccessibleRole(world, listEntity, 'list');
setAccessibleRole(world, inputEntity, 'textbox');
```

#### getAccessibleRole

Gets the accessible role for an entity.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `AccessibleRole | undefined` - The accessible role or undefined if not set

**Example:**
```typescript
import { getAccessibleRole } from 'blecsd';

const role = getAccessibleRole(world, entity);
if (role === 'button') {
  console.log('This is a button');
}
```

#### setAccessibleLabel

Sets the accessible label for an entity. The label provides a human-readable description of the element. Automatically adds the Accessible component if not present.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `label` - The label text

**Example:**
```typescript
import { setAccessibleLabel } from 'blecsd';

setAccessibleLabel(world, buttonEntity, 'Submit form');
setAccessibleLabel(world, inputEntity, 'Enter your name');
setAccessibleLabel(world, listEntity, 'Available options');
```

#### getAccessibleLabel

Gets the accessible label for an entity.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `string | undefined` - The label text or undefined if not set

**Example:**
```typescript
import { getAccessibleLabel } from 'blecsd';

const label = getAccessibleLabel(world, entity);
console.log(`Element label: ${label}`);
```

#### announce

Announces a message to screen readers. Uses terminal title or OSC sequences for notifications. Screen readers can monitor title changes to provide audio feedback.

**Parameters:**
- `message` - The message to announce

**Example:**
```typescript
import { announce } from 'blecsd';

// Announce status changes
announce('Form submitted successfully');
announce('3 items selected');
announce('Error: Invalid input');
announce('Loading complete');
```

#### clearAccessibilityLabels

Clears all accessibility label storage. Useful for testing or resetting state.

**Example:**
```typescript
import { clearAccessibilityLabels } from 'blecsd';

// In tests
afterEach(() => {
  clearAccessibilityLabels();
});
```

## Common Patterns

### Accessible Button

```typescript
import { setAccessibleRole, setAccessibleLabel } from 'blecsd';

const submitButton = addEntity(world);
setAccessibleRole(world, submitButton, 'button');
setAccessibleLabel(world, submitButton, 'Submit form');

const cancelButton = addEntity(world);
setAccessibleRole(world, cancelButton, 'button');
setAccessibleLabel(world, cancelButton, 'Cancel');
```

### Accessible Form

```typescript
import { setAccessibleRole, setAccessibleLabel } from 'blecsd';

const nameInput = addEntity(world);
setAccessibleRole(world, nameInput, 'textbox');
setAccessibleLabel(world, nameInput, 'Enter your name');

const emailInput = addEntity(world);
setAccessibleRole(world, emailInput, 'textbox');
setAccessibleLabel(world, emailInput, 'Enter your email address');

const termsCheckbox = addEntity(world);
setAccessibleRole(world, termsCheckbox, 'checkbox');
setAccessibleLabel(world, termsCheckbox, 'I agree to the terms and conditions');
```

### Accessible List

```typescript
import { setAccessibleRole, setAccessibleLabel } from 'blecsd';

const userList = addEntity(world);
setAccessibleRole(world, userList, 'list');
setAccessibleLabel(world, userList, 'User list');

const user1 = addEntity(world);
setAccessibleRole(world, user1, 'listitem');
setAccessibleLabel(world, user1, 'Alice Smith');

const user2 = addEntity(world);
setAccessibleRole(world, user2, 'listitem');
setAccessibleLabel(world, user2, 'Bob Johnson');
```

### Accessible Menu

```typescript
import { setAccessibleRole, setAccessibleLabel } from 'blecsd';

const fileMenu = addEntity(world);
setAccessibleRole(world, fileMenu, 'menu');
setAccessibleLabel(world, fileMenu, 'File menu');

const newItem = addEntity(world);
setAccessibleRole(world, newItem, 'menuitem');
setAccessibleLabel(world, newItem, 'New file');

const openItem = addEntity(world);
setAccessibleRole(world, openItem, 'menuitem');
setAccessibleLabel(world, openItem, 'Open file');

const saveItem = addEntity(world);
setAccessibleRole(world, saveItem, 'menuitem');
setAccessibleLabel(world, saveItem, 'Save file');
```

### Accessible Dialog

```typescript
import { setAccessibleRole, setAccessibleLabel, announce } from 'blecsd';

const confirmDialog = addEntity(world);
setAccessibleRole(world, confirmDialog, 'dialog');
setAccessibleLabel(world, confirmDialog, 'Confirm deletion');

// Announce when dialog opens
announce('Confirm deletion dialog opened');

// Announce when dialog closes
announce('Dialog closed');
```

### Accessible Tree View

```typescript
import { setAccessibleRole, setAccessibleLabel } from 'blecsd';

const fileTree = addEntity(world);
setAccessibleRole(world, fileTree, 'tree');
setAccessibleLabel(world, fileTree, 'File explorer');

const rootFolder = addEntity(world);
setAccessibleRole(world, rootFolder, 'treeitem');
setAccessibleLabel(world, rootFolder, 'Root folder: src');

const subFolder = addEntity(world);
setAccessibleRole(world, subFolder, 'treeitem');
setAccessibleLabel(world, subFolder, 'Folder: components');

const file = addEntity(world);
setAccessibleRole(world, file, 'treeitem');
setAccessibleLabel(world, file, 'File: button.ts');
```

### Status Announcements

```typescript
import { announce } from 'blecsd';

// Loading states
announce('Loading data');
announce('Loading complete');

// Form validation
announce('Error: Email is required');
announce('Form submitted successfully');

// Selection changes
announce(`${selectedCount} items selected`);
announce('All items deselected');

// Progress updates
announce(`Upload progress: ${percent}%`);
announce('Upload complete');
```

### Dynamic Labels

```typescript
import { setAccessibleLabel, getAccessibleLabel } from 'blecsd';

// Update label based on state
function updateButtonLabel(world: World, button: Entity, isEnabled: boolean) {
  const baseLabel = getAccessibleLabel(world, button) || 'Submit';
  const newLabel = isEnabled ? baseLabel : `${baseLabel} (disabled)`;
  setAccessibleLabel(world, button, newLabel);
}
```

## Best Practices

### Role Assignment

- Assign roles to all interactive elements (buttons, inputs, menus)
- Use semantic roles that match the element's function
- Container elements (list, menu, tree) should have appropriate roles

### Label Guidelines

- Labels should be concise but descriptive
- Include context when needed ("Submit form" not just "Submit")
- Update labels when element state changes
- For lists, include item count in container label ("User list (5 items)")

### Announcements

- Announce important state changes
- Keep announcements brief and relevant
- Don't over-announce (avoid announcing every keystroke)
- Announce errors and validation messages
- Announce completion of long-running operations

### Testing

```typescript
import { getAccessibleRole, getAccessibleLabel } from 'blecsd';

// Verify accessibility in tests
describe('Button accessibility', () => {
  it('has correct role and label', () => {
    const button = addEntity(world);
    setAccessibleRole(world, button, 'button');
    setAccessibleLabel(world, button, 'Submit');

    expect(getAccessibleRole(world, button)).toBe('button');
    expect(getAccessibleLabel(world, button)).toBe('Submit');
  });
});
```

## Technical Details

### Screen Reader Support

The `announce` function uses OSC 2 (Set Window Title) escape sequences. Most modern screen readers can monitor terminal title changes and provide audio feedback. This is the most reliable method for announcements in terminal applications.

### Label Storage

Labels are stored in a separate Map to avoid storing strings directly in the component arrays. This keeps the component data compact and cache-friendly while still providing flexible label management.

### Component Integration

The Accessible component integrates seamlessly with other blECSd components like Focusable and Content. Elements can have both visual content and accessibility labels.
