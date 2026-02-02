#!/usr/bin/env node
/**
 * Dual-pane file manager application.
 * Multiple columns with drag and drop support.
 * @module dualPaneApp
 */

import { createWorld, addEntity } from 'bitecs';
import type { World, Entity } from 'blecsd';
import {
	parseKeyBuffer,
	type KeyEvent,
} from 'blecsd';

/**
 * Local mouse event type.
 */
interface LocalMouseEvent {
	x: number;
	y: number;
	action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheelup' | 'wheeldown';
	button: 'left' | 'middle' | 'right' | 'none';
	ctrl: boolean;
	shift: boolean;
	meta: boolean;
}

import { DEFAULT_CONFIG, type FileManagerConfig } from './config';
import { createFileStore, type FileStore } from './data';
import {
	createVirtualListState,
	type VirtualListState,
} from './systems/virtualListSystem';
import {
	processSelectionAction,
	type SelectionAction,
} from './systems/selectionSystem';
import {
	processNavigationAction,
} from './systems/navigationSystem';
import {
	createPreviewState,
	cleanupPreviewState,
} from './systems/previewSystem';
import {
	createDualPaneState,
	createFileDragState,
	processDualPaneAction,
	getActivePane,
	type DualPaneState,
	type FileDragState,
	type DualPaneAction,
	calculatePaneBounds,
	getPaneAtPosition,
} from './systems/dualPaneSystem';
import {
	createDualPaneRenderState,
	updateDualPaneRenderDimensions,
	renderDualPane,
	dualPaneBufferToAnsi,
	type DualPaneRenderState,
} from './systems/dualPaneRender';
import { getCurrentIndex, getVisibleRange, setVirtualList, ensureIndexVisible, setTotalItems } from './components';
import { getHomePath } from './data/filesystem';

/**
 * Application state.
 */
interface AppState {
	world: World;
	config: FileManagerConfig;
	dualPaneState: DualPaneState;
	dragState: FileDragState;
	renderState: DualPaneRenderState;
	virtualListStates: Map<string, VirtualListState>;
	previewStates: Map<string, ReturnType<typeof createPreviewState>>;
	running: boolean;
	needsRedraw: boolean;
}

/**
 * Creates application state.
 */
async function createAppState(
	initialPath: string,
	width: number,
	height: number,
): Promise<AppState> {
	const world = createWorld() as World;
	const config = { ...DEFAULT_CONFIG, showPreview: false }; // Disable preview for dual-pane
	const dualPaneState = createDualPaneState(initialPath);
	const dragState = createFileDragState();
	const renderState = createDualPaneRenderState(width, height);
	const virtualListStates = new Map<string, VirtualListState>();
	const previewStates = new Map<string, ReturnType<typeof createPreviewState>>();

	// Initialize first pane
	const firstPane = dualPaneState.panes[0];
	if (firstPane) {
		const fileStore = createFileStore();
		await fileStore.loadDirectory(initialPath, config);
		dualPaneState.fileStores.set(firstPane.id, fileStore);

		const listEid = addEntity(world);
		dualPaneState.paneEntities.set(firstPane.id, listEid);

		const listHeight = height - 6; // Header, border, column header, footer
		setVirtualList(world, listEid, { totalItems: fileStore.count, visibleCount: listHeight });

		const vls = createVirtualListState();
		virtualListStates.set(firstPane.id, vls);
		// VirtualList initialized

		previewStates.set(firstPane.id, createPreviewState());
	}

	return {
		world,
		config,
		dualPaneState,
		dragState,
		renderState,
		virtualListStates,
		previewStates,
		running: true,
		needsRedraw: true,
	};
}

/**
 * Adds a new pane to the application.
 */
async function addNewPane(
	appState: AppState,
	path: string,
	screenHeight: number,
): Promise<void> {
	const { state: newDualPaneState } = processDualPaneAction(
		appState.dualPaneState,
		appState.dragState,
		{ type: 'addPane', path },
	);

	appState.dualPaneState = newDualPaneState;

	// Find the newly added pane (the one without a file store)
	for (const pane of newDualPaneState.panes) {
		if (!newDualPaneState.fileStores.has(pane.id)) {
			const fileStore = createFileStore();
			await fileStore.loadDirectory(path, appState.config);
			appState.dualPaneState.fileStores.set(pane.id, fileStore);

			const listEid = addEntity(appState.world);
			appState.dualPaneState.paneEntities.set(pane.id, listEid);

			const listHeight = screenHeight - 6;
			setVirtualList(appState.world, listEid, { totalItems: fileStore.count, visibleCount: listHeight });

			const vls = createVirtualListState();
			appState.virtualListStates.set(pane.id, vls);
			// VirtualList initialized

			appState.previewStates.set(pane.id, createPreviewState());
		}
	}

	appState.needsRedraw = true;
}

