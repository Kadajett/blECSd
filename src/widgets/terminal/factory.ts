/**
 * Factory function for creating Terminal widgets.
 *
 * @module widgets/terminal/factory
 */

import { setDimensions } from '../../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import {
	clearTerminal,
	getTerminalBuffer,
	getTerminalCells,
	getTerminalState,
	removeTerminalBuffer,
	resetTerminal,
	resizeTerminalBuffer,
	scrollTerminalDown,
	scrollTerminalToBottom,
	scrollTerminalToTop,
	scrollTerminalUp,
	setCursorPosition,
	setCursorVisible,
	setTerminalBuffer,
	type TerminalBufferConfig,
	writeToTerminal,
} from '../../components/terminalBuffer';
import { addEntity, removeEntity } from '../../core/ecs';
import type { World } from '../../core/types';
import { TerminalConfigSchema } from './config';
import { parseSpawnOptions, tryLoadNodePty } from './pty';
import { ptyStateMap, Terminal } from './state';
import type { PtyOptions, PtyState, TerminalConfig, TerminalWidget } from './types';
import {
	calculateDisplayDimensions,
	parsePositionToNumber,
	setupTerminalBorder,
	setupTerminalStyle,
} from './utils';

/**
 * Creates a Terminal widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns Terminal widget interface
 *
 * @example
 * ```typescript
 * import { createTerminal } from 'blecsd/widgets';
 *
 * const terminal = createTerminal(world, {
 *   width: 80,
 *   height: 24,
 *   border: { type: 'line' },
 * });
 *
 * // Write content
 * terminal.writeln('Hello, Terminal!');
 *
 * // Spawn a shell
 * terminal.spawn('/bin/bash');
 * terminal.onData((data) => console.log(data));
 * ```
 */
