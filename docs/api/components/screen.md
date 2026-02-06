# Screen Component

The Screen component represents the root terminal viewport and tracks cursor state, focus, and display settings.

## Overview

Every blECSd application has exactly one Screen entity, which serves as the root of the entity hierarchy. The Screen component provides:

- Cursor position and appearance tracking
- Focus and hover state management
- Unicode and padding settings
- Terminal size management

## Creating a Screen

Screens are created using `createScreenEntity` from the entities module. Only one screen can exist per world.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, createScreenEntity, getScreen } from 'blecsd';

const world = createWorld();

// Create the screen (singleton per world)
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  title: 'My Game',
  cursorVisible: true,
  cursorShape: CursorShape.BLOCK,
  fullUnicode: true,
});

// Get the screen later
const screenEntity = getScreen(world);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | Required | Screen width in columns |
| `height` | `number` | Required | Screen height in rows |
| `title` | `string` | - | Optional window title |
| `cursorVisible` | `boolean` | `true` | Whether cursor is visible |
| `cursorShape` | `CursorShapeValue` | `BLOCK` | Cursor appearance |
| `fullUnicode` | `boolean` | `true` | Enable full Unicode support |
| `autoPadding` | `boolean` | `false` | Enable auto padding |

## Cursor Management

### Cursor Shapes

<!-- blecsd-doccheck:ignore -->
```typescript
import { CursorShape } from 'blecsd';

CursorShape.BLOCK           // Standard block cursor (default)
CursorShape.UNDERLINE       // Underline cursor
CursorShape.BAR             // Vertical bar cursor
CursorShape.BLINKING_BLOCK  // Blinking block
CursorShape.BLINKING_UNDERLINE
CursorShape.BLINKING_BAR
```

### Cursor Functions

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  getScreenCursor,
  setScreenCursor,
  setScreenCursorVisible,
  setScreenCursorShape,
} from 'blecsd';

// Get cursor state
const cursor = getScreenCursor(world, screen);
console.log(`Cursor at ${cursor?.x}, ${cursor?.y}`);
console.log(`Visible: ${cursor?.visible}`);
console.log(`Shape: ${cursor?.shape}`);

// Set cursor position
setScreenCursor(world, screen, 10, 5);

// Show/hide cursor
setScreenCursorVisible(world, screen, false);

// Change cursor shape
setScreenCursorShape(world, screen, CursorShape.UNDERLINE);
```

## Focus Management

Track which entity has keyboard focus:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  getScreenFocus,
  setScreenFocus,
  getScreenHover,
  setScreenHover,
} from 'blecsd';

// Set focused entity
setScreenFocus(world, screen, buttonEntity);

// Get currently focused entity
const focused = getScreenFocus(world, screen);
if (focused !== null) {
  console.log(`Entity ${focused} has focus`);
}

// Clear focus
setScreenFocus(world, screen, null);

// Track hovered entity (for mouse interaction)
setScreenHover(world, screen, hoveredEntity);
const hovered = getScreenHover(world, screen);
```

## Screen Size

<!-- blecsd-doccheck:ignore -->
```typescript
import { getScreenSize, resizeScreen } from 'blecsd';

// Get current size
const size = getScreenSize(world, screen);
console.log(`Terminal: ${size?.width}x${size?.height}`);

// Handle terminal resize
process.stdout.on('resize', () => {
  resizeScreen(world, screen, process.stdout.columns, process.stdout.rows);
});
```

## Unicode and Padding Settings

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  isFullUnicode,
  setFullUnicode,
  isAutoPadding,
  setAutoPadding,
} from 'blecsd';

// Check/set full Unicode support
console.log(isFullUnicode(world, screen)); // true by default
setFullUnicode(world, screen, false);

// Check/set auto padding
console.log(isAutoPadding(world, screen)); // false by default
setAutoPadding(world, screen, true);
```

## Getting All Screen Data

<!-- blecsd-doccheck:ignore -->
```typescript
import { getScreenData } from 'blecsd';

const data = getScreenData(world, screen);
if (data) {
  console.log(`Size: ${data.width}x${data.height}`);
  console.log(`Cursor: ${data.cursor.x}, ${data.cursor.y}`);
  console.log(`Cursor visible: ${data.cursor.visible}`);
  console.log(`Cursor shape: ${data.cursor.shape}`);
  console.log(`Focused: ${data.focused}`);
  console.log(`Hovered: ${data.hovered}`);
  console.log(`Full Unicode: ${data.fullUnicode}`);
  console.log(`Auto padding: ${data.autoPadding}`);
}
```

## Singleton Pattern

Only one screen can exist per world:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, createScreenEntity, hasScreenSingleton, destroyScreen } from 'blecsd';

const world = createWorld();

// Check if screen exists
console.log(hasScreenSingleton(world)); // false

// Create screen
createScreenEntity(world, { width: 80, height: 24 });
console.log(hasScreenSingleton(world)); // true

// Attempting to create another throws an error
try {
  createScreenEntity(world, { width: 100, height: 30 });
} catch (e) {
  console.log('Cannot create second screen');
}

// Destroy screen to allow creating a new one
destroyScreen(world);
console.log(hasScreenSingleton(world)); // false
```

## API Reference

### Screen Component

| Field | Type | Description |
|-------|------|-------------|
| `cursorX` | `Uint16Array` | Cursor X position |
| `cursorY` | `Uint16Array` | Cursor Y position |
| `cursorVisible` | `Uint8Array` | 0=hidden, 1=visible |
| `cursorShape` | `Uint8Array` | CursorShape value |
| `focused` | `Uint32Array` | Focused entity ID |
| `hovered` | `Uint32Array` | Hovered entity ID |
| `fullUnicode` | `Uint8Array` | Unicode enabled flag |
| `autoPadding` | `Uint8Array` | Auto padding flag |

### Functions

| Function | Description |
|----------|-------------|
| `createScreenEntity(world, config)` | Create screen (singleton) |
| `getScreen(world)` | Get screen entity |
| `isScreen(world, eid)` | Check if entity is screen |
| `hasScreen(world, eid)` | Check if entity has Screen component |
| `hasScreenSingleton(world)` | Check if screen exists |
| `destroyScreen(world)` | Remove screen singleton |
| `getScreenCursor(world, eid)` | Get cursor state |
| `setScreenCursor(world, eid, x, y)` | Set cursor position |
| `setScreenCursorVisible(world, eid, visible)` | Show/hide cursor |
| `setScreenCursorShape(world, eid, shape)` | Set cursor shape |
| `getScreenFocus(world, eid)` | Get focused entity |
| `setScreenFocus(world, eid, entity)` | Set focused entity |
| `getScreenHover(world, eid)` | Get hovered entity |
| `setScreenHover(world, eid, entity)` | Set hovered entity |
| `getScreenSize(world, eid)` | Get screen dimensions |
| `resizeScreen(world, eid, width, height)` | Resize screen |
| `getScreenData(world, eid)` | Get all screen data |
| `isFullUnicode(world, eid)` | Check Unicode setting |
| `setFullUnicode(world, eid, enabled)` | Set Unicode support |
| `isAutoPadding(world, eid)` | Check auto padding |
| `setAutoPadding(world, eid, enabled)` | Set auto padding |