/**
 * Removes a pane from the application.
 */
function removePaneFromApp(appState: AppState, paneId: string): void {
	const { state: newDualPaneState } = processDualPaneAction(
		appState.dualPaneState,
		appState.dragState,
		{ type: 'removePane', paneId },
	);

	// Clean up resources
	const previewState = appState.previewStates.get(paneId);
	if (previewState) {
		cleanupPreviewState(previewState);
		appState.previewStates.delete(paneId);
	}

	appState.virtualListStates.delete(paneId);
	newDualPaneState.fileStores.delete(paneId);
	newDualPaneState.paneEntities.delete(paneId);

	appState.dualPaneState = newDualPaneState;
	appState.needsRedraw = true;
}

/**
 * Handles keyboard input.
 */
async function handleKeyInput(
	appState: AppState,
	event: KeyEvent,
	screenHeight: number,
): Promise<void> {
	const activePane = getActivePane(appState.dualPaneState);
	if (!activePane) return;

	const fileStore = appState.dualPaneState.fileStores.get(activePane.id);
	const listEid = appState.dualPaneState.paneEntities.get(activePane.id);
	const virtualListState = appState.virtualListStates.get(activePane.id);

	if (!fileStore || listEid === undefined || !virtualListState) return;

	const key = event.name.toLowerCase();

	// Global actions
	if (key === 'q' || (event.ctrl && key === 'c')) {
		appState.running = false;
		return;
	}

	// Tab - switch panes
	if (key === 'tab') {
		const { state } = processDualPaneAction(
			appState.dualPaneState,
			appState.dragState,
			{ type: 'cyclePane', direction: event.shift ? -1 : 1 },
		);
		appState.dualPaneState = state;
		appState.needsRedraw = true;
		return;
	}

	// + - add pane
	if (key === '+' || (event.shift && key === '=')) {
		await addNewPane(appState, activePane.path, screenHeight);
		return;
	}

	// - - remove current pane
	if (key === '-') {
		if (appState.dualPaneState.panes.length > 1) {
			removePaneFromApp(appState, activePane.id);
		}
		return;
	}

	// Movement
	let selectionAction: SelectionAction | null = null;

	if (key === 'j' || key === 'down') {
		selectionAction = { type: 'move', delta: 1 };
	} else if (key === 'k' || key === 'up') {
		selectionAction = { type: 'move', delta: -1 };
	} else if (key === 'g' || key === 'home') {
		selectionAction = { type: 'first' };
	} else if ((event.shift && key === 'g') || key === 'end') {
		selectionAction = { type: 'last' };
	} else if (key === 'pageup') {
		selectionAction = { type: 'page', direction: -1 };
	} else if (key === 'pagedown') {
		selectionAction = { type: 'page', direction: 1 };
	} else if (key === ' ') {
		selectionAction = { type: 'toggle' };
	} else if (event.ctrl && key === 'a') {
		selectionAction = { type: 'selectAll' };
	}

	if (selectionAction) {
		const changed = processSelectionAction(
			appState.world,
			listEid,
			selectionAction,
			fileStore.count,
		);
		if (changed) {
			ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
			appState.needsRedraw = true;
		}
		return;
	}

	// Navigation
	if (key === 'enter' || key === 'return' || key === 'l') {
		const result = await processNavigationAction(
			appState.world,
			listEid,
			{ type: 'enter' },
			fileStore,
			appState.config,
		);

		if (result.directoryChanged) {
			const { state } = processDualPaneAction(
				appState.dualPaneState,
				appState.dragState,
				{ type: 'updatePath', paneId: activePane.id, path: fileStore.currentPath },
			);
			appState.dualPaneState = state;
		}

		ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
		appState.needsRedraw = true;
		return;
	}

	if (key === 'backspace' || key === 'h') {
		await processNavigationAction(
			appState.world,
			listEid,
			{ type: 'back' },
			fileStore,
			appState.config,
		);

		const { state } = processDualPaneAction(
			appState.dualPaneState,
			appState.dragState,
			{ type: 'updatePath', paneId: activePane.id, path: fileStore.currentPath },
		);
		appState.dualPaneState = state;

		ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
		appState.needsRedraw = true;
		return;
	}

	// Home directory
	if (key === '~') {
		await processNavigationAction(
			appState.world,
			listEid,
			{ type: 'home' },
			fileStore,
			appState.config,
		);

		const { state } = processDualPaneAction(
			appState.dualPaneState,
			appState.dragState,
			{ type: 'updatePath', paneId: activePane.id, path: fileStore.currentPath },
		);
		appState.dualPaneState = state;

		ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
		appState.needsRedraw = true;
		return;
	}

	// Hidden files toggle
	if (key === '.') {
		appState.config = { ...appState.config, showHidden: !appState.config.showHidden };
		fileStore.resort(appState.config);
		ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
		appState.needsRedraw = true;
		return;
	}

	// Move selected files to other pane
	if (key === 'm') {
		await moveSelectedToNextPane(appState);
		return;
	}
}

