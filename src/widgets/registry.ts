/**
 * Widget Registry System
 *
 * Provides centralized widget registration and creation by name.
 * Useful for dynamic UI building from configuration, serialization,
 * and plugin systems.
 *
 * @module widgets/registry
 *
 * @example
 * ```typescript
 * import { createWidgetRegistry, registerBuiltinWidgets } from 'blecsd';
 *
 * const registry = createWidgetRegistry();
 * registerBuiltinWidgets(registry);
 *
 * // Create widget by name
 * const box = registry.create(world, 'box', { width: 20, height: 10 });
 *
 * // Check if widget type exists
 * if (registry.has('panel')) {
 *   const panel = registry.create(world, 'panel', { title: 'Hello' });
 * }
 * ```
 */

import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Widget factory function signature.
 * Takes a world, entity, and optional config, returns a widget interface.
 */
export type WidgetFactory<TConfig = unknown, TWidget = unknown> = (
	world: World,
	entity: Entity,
	config?: TConfig,
) => TWidget;

/**
 * Widget registration entry.
 */
export interface WidgetRegistration<TConfig = unknown, TWidget = unknown> {
	/** The widget factory function */
	readonly factory: WidgetFactory<TConfig, TWidget>;
	/** Optional description */
	readonly description?: string;
	/** Optional tags for categorization */
	readonly tags?: readonly string[];
}

/**
 * Widget registry interface.
 */
export interface WidgetRegistry {
	/**
	 * Registers a widget factory.
	 *
	 * @param name - Widget type name (case-insensitive)
	 * @param registration - Widget registration info
	 * @returns The registry for chaining
	 */
	register<TConfig, TWidget>(
		name: string,
		registration: WidgetRegistration<TConfig, TWidget>,
	): WidgetRegistry;

	/**
	 * Registers an alias for an existing widget type.
	 *
	 * @param alias - The alias name
	 * @param target - The target widget type name
	 * @returns The registry for chaining
	 */
	alias(alias: string, target: string): WidgetRegistry;

	/**
	 * Checks if a widget type is registered.
	 *
	 * @param name - Widget type name (case-insensitive)
	 */
	has(name: string): boolean;

	/**
	 * Gets a widget registration by name.
	 *
	 * @param name - Widget type name (case-insensitive)
	 */
	get(name: string): WidgetRegistration | undefined;

	/**
	 * Creates a widget by type name.
	 *
	 * @param world - The ECS world
	 * @param name - Widget type name (case-insensitive)
	 * @param config - Widget configuration
	 * @returns The created widget
	 * @throws Error if widget type is not registered
	 */
	create<TWidget = unknown>(world: World, name: string, config?: unknown): TWidget;

	/**
	 * Creates a widget with a specific entity.
	 *
	 * @param world - The ECS world
	 * @param entity - The entity ID to use
	 * @param name - Widget type name (case-insensitive)
	 * @param config - Widget configuration
	 * @returns The created widget
	 * @throws Error if widget type is not registered
	 */
	createWithEntity<TWidget = unknown>(
		world: World,
		entity: Entity,
		name: string,
		config?: unknown,
	): TWidget;

	/**
	 * Lists all registered widget type names.
	 */
	list(): readonly string[];

	/**
	 * Lists widget types by tag.
	 *
	 * @param tag - Tag to filter by
	 */
	listByTag(tag: string): readonly string[];

	/**
	 * Unregisters a widget type.
	 *
	 * @param name - Widget type name
	 * @returns True if the widget was unregistered
	 */
	unregister(name: string): boolean;

