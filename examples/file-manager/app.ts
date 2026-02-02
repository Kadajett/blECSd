/**
 * File Manager Application.
 * @module app
 */

import * as readline from 'node:readline';
import { createWorld } from 'blecsd';
import type { World, KeyEvent } from 'blecsd';
import { parseKeyBuffer } from 'blecsd';

/**
 * Local mouse event type for file manager.
 * Uses more granular action types than the library's MouseEvent.
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

import { createConfig, type FileManagerConfig } from './config';
import { createFileStore, type FileStore } from './data';
import { createLayout, updateLayout, type LayoutEntities } from './ui';
import {
	createVirtualListSystem,
	createVirtualListState,
	registerListRows,
	createRenderState,
	updateRenderDimensions,
	render,
	bufferToAnsi,
	createPreviewState,
	cleanupPreviewState,
	updatePreview,
	type VirtualListState,
	type RenderState,
	type PreviewState,
} from './systems';
import {
	matchKeyBinding,
	DEFAULT_KEY_BINDINGS,
	processMouseEvent,
	createUIRegions,
	handleAction,
	handleMouseAction,
	handleFilterInput,
	type HandlerContext,
} from './input';
import { setTotalItems, getVirtualList } from './components';

/**
 * File Manager Application.
 */
export class FileManagerApp {
	private world: World;
	private config: FileManagerConfig;
	private fileStore: FileStore;
	private layout: LayoutEntities;
	private virtualListState: VirtualListState;
	private virtualListSystem: ReturnType<typeof createVirtualListSystem>;
	private renderState: RenderState;
	private previewState: PreviewState;

	private running = false;
	private focusedPane: 'list' | 'preview' = 'list';
	private filterMode = false;
	private filterQuery = '';

	private rl: readline.Interface | null = null;
	private stdin: typeof process.stdin;
	private stdout: typeof process.stdout;

	constructor(initialPath?: string) {
		this.world = createWorld();
		this.config = createConfig();
		this.fileStore = createFileStore();

		// Get terminal dimensions
		const { columns, rows } = process.stdout;
		const width = columns ?? 80;
		const height = rows ?? 24;

		// Create layout
		this.layout = createLayout(this.world, this.config, height);

		// Setup virtual list
		this.virtualListState = createVirtualListState();
		registerListRows(this.virtualListState, this.layout.list, this.layout.rows);
		this.virtualListSystem = createVirtualListSystem(this.virtualListState);

		// Create render state
		this.renderState = createRenderState(width, height, this.config.splitRatio);

		// Create preview state
		this.previewState = createPreviewState();

		this.stdin = process.stdin;
		this.stdout = process.stdout;
	}

	/**
	 * Starts the file manager.
	 */
	async start(initialPath?: string): Promise<void> {
		this.running = true;

		// Load initial directory
		const startPath = initialPath ?? process.cwd();
		await this.fileStore.loadDirectory(startPath, this.config);
		setTotalItems(this.world, this.layout.list, this.fileStore.count);

		// Initial preview update
		updatePreview(
			this.world,
			this.layout.list,
			this.layout.preview,
			this.fileStore,
			this.config.sizeFormat,
			this.previewState,
		);

		// Setup terminal
		this.setupTerminal();

		// Initial render
		this.renderFrame();

		// Handle resize
		this.stdout.on('resize', () => {
			this.handleResize();
		});

		// Main loop
		await this.mainLoop();
	}

	/**
	 * Sets up terminal for raw input.
	 */
	private setupTerminal(): void {
		// Enable raw mode
		if (this.stdin.isTTY) {
			this.stdin.setRawMode(true);
		}
		this.stdin.resume();

		// Hide cursor and enter alternate screen
		this.stdout.write('\x1b[?25l'); // Hide cursor
		this.stdout.write('\x1b[?1049h'); // Enter alternate screen
		this.stdout.write('\x1b[?1000h'); // Enable basic mouse tracking
		this.stdout.write('\x1b[?1002h'); // Enable button-motion tracking (for scroll)
		this.stdout.write('\x1b[?1006h'); // Enable SGR mouse mode
	}

	/**
	 * Restores terminal to normal state.
	 */
	private restoreTerminal(): void {
		this.stdout.write('\x1b[?1006l'); // Disable SGR mouse mode
		this.stdout.write('\x1b[?1002l'); // Disable button-motion tracking
		this.stdout.write('\x1b[?1000l'); // Disable mouse tracking
		this.stdout.write('\x1b[?1049l'); // Exit alternate screen
		this.stdout.write('\x1b[?25h'); // Show cursor
		this.stdout.write('\x1b[0m'); // Reset attributes

		if (this.stdin.isTTY) {
			this.stdin.setRawMode(false);
		}
	}

	/**
	 * Main input loop.
	 */
	private async mainLoop(): Promise<void> {
		return new Promise<void>((resolve) => {
			this.stdin.on('data', async (data: Buffer) => {
				if (!this.running) return;

				const result = await this.handleInput(data);

				if (result.quit) {
					this.running = false;
					this.cleanup();
					resolve();
					return;
				}

				if (result.redraw) {
					this.renderFrame();
				}
			});
		});
	}

