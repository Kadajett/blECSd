# Scene API

Scene management for game screens. Provides a scene stack with lifecycle callbacks, scene transitions, and per-scene system registration. Scenes can be pushed/popped for overlays or switched directly.

## Quick Start

```typescript
import { createSceneManager } from 'blecsd';

const scenes = createSceneManager();

scenes.registerScene({
  name: 'menu',
  onEnter(world) { console.log('Entering menu'); },
});

scenes.registerScene({
  name: 'game',
  onEnter(world) { console.log('Starting game'); },
  onUpdate(world, dt) { /* game logic */ },
});

scenes.switchTo(world, 'menu');
scenes.switchTo(world, 'game');
```

## Types

### Scene

A game scene with lifecycle callbacks and optional per-scene systems.

```typescript
interface Scene {
  readonly name: string;
  onCreate?(world: World): void;
  onEnter?(world: World): void;
  onExit?(world: World): void;
  onDestroy?(world: World): void;
  onUpdate?(world: World, delta: number): void;
  systems?: readonly System[];
}
```

**Lifecycle:**
- `onCreate` - Called once when the scene is first entered (lazy initialization)
- `onEnter` - Called each time the scene becomes active
- `onExit` - Called when the scene is deactivated
- `onDestroy` - Called when the scene is unregistered or manager is reset
- `onUpdate` - Called each frame while the scene is active

### SceneTransition

A scene transition configuration.

```typescript
interface SceneTransition {
  readonly duration: number;
  onStart?(world: World): void;
  onUpdate?(world: World, progress: number): void;
  onComplete?(world: World): void;
}
```

### TransitionState

Current state of an active transition.

```typescript
interface TransitionState {
  readonly transition: SceneTransition;
  elapsed: number;
  readonly fromScene: Scene | null;
  readonly toScene: Scene;
}
```

### SceneManager

```typescript
interface SceneManager {
  registerScene(scene: Scene): boolean;
  unregisterScene(world: World, name: string): boolean;
  switchTo(world: World, name: string, transition?: SceneTransition): boolean;
  push(world: World, name: string, transition?: SceneTransition): boolean;
  pop(world: World, transition?: SceneTransition): boolean;
  getCurrentScene(): Scene | null;
  getSceneStack(): readonly Scene[];
  getRegisteredScenes(): readonly string[];
  isTransitioning(): boolean;
  getTransitionState(): TransitionState | null;
  updateTransition(world: World, delta: number): void;
  reset(world: World): void;
}
```

## Functions

### createSceneManager

Creates a new scene manager.

```typescript
function createSceneManager(): SceneManager;
```

**Returns:** A SceneManager instance.

### createFadeTransition

Creates a fade transition that calls onUpdate with progress 0-1.

```typescript
function createFadeTransition(
  duration: number,
  onProgress?: (world: World, progress: number) => void
): SceneTransition;
```

```typescript
import { createFadeTransition } from 'blecsd';

sceneManager.switchTo(world, 'game', createFadeTransition(0.5));
```

### createSlideTransition

Creates a slide transition in a given direction.

```typescript
function createSlideTransition(
  duration: number,
  direction: 'left' | 'right' | 'up' | 'down',
  onProgress?: (world: World, progress: number, direction: string) => void
): SceneTransition;
```

```typescript
import { createSlideTransition } from 'blecsd';

sceneManager.switchTo(world, 'settings', createSlideTransition(0.3, 'left'));
```

### createSceneSystem

Creates a system that updates the scene manager each frame. Advances transitions and calls onUpdate on the active scene.

```typescript
function createSceneSystem(sceneManager: SceneManager, getDelta: () => number): System;
```

```typescript
import { createSceneManager, createSceneSystem } from 'blecsd';

const scenes = createSceneManager();
const sceneSystem = createSceneSystem(scenes, getDeltaTime);
scheduler.registerSystem(LoopPhase.UPDATE, sceneSystem);
```

## Usage Example

```typescript
import { createSceneManager, createFadeTransition, createWorld } from 'blecsd';

const world = createWorld();
const scenes = createSceneManager();

// Register scenes
scenes.registerScene({
  name: 'title',
  onEnter(world) { setupTitleScreen(world); },
  onExit(world) { cleanupTitleScreen(world); },
  onUpdate(world, dt) { updateTitleAnimations(world, dt); },
});

scenes.registerScene({
  name: 'gameplay',
  onCreate(world) { loadLevel(world); },
  onEnter(world) { resumeGameplay(world); },
  onUpdate(world, dt) { updateGameplay(world, dt); },
  systems: [movementSystem, collisionSystem, aiSystem],
});

scenes.registerScene({
  name: 'pause',
  onEnter(world) { showPauseMenu(world); },
  onExit(world) { hidePauseMenu(world); },
});

// Start at title
scenes.switchTo(world, 'title');

// Transition to gameplay with fade
scenes.switchTo(world, 'gameplay', createFadeTransition(0.5));

// Push pause overlay (gameplay stays underneath)
scenes.push(world, 'pause');

// Pop to return to gameplay
scenes.pop(world);

// Check current scene
const current = scenes.getCurrentScene();
console.log(current?.name); // 'gameplay'

// Full stack
console.log(scenes.getSceneStack().map(s => s.name));
```
