# blECSd Examples

Interactive, runnable examples demonstrating blECSd features and patterns.

## Running Examples

All examples can be run directly with `tsx`:

```bash
# From project root
tsx examples/01-hello-world.ts
tsx examples/02-dashboard.ts
tsx examples/03-form-validation.ts
tsx examples/04-animation-physics.ts
tsx examples/05-game-ecs.ts
```

Or with `npm` scripts (add to package.json):

```bash
npm run example:hello
npm run example:dashboard
npm run example:form
npm run example:animation
npm run example:game
```

---

## Examples Overview

### 01. Hello World
**File:** `01-hello-world.ts`

**Demonstrates:**
- Creating a world
- Creating a basic box widget
- Setting content and styling
- Rendering to terminal
- Basic input handling

**Run:**
```bash
tsx examples/01-hello-world.ts
```

**Controls:**
- `q` - Quit

---

### 02. Dashboard
**File:** `02-dashboard.ts`

**Demonstrates:**
- Panels with titles
- Lists with keyboard navigation
- Layout management
- Multiple widgets working together
- Status bar updates

**Run:**
```bash
tsx examples/02-dashboard.ts
```

**Controls:**
- `↑/↓` - Navigate menu
- `Enter` - Select menu item
- `q` - Quit

**Visual Preview:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━ System Dashboard ━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─ Menu ───────────────┐  ┌─ Content ──────────────────────────────────────┐
│ > Overview           │  │                                                 │
│   Performance        │  │  Welcome to the Dashboard!                      │
│   Logs               │  │                                                 │
│   Settings           │  │  Use arrow keys to navigate the menu.           │
│   Help               │  │  Press Enter to select.                         │
│                      │  │                                                 │
└──────────────────────┘  │                                                 │
                          └─────────────────────────────────────────────────┘
                          ┌─ Status ────────────────────────────────────────┐
                          │  System: Ready | Memory: 45% | CPU: 12%        │
                          └─────────────────────────────────────────────────┘
```

---

### 03. Form with Validation
**File:** `03-form-validation.ts`

**Demonstrates:**
- Text input controls
- Checkbox controls
- Form validation
- Focus management (Tab navigation)
- Submit handling with validation feedback

**Run:**
```bash
tsx examples/03-form-validation.ts
```

**Controls:**
- `Tab` - Next field
- `Shift+Tab` - Previous field
- `Enter` - Submit form
- `q` - Quit

**Validation Rules:**
- Username: Minimum 3 characters
- Email: Valid email format
- Terms: Must be checked

**Visual Preview:**
```
┌─ User Registration ──────────────────────────────────────────┐
│                                                               │
│  Username:  [Enter username (min 3 chars)____________]       │
│                                                               │
│  Email:     [user@example.com_______________________]        │
│                                                               │
│  [ ] I agree to the terms and conditions                     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Fill out all fields and press Enter to submit         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Tab: Next field | Shift+Tab: Previous | Enter: Submit       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 04. Animation & Physics
**File:** `04-animation-physics.ts`

**Demonstrates:**
- Physics-based movement
- Velocity and acceleration
- Collision detection
- Game loop with timing
- Interactive player control

**Run:**
```bash
tsx examples/04-animation-physics.ts
```

**Controls:**
- `↑/↓/←/→` - Move player
- `q` - Quit

**Gameplay:**
- Control the `@` character
- Collect stars (`*`) for points
- Avoid moving obstacles (`X`)

**Visual Preview:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Animation Demo - Press arrow keys to move, q to quit                    ┃
┃                                                                          ┃
┃  ┌──────────────┐                                                       ┃
┃  │ Score: 10    │                                                       ┃
┃  └──────────────┘                                                       ┃
┃                                                                          ┃
┃                              *                                           ┃
┃                                                                          ┃
┃           ┌─┐                                                            ┃
┃           │@│                                                            ┃
┃           └─┘                                                            ┃
┃                                                                          ┃
┃                                  ┌──┐                                    ┃
┃                                  │X │                                    ┃
┃                                  └──┘                                    ┃
┃                                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### 05. Game ECS
**File:** `05-game-ecs.ts`

**Demonstrates:**
- Full ECS architecture
- Entity management (player, enemies, bullets)
- Component composition (Position, Velocity, Collision)
- System execution (movement, AI, collision)
- Game state management
- Factory functions for entities

