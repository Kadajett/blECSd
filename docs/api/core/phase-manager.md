# Phase Manager API

Configurable game loop execution order. Allows users to add custom phases between the default phases while ensuring INPUT always runs first.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { createPhaseManager, LoopPhase } from 'blecsd';

const manager = createPhaseManager();

// Add custom phases between built-in phases
const preRender = manager.registerPhase('PRE_RENDER', LoopPhase.LAYOUT);
const postPhysics = manager.registerPhase('POST_PHYSICS', LoopPhase.PHYSICS);

// Get execution order
console.log(manager.getPhaseOrder());
```

## Types

### PhaseId

A phase identifier, either a built-in LoopPhase or a custom string.

```typescript
type PhaseId = LoopPhase | string;
```

### PhaseManager

```typescript
interface PhaseManager {
  registerPhase(name: string, afterPhase: PhaseId): string;
  unregisterPhase(phaseId: PhaseId): boolean;
  getPhaseOrder(): readonly PhaseId[];
  getPhaseName(phaseId: PhaseId): string | undefined;
  hasPhase(phaseId: PhaseId): boolean;
  isBuiltin(phaseId: PhaseId): boolean;
  getPhaseCount(): number;
  getCustomPhaseCount(): number;
  getCustomPhases(): string[];
  clearCustomPhases(): void;
  reset(): void;
}
```

## Constants

### BUILTIN_PHASE_NAMES

Maps built-in LoopPhase values to their string names.

<!-- blecsd-doccheck:ignore -->
```typescript
import { BUILTIN_PHASE_NAMES, LoopPhase } from 'blecsd';

console.log(BUILTIN_PHASE_NAMES[LoopPhase.INPUT]);  // 'INPUT'
console.log(BUILTIN_PHASE_NAMES[LoopPhase.RENDER]); // 'RENDER'
```

Built-in phases (in order): INPUT, EARLY_UPDATE, UPDATE, LATE_UPDATE, PHYSICS, LAYOUT, RENDER, POST_RENDER.

### defaultPhaseManager

Default global phase manager for simple use cases.

```typescript
import { defaultPhaseManager } from 'blecsd';
```

## Functions

### createPhaseManager

Creates a new PhaseManager instance.

```typescript
function createPhaseManager(): PhaseManager;
```

**Returns:** A new PhaseManager initialized with all built-in phases.

### isBuiltinPhase

Checks if a phase ID is a built-in LoopPhase.

```typescript
function isBuiltinPhase(id: PhaseId): id is LoopPhase;
```

## PhaseManager Methods

### registerPhase

Registers a custom phase to run after a specific phase.

```typescript
registerPhase(name: string, afterPhase: PhaseId): string;
```

**Parameters:**
- `name` - Name for the custom phase (for debugging)
- `afterPhase` - The phase after which this custom phase should run

**Returns:** The ID for the new custom phase.

**Throws:** Error if the afterPhase is unknown.

### unregisterPhase

Unregisters a custom phase. Built-in phases cannot be removed.

```typescript
unregisterPhase(phaseId: PhaseId): boolean;
```

**Throws:** Error if attempting to remove a built-in phase.

### getPhaseOrder

Gets all phases in execution order.

```typescript
getPhaseOrder(): readonly PhaseId[];
```

### Other Methods

- `getPhaseName(phaseId)` - Gets the display name for a phase
- `hasPhase(phaseId)` - Checks if a phase exists
- `isBuiltin(phaseId)` - Checks if a phase is built-in
- `getPhaseCount()` - Total number of phases
- `getCustomPhaseCount()` - Number of custom phases
- `getCustomPhases()` - Array of custom phase IDs
- `clearCustomPhases()` - Removes all custom phases
- `reset()` - Resets to default built-in phases only

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import { createPhaseManager, LoopPhase } from 'blecsd';

const phases = createPhaseManager();

// Add custom phases for specific needs
const aiPhase = phases.registerPhase('AI', LoopPhase.UPDATE);
const particlePhase = phases.registerPhase('PARTICLES', LoopPhase.PHYSICS);
const uiPhase = phases.registerPhase('UI_UPDATE', LoopPhase.LAYOUT);

// Inspect execution order
for (const phase of phases.getPhaseOrder()) {
  const name = phases.getPhaseName(phase);
  const builtin = phases.isBuiltin(phase) ? ' (built-in)' : '';
  console.log(`${name}${builtin}`);
}
// OUTPUT:
// INPUT (built-in)
// EARLY_UPDATE (built-in)
// UPDATE (built-in)
// AI
// LATE_UPDATE (built-in)
// PHYSICS (built-in)
// PARTICLES
// LAYOUT (built-in)
// UI_UPDATE
// RENDER (built-in)
// POST_RENDER (built-in)

// Remove a custom phase
phases.unregisterPhase(aiPhase);

// Reset to defaults
phases.reset();
```
