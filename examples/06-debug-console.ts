/**
 * Example: Debug Console with F12
 *
 * Demonstrates how to use the debug console for development and debugging:
 * - F12 key toggle
 * - Log messages with levels
 * - Performance overlay
 * - Entity inspection
 */

import { createDebugConsole, createWorld, debugLog, startGameLoop } from '../src/index';

// Create world
const world = createWorld();

// Create debug console with F12 toggle
const debugConsole = createDebugConsole(world, {
	enabled: true,
	toggleKey: 'F12',
	showOverlay: true, // Show performance stats
	showLogs: true, // Show log messages
	maxLogEntries: 100,
	position: { x: 0, y: 0 },
	dimensions: { width: 80, height: 20 },
});

// Start game loop
const loop = startGameLoop(world, {
	targetFPS: 60,
	onUpdate: (world, deltaTime) => {
		// Update debug console
		debugConsole.update(world, loop);

		// Example: Log some debug information
		if (Math.random() < 0.01) {
			debugConsole.log(`Frame time: ${deltaTime.toFixed(2)}ms`, 'info');
		}

		return world;
	},
});

// Wire up F12 key binding
loop.onKey('F12', () => {
	debugConsole.toggle();
	debugLog(world, `Debug console ${debugConsole.visible ? 'shown' : 'hidden'}`, 'info');
});

// Example: Log messages at different levels
setTimeout(() => {
	debugConsole.log('Application started successfully', 'info');
}, 100);

setTimeout(() => {
	debugConsole.log('Performance optimization applied', 'debug');
}, 500);

setTimeout(() => {
	debugConsole.log('Memory usage increasing', 'warn');
}, 1000);

setTimeout(() => {
	debugConsole.log('Critical error in physics system', 'error');
}, 1500);

// Example: Using the debugLog convenience function
debugLog(world, 'System initialized', 'info');

console.log('Press F12 to toggle debug console');
console.log('Debug console started. Press Ctrl+C to exit.');
