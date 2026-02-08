/**
 * Game-like ECS Example
 *
 * This example demonstrates:
 * - Full ECS architecture
 * - Entity management
 * - Component composition
 * - System execution
 * - Game state management
 *
 * Run with: tsx examples/05-game-ecs.ts
 */

import {
	addEntity,
	createBox,
	createWorld,
	enableInput,
	getInputEventBus,
	getPosition,
	query,
	removeEntity,
	render,
	setCollider,
	setContent,
	setPosition,
	setRenderable,
	setVelocity,
} from '../src/index';
import { Collision, Position, Velocity } from '../src/index';

// Create the ECS world
const world = createWorld();
enableInput(world);

// Game state
interface GameState {
	running: boolean;
	score: number;
	level: number;
	playerLives: number;
}

const gameState: GameState = {
	running: true,
	score: 0,
	level: 1,
	playerLives: 3,
};

// Create game boundary
const gameArea = createBox(world, {
	x: 2,
	y: 2,
	width: 76,
	height: 24,
	border: { type: 'double' },
});
setContent(world, gameArea, 'Space Shooter - Arrow keys to move, Space to fire, q to quit');

// Create UI panels
const scorePanel = createBox(world, {
	x: 5,
	y: 3,
	width: 20,
	height: 3,
});

const livesPanel = createBox(world, {
	x: 5,
	y: 7,
	width: 20,
	height: 3,
});

// Factory functions for game entities
function createPlayer(x: number, y: number) {
	const entity = addEntity(world);
	setPosition(world, entity, x, y);
	setVelocity(world, entity, { x: 0, y: 0, friction: 0.9, maxSpeed: 8 });
	setCollider(world, entity, {
		type: 'aabb',
		width: 3,
		height: 2,
		layer: 1,
		mask: 0b110, // Collides with enemies (layer 2) and bullets (layer 3)
	});
	setRenderable(world, entity, { char: '^', fg: 0x00ff00, bg: 0x000000 });
	return entity;
}

function createEnemy(x: number, y: number) {
	const entity = addEntity(world);
	setPosition(world, entity, x, y);
	setVelocity(world, entity, { x: Math.random() * 2 - 1, y: 1, friction: 1.0, maxSpeed: 3 });
	setCollider(world, entity, {
		type: 'aabb',
		width: 3,
		height: 2,
		layer: 2,
		mask: 0b101, // Collides with player (layer 1) and player bullets (layer 3)
	});
	setRenderable(world, entity, { char: 'V', fg: 0xff0000, bg: 0x000000 });
	return entity;
}

function createBullet(x: number, y: number, direction: number) {
	const entity = addEntity(world);
	setPosition(world, entity, x, y);
	setVelocity(world, entity, { x: 0, y: direction * 15, friction: 1.0, maxSpeed: 15 });
	setCollider(world, entity, {
		type: 'aabb',
		width: 1,
		height: 1,
		layer: 3,
		mask: 0b110, // Collides with enemies (layer 2)
	});
	setRenderable(world, entity, { char: '|', fg: 0xffff00, bg: 0x000000 });
	return entity;
}

// Create player
const player = createPlayer(38, 20);

// Spawn initial enemies
const enemies: number[] = [];
function spawnEnemies(count: number) {
	for (let i = 0; i < count; i++) {
		const enemy = createEnemy(Math.random() * 70 + 5, 5 + i * 3);
		enemies.push(enemy);
	}
}
spawnEnemies(5);

// Input handling
const inputBus = getInputEventBus(world);
let keys = { up: false, down: false, left: false, right: false, space: false };
let lastShot = 0;

inputBus.on('key', (event) => {
	if (event.name === 'q') {
		process.exit(0);
	}

	const isDown = event.action === 'press';
	if (event.name === 'up') keys.up = isDown;
	if (event.name === 'down') keys.down = isDown;
	if (event.name === 'left') keys.left = isDown;
	if (event.name === 'right') keys.right = isDown;
	if (event.name === 'space') keys.space = isDown;
});

