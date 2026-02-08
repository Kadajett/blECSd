/**
 * Basic Hello World Example
 *
 * This example demonstrates:
 * - Creating a world
 * - Creating a simple box widget
 * - Setting content and styling
 * - Rendering to the terminal
 *
 * Run with: tsx examples/01-hello-world.ts
 */

import { createBox, createWorld, enableInput, getInputEventBus, render } from '../src/index';

// Create the ECS world
const world = createWorld();

// Enable input handling
enableInput(world);

// Create a box with content
const box = createBox(world, {
	x: 5,
	y: 3,
	width: 40,
	height: 10,
	border: { type: 'rounded' },
	padding: { all: 2 },
});

// Set the content
import { setContent } from '../src/index';
setContent(world, box, 'Hello, blECSd!\n\nPress q to quit.');

// Render the initial frame
render(world);

// Handle input
const inputBus = getInputEventBus(world);
inputBus.on('key', (event) => {
	if (event.name === 'q') {
		process.exit(0);
	}
});

console.log('\nHello World Example');
console.log('Press q to quit\n');
