#!/usr/bin/env node
/**
 * File Manager Example Entry Point
 *
 * A terminal file manager demonstrating blECSd's architecture:
 * - ECS for UI state (selection, viewport, focus)
 * - Data outside ECS (FileStore for file entries)
 * - Virtualized rendering (only visible rows get entities)
 *
 * @module file-manager
 */

import { FileManagerApp } from './app';

async function main(): Promise<void> {
	// Get initial path from command line or use current directory
	const initialPath = process.argv[2] ?? process.cwd();

	const app = new FileManagerApp();

	try {
		await app.start(initialPath);
	} catch (error) {
		// Restore terminal on error
		process.stdout.write('\x1b[?1049l'); // Exit alternate screen
		process.stdout.write('\x1b[?25h'); // Show cursor
		process.stdout.write('\x1b[0m'); // Reset attributes

		console.error('Error:', error);
		process.exit(1);
	}

	process.exit(0);
}

main();
