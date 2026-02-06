# Health Components API

ECS component for health/resource pools with current/max values, regeneration, invulnerability, and damage/heal helpers.

## Overview

The Health component is a generic resource pool suitable for HP, mana, stamina, or any numeric resource. It tracks current and max values, supports per-second regeneration, and provides timed invulnerability. Damage respects invulnerability and clamps to zero; healing clamps to max.

## Import

```typescript
import {
  Health,
  setHealth,
  getHealth,
  hasHealth,
  removeHealth,
  damage,
  heal,
  isDead,
  isInvulnerable,
  setInvulnerable,
  clearInvulnerable,
  getHealthPercent,
  setCurrentHealth,
  setMaxHealth,
  setRegen,
  updateHealth,
} from 'blecsd';
```

## Component Data Layout

```typescript
const Health = {
  current:          Float32Array,  // Current resource value
  max:              Float32Array,  // Maximum resource value
  regen:            Float32Array,  // Regeneration per second
  invulnerable:     Uint8Array,    // 1=invulnerable, 0=vulnerable
  invulnerableTime: Float32Array,  // Remaining invulnerability seconds
};
```

## Core Functions

### setHealth

Sets health on an entity. Adds the component if not present.

```typescript
import { setHealth } from 'blecsd';

setHealth(world, entity, { max: 100 });                   // Full HP
setHealth(world, entity, { max: 100, current: 75, regen: 2 }); // Damaged, regenerating
```

**Options:**
- `max` - Maximum resource value (required)
- `current` - Current value (default: same as `max`)
- `regen` - Regeneration per second (default: `0`)

### getHealth

Returns a snapshot of health state.

```typescript
import { getHealth } from 'blecsd';

const hp = getHealth(world, entity);
if (hp) {
  console.log(`HP: ${hp.current}/${hp.max}`);
}
```

**Returns:** `HealthData | undefined`

### hasHealth / removeHealth

```typescript
import { hasHealth, removeHealth } from 'blecsd';

if (hasHealth(world, entity)) {
  removeHealth(world, entity);
}
```

## Damage and Healing

### damage

Applies damage. Respects invulnerability. Clamps to zero.

```typescript
import { damage } from 'blecsd';

const killed = damage(world, entity, 50);
if (killed) {
  console.log('Entity was killed!');
}
```

**Returns:** `true` if the entity's health reached zero.

### heal

Restores health, clamped to max.

```typescript
import { heal } from 'blecsd';

heal(world, entity, 25);
```

## Invulnerability

### setInvulnerable / clearInvulnerable / isInvulnerable

```typescript
import { setInvulnerable, clearInvulnerable, isInvulnerable } from 'blecsd';

setInvulnerable(world, entity, 2.0); // 2 seconds of invulnerability
setInvulnerable(world, entity, 0);   // Permanent until cleared
clearInvulnerable(world, entity);

if (isInvulnerable(world, entity)) {
  // Takes no damage
}
```

## Query Helpers

### isDead

```typescript
import { isDead } from 'blecsd';

if (isDead(world, entity)) {
  // current health <= 0
}
```

### getHealthPercent

Returns health as a 0-1 ratio.

```typescript
import { getHealthPercent } from 'blecsd';

const percent = getHealthPercent(world, entity);
console.log(`HP: ${Math.round(percent * 100)}%`);
```

### setCurrentHealth / setMaxHealth / setRegen

Direct setters for individual fields.

```typescript
import { setCurrentHealth, setMaxHealth, setRegen } from 'blecsd';

setCurrentHealth(world, entity, 50); // Clamped to [0, max]
setMaxHealth(world, entity, 200);    // Clamps current if over new max
setRegen(world, entity, 5);          // 5 HP per second
```

## Update

### updateHealth

Call each frame. Decrements invulnerability timer and applies regeneration.

```typescript
import { updateHealth } from 'blecsd';

// In your update loop
updateHealth(world, entity, deltaTime);
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setHealth, damage, heal, isDead, setInvulnerable, updateHealth } from 'blecsd';

const world = createWorld();
const player = addEntity(world);

setHealth(world, player, { max: 100, regen: 1 });

// Take damage
damage(world, player, 30); // 70 HP

// Heal
heal(world, player, 10); // 80 HP

// Invulnerability after hit
setInvulnerable(world, player, 1.5);

// Each frame
updateHealth(world, player, deltaTime);

if (isDead(world, player)) {
  // Game over
}
```

## Types

### HealthData

```typescript
interface HealthData {
  readonly current: number;
  readonly max: number;
  readonly regen: number;
  readonly invulnerable: boolean;
  readonly invulnerableTime: number;
}
```

### HealthOptions

```typescript
interface HealthOptions {
  current?: number;
  max: number;
  regen?: number;
}
```