/**
 * Moves selected files from active pane to next pane.
 */
async function moveSelectedToNextPane(appState: AppState): Promise<void> {
	if (appState.dualPaneState.panes.length < 2) {
		return; // Need at least 2 panes
	}

	const activePane = getActivePane(appState.dualPaneState);
	if (!activePane) return;

	const sourceFileStore = appState.dualPaneState.fileStores.get(activePane.id);
	const sourceListEid = appState.dualPaneState.paneEntities.get(activePane.id);

	if (!sourceFileStore || sourceListEid === undefined) return;

	// Get selected files (or current if none selected)
	const selectedFiles = sourceFileStore.getSelectedEntries(appState.world, sourceListEid);
	if (selectedFiles.length === 0) {
		const currentIndex = getCurrentIndex(appState.world, sourceListEid);
		const currentEntry = sourceFileStore.getEntryAt(currentIndex);
		if (currentEntry) {
			selectedFiles.push(currentEntry);
		}
	}

	if (selectedFiles.length === 0) return;

	// Find target pane (next pane, wrapping around)
	const currentIndex = appState.dualPaneState.activePaneIndex;
	const targetIndex = (currentIndex + 1) % appState.dualPaneState.panes.length;
	const targetPane = appState.dualPaneState.panes[targetIndex];

	if (!targetPane || targetPane.path === activePane.path) {
		return; // Can't move to same directory
	}

	// TODO: Actually move files using fs operations
	// For now, just log what would be moved
	const fileNames = selectedFiles.map((f) => f.name).join(', ');
	process.stderr.write(`\nWould move: ${fileNames}\nFrom: ${activePane.path}\nTo: ${targetPane.path}\n`);

	appState.needsRedraw = true;
}

/**
 * Handles mouse input.
 */
function handleMouseInput(
	appState: AppState,
	event: LocalMouseEvent,
	screenWidth: number,
	screenHeight: number,
): void {
	// Determine which pane was clicked
	const bounds = calculatePaneBounds(appState.dualPaneState, screenWidth, screenHeight);
	const clickedPane = getPaneAtPosition(appState.dualPaneState, event.x, screenWidth);

	if (clickedPane && event.action === 'mousedown') {
		// Switch to clicked pane
		const paneIndex = appState.dualPaneState.panes.findIndex((p) => p.id === clickedPane.id);
		if (paneIndex !== -1 && paneIndex !== appState.dualPaneState.activePaneIndex) {
			const { state } = processDualPaneAction(
				appState.dualPaneState,
				appState.dragState,
				{ type: 'setActivePane', paneIndex },
			);
			appState.dualPaneState = state;
			appState.needsRedraw = true;
		}

		// Handle click within pane
		const paneBounds = bounds.find((b) => b.paneId === clickedPane.id);
		if (paneBounds) {
			const localY = event.y - paneBounds.y - 2; // Subtract header and column header
			if (localY >= 0 && localY < paneBounds.height - 3) {
				const listEid = appState.dualPaneState.paneEntities.get(clickedPane.id);
				const virtualListState = appState.virtualListStates.get(clickedPane.id);
				const fileStore = appState.dualPaneState.fileStores.get(clickedPane.id);

				if (listEid !== undefined && virtualListState && fileStore) {
					const range = getVisibleRange(appState.world, listEid);
					const clickedIndex = range.start + localY;

					processSelectionAction(
						appState.world,
						listEid,
						{ type: 'click', index: clickedIndex },
						fileStore.count,
					);

					ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
					appState.needsRedraw = true;
				}
			}
		}
	}
}

/**
 * Renders the application.
 */
function render(appState: AppState, program: Program): void {
	renderDualPane(
		appState.world,
		appState.renderState,
		appState.dualPaneState,
		appState.dragState,
		appState.dualPaneState.fileStores,
		appState.config,
		appState.virtualListStates,
	);

	const output = dualPaneBufferToAnsi(appState.renderState);
	program.write(output);
}

