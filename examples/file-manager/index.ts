#!/usr/bin/env node
/**
 * File Manager Example Entry Point
 *
 * A terminal file manager demonstrating blECSd's architecture:
 * - ECS for UI state (selection, viewport, focus)
 * - Data outside ECS (FileStore for file entries)
 * - Virtualized rendering (only visible rows get entities)
 * - Tabbed explorer with preview panel
 *
 * Usage:
 *   pnpm --filter file-manager-example start [path] [options]
 *
 * Options:
 *   --tabs         Start in tabbed mode (default)
 *
 * Key bindings:
 *   Ctrl+Tab       Cycle between tabs
 *   t              New tab
 *   w              Close tab
 *   j/k or arrows  Navigate files
 *   Enter/l        Open directory or file
 *   Backspace/h    Go to parent directory
 *   Space          Toggle selection
 *   [ / ]          Scroll preview
 *   q              Quit
 *
 * @module file-manager
 */

import { runTabbedApp } from './tabbedApp';

async function main(): Promise<void> {
	try {
		await runTabbedApp();
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
