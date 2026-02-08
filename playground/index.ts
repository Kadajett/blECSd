/**
 * blECSd Playground
 *
 * This is a sandbox for experimenting with blECSd APIs.
 * Feel free to modify this file and run with: pnpm playground
 *
 * Quick Start Examples:
 * 1. ECS Components and Entities
 * 2. Creating Widgets
 * 3. Working with Systems
 */

import {
	addEntity,
	createWorld,
	Position,
	Velocity,
	setPosition,
	setVelocity,
	query,
} from '../src/index';

console.log('\\n=== blECSd Playground ===\\n');

// Example 1: Create an ECS World
const world = createWorld();
console.log('✓ Created ECS world');

// Example 2: Create Entities with Components
const player = addEntity(world);
setPosition(world, player, 10, 5);
setVelocity(world, player, { x: 1, y: 0, friction: 0.9, maxSpeed: 5 });
console.log(`✓ Created player entity (ID: ${player})`);
console.log(`  Position: (${Position.x[player]}, ${Position.y[player]})`);
console.log(`  Velocity: (${Velocity.x[player]}, ${Velocity.y[player]})`);

// Example 3: Create Multiple Entities
const enemy1 = addEntity(world);
setPosition(world, enemy1, 20, 10);
setVelocity(world, enemy1, { x: -0.5, y: 0, friction: 1.0, maxSpeed: 3 });

const enemy2 = addEntity(world);
setPosition(world, enemy2, 30, 15);
setVelocity(world, enemy2, { x: -1, y: 0.5, friction: 1.0, maxSpeed: 3 });

console.log(`✓ Created 2 enemy entities`);

// Example 4: Query Entities with Components
const entitiesWithVelocity = query(world, [Position, Velocity]);
console.log(`\\n✓ Query found ${entitiesWithVelocity.length} entities with Position + Velocity:`);
for (const eid of entitiesWithVelocity) {
	const x = Position.x[eid];
	const y = Position.y[eid];
	const vx = Velocity.x[eid];
	const vy = Velocity.y[eid];
	console.log(`  Entity ${eid}: pos=(${x}, ${y}), vel=(${vx}, ${vy})`);
}

// Example 5: Custom System - Apply Physics
function movementSystem(): void {
	const entities = query(world, [Position, Velocity]);
	for (const eid of entities) {
		const px = Position.x[eid];
		const py = Position.y[eid];
		const vx = Velocity.x[eid];
		const vy = Velocity.y[eid];

		if (px !== undefined && py !== undefined && vx !== undefined && vy !== undefined) {
			Position.x[eid] = px + vx;
			Position.y[eid] = py + vy;
		}
	}
}

// Run system a few times
console.log('\\n✓ Running movement system 3 times...');
for (let i = 0; i < 3; i++) {
	movementSystem();
}

// Check final positions
console.log('\\n✓ Final positions after movement:');
for (const eid of entitiesWithVelocity) {
	const x = Position.x[eid];
	const y = Position.y[eid];
	console.log(`  Entity ${eid}: pos=(${x?.toFixed(1)}, ${y?.toFixed(1)})`);
}

console.log('\\n✅ Playground complete!');
console.log('\\nTry modifying this file to experiment with:');
console.log('  - More components (Renderable, Collision, etc.)');
console.log('  - Custom systems');
console.log('  - Widget creation (createBox, createList, etc.)');
console.log('  - Entity hierarchies and relationships');
console.log('\\n');

// ============================================================================
// YOUR EXPERIMENTS BELOW
// ============================================================================

// Try experimenting here! Examples:

// 1. Add more components to an entity:
// import { Renderable, addComponent } from '../src/index';
// addComponent(world, player, Renderable);
// Renderable.char[player] = '@'.charCodeAt(0);

// 2. Create custom components:
// import { defineComponent, Types } from '../src/index';
// const Health = defineComponent({ current: Types.f32, max: Types.f32 });

// 3. Query multiple component combinations:
// const renderableEntities = query(world, [Position, Renderable]);

// 4. Build a simple simulation:
// function collisionSystem() {
//   const entities = query(world, [Position, Collision]);
//   // Check for collisions...
// }

// Happy experimenting! 🚀