// Systems
function playerControlSystem() {
	const accel = 1.0;
	if (keys.up) {
		const vel = getVelocity(world, player);
		setVelocity(world, player, { ...vel, y: vel.y - accel });
	}
	if (keys.down) {
		const vel = getVelocity(world, player);
		setVelocity(world, player, { ...vel, y: vel.y + accel });
	}
	if (keys.left) {
		const vel = getVelocity(world, player);
		setVelocity(world, player, { ...vel, x: vel.x - accel });
	}
	if (keys.right) {
		const vel = getVelocity(world, player);
		setVelocity(world, player, { ...vel, x: vel.x + accel });
	}

	// Shooting
	if (keys.space) {
		const now = Date.now();
		if (now - lastShot > 200) {
			// 200ms cooldown
			const pos = getPosition(world, player);
			createBullet(pos.x + 1, pos.y - 1, -1); // Shoot up
			lastShot = now;
		}
	}
}

function enemyAISystem() {
	// Simple enemy AI - move down and bounce off sides
	for (const enemy of enemies) {
		const pos = getPosition(world, enemy);

		// Remove if off screen
		if (pos.y > 25) {
			removeEntity(world, enemy);
			const index = enemies.indexOf(enemy);
			if (index > -1) enemies.splice(index, 1);
			gameState.playerLives--;
			continue;
		}

		// Bounce off sides
		if (pos.x <= 3 || pos.x >= 73) {
			const vel = getVelocity(world, enemy);
			setVelocity(world, enemy, { ...vel, x: -vel.x });
		}
	}
}

function collisionSystem() {
	// Get all entities with collision components
	const entities = query(world, [Position, Collision]);

	// Simple AABB collision detection
	for (let i = 0; i < entities.length; i++) {
		for (let j = i + 1; j < entities.length; j++) {
			const a = entities[i];
			const b = entities[j];

			const posA = getPosition(world, a!);
			const posB = getPosition(world, b!);

			// Check collision
			const dx = Math.abs(posA.x - posB.x);
			const dy = Math.abs(posA.y - posB.y);

			if (dx < 3 && dy < 2) {
				// Handle collision
				handleCollision(a!, b!);
			}
		}
	}
}

function handleCollision(a: number, b: number) {
	// Determine entity types and handle accordingly
	// This is simplified - real implementation would check layers
	if (enemies.includes(a) || enemies.includes(b)) {
		// Enemy hit
		gameState.score += 10;
		removeEntity(world, a);
		removeEntity(world, b);

		const index = enemies.indexOf(a);
		if (index > -1) enemies.splice(index, 1);
	}
}

function updateUI() {
	setContent(world, scorePanel, `Score: ${gameState.score}\nLevel: ${gameState.level}`);
	setContent(world, livesPanel, `Lives: ${gameState.playerLives}`);
}

// Helper function (pseudo-code)
function getVelocity(world: any, entity: any): { x: number; y: number; friction: number; maxSpeed: number } {
	return { x: 0, y: 0, friction: 1, maxSpeed: 10 };
}

// Game loop
let lastTime = Date.now();
const targetFPS = 30;
const frameTime = 1000 / targetFPS;

function gameLoop() {
	if (!gameState.running || gameState.playerLives <= 0) {
		console.log('\nGame Over!');
		console.log(`Final Score: ${gameState.score}`);
		process.exit(0);
	}

	const now = Date.now();
	const delta = now - lastTime;

	if (delta >= frameTime) {
		lastTime = now - (delta % frameTime);

		// Execute systems
		playerControlSystem();
		enemyAISystem();

		// Movement system (from library)
		import { movementSystem } from '../src/index';
		movementSystem(world);

		collisionSystem();
		updateUI();

		// Spawn more enemies if needed
		if (enemies.length < 3) {
			spawnEnemies(2);
		}

		// Render
		render(world);
	}

	setTimeout(gameLoop, 1);
}

// Start game
gameLoop();

console.log('\nSpace Shooter Game');
console.log('Arrow keys: Move | Space: Shoot | q: Quit\n');
