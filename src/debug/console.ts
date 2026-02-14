/**
 * Debug console with F12 toggle and logging capabilities.
 *
 * Provides a unified interface for debug mode with:
 * - F12 key toggle for debug overlay
 * - Log messages with levels (info, warn, error, debug)
 * - Entity inspection
 * - Performance monitoring
 *
 * @module debug/console
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { hide as hideEntity, setStyle, show as showEntity } from '../components/renderable';
import { addEntity, entityExists, removeEntity } from '../core/ecs';
import { setEntityData } from '../core/entityData';
import type { GameLoop } from '../core/gameLoop';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { createDebugOverlay, type DebugOverlay } from './overlay';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Log level for debug messages.
 */
export type ConsoleLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug console configuration.
 *
 * @example
 * ```typescript
 * const console = createDebugConsole(world, {
 *   enabled: true,
 *   toggleKey: 'F12',
 *   showOverlay: true,
 *   maxLogEntries: 100,
 * });
 * ```
 */
export interface DebugConsoleConfig {
	/**
	 * Enable debug mode
	 * @default false
	 */
	readonly enabled?: boolean;

	/**
	 * Key to toggle debug console
	 * @default 'F12'
	 */
	readonly toggleKey?: string;

	/**
	 * Show performance overlay
	 * @default true
	 */
	readonly showOverlay?: boolean;

	/**
	 * Show log panel
	 * @default true
	 */
	readonly showLogs?: boolean;

	/**
	 * Maximum number of log entries to keep
	 * @default 100
	 */
	readonly maxLogEntries?: number;

	/**
	 * Position for debug console
	 * @default { x: 0, y: 0 }
	 */
	readonly position?: { x: number; y: number };

	/**
	 * Dimensions for debug console
	 * @default { width: 80, height: 20 }
	 */
	readonly dimensions?: { width: number; height: number };

	/**
	 * Theme colors
	 */
	readonly theme?: {
		readonly bg?: string | number;
		readonly fg?: string | number;
		readonly infoBg?: string | number;
		readonly warnBg?: string | number;
		readonly errorBg?: string | number;
	};
}

/**
 * Log entry in the debug console.
 */
export interface LogEntry {
	readonly timestamp: number;
	readonly level: ConsoleLogLevel;
	readonly message: string;
}

/**
 * Resolved debug console configuration with all required fields.
 * @internal
 */
interface ResolvedDebugConsoleConfig {
	readonly enabled: boolean;
	readonly toggleKey: string;
	readonly showOverlay: boolean;
	readonly showLogs: boolean;
	readonly maxLogEntries: number;
	readonly position: { x: number; y: number };
	readonly dimensions: { width: number; height: number };
	readonly theme: {
		readonly bg: string | number;
		readonly fg: string | number;
		readonly infoBg: string | number;
		readonly warnBg: string | number;
		readonly errorBg: string | number;
	};
}

/**
 * Debug console instance.
 */
export interface DebugConsole {
	/** Whether console is enabled */
	readonly enabled: boolean;
	/** Whether console is visible */
	readonly visible: boolean;
	/** Log entries */
	readonly logs: readonly LogEntry[];
	/** Configuration */
	readonly config: ResolvedDebugConsoleConfig;