	/**
	 * Handles raw input data.
	 */
	private async handleInput(data: Buffer): Promise<{ redraw: boolean; quit: boolean }> {
		const str = data.toString();

		// Check for mouse event
		if (str.startsWith('\x1b[<')) {
			return this.handleMouseInput(str);
		}

		// Parse as key event
		const keyEvents = parseKeyBuffer(data);
		if (keyEvents.length === 0) {
			return { redraw: false, quit: false };
		}

		// Handle first key event (usually there's only one)
		const keyEvent = keyEvents[0];
		if (!keyEvent) {
			return { redraw: false, quit: false };
		}

		return this.handleKeyInput(keyEvent);
	}

	/**
	 * Handles key input.
	 */
	private async handleKeyInput(event: KeyEvent): Promise<{ redraw: boolean; quit: boolean }> {
		// Filter mode
		if (this.filterMode) {
			const result = handleFilterInput(event.name, this.createHandlerContext());
			this.applyHandlerResult(result);
			return result;
		}

		// Match key binding
		const action = matchKeyBinding(event, DEFAULT_KEY_BINDINGS);
		if (!action) {
			return { redraw: false, quit: false };
		}

		const result = await handleAction(action, this.createHandlerContext());
		this.applyHandlerResult(result);
		return result;
	}

	/**
	 * Handles mouse input.
	 */
	private async handleMouseInput(str: string): Promise<{ redraw: boolean; quit: boolean }> {
		const mouseEvent = parseMouseSGR(str);
		if (!mouseEvent) {
			return { redraw: false, quit: false };
		}

		const regions = createUIRegions(
			this.renderState.width,
			this.renderState.height,
			this.config.splitRatio,
		);

		const virtualList = getVirtualList(this.world, this.layout.list);
		const listStartIndex = virtualList?.visibleStart ?? 0;

		const mouseAction = processMouseEvent(mouseEvent, regions, listStartIndex);
		if (!mouseAction) {
			return { redraw: false, quit: false };
		}

		const result = await handleMouseAction(mouseAction, this.createHandlerContext());
		this.applyHandlerResult(result);
		return result;
	}

	/**
	 * Creates handler context.
	 */
	private createHandlerContext(): HandlerContext {
		return {
			world: this.world,
			listEid: this.layout.list,
			previewEid: this.layout.preview,
			fileStore: this.fileStore,
			config: this.config,
			previewState: this.previewState,
			focusedPane: this.focusedPane,
			filterMode: this.filterMode,
			filterQuery: this.filterQuery,
			terminalWidth: this.renderState.width,
			terminalHeight: this.renderState.height,
		};
	}

	/**
	 * Applies handler result to app state.
	 */
	private applyHandlerResult(result: { config?: FileManagerConfig; focusedPane?: 'list' | 'preview'; filterMode?: boolean; filterQuery?: string }): void {
		if (result.config) {
			this.config = result.config;
		}
		if (result.focusedPane !== undefined) {
			this.focusedPane = result.focusedPane;
		}
		if (result.filterMode !== undefined) {
			this.filterMode = result.filterMode;
		}
		if (result.filterQuery !== undefined) {
			this.filterQuery = result.filterQuery;
		}
	}

	/**
	 * Handles terminal resize.
	 */
	private handleResize(): void {
		const { columns, rows } = this.stdout;
		const width = columns ?? 80;
		const height = rows ?? 24;

		updateRenderDimensions(this.renderState, width, height, this.config.splitRatio);
		updateLayout(this.world, this.layout, this.config, height);

		this.renderFrame();
	}

	/**
	 * Renders a frame.
	 */
	private renderFrame(): void {
		// Run virtual list system
		this.virtualListSystem(this.world);

		// Render to buffer
		// Pass undefined when not in filter mode, or the query (even if empty) when in filter mode
		render(
			this.world,
			this.renderState,
			this.layout.list,
			this.layout.preview,
			this.fileStore,
			this.config,
			this.virtualListState,
			this.filterMode ? this.filterQuery : undefined,
		);

		// Output to terminal
		const output = bufferToAnsi(this.renderState);
		this.stdout.write(output);
	}

	/**
	 * Cleans up resources.
	 */
	private cleanup(): void {
		cleanupPreviewState(this.previewState);
		this.restoreTerminal();
	}
}

/**
 * Parses SGR mouse sequence.
 */
function parseMouseSGR(str: string): LocalMouseEvent | null {
	// Format: \x1b[<Cb;Cx;CyM or \x1b[<Cb;Cx;Cym
	const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
	if (!match) return null;

	const cb = Number.parseInt(match[1] ?? '0', 10);
	const cx = Number.parseInt(match[2] ?? '0', 10);
	const cy = Number.parseInt(match[3] ?? '0', 10);
	const released = match[4] === 'm';

	// Decode button
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

	// Convert from 1-based terminal coordinates to 0-based screen coordinates
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