export function createTerminal(world: World, config: TerminalConfig = {}): TerminalWidget {
	const validated = TerminalConfigSchema.parse(config);

	// Create entity
	const eid = addEntity(world);

	// Mark as terminal widget
	Terminal.isTerminal[eid] = 1;
	Terminal.mouseEnabled[eid] = validated.mouse ? 1 : 0;
	Terminal.keysEnabled[eid] = validated.keys ? 1 : 0;

	// Set position
	const x = parsePositionToNumber(validated.left);
	const y = parsePositionToNumber(validated.top);
	setPosition(world, eid, x, y);

	// Calculate and set dimensions
	const { displayWidth, displayHeight } = calculateDisplayDimensions(
		validated.width,
		validated.height,
		validated.border,
	);
	setDimensions(world, eid, displayWidth, displayHeight);

	// Set up terminal buffer
	const bufferConfig: TerminalBufferConfig = {
		width: validated.width,
		height: validated.height,
		scrollbackLines: validated.scrollback,
		cursorBlink: validated.cursorBlink,
		cursorShape: validated.cursorShape,
		cursorVisible: true,
	};
	setTerminalBuffer(world, eid, bufferConfig);

	// Set style and visibility
	setupTerminalStyle(world, eid, validated.style);
	setVisible(world, eid, true);

	// Set border
	setupTerminalBorder(world, eid, validated.border);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Initialize PTY state
	const ptyState: PtyState = {
		pty: null,
		onDataCallback: null,
		onExitCallback: null,
		autoResize: true,
	};
	ptyStateMap.set(eid, ptyState);

	// Create widget interface
	const widget: TerminalWidget = {
		eid,

		// Content
		write(data: string): TerminalWidget {
			writeToTerminal(world, eid, data);
			return widget;
		},

		writeln(data: string): TerminalWidget {
			writeToTerminal(world, eid, `${data}\n`);
			return widget;
		},

		clear(): TerminalWidget {
			clearTerminal(world, eid);
			return widget;
		},

		reset(): TerminalWidget {
			resetTerminal(world, eid);
			return widget;
		},

		// Scrolling
		scrollUp(lines = 1): TerminalWidget {
			scrollTerminalUp(world, eid, lines);
			return widget;
		},

		scrollDown(lines = 1): TerminalWidget {
			scrollTerminalDown(world, eid, lines);
			return widget;
		},

		scrollToTop(): TerminalWidget {
			scrollTerminalToTop(world, eid);
			return widget;
		},

		scrollToBottom(): TerminalWidget {
			scrollTerminalToBottom(world, eid);
			return widget;
		},

		// Cursor
		setCursor(cursorX: number, cursorY: number): TerminalWidget {
			setCursorPosition(world, eid, cursorX, cursorY);
			return widget;
		},

		showCursor(): TerminalWidget {
			setCursorVisible(world, eid, true);
			return widget;
		},

		hideCursor(): TerminalWidget {
			setCursorVisible(world, eid, false);
			return widget;
		},

		// PTY Process
		spawn(options?: PtyOptions | string): TerminalWidget {
			const nodePty = tryLoadNodePty();
			if (!nodePty) {
				console.warn('node-pty is not installed. Install it with: pnpm add node-pty');
				return widget;
			}

			// Kill existing process if any
			if (ptyState.pty) {
				widget.kill();
			}

			// Parse options
			const {
				shell,
				args,
				env,
				cwd,
				term,
				cols: optCols,
				rows: optRows,
				autoResize,
			} = parseSpawnOptions(options);

			// Get terminal dimensions (use options if provided, otherwise widget dimensions)
			const buffer = getTerminalBuffer(eid);
			const cols = optCols ?? buffer?.width ?? 80;
			const rows = optRows ?? buffer?.height ?? 24;

			// Store auto-resize setting
			ptyState.autoResize = autoResize;

			// Spawn PTY
			const pty = nodePty.spawn(shell, args, {
				name: term,
				cols,
				rows,
				...(cwd !== undefined ? { cwd } : {}),
				env,
			});

			ptyState.pty = pty;

			// Handle PTY output
			pty.onData((data: string) => {
				// Write to terminal buffer
				writeToTerminal(world, eid, data);

				// Call user callback
				if (ptyState.onDataCallback) {
					ptyState.onDataCallback(data);
				}
			});

			// Handle PTY exit
			pty.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
				ptyState.pty = null;

				if (ptyState.onExitCallback) {
					ptyState.onExitCallback(exitCode, signal);
				}
			});

			return widget;
		},

		input(data: string): TerminalWidget {
			const pty = ptyState.pty as { write: (data: string) => void } | null;
			if (pty) {
				pty.write(data);
			}
			return widget;
		},

		resize(cols: number, rows: number): TerminalWidget {
			// Resize terminal buffer
			resizeTerminalBuffer(world, eid, cols, rows);

			// Resize PTY if running and autoResize is enabled
			const pty = ptyState.pty as { resize: (cols: number, rows: number) => void } | null;
			if (pty && ptyState.autoResize) {
				pty.resize(cols, rows);
			}

			// Update widget dimensions
			const hasBorderNow = validated.border !== undefined && validated.border.type !== 'none';
			const newDisplayWidth = cols + (hasBorderNow ? 2 : 0);
			const newDisplayHeight = rows + (hasBorderNow ? 2 : 0);
			setDimensions(world, eid, newDisplayWidth, newDisplayHeight);

			markDirty(world, eid);
			return widget;
		},

		kill(signal = 'SIGTERM'): TerminalWidget {
			const pty = ptyState.pty as { kill: (signal?: string) => void } | null;
			if (pty) {
				pty.kill(signal);
				ptyState.pty = null;
			}
			return widget;
		},

		isRunning(): boolean {
			return ptyState.pty !== null;
		},

		getPtyHandle(): unknown | null {
			return ptyState.pty;
		},

		// Events
		onData(callback: (data: string) => void): TerminalWidget {
			ptyState.onDataCallback = callback;
			return widget;
		},

		onExit(callback: (code: number, signal?: number) => void): TerminalWidget {
			ptyState.onExitCallback = callback;
			return widget;
		},

		// Visibility
		show(): TerminalWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TerminalWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Focus
		focus(): TerminalWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TerminalWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// State Access
		getDimensions(): { width: number; height: number } {
			const buffer = getTerminalBuffer(eid);
			return {
				width: buffer?.width ?? 0,
				height: buffer?.height ?? 0,
			};
		},

		getCursor(): { x: number; y: number } {
			const buffer = getTerminalBuffer(eid);
			return {
				x: buffer?.cursorX ?? 0,
				y: buffer?.cursorY ?? 0,
			};
		},

		getState() {
			return getTerminalState(eid);
		},

		getCells() {
			return getTerminalCells(eid);
		},

		// Lifecycle
		destroy(): void {
			// Kill PTY if running
			widget.kill();

			// Clean up
			Terminal.isTerminal[eid] = 0;
			Terminal.mouseEnabled[eid] = 0;
			Terminal.keysEnabled[eid] = 0;
			removeTerminalBuffer(eid);
			ptyStateMap.delete(eid);
			removeEntity(world, eid);
		},

		refresh(): TerminalWidget {
			markDirty(world, eid);
			return widget;
		},
	};

	// Mark dirty for initial render
	markDirty(world, eid);

	return widget;
}