	/** Show the console */
	show(): void;
	/** Hide the console */
	hide(): void;
	/** Toggle visibility */
	toggle(): void;
	/** Log a message */
	log(message: string, level?: ConsoleLogLevel): void;
	/** Update console display */
	update(world: World, loop?: GameLoop): void;
	/** Clear all logs */
	clearLogs(): void;
	/** Destroy the console */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const DebugConsoleConfigSchema = z.object({
	enabled: z.boolean().optional().default(false),
	toggleKey: z.string().optional().default('F12'),
	showOverlay: z.boolean().optional().default(true),
	showLogs: z.boolean().optional().default(true),
	maxLogEntries: z.number().int().positive().optional().default(100),
	position: z.object({ x: z.number(), y: z.number() }).optional(),
	dimensions: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
	theme: z
		.object({
			bg: z.union([z.string(), z.number()]).optional(),
			fg: z.union([z.string(), z.number()]).optional(),
			infoBg: z.union([z.string(), z.number()]).optional(),
			warnBg: z.union([z.string(), z.number()]).optional(),
			errorBg: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: ResolvedDebugConsoleConfig = {
	enabled: false,
	toggleKey: 'F12',
	showOverlay: true,
	showLogs: true,
	maxLogEntries: 100,
	position: { x: 0, y: 0 },
	dimensions: { width: 80, height: 20 },
	theme: {
		bg: 0x000000dd, // Semi-transparent black
		fg: 0xffffffff, // White
		infoBg: 0x0000ffff, // Blue
		warnBg: 0xffff00ff, // Yellow
		errorBg: 0xff0000ff, // Red
	},
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Creates a debug console with F12 toggle and logging capabilities.
 *
 * @param world - The ECS world
 * @param config - Console configuration
 * @returns Debug console instance
 *
 * @example
 * ```typescript
 * import { createDebugConsole } from 'blecsd/debug';
 *
 * const debugConsole = createDebugConsole(world, {
 *   enabled: true,
 *   toggleKey: 'F12',
 * });
 *
 * // Log messages
 * debugConsole.log('Hello from debug!', 'info');
 * debugConsole.log('Warning message', 'warn');
 * debugConsole.log('Error occurred', 'error');
 *
 * // In game loop
 * game.onUpdate(() => {
 *   debugConsole.update(world, loop);
 * });
 *
 * // Wire up F12 key
 * game.onKey('F12', () => debugConsole.toggle());
 * ```
 */
export function createDebugConsole(world: World, config: DebugConsoleConfig = {}): DebugConsole {
	const validated: ResolvedDebugConsoleConfig = {
		...DEFAULT_CONFIG,
		...config,
		position: config.position ?? DEFAULT_CONFIG.position,
		dimensions: config.dimensions ?? DEFAULT_CONFIG.dimensions,
		theme: {
			...DEFAULT_CONFIG.theme,
			...(config.theme ?? {}),
		},
	};

	// Validate with Zod
	DebugConsoleConfigSchema.parse(config);

	if (!validated.enabled) {
		// Return no-op console if disabled
		return createNoOpConsole(validated);
	}

	const logs: LogEntry[] = [];
	let visible = false;
	let consoleEntity: Entity | null = null;
	let logPanelEntity: Entity | null = null;
	let overlay: DebugOverlay | null = null;

	// Create overlay if enabled
	if (validated.showOverlay) {
		overlay = createDebugOverlay(world, {
			x: validated.position.x,
			y: validated.position.y,
			width: Math.floor(validated.dimensions.width / 2),
			toggleKey: validated.toggleKey,
			visibleOnStart: false,
		});
	}

	/**
	 * Creates the console entity.
	 */
	function createConsoleEntity(): Entity {
		const eid = addEntity(world);

		const x = validated.showOverlay
			? validated.position.x + Math.floor(validated.dimensions.width / 2) + 1
			: validated.position.x;

		setPosition(world, eid, x, validated.position.y, 9999); // Very high z-index
		setDimensions(
			world,
			eid,
			Math.floor(validated.dimensions.width / 2),
			validated.dimensions.height,
		);
		setStyle(world, eid, {
			fg: parseColor(validated.theme.fg),
			bg: parseColor(validated.theme.bg),
		});
		hideEntity(world, eid);
		setEntityData(world, eid, 'name', '__debug_console__');

		return eid;
	}

	/**
	 * Creates the log panel entity.
	 */
	function createLogPanelEntity(): Entity {
		const eid = addEntity(world);

		setPosition(world, eid, 0, 0, 0);
		setDimensions(
			world,
			eid,
			Math.floor(validated.dimensions.width / 2),
			validated.dimensions.height,
		);
		setStyle(world, eid, {
			fg: parseColor(validated.theme.fg),
			bg: 0x00000000, // Transparent
		});
		setContent(world, eid, 'Debug Console\n─────────────');
		setEntityData(world, eid, 'name', '__debug_log_panel__');

		return eid;
	}

	/**
	 * Updates log panel content.
	 */
	function updateLogPanel(): void {
		if (!logPanelEntity || !entityExists(world, logPanelEntity)) return;

		const maxLines = validated.dimensions.height - 2; // Reserve 2 lines for header
		const recentLogs = logs.slice(-maxLines);

		const lines = ['Debug Console', '─────────────'];
		for (const entry of recentLogs) {
			const time = new Date(entry.timestamp).toLocaleTimeString();
			const levelIcon = getLevelIcon(entry.level);
			lines.push(`${time} ${levelIcon} ${entry.message}`);
		}

		setContent(world, logPanelEntity, lines.join('\n'));
	}

	/**
	 * Gets icon for log level.
	 */
	function getLevelIcon(level: ConsoleLogLevel): string {
		switch (level) {
			case 'debug':
				return '[D]';
			case 'info':
				return '[I]';
			case 'warn':
				return '[W]';
			case 'error':
				return '[E]';
		}
	}

	/**
	 * Shows the console.
	 */
	function show(): void {
		if (visible) return;
		visible = true;

		if (overlay) {
			overlay.show();
		}

		if (validated.showLogs) {
			if (!consoleEntity || !entityExists(world, consoleEntity)) {
				consoleEntity = createConsoleEntity();
				logPanelEntity = createLogPanelEntity();
				appendChild(world, consoleEntity, logPanelEntity);
			}
			if (consoleEntity && entityExists(world, consoleEntity)) {
				showEntity(world, consoleEntity);
			}
			updateLogPanel();
		}
	}

	/**
	 * Hides the console.
	 */
	function hide(): void {
		if (!visible) return;
		visible = false;

		if (overlay) {
			overlay.hide();
		}

		if (consoleEntity && entityExists(world, consoleEntity)) {
			hideEntity(world, consoleEntity);
		}
	}

	/**
	 * Toggles console visibility.
	 */
	function toggle(): void {
		if (visible) {
			hide();
		} else {
			show();
		}
	}

	/**
	 * Logs a message.
	 */
	function log(message: string, level: ConsoleLogLevel = 'info'): void {
		const entry: LogEntry = {
			timestamp: Date.now(),
			level,
			message,
		};

		logs.push(entry);

		// Trim logs if exceeding max
		while (logs.length > validated.maxLogEntries) {
			logs.shift();
		}

		// Also log to console
		switch (level) {
			case 'debug':
				console.debug(`[DEBUG] ${message}`);
				break;
			case 'info':
				console.info(`[INFO] ${message}`);
				break;
			case 'warn':
				console.warn(`[WARN] ${message}`);
				break;
			case 'error':
				console.error(`[ERROR] ${message}`);
				break;
		}

		if (visible && validated.showLogs) {
			updateLogPanel();
		}
	}

	/**
	 * Updates the console.
	 */
	function update(world: World, loop?: GameLoop): void {
		if (!visible) return;

		if (overlay) {
			overlay.update(world, loop);
		}

		if (validated.showLogs && logPanelEntity && entityExists(world, logPanelEntity)) {
			updateLogPanel();
		}
	}

	/**
	 * Clears all logs.
	 */
	function clearLogs(): void {
		logs.length = 0;
		if (visible && validated.showLogs) {
			updateLogPanel();
		}
	}

	/**
	 * Destroys the console.
	 */
	function destroy(): void {
		if (overlay) {
			overlay.destroy();
		}

		if (logPanelEntity && entityExists(world, logPanelEntity)) {
			removeEntity(world, logPanelEntity);
		}

		if (consoleEntity && entityExists(world, consoleEntity)) {
			removeEntity(world, consoleEntity);
		}

		logs.length = 0;
	}

	return {
		get enabled() {
			return validated.enabled;
		},
		get visible() {
			return visible;
		},
		get logs() {
			return logs;
		},
		get config() {
			return validated;
		},
		show,
		hide,
		toggle,
		log,
		update,
		clearLogs,
		destroy,
	};
}

/**
 * Creates a no-op debug console (when disabled).
 */
function createNoOpConsole(config: ResolvedDebugConsoleConfig): DebugConsole {
	return {
		enabled: false,
		visible: false,
		logs: [],
		config,
		show: () => {},
		hide: () => {},
		toggle: () => {},
		log: () => {},
		update: () => {},
		clearLogs: () => {},
		destroy: () => {},
	};
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Logs a debug message to the debug console.
 *
 * @param world - The ECS world
 * @param message - Message to log
 * @param level - Log level
 *
 * @example
 * ```typescript
 * import { debugLog } from 'blecsd/debug';
 *
 * debugLog(world, 'System initialized', 'info');
 * debugLog(world, 'Performance warning', 'warn');
 * debugLog(world, 'Critical error', 'error');
 * ```
 */
export function debugLog(_world: World, message: string, level: ConsoleLogLevel = 'info'): void {
	// Log to console for now - can be connected to DebugConsole instance via world data
	switch (level) {
		case 'debug':
			console.debug(`[DEBUG] ${message}`);
			break;
		case 'info':
			console.info(`[INFO] ${message}`);
			break;
		case 'warn':
			console.warn(`[WARN] ${message}`);
			break;
		case 'error':
			console.error(`[ERROR] ${message}`);
			break;
	}
}