	/**
	 * Clears all registrations.
	 */
	clear(): void;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a new widget registry.
 *
 * @returns A new widget registry instance
 *
 * @example
 * ```typescript
 * import { createWidgetRegistry } from 'blecsd';
 *
 * const registry = createWidgetRegistry();
 *
 * // Register a custom widget
 * registry.register('myWidget', {
 *   factory: (world, eid, config) => createMyWidget(world, eid, config),
 *   description: 'My custom widget',
 *   tags: ['custom', 'ui'],
 * });
 * ```
 */
export function createWidgetRegistry(): WidgetRegistry {
	// Store registrations (case-insensitive keys)
	const registrations = new Map<string, WidgetRegistration>();
	// Store aliases (case-insensitive)
	const aliases = new Map<string, string>();

	/**
	 * Normalizes a widget name to lowercase.
	 */
	function normalize(name: string): string {
		return name.toLowerCase();
	}

	/**
	 * Resolves a name through aliases.
	 */
	function resolve(name: string): string {
		const normalized = normalize(name);
		return aliases.get(normalized) ?? normalized;
	}

	const registry: WidgetRegistry = {
		register<TConfig, TWidget>(
			name: string,
			registration: WidgetRegistration<TConfig, TWidget>,
		): WidgetRegistry {
			const normalized = normalize(name);
			registrations.set(normalized, registration as WidgetRegistration);
			return registry;
		},

		alias(alias: string, target: string): WidgetRegistry {
			const normalizedAlias = normalize(alias);
			const normalizedTarget = normalize(target);

			// Verify target exists
			if (!registrations.has(normalizedTarget) && !aliases.has(normalizedTarget)) {
				throw new Error(`Cannot create alias '${alias}' for non-existent widget type '${target}'`);
			}

			aliases.set(normalizedAlias, normalizedTarget);
			return registry;
		},

		has(name: string): boolean {
			const resolved = resolve(name);
			return registrations.has(resolved);
		},

		get(name: string): WidgetRegistration | undefined {
			const resolved = resolve(name);
			return registrations.get(resolved);
		},

		create<TWidget = unknown>(world: World, name: string, config?: unknown): TWidget {
			const { addEntity } = require('bitecs');
			const entity = addEntity(world);
			return registry.createWithEntity<TWidget>(world, entity, name, config);
		},

		createWithEntity<TWidget = unknown>(
			world: World,
			entity: Entity,
			name: string,
			config?: unknown,
		): TWidget {
			const registration = registry.get(name);
			if (!registration) {
				const available = registry.list().join(', ');
				throw new Error(`Unknown widget type '${name}'. Available types: ${available || 'none'}`);
			}

			return registration.factory(world, entity, config) as TWidget;
		},

		list(): readonly string[] {
			return Array.from(registrations.keys()).sort();
		},

		listByTag(tag: string): readonly string[] {
			const normalizedTag = tag.toLowerCase();
			return Array.from(registrations.entries())
				.filter(([, reg]) => reg.tags?.some((t) => t.toLowerCase() === normalizedTag))
				.map(([name]) => name)
				.sort();
		},

		unregister(name: string): boolean {
			const normalized = normalize(name);

			// Remove any aliases pointing to this widget
			for (const [alias, target] of aliases.entries()) {
				if (target === normalized) {
					aliases.delete(alias);
				}
			}

			return registrations.delete(normalized);
		},

		clear(): void {
			registrations.clear();
			aliases.clear();
		},
	};

	return registry;
}

// =============================================================================
// BUILTIN REGISTRATION
// =============================================================================

// Import widget factories
import { createBox } from './box';
import { createHoverTextManager } from './hoverText';
import { createLayout } from './layout';
import { createLine } from './line';
import { createList } from './list';
import { createListbar } from './listbar';
import { createListTable } from './listTable';
import { createLoading } from './loading';
import { createPanel } from './panel';
import { createScrollableBox } from './scrollableBox';
import { createScrollableText } from './scrollableText';
import { createTable } from './table';
import { createTabs } from './tabs';
import { createText } from './text';
import { createTree } from './tree';
import { createViewport3D } from './viewport3d';

/**
 * Builtin widget definitions.
 */
const BUILTIN_WIDGETS: ReadonlyArray<{
	name: string;
	factory: WidgetFactory;
	description: string;
	tags: readonly string[];
	aliases?: readonly string[];
}> = [
	{
		name: 'box',
		factory: createBox as WidgetFactory,
		description: 'Basic container widget with optional border and padding',
		tags: ['container', 'layout', 'basic'],
	},
	{
		name: 'text',
		factory: createText as WidgetFactory,
		description: 'Simple text display widget',
		tags: ['display', 'text', 'basic'],
	},
	{
		name: 'line',
		factory: createLine as WidgetFactory,
		description: 'Horizontal or vertical line separator',
		tags: ['display', 'decoration', 'basic'],
	},
	{
		name: 'layout',
		factory: createLayout as WidgetFactory,
		description: 'Auto-arranging container with flex/grid/inline modes',
		tags: ['container', 'layout'],
	},
	{
		name: 'panel',
		factory: createPanel as WidgetFactory,
		description: 'Container with title bar and optional close/collapse buttons',
		tags: ['container', 'layout', 'interactive'],
	},
	{
		name: 'tabs',
		factory: createTabs as WidgetFactory,
		description: 'Tabbed container with navigation',
		tags: ['container', 'layout', 'navigation', 'interactive'],
	},
	{
		name: 'scrollableBox',
		factory: createScrollableBox as WidgetFactory,
		description: 'Scrollable container with scrollbar support',
		tags: ['container', 'scrolling'],
		aliases: ['scrollbox', 'scroll'],
	},
	{
		name: 'scrollableText',
		factory: createScrollableText as WidgetFactory,
		description: 'Scrollable text display optimized for logs and documents',
		tags: ['display', 'text', 'scrolling'],
		aliases: ['log', 'textarea'],
	},
	{
		name: 'list',
		factory: createList as WidgetFactory,
		description: 'Selectable list of items',
		tags: ['selection', 'interactive', 'data'],
	},
	{
		name: 'listbar',
		factory: createListbar as WidgetFactory,
		description: 'Horizontal menu bar with selectable items',
		tags: ['navigation', 'interactive', 'menu'],
		aliases: ['menubar', 'menu'],
	},
	{
		name: 'table',
		factory: createTable as WidgetFactory,
		description: 'Data table with rows and columns',
		tags: ['display', 'data'],
	},
	{
		name: 'listTable',
		factory: createListTable as WidgetFactory,
		description: 'Selectable data table combining list and table features',
		tags: ['selection', 'interactive', 'data'],
		aliases: ['datatable', 'grid'],
	},
	{
		name: 'tree',
		factory: createTree as WidgetFactory,
		description: 'Hierarchical tree view with expandable nodes',
		tags: ['selection', 'interactive', 'data', 'hierarchy'],
		aliases: ['treeview'],
	},
	{
		name: 'loading',
		factory: createLoading as WidgetFactory,
		description: 'Loading indicator with spinner animation',
		tags: ['display', 'feedback', 'animation'],
		aliases: ['spinner', 'progress'],
	},
	{
		name: 'hoverText',
		factory: createHoverTextManager as WidgetFactory,
		description: 'Tooltip/hover text manager',
		tags: ['feedback', 'tooltip'],
		aliases: ['tooltip'],
	},
	{
		name: 'viewport3d',
		factory: createViewport3D as WidgetFactory,
		description: '3D rendering viewport with camera and mesh management',
		tags: ['display', '3d', 'rendering'],
		aliases: ['3d', 'viewport'],
	},
];

/**
 * Registers all builtin widgets with the registry.
 *
 * @param registry - The widget registry
 * @returns The registry for chaining
 *
 * @example
 * ```typescript
 * import { createWidgetRegistry, registerBuiltinWidgets } from 'blecsd';
 *
 * const registry = createWidgetRegistry();
 * registerBuiltinWidgets(registry);
 *
 * // Now all builtin widgets are available
 * const box = registry.create(world, 'box', { width: 20, height: 10 });
 * const panel = registry.create(world, 'panel', { title: 'Hello' });
 *
 * // Aliases work too
 * const log = registry.create(world, 'log', { content: 'Log text...' });
 * ```
 */
export function registerBuiltinWidgets(registry: WidgetRegistry): WidgetRegistry {
	for (const widget of BUILTIN_WIDGETS) {
		registry.register(widget.name, {
			factory: widget.factory,
			description: widget.description,
			tags: widget.tags,
		});

		// Register aliases
		if (widget.aliases) {
			for (const alias of widget.aliases) {
				registry.alias(alias, widget.name);
			}
		}
	}

	return registry;
}

/**
 * Default global widget registry with builtin widgets pre-registered.
 *
 * @example
 * ```typescript
 * import { defaultRegistry } from 'blecsd';
 *
 * // Use the default registry directly
 * const box = defaultRegistry.create(world, 'box', { width: 20 });
 * ```
 */
export const defaultRegistry: WidgetRegistry = registerBuiltinWidgets(createWidgetRegistry());

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets all available widget type names from the default registry.
 *
 * @returns Array of widget type names
 *
 * @example
 * ```typescript
 * import { getWidgetTypes } from 'blecsd';
 *
 * console.log(getWidgetTypes());
 * // ['box', 'layout', 'line', 'list', ...]
 * ```
 */
export function getWidgetTypes(): readonly string[] {
	return defaultRegistry.list();
}

/**
 * Checks if a widget type exists in the default registry.
 *
 * @param name - Widget type name (case-insensitive)
 *
 * @example
 * ```typescript
 * import { isWidgetType } from 'blecsd';
 *
 * isWidgetType('box');    // true
 * isWidgetType('Box');    // true (case-insensitive)
 * isWidgetType('custom'); // false
 * ```
 */
export function isWidgetType(name: string): boolean {
	return defaultRegistry.has(name);
}

/**
 * Gets widget types by tag from the default registry.
 *
 * @param tag - Tag to filter by
 * @returns Array of widget type names with that tag
 *
 * @example
 * ```typescript
 * import { getWidgetsByTag } from 'blecsd';
 *
 * getWidgetsByTag('container');
 * // ['box', 'layout', 'panel', 'tabs', 'scrollableBox']
 *
 * getWidgetsByTag('interactive');
 * // ['list', 'listbar', 'listTable', 'panel', 'tabs', 'tree']
 * ```
 */
export function getWidgetsByTag(tag: string): readonly string[] {
	return defaultRegistry.listByTag(tag);
}
