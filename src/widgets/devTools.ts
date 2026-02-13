/**
 * DevTools Widget
 *
 * Runtime inspection and debugging tool for ECS entities, components, and systems.
 * Provides Entity Inspector, Component Viewer, System Monitor, and Event Log panels.
 *
 * @module widgets/devTools
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { blur, focus, setFocusable } from '../components/focusable';
import { appendChild } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, entityExists, getAllEntities, removeEntity } from '../core/ecs';
import type { Scheduler } from '../core/scheduler';
import type { Entity, World } from '../core/types';
import { LoopPhase } from '../core/types';
import { parseColor } from '../utils/color';
import { createTabs, type TabsWidget } from './tabs';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DevTools component marker for identifying devtools entities.
 */
export const DevTools = {
	/** Tag indicating this is a devtools widget (1 = yes) */
	isDevTools: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * DevTools position preset.
 */
export type DevToolsPosition = 'bottom' | 'right' | 'floating';

/**
 * Initial tab to display.
 */
export type DevToolsTab = 'entities' | 'components' | 'systems' | 'events';

/**
 * DevTools theme configuration.
 */
export interface DevToolsTheme {
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Border color */
	readonly borderFg?: string | number;
	/** Border background color */
	readonly borderBg?: string | number;
	/** Tab active foreground */
	readonly tabActiveFg?: string | number;
	/** Tab active background */
	readonly tabActiveBg?: string | number;
	/** Tab inactive foreground */
	readonly tabInactiveFg?: string | number;
	/** Tab inactive background */
	readonly tabInactiveBg?: string | number;
}

/**
 * DevTools widget configuration.
 *
 * @example
 * ```typescript
 * const devTools = createDevTools(world, eid, {
 *   position: 'bottom',
 *   initialTab: 'entities',
 *   theme: {
 *     fg: '#00ff00',
 *     bg: '#000000'
 *   }
 * });
 *
 * // Toggle with F12 (handled by keyboard input system)
 * devTools.toggle();
 * ```
 */
export interface DevToolsConfig {
	/**
	 * Position preset
	 * @default 'bottom'
	 */
	readonly position?: DevToolsPosition;

	/**
	 * Initial tab to display
	 * @default 'entities'
	 */
	readonly initialTab?: DevToolsTab;

	/**
	 * Theme configuration
	 * @default undefined
	 */
	readonly theme?: DevToolsTheme;

	/**
	 * Left position (overrides position preset)
	 * @default undefined
	 */
	readonly left?: number;

	/**
	 * Top position (overrides position preset)
	 * @default undefined
	 */
	readonly top?: number;

	/**
	 * Width (overrides position preset)
	 * @default undefined
	 */
	readonly width?: number;

	/**
	 * Height (overrides position preset)
	 * @default undefined
	 */
	readonly height?: number;

	/**
	 * Scheduler instance for system monitoring
	 * @default undefined
	 */
	readonly scheduler?: Scheduler;
}

/**
 * Component information for DevTools display.
 */
export interface DevToolsComponentInfo {
	readonly name: string;
	readonly hasData: boolean;
}

/**
 * Entity information for display.
 */
export interface EntityInfo {
	readonly eid: Entity;
	readonly components: readonly DevToolsComponentInfo[];
}

/**
 * System information for display.
 */
export interface SystemInfo {
	readonly phase: LoopPhase;
	readonly systemCount: number;
	readonly frameTime?: number;
}

/**
 * Event log entry.
 */
export interface EventLogEntry {
	readonly timestamp: number;
	readonly type: string;
	readonly data: unknown;
}

/**
 * DevTools widget interface providing chainable methods.
 */
export interface DevToolsWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility and toggle
	/** Shows the devtools */
	show(): DevToolsWidget;
	/** Hides the devtools */
	hide(): DevToolsWidget;
	/** Toggles visibility */
	toggle(): DevToolsWidget;
	/** Checks if devtools is visible */
	isVisible(): boolean;

	// Focus
	/** Focuses the devtools */
	focus(): DevToolsWidget;
	/** Blurs the devtools */
	blur(): DevToolsWidget;

	// Tab management
	/** Sets the active tab */
	setTab(tab: DevToolsTab): DevToolsWidget;
	/** Gets the active tab */
	getTab(): DevToolsTab;

	// Data inspection
	/** Refreshes entity data */
	refreshEntities(): DevToolsWidget;
	/** Gets all entities with their components */
	getEntities(): readonly EntityInfo[];
	/** Gets entity by ID */
	getEntity(eid: Entity): EntityInfo | undefined;

	// System monitoring
	/** Gets system information */
	getSystems(): readonly SystemInfo[];
	/** Refreshes system stats */
	refreshSystems(): DevToolsWidget;

	// Event logging
	/** Logs an event */
	logEvent(type: string, data: unknown): DevToolsWidget;
	/** Gets event log */
	getEventLog(): readonly EventLogEntry[];
	/** Clears event log */
	clearEventLog(): DevToolsWidget;

	// Search/filter
	/** Filters entities by component name */
	filterByComponent(componentName: string): DevToolsWidget;
	/** Clears entity filter */
	clearFilter(): DevToolsWidget;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const DevToolsConfigSchema = z.object({
	position: z.enum(['bottom', 'right', 'floating']).optional().default('bottom'),
	initialTab: z
		.enum(['entities', 'components', 'systems', 'events'])
		.optional()
		.default('entities'),
	theme: z
		.object({
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
			borderFg: z.union([z.string(), z.number()]).optional(),
			borderBg: z.union([z.string(), z.number()]).optional(),
			tabActiveFg: z.union([z.string(), z.number()]).optional(),
			tabActiveBg: z.union([z.string(), z.number()]).optional(),
			tabInactiveFg: z.union([z.string(), z.number()]).optional(),
			tabInactiveBg: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
	left: z.number().optional(),
	top: z.number().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	scheduler: z.any().optional(),
});

type ValidatedDevToolsConfig = z.infer<typeof DevToolsConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface DevToolsState {
	world: World;
	tabsWidget: TabsWidget;
	currentTab: DevToolsTab;
	visible: boolean;
	entities: EntityInfo[];
	systems: SystemInfo[];
	eventLog: EventLogEntry[];
	filter: string | null;
	scheduler: Scheduler | null;
}

const devToolsStateMap = new Map<Entity, DevToolsState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates position and dimensions based on preset.
 */
function calculateLayout(
	position: DevToolsPosition,
	overrides: {
		left?: number;
		top?: number;
		width?: number;
		height?: number;
	},
): { left: number; top: number; width: number; height: number } {
	// Default terminal size assumptions
	const terminalWidth = 80;
	const terminalHeight = 24;

	let layout = { left: 0, top: 0, width: terminalWidth, height: terminalHeight / 3 };

	switch (position) {
		case 'bottom':
			layout = {
				left: 0,
				top: Math.floor((terminalHeight * 2) / 3),
				width: terminalWidth,
				height: Math.floor(terminalHeight / 3),
			};
			break;
		case 'right':
			layout = {
				left: Math.floor((terminalWidth * 2) / 3),
				top: 0,
				width: Math.floor(terminalWidth / 3),
				height: terminalHeight,
			};
			break;
		case 'floating':
			layout = {
				left: Math.floor(terminalWidth / 4),
				top: Math.floor(terminalHeight / 4),
				width: Math.floor(terminalWidth / 2),
				height: Math.floor(terminalHeight / 2),
			};
			break;
	}

	return {
		left: overrides.left ?? layout.left,
		top: overrides.top ?? layout.top,
		width: overrides.width ?? layout.width,
		height: overrides.height ?? layout.height,
	};
}

/**
 * Collects entity information from the world.
 */
function collectEntityInfo(world: World, filter: string | null): EntityInfo[] {
	const entities = getAllEntities(world);
	const result: EntityInfo[] = [];

	for (const eid of entities) {
		if (!entityExists(world, eid)) continue;

		// Basic component detection - check well-known components
		const components: DevToolsComponentInfo[] = [];

		// Note: In a full implementation, we would need a component registry
		// to enumerate all possible components. For now, we'll check known ones.
		// This is a simplified version.

		const entityInfo: EntityInfo = {
			eid,
			components,
		};

		// Apply filter if set
		if (filter) {
			const hasMatchingComponent = components.some((c) =>
				c.name.toLowerCase().includes(filter.toLowerCase()),
			);
			if (!hasMatchingComponent) continue;
		}

		result.push(entityInfo);
	}

	return result;
}

/**
 * Collects system information from scheduler.
 */
function collectSystemInfo(scheduler: Scheduler | null): SystemInfo[] {
	if (!scheduler) {
		return [];
	}

	const phases = [
		LoopPhase.INPUT,
		LoopPhase.EARLY_UPDATE,
		LoopPhase.UPDATE,
		LoopPhase.LATE_UPDATE,
		LoopPhase.ANIMATION,
		LoopPhase.LAYOUT,
		LoopPhase.RENDER,
		LoopPhase.POST_RENDER,
	];

	const telemetry = scheduler.getTelemetry();

	return phases.map((phase) => {
		const systemCount = scheduler.getSystemCount(phase);
		const phaseTiming = telemetry?.phases.find((p) => p.phase === phase);

		const info: SystemInfo = {
			phase,
			systemCount,
		};

		if (phaseTiming?.duration !== undefined) {
			(info as { frameTime: number }).frameTime = phaseTiming.duration;
		}

		return info;
	});
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a DevTools widget for runtime debugging and inspection.
 *
 * The devtools widget provides tabbed panels for inspecting entities,
 * components, systems, and event logs. Typically toggled with F12.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The DevTools widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createDevTools } from 'blecsd/widgets';
 * import { createScheduler } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 * const scheduler = createScheduler();
 *
 * // Create devtools at bottom of screen
 * const devTools = createDevTools(world, eid, {
 *   position: 'bottom',
 *   initialTab: 'entities',
 *   scheduler,
 *   theme: {
 *     fg: '#00ff00',
 *     bg: '#000000'
 *   }
 * });
 *
 * // Toggle visibility
 * devTools.toggle();
 *
 * // Inspect entities
 * const entities = devTools.getEntities();
 * console.log(`Found ${entities.length} entities`);
 *
 * // Filter by component
 * devTools.filterByComponent('Position');
 *
 * // Log events
 * devTools.logEvent('player_moved', { x: 10, y: 20 });
 * ```
 */
/**
 * Builds layout overrides from validated config.
 * @internal
 */
function buildLayoutOverrides(validated: ValidatedDevToolsConfig): {
	left?: number;
	top?: number;
	width?: number;
	height?: number;
} {
	const overrides: {
		left?: number;
		top?: number;
		width?: number;
		height?: number;
	} = {};
	if (validated.left !== undefined) overrides.left = validated.left;
	if (validated.top !== undefined) overrides.top = validated.top;
	if (validated.width !== undefined) overrides.width = validated.width;
	if (validated.height !== undefined) overrides.height = validated.height;
	return overrides;
}

/**
 * Applies theme styling to the devtools entity.
 * @internal
 */
function applyDevToolsTheme(
	world: World,
	eid: Entity,
	theme: ValidatedDevToolsConfig['theme'],
): void {
	if (!theme) {
		return;
	}

	const fgColor = theme.fg ? parseColor(theme.fg) : undefined;
	const bgColor = theme.bg ? parseColor(theme.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}
}

/**
 * Builds tab style from theme configuration.
 * @internal
 */
function buildTabStyle(theme: ValidatedDevToolsConfig['theme']):
	| {
			tab?: {
				activeFg?: string | number;
				activeBg?: string | number;
				inactiveFg?: string | number;
				inactiveBg?: string | number;
			};
			border?: {
				fg?: string | number;
				bg?: string | number;
			};
	  }
	| undefined {
	if (!theme) {
		return undefined;
	}

	const tabsStyle: {
		tab?: {
			activeFg?: string | number;
			activeBg?: string | number;
			inactiveFg?: string | number;
			inactiveBg?: string | number;
		};
		border?: {
			fg?: string | number;
			bg?: string | number;
		};
	} = {};

	if (
		theme.tabActiveFg !== undefined ||
		theme.tabActiveBg !== undefined ||
		theme.tabInactiveFg !== undefined ||
		theme.tabInactiveBg !== undefined
	) {
		tabsStyle.tab = {
			...(theme.tabActiveFg !== undefined && { activeFg: theme.tabActiveFg }),
			...(theme.tabActiveBg !== undefined && { activeBg: theme.tabActiveBg }),
			...(theme.tabInactiveFg !== undefined && { inactiveFg: theme.tabInactiveFg }),
			...(theme.tabInactiveBg !== undefined && { inactiveBg: theme.tabInactiveBg }),
		};
	}

	if (theme.borderFg !== undefined || theme.borderBg !== undefined) {
		tabsStyle.border = {
			...(theme.borderFg !== undefined && { fg: theme.borderFg }),
			...(theme.borderBg !== undefined && { bg: theme.borderBg }),
		};
	}

	return tabsStyle;
}

export function createDevTools(
	world: World,
	entity: Entity,
	config: DevToolsConfig = {},
): DevToolsWidget {
	const validated = DevToolsConfigSchema.parse(config) as ValidatedDevToolsConfig;
	const eid = entity;

	// Mark as devtools
	DevTools.isDevTools[eid] = 1;

	// Calculate layout
	const overrides = buildLayoutOverrides(validated);
	const layout = calculateLayout(validated.position, overrides);

	// Position and dimensions
	setPosition(world, eid, layout.left, layout.top);
	setDimensions(world, eid, layout.width, layout.height);

	// Set up focusable
	setFocusable(world, eid, { focusable: true });

	// Set up style
	applyDevToolsTheme(world, eid, validated.theme);

	// Create tabs widget for panels
	const tabsEid = addEntity(world);
	appendChild(world, eid, tabsEid);

	// Build style configuration if theme is provided
	const tabsStyle = buildTabStyle(validated.theme);

	const tabsConfig: {
		left: number;
		top: number;
		width: number;
		height: number;
		tabs: { label: string; content: number }[];
		activeTab: number;
		style?: {
			tab?: {
				activeFg?: string | number;
				activeBg?: string | number;
				inactiveFg?: string | number;
				inactiveBg?: string | number;
			};
			border?: {
				fg?: string | number;
				bg?: string | number;
			};
		};
	} = {
		left: 0,
		top: 0,
		width: layout.width,
		height: layout.height,
		tabs: [
			{ label: 'Entities', content: addEntity(world) },
			{ label: 'Components', content: addEntity(world) },
			{ label: 'Systems', content: addEntity(world) },
			{ label: 'Events', content: addEntity(world) },
		],
		activeTab: ['entities', 'components', 'systems', 'events'].indexOf(validated.initialTab),
	};

	if (tabsStyle) {
		tabsConfig.style = tabsStyle;
	}

	const tabsWidget = createTabs(world, tabsEid, tabsConfig);

	// Initialize state
	const state: DevToolsState = {
		world,
		tabsWidget,
		currentTab: validated.initialTab,
		visible: false,
		entities: [],
		systems: [],
		eventLog: [],
		filter: null,
		scheduler: validated.scheduler ?? null,
	};

	// Initial data collection
	state.entities = collectEntityInfo(world, null);
	state.systems = collectSystemInfo(state.scheduler);

	devToolsStateMap.set(eid, state);

	// Start hidden
	setVisible(world, eid, false);

	// Create the widget object with chainable methods
	const widget: DevToolsWidget = {
		eid,

		// Visibility and toggle
		show(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.visible = true;
				setVisible(world, eid, true);
				markDirty(world, eid);
			}
			return widget;
		},

		hide(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.visible = false;
				setVisible(world, eid, false);
				markDirty(world, eid);
			}
			return widget;
		},

		toggle(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				if (currentState.visible) {
					widget.hide();
				} else {
					widget.show();
				}
			}
			return widget;
		},

		isVisible(): boolean {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.visible ?? false;
		},

		// Focus
		focus(): DevToolsWidget {
			focus(world, eid);
			return widget;
		},

		blur(): DevToolsWidget {
			blur(world, eid);
			return widget;
		},

		// Tab management
		setTab(tab: DevToolsTab): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.currentTab = tab;
				const tabIndex = ['entities', 'components', 'systems', 'events'].indexOf(tab);
				currentState.tabsWidget.setActiveTab(tabIndex);
				markDirty(world, eid);
			}
			return widget;
		},

		getTab(): DevToolsTab {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.currentTab ?? 'entities';
		},

		// Data inspection
		refreshEntities(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.entities = collectEntityInfo(currentState.world, currentState.filter);
				markDirty(world, eid);
			}
			return widget;
		},

		getEntities(): readonly EntityInfo[] {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.entities ?? [];
		},

		getEntity(entityId: Entity): EntityInfo | undefined {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.entities.find((e) => e.eid === entityId);
		},

		// System monitoring
		getSystems(): readonly SystemInfo[] {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.systems ?? [];
		},

		refreshSystems(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.systems = collectSystemInfo(currentState.scheduler);
				markDirty(world, eid);
			}
			return widget;
		},

		// Event logging
		logEvent(type: string, data: unknown): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.eventLog.push({
					timestamp: Date.now(),
					type,
					data,
				});
				// Keep only last 100 events
				if (currentState.eventLog.length > 100) {
					currentState.eventLog = currentState.eventLog.slice(-100);
				}
				markDirty(world, eid);
			}
			return widget;
		},

		getEventLog(): readonly EventLogEntry[] {
			const currentState = devToolsStateMap.get(eid);
			return currentState?.eventLog ?? [];
		},

		clearEventLog(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.eventLog = [];
				markDirty(world, eid);
			}
			return widget;
		},

		// Search/filter
		filterByComponent(componentName: string): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.filter = componentName;
				currentState.entities = collectEntityInfo(currentState.world, componentName);
				markDirty(world, eid);
			}
			return widget;
		},

		clearFilter(): DevToolsWidget {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.filter = null;
				currentState.entities = collectEntityInfo(currentState.world, null);
				markDirty(world, eid);
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			const currentState = devToolsStateMap.get(eid);
			if (currentState) {
				currentState.tabsWidget.destroy();
			}
			devToolsStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Type guard to check if an entity is a devtools widget.
 */
export function isDevTools(_world: World, eid: Entity): boolean {
	return DevTools.isDevTools[eid] === 1;
}

/**
 * Resets the devtools store (for testing).
 * @internal
 */
export function resetDevToolsStore(): void {
	devToolsStateMap.clear();
}
