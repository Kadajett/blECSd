/**
 * Animation and Physics Example
 *
 * This example demonstrates:
 * - Physics-based animations
 * - Velocity and acceleration
 * - Collision detection
 * - Game loop with timing
 *
 * Run with: tsx examples/04-animation-physics.ts
 */

import {
	addEntity,
	createBox,
	createWorld,
	enableInput,
	getInputEventBus,
	getPosition,
	moveBy,
	render,
	setContent,
	setPosition,
	setVelocity,
} from '../src/index';

// Create the ECS world
const world = createWorld();
enableInput(world);

// Create boundary box
const boundary = createBox(world, {
	x: 2,
	y: 2,
	width: 76,
	height: 22,
	border: { type: 'double' },
});
setContent(world, boundary, 'Animation Demo - Press arrow keys to move, q to quit');

// Create player entity (controllable)
const player = addEntity(world);
setPosition(world, player, 20, 10);
setVelocity(world, player, { x: 0, y: 0, friction: 0.95, maxSpeed: 5 });

const playerBox = createBox(world, {
	x: 0,
	y: 0,
	width: 3,
	height: 2,
	border: { type: 'single' },
});
setContent(world, playerBox, '@');

// Create moving obstacle
const obstacle = addEntity(world);
setPosition(world, obstacle, 50, 15);
setVelocity(world, obstacle, { x: 2, y: 1, friction: 1.0, maxSpeed: 3 });

const obstacleBox = createBox(world, {
	x: 0,
	y: 0,
	width: 4,
	height: 2,
	border: { type: 'single' },
});
setContent(world, obstacleBox, 'X');

// Create collectible
const collectible = addEntity(world);
setPosition(world, collectible, 40, 12);

const collectibleBox = createBox(world, {
	x: 0,
	y: 0,
	width: 2,
	height: 1,
});
setContent(world, collectibleBox, '*');

// Score tracking
let score = 0;
const scoreBox = createBox(world, {
	x: 5,
	y: 3,
	width: 20,
	height: 3,
});
setContent(world, scoreBox, `Score: ${score}`);

// Input handling
const inputBus = getInputEventBus(world);
let keys = { up: false, down: false, left: false, right: false };

inputBus.on('key', (event) => {
	if (event.name === 'q') {
		process.exit(0);
	}

	// Track key states
	const isDown = event.action === 'press';
	if (event.name === 'up') keys.up = isDown;
	if (event.name === 'down') keys.down = isDown;
	if (event.name === 'left') keys.left = isDown;
	if (event.name === 'right') keys.right = isDown;
});

// Game loop
let lastTime = Date.now();
const targetFPS = 30;
const frameTime = 1000 / targetFPS;

function gameLoop() {
	const now = Date.now();
	const delta = now - lastTime;

	if (delta >= frameTime) {
		lastTime = now - (delta % frameTime);

		// Apply player input
		const accel = 0.5;
		if (keys.up) moveBy(world, player, 0, -accel);
		if (keys.down) moveBy(world, player, 0, accel);
		if (keys.left) moveBy(world, player, -accel, 0);
		if (keys.right) moveBy(world, player, accel, 0);

		// Update physics (velocity, collision, etc.)
		import { movementSystem } from '../src/index';
		movementSystem(world);

		// Obstacle bouncing off walls
		const obstaclePos = getPosition(world, obstacle);
		if (obstaclePos.x <= 3 || obstaclePos.x >= 73) {
			const velocity = getVelocity(world, obstacle);
			setVelocity(world, obstacle, { ...velocity, x: -velocity.x });
		}
		if (obstaclePos.y <= 3 || obstaclePos.y >= 21) {
			const velocity = getVelocity(world, obstacle);
			setVelocity(world, obstacle, { ...velocity, y: -velocity.y });
		}

		// Collision detection (simple distance check)
		const playerPos = getPosition(world, player);
		const collectiblePos = getPosition(world, collectible);

		const dx = playerPos.x - collectiblePos.x;
		const dy = playerPos.y - collectiblePos.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < 3) {
			// Collect item
			score += 10;
			setContent(world, scoreBox, `Score: ${score}`);
			// Respawn collectible
			setPosition(world, collectible, Math.random() * 60 + 10, Math.random() * 15 + 5);
		}

		// Update entity visual positions
		setPosition(world, playerBox, playerPos.x, playerPos.y);
		setPosition(world, obstacleBox, obstaclePos.x, obstaclePos.y);
		setPosition(world, collectibleBox, collectiblePos.x, collectiblePos.y);

		// Render frame
		render(world);
	}

	setTimeout(gameLoop, 1);
}

// Helper to get velocity (pseudo-code)
function getVelocity(world: any, entity: any): { x: number; y: number } {
	// This would use actual component access
	return { x: 0, y: 0 };
}

// Start game loop
gameLoop();

console.log('\nAnimation & Physics Example');
console.log('Use arrow keys to move, collect stars (*), avoid obstacles (X)\n');