/**
 * Parses SGR mouse sequence.
 */
function parseMouseSGR(str: string): LocalMouseEvent | null {
	const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
	if (!match) return null;

	const cb = Number.parseInt(match[1] ?? '0', 10);
	const cx = Number.parseInt(match[2] ?? '0', 10);
	const cy = Number.parseInt(match[3] ?? '0', 10);
	const released = match[4] === 'm';

	const buttonCode = cb & 0x03;
	const motion = (cb & 0x20) !== 0;
	const wheel = (cb & 0x40) !== 0;
	const ctrl = (cb & 0x10) !== 0;
	const shift = (cb & 0x04) !== 0;

	let button: 'left' | 'middle' | 'right' | 'none' = 'none';
	let action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheelup' | 'wheeldown' = 'mousedown';

	if (wheel) {
		action = buttonCode === 0 ? 'wheelup' : 'wheeldown';
	} else if (motion && released) {
		action = 'mousemove';
	} else if (released) {
		action = 'mouseup';
	} else {
		action = 'mousedown';
		if (buttonCode === 0) button = 'left';
		else if (buttonCode === 1) button = 'middle';
		else if (buttonCode === 2) button = 'right';
	}

	return {
		x: cx - 1,
		y: cy - 1,
		action,
		button,
		ctrl,
		shift,
		meta: false,
	};
}

/**
 * Main application entry point.
 */
async function main(): Promise<void> {
	const stdout = process.stdout;
	const stdin = process.stdin;

	// Get terminal size
	let width = stdout.columns ?? 80;
	let height = stdout.rows ?? 24;

	// Initialize application
	const initialPath = process.argv[2] ?? getHomePath();
	const appState = await createAppState(initialPath, width, height);

	// Setup terminal
	if (stdin.isTTY) {
		stdin.setRawMode(true);
	}
	stdin.resume();

	stdout.write('\x1b[?25l'); // Hide cursor
	stdout.write('\x1b[?1049h'); // Enter alternate screen
	stdout.write('\x1b[?1000h'); // Enable mouse tracking
	stdout.write('\x1b[?1006h'); // Enable SGR mouse mode

	// Initial render
	renderApp(appState);
	appState.needsRedraw = false;

	// Handle input
	stdin.on('data', async (data: Buffer) => {
		if (!appState.running) return;

		const str = data.toString();

		// Check for mouse event
		if (str.startsWith('\x1b[<')) {
			const mouseEvent = parseMouseSGR(str);
			if (mouseEvent) {
				handleMouseInput(appState, mouseEvent, width, height);
			}
		} else {
			// Parse as key events
			const keyEvents = parseKeyBuffer(data);
			for (const keyEvent of keyEvents) {
				await handleKeyInput(appState, keyEvent, height);
			}
		}

		if (!appState.running) {
			cleanup();
			process.exit(0);
		}

		if (appState.needsRedraw) {
			renderApp(appState);
			appState.needsRedraw = false;
		}
	});

	// Handle resize
	stdout.on('resize', () => {
		width = stdout.columns ?? 80;
		height = stdout.rows ?? 24;

		updateDualPaneRenderDimensions(appState.renderState, width, height);

		// Update all virtual lists
		for (const [paneId, virtualListState] of appState.virtualListStates) {
			const listEid = appState.dualPaneState.paneEntities.get(paneId);
			if (listEid !== undefined) {
				ensureIndexVisible(appState.world, listEid, getCurrentIndex(appState.world, listEid));
			}
		}

		renderApp(appState);
	});

	function cleanup(): void {
		stdout.write('\x1b[?1006l'); // Disable SGR mouse mode
		stdout.write('\x1b[?1000l'); // Disable mouse tracking
		stdout.write('\x1b[?1049l'); // Exit alternate screen
		stdout.write('\x1b[?25h'); // Show cursor
		stdout.write('\x1b[0m'); // Reset attributes

		if (stdin.isTTY) {
			stdin.setRawMode(false);
		}

		// Cleanup preview states
		for (const previewState of appState.previewStates.values()) {
			cleanupPreviewState(previewState);
		}
	}

	// Handle signals
	process.on('SIGINT', () => {
		cleanup();
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		cleanup();
		process.exit(0);
	});
}

/**
 * Renders the application.
 */
function renderApp(appState: AppState): void {
	renderDualPane(
		appState.world,
		appState.renderState,
		appState.dualPaneState,
		appState.dragState,
		appState.dualPaneState.fileStores,
		appState.config,
		appState.virtualListStates,
	);

	const output = dualPaneBufferToAnsi(appState.renderState);
	process.stdout.write(output);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