**Run:**
```bash
tsx examples/05-game-ecs.ts
```

**Controls:**
- `↑/↓/←/→` - Move spaceship
- `Space` - Fire bullets
- `q` - Quit

**Gameplay:**
- Shoot down incoming enemies
- Avoid letting enemies reach the bottom
- Each enemy destroyed: +10 points
- Each enemy that escapes: -1 life
- Game over at 0 lives

**Visual Preview:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Space Shooter - Arrow keys to move, Space to fire, q to quit            ┃
┃                                                                          ┃
┃  ┌──────────────┐                                                       ┃
┃  │ Score: 50    │        V    V    V                                    ┃
┃  │ Level: 1     │                                                       ┃
┃  └──────────────┘                                                       ┃
┃  ┌──────────────┐               |                                       ┃
┃  │ Lives: 3     │                                                       ┃
┃  └──────────────┘                                                       ┃
┃                                  |                                       ┃
┃                                                                          ┃
┃                                                                          ┃
┃                                                                          ┃
┃                                  ^                                       ┃
┃                                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Key Concepts Demonstrated

### 1. World & Entity Management
All examples show how to:
- Create an ECS world with `createWorld()`
- Add entities with `addEntity()`
- Remove entities with `removeEntity()`

### 2. Component Composition
Examples demonstrate component usage:
- `Position` - Entity location (x, y)
- `Renderable` - Visual appearance (char, colors)
- `Velocity` - Physics movement
- `Collision` - Collision detection
- `Focusable` - Focus management

### 3. Widget System
High-level widgets shown:
- `Box` - Basic container
- `Panel` - Container with title
- `Text` - Text display
- `TextInput` - User input
- `Checkbox` - Toggle control
- `List` - Selectable list

### 4. Input Handling
All examples include:
- Enabling input with `enableInput()`
- Event subscriptions with `getInputEventBus()`
- Keyboard handling (arrows, Enter, Space, etc.)

### 5. Rendering
Two rendering approaches:
- **Manual:** Call `render(world)` after state changes
- **Game Loop:** Continuous rendering in a loop

### 6. Systems
Advanced examples (04, 05) demonstrate:
- Custom systems (playerControlSystem, enemyAISystem)
- Built-in systems (movementSystem, collisionSystem)
- System execution order

---

## Learning Path

**Beginner:**
1. Start with `01-hello-world.ts` - Basic concepts
2. Try `02-dashboard.ts` - Multiple widgets
3. Explore `03-form-validation.ts` - User input

**Intermediate:**
4. Study `04-animation-physics.ts` - Game loop and physics
5. Analyze `05-game-ecs.ts` - Full ECS architecture

**Advanced:**
- Combine patterns from multiple examples
- Create your own systems and components
- Build a complete application

---

## Common Patterns

### Pattern 1: Basic UI
```typescript
const world = createWorld();
enableInput(world);

const box = createBox(world, { x: 5, y: 3, width: 40, height: 10 });
setContent(world, box, 'Hello!');

render(world);
```

### Pattern 2: Input Handling
```typescript
const inputBus = getInputEventBus(world);
inputBus.on('key', (event) => {
  if (event.name === 'q') process.exit(0);
  // Handle other keys...
  render(world);
});
```

### Pattern 3: Game Loop
```typescript
function gameLoop() {
  // Update game state
  playerControlSystem();
  movementSystem(world);
  collisionSystem();

  // Render
  render(world);

  // Continue loop
  setTimeout(gameLoop, 16); // ~60 FPS
}
gameLoop();
```

---

## Troubleshooting

### Example won't run
- Make sure you're in the project root
- Install dependencies: `pnpm install`
- Use `tsx` to run TypeScript files

### Terminal looks garbled
- Resize your terminal (minimum 80x24 recommended)
- Try running in a different terminal emulator
- Some examples require true color support

### Controls not working
- Make sure your terminal is focused
- Check that raw mode is enabled (library handles this)
- Try a different terminal emulator

---

## Next Steps

- Read the [API Documentation](/docs/api/)
- Check out the [Guides](/docs/guides/)
- Build your own application!
- Share your creations with the community

---

## Contributing Examples

Have a cool example? Submit a PR!

Guidelines:
- Keep examples focused on one concept
- Include clear comments
- Add keyboard shortcuts documentation
- Update this README with your example
