/**
 * Plugin/Module System
 *
 * Provides a plugin interface for extending blECSd with reusable modules
 * that bundle components, systems, and lifecycle hooks. Plugins declare
 * which scheduler phase their systems belong to, enabling modular
 * composition of functionality.
 *
 * @module core/plugins
 *
 * @example
 * ```typescript
 * import { createPluginRegistry, registerPlugin, LoopPhase } from 'blecsd';
 *
 * const registry = createPluginRegistry();
 * const plugin = {
 *   name: 'physics',
 *   version: '1.0.0',
 *   systems: [
 *     { system: gravitySystem, phase: LoopPhase.ANIMATION, priority: 0 },
 *   ],
 * };
 *
 * registerPlugin(registry, scheduler, world, plugin);
 * ```
 */

import { z } from 'zod';
import type { Scheduler } from './scheduler';
import type { System, World } from './types';
import { LoopPhase } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A component definition that a plugin provides.
 * Stores metadata about the component for registration tracking.
 */
export interface PluginComponent {
	/** Unique name identifying this component */
	readonly name: string;
	/** The actual component store (SoA typed arrays or marker) */
	readonly store: unknown;
}

/**
 * A system definition that a plugin provides,
 * including which scheduler phase it should run in.
 */
export interface PluginSystem {
	/** The system function */
	readonly system: System;
	/** The scheduler phase this system should be registered in */
	readonly phase: LoopPhase;
	/** Priority within the phase (lower = earlier, default: 0) */
	readonly priority?: number;
}

/**
 * A widget declaration that a plugin provides.
 * Used to register widgets when the plugin is installed.
 */
export interface PluginWidgetDeclaration {
	/** Widget type name (e.g., 'bar-chart', 'pie-chart') */
	readonly name: string;
	/** Human-readable description */
	readonly description?: string;
	/** Factory function for creating the widget entity */
	readonly factory: (world: World, config: Record<string, unknown>) => number;
	/** Tags for categorization */
	readonly tags?: readonly string[];
}

/**
 * A theme declaration that a plugin provides.
 * Used to register themes when the plugin is installed.
 */
export interface PluginThemeDeclaration {
	/** Theme name */
	readonly name: string;
	/** Theme data object */
	readonly theme: Record<string, unknown>;
}

/**
 * Plugin interface for extending blECSd with reusable functionality.
 *
 * Plugins bundle components, systems, and lifecycle hooks into a
 * single installable unit. They declare dependencies and can
 * initialize/cleanup world state.
 *
 * @example
 * ```typescript
 * import type { Plugin } from 'blecsd';
 * import { LoopPhase } from 'blecsd';
 *
 * const myPlugin: Plugin = {
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   dependencies: ['core-renderer'],
 *   components: [
 *     { name: 'MyComponent', store: MyComponentStore },
 *   ],
 *   systems: [
 *     { system: myUpdateSystem, phase: LoopPhase.UPDATE },
 *     { system: myRenderSystem, phase: LoopPhase.RENDER, priority: 10 },
 *   ],
 *   init: (world) => {
 *     // Set up initial world state
 *     return world;
 *   },
 *   cleanup: (world) => {
 *     // Tear down plugin state
 *     return world;
 *   },
 * };
 * ```
 */
export interface Plugin {
	/** Unique plugin name */
	readonly name: string;
	/** Semantic version string */
	readonly version: string;
	/** Names of plugins this one depends on (must be registered first) */
	readonly dependencies?: readonly string[];
	/** Components provided by this plugin */
	readonly components?: readonly PluginComponent[];
	/** Systems provided by this plugin, with phase assignments */
	readonly systems?: readonly PluginSystem[];
	/** Widget declarations provided by this plugin */
	readonly widgets?: readonly PluginWidgetDeclaration[];
	/** Theme declarations provided by this plugin */
	readonly themes?: readonly PluginThemeDeclaration[];
	/** Zod schema for plugin configuration validation */
	readonly configSchema?: z.ZodType;
	/** Called when the plugin is registered. Can set up initial world state. */
	readonly init?: (world: World) => World;
	/** Called when the plugin is activated (starts processing). */
	readonly onActivate?: (world: World) => void;
	/** Called when the plugin is deactivated (stops processing). */
	readonly onDeactivate?: (world: World) => void;
	/** Called when the plugin is unregistered. Can clean up world state. */
	readonly cleanup?: (world: World) => World;
}

/**
 * Info about a registered plugin, returned by getPlugins().
 */
export interface PluginInfo {
	/** Plugin name */
	readonly name: string;
	/** Plugin version */
	readonly version: string;
	/** Names of dependencies */
	readonly dependencies: readonly string[];
	/** Number of components provided */
	readonly componentCount: number;
	/** Number of systems provided */
	readonly systemCount: number;
	/** Number of widgets provided */
	readonly widgetCount: number;
	/** Number of themes provided */
	readonly themeCount: number;
	/** Whether the plugin is currently active */
	readonly active: boolean;
}

/**
 * Result of a plugin registration operation.
 */
export interface PluginRegistrationResult {
	/** Whether registration succeeded */
	readonly success: boolean;
	/** Error message if registration failed */
	readonly error?: string;
	/** Number of systems registered with the scheduler */
	readonly systemsRegistered: number;
	/** Number of components registered */
	readonly componentsRegistered: number;
}

/**
 * Registry that tracks all registered plugins and their state.
 */
export interface PluginRegistry {
	/** Internal storage, not for direct access */
	readonly _plugins: ReadonlyMap<string, PluginRegistryEntry>;
}

/**
 * Internal entry for a registered plugin.
 * @internal
 */
interface PluginRegistryEntry {
	readonly plugin: Plugin;
	readonly registeredSystems: readonly PluginSystem[];
	active: boolean;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for PluginComponent validation.
 *
 * @example
 * ```typescript
 * import { PluginComponentSchema } from 'blecsd';
 *
 * const validated = PluginComponentSchema.parse({
 *   name: 'MyComponent',
 *   store: myStore,
 * });
 * ```
 */
export const PluginComponentSchema = z.object({
	name: z.string().min(1),
	store: z.unknown(),
});

/**
 * Zod schema for PluginSystem validation.
 *
 * @example
 * ```typescript
 * import { PluginSystemSchema } from 'blecsd';
 *
 * const validated = PluginSystemSchema.parse({
 *   system: mySystem,
 *   phase: 2, // LoopPhase.UPDATE
 *   priority: 0,
 * });
 * ```
 */
export const PluginSystemSchema = z.object({
	system: z.function(),
	phase: z.nativeEnum(LoopPhase),
	priority: z.number().optional(),
});

/**
 * Zod schema for Plugin manifest validation.
 * Validates the structure of a plugin before registration.
 *
 * @example
 * ```typescript
 * import { PluginSchema } from 'blecsd';
 *
 * const result = PluginSchema.safeParse(pluginCandidate);
 * if (result.success) {
 *   registerPlugin(registry, scheduler, world, result.data);
 * }
 * ```
 */
/**
 * Zod schema for PluginWidgetDeclaration validation.
 */
export const PluginWidgetDeclarationSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	factory: z.function(),
	tags: z.array(z.string()).readonly().optional(),
});

/**
 * Zod schema for PluginThemeDeclaration validation.
 */
export const PluginThemeDeclarationSchema = z.object({
	name: z.string().min(1),
	theme: z.record(z.string(), z.unknown()),
});

export const PluginSchema = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
	dependencies: z.array(z.string().min(1)).readonly().optional(),
	components: z.array(PluginComponentSchema).readonly().optional(),
	systems: z.array(PluginSystemSchema).readonly().optional(),
	widgets: z.array(PluginWidgetDeclarationSchema).readonly().optional(),
	themes: z.array(PluginThemeDeclarationSchema).readonly().optional(),
	configSchema: z.unknown().optional(),
	init: z.function().optional(),
	onActivate: z.function().optional(),
	onDeactivate: z.function().optional(),
	cleanup: z.function().optional(),
});

// =============================================================================
// REGISTRY FUNCTIONS
// =============================================================================

/**
 * Creates a new, empty plugin registry.
 *
 * @returns A new PluginRegistry
 *
 * @example
 * ```typescript
 * import { createPluginRegistry } from 'blecsd';
 *
 * const registry = createPluginRegistry();
 * ```
 */
export function createPluginRegistry(): PluginRegistry {
	return { _plugins: new Map() };
}

/**
 * Registers a plugin with the given registry and scheduler.
 *
 * Validates the plugin manifest, checks dependencies, registers systems
 * with the scheduler, and calls the plugin's init hook if present.
 *
 * @param registry - The plugin registry to register with
 * @param scheduler - The scheduler to register systems with
 * @param world - The ECS world (passed to init hook)
 * @param plugin - The plugin to register
 * @returns Registration result with success status and details
 *
 * @example
 * ```typescript
 * import { createPluginRegistry, createScheduler, registerPlugin, LoopPhase } from 'blecsd';
 *
 * const registry = createPluginRegistry();
 * const scheduler = createScheduler();
 * const world = createWorld();
 *
 * const result = registerPlugin(registry, scheduler, world, {
 *   name: 'physics',
 *   version: '1.0.0',
 *   systems: [
 *     { system: gravitySystem, phase: LoopPhase.ANIMATION },
 *   ],
 * });
 *
 * if (!result.success) {
 *   console.error('Plugin registration failed:', result.error);
 * }
 * ```
 */
export function registerPlugin(
	registry: PluginRegistry,
	scheduler: Scheduler,
	world: World,
	plugin: Plugin,
): PluginRegistrationResult {
	// Validate manifest
	const parseResult = PluginSchema.safeParse(plugin);
	if (!parseResult.success) {
		return {
			success: false,
			error: `Invalid plugin manifest: ${parseResult.error.message}`,
			systemsRegistered: 0,
			componentsRegistered: 0,
		};
	}

	// Check for duplicate registration
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	if (plugins.has(plugin.name)) {
		return {
			success: false,
			error: `Plugin "${plugin.name}" is already registered`,
			systemsRegistered: 0,
			componentsRegistered: 0,
		};
	}

	// Check dependencies
	if (plugin.dependencies) {
		for (const dep of plugin.dependencies) {
			if (!plugins.has(dep)) {
				return {
					success: false,
					error: `Missing dependency: "${dep}" (required by "${plugin.name}")`,
					systemsRegistered: 0,
					componentsRegistered: 0,
				};
			}
		}
	}

	// Register systems with the scheduler
	const registeredSystems: PluginSystem[] = [];
	if (plugin.systems) {
		for (const entry of plugin.systems) {
			scheduler.registerSystem(entry.phase, entry.system, entry.priority ?? 0);
			registeredSystems.push(entry);
		}
	}

	// Store in registry
	plugins.set(plugin.name, {
		plugin,
		registeredSystems,
		active: true,
	});

	// Call init hook
	if (plugin.init) {
		plugin.init(world);
	}

	// Call onActivate hook
	if (plugin.onActivate) {
		plugin.onActivate(world);
	}

	return {
		success: true,
		systemsRegistered: registeredSystems.length,
		componentsRegistered: plugin.components?.length ?? 0,
	};
}

/**
 * Unregisters a plugin, removing its systems from the scheduler
 * and calling the cleanup hook.
 *
 * @param registry - The plugin registry
 * @param scheduler - The scheduler to unregister systems from
 * @param world - The ECS world (passed to cleanup hook)
 * @param pluginName - The name of the plugin to unregister
 * @returns true if the plugin was found and unregistered
 *
 * @example
 * ```typescript
 * import { unregisterPlugin } from 'blecsd';
 *
 * const removed = unregisterPlugin(registry, scheduler, world, 'physics');
 * if (!removed) {
 *   console.warn('Plugin not found');
 * }
 * ```
 */
export function unregisterPlugin(
	registry: PluginRegistry,
	scheduler: Scheduler,
	world: World,
	pluginName: string,
): boolean {
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	const entry = plugins.get(pluginName);
	if (!entry) {
		return false;
	}

	// Check if other plugins depend on this one
	for (const [name, other] of plugins) {
		if (name === pluginName) continue;
		if (other.plugin.dependencies?.includes(pluginName)) {
			return false;
		}
	}

	// Call onDeactivate hook
	if (entry.active && entry.plugin.onDeactivate) {
		entry.plugin.onDeactivate(world);
	}

	// Unregister systems from scheduler
	for (const sysEntry of entry.registeredSystems) {
		scheduler.unregisterSystem(sysEntry.system);
	}

	// Call cleanup hook
	if (entry.plugin.cleanup) {
		entry.plugin.cleanup(world);
	}

	// Remove from registry
	plugins.delete(pluginName);
	return true;
}

/**
 * Gets information about all registered plugins.
 *
 * @param registry - The plugin registry
 * @returns Array of plugin info objects
 *
 * @example
 * ```typescript
 * import { getPlugins } from 'blecsd';
 *
 * const plugins = getPlugins(registry);
 * for (const info of plugins) {
 *   console.log(`${info.name} v${info.version} (${info.systemCount} systems)`);
 * }
 * ```
 */
export function getPlugins(registry: PluginRegistry): readonly PluginInfo[] {
	const result: PluginInfo[] = [];
	for (const entry of registry._plugins.values()) {
		result.push({
			name: entry.plugin.name,
			version: entry.plugin.version,
			dependencies: entry.plugin.dependencies ?? [],
			componentCount: entry.plugin.components?.length ?? 0,
			systemCount: entry.registeredSystems.length,
			widgetCount: entry.plugin.widgets?.length ?? 0,
			themeCount: entry.plugin.themes?.length ?? 0,
			active: entry.active,
		});
	}
	return result;
}

/**
 * Checks if a plugin is registered.
 *
 * @param registry - The plugin registry
 * @param pluginName - The plugin name to check
 * @returns true if the plugin is registered
 *
 * @example
 * ```typescript
 * import { hasPlugin } from 'blecsd';
 *
 * if (hasPlugin(registry, 'physics')) {
 *   console.log('Physics plugin is loaded');
 * }
 * ```
 */
export function hasPlugin(registry: PluginRegistry, pluginName: string): boolean {
	return registry._plugins.has(pluginName);
}

/**
 * Gets the count of registered plugins.
 *
 * @param registry - The plugin registry
 * @returns Number of registered plugins
 *
 * @example
 * ```typescript
 * import { getPluginCount } from 'blecsd';
 *
 * console.log(`${getPluginCount(registry)} plugins loaded`);
 * ```
 */
export function getPluginCount(registry: PluginRegistry): number {
	return registry._plugins.size;
}

/**
 * Unregisters all plugins in reverse registration order,
 * calling cleanup hooks and removing systems.
 *
 * @param registry - The plugin registry
 * @param scheduler - The scheduler to unregister systems from
 * @param world - The ECS world (passed to cleanup hooks)
 *
 * @example
 * ```typescript
 * import { clearPlugins } from 'blecsd';
 *
 * clearPlugins(registry, scheduler, world);
 * ```
 */
export function clearPlugins(registry: PluginRegistry, scheduler: Scheduler, world: World): void {
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	// Unregister in reverse order to respect dependencies
	const names = [...plugins.keys()].reverse();
	for (const name of names) {
		const entry = plugins.get(name);
		if (!entry) continue;

		// Call onDeactivate
		if (entry.active && entry.plugin.onDeactivate) {
			entry.plugin.onDeactivate(world);
		}

		// Unregister systems
		for (const sysEntry of entry.registeredSystems) {
			scheduler.unregisterSystem(sysEntry.system);
		}

		// Call cleanup
		if (entry.plugin.cleanup) {
			entry.plugin.cleanup(world);
		}
	}

	plugins.clear();
}

// =============================================================================
// PLUGIN API V2 - CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Creates a plugin definition with sensible defaults.
 * A convenience function that makes plugin creation more concise.
 *
 * @param config - Plugin configuration
 * @returns A fully-formed Plugin object
 *
 * @example
 * ```typescript
 * import { definePlugin, LoopPhase } from 'blecsd';
 *
 * const myPlugin = definePlugin({
 *   name: 'my-charts',
 *   version: '1.0.0',
 *   widgets: [
 *     { name: 'bar-chart', factory: createBarChart, tags: ['chart', 'data'] },
 *     { name: 'pie-chart', factory: createPieChart, tags: ['chart', 'data'] },
 *   ],
 *   systems: [
 *     { system: chartAnimationSystem, phase: LoopPhase.ANIMATION },
 *   ],
 * });
 * ```
 */
export function definePlugin(config: Plugin): Plugin {
	return config;
}

/**
 * Activates a previously deactivated plugin.
 * Re-registers its systems with the scheduler and calls onActivate.
 *
 * @param registry - The plugin registry
 * @param scheduler - The scheduler to register systems with
 * @param world - The ECS world
 * @param pluginName - The name of the plugin to activate
 * @returns true if the plugin was found and activated
 *
 * @example
 * ```typescript
 * import { activatePlugin } from 'blecsd';
 *
 * activatePlugin(registry, scheduler, world, 'physics');
 * ```
 */
export function activatePlugin(
	registry: PluginRegistry,
	scheduler: Scheduler,
	world: World,
	pluginName: string,
): boolean {
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	const entry = plugins.get(pluginName);
	if (!entry) {
		return false;
	}
	if (entry.active) {
		return true;
	}

	// Re-register systems with the scheduler
	for (const sysEntry of entry.registeredSystems) {
		scheduler.registerSystem(sysEntry.phase, sysEntry.system, sysEntry.priority ?? 0);
	}

	entry.active = true;

	// Call onActivate hook
	if (entry.plugin.onActivate) {
		entry.plugin.onActivate(world);
	}

	return true;
}

/**
 * Deactivates a plugin without fully unregistering it.
 * Removes its systems from the scheduler and calls onDeactivate,
 * but keeps the plugin in the registry for later reactivation.
 *
 * @param registry - The plugin registry
 * @param scheduler - The scheduler to unregister systems from
 * @param world - The ECS world
 * @param pluginName - The name of the plugin to deactivate
 * @returns true if the plugin was found and deactivated
 *
 * @example
 * ```typescript
 * import { deactivatePlugin } from 'blecsd';
 *
 * deactivatePlugin(registry, scheduler, world, 'physics');
 * // Plugin is still registered but not running
 * // Re-activate later with activatePlugin()
 * ```
 */
export function deactivatePlugin(
	registry: PluginRegistry,
	scheduler: Scheduler,
	world: World,
	pluginName: string,
): boolean {
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	const entry = plugins.get(pluginName);
	if (!entry) {
		return false;
	}
	if (!entry.active) {
		return true;
	}

	// Call onDeactivate hook
	if (entry.plugin.onDeactivate) {
		entry.plugin.onDeactivate(world);
	}

	// Unregister systems from scheduler
	for (const sysEntry of entry.registeredSystems) {
		scheduler.unregisterSystem(sysEntry.system);
	}

	entry.active = false;

	return true;
}

/**
 * Checks if a plugin is currently active.
 *
 * @param registry - The plugin registry
 * @param pluginName - The name of the plugin to check
 * @returns true if the plugin is registered and active
 *
 * @example
 * ```typescript
 * import { isPluginActive } from 'blecsd';
 *
 * if (isPluginActive(registry, 'physics')) {
 *   console.log('Physics is running');
 * }
 * ```
 */
export function isPluginActive(registry: PluginRegistry, pluginName: string): boolean {
	const plugins = registry._plugins as Map<string, PluginRegistryEntry>;
	const entry = plugins.get(pluginName);
	return entry?.active ?? false;
}

/**
 * Validates plugin configuration against its declared config schema.
 * Returns the validated config or throws if invalid.
 *
 * @param plugin - The plugin with a configSchema
 * @param config - The configuration to validate
 * @returns The validated configuration
 * @throws If the config is invalid according to the plugin's schema
 *
 * @example
 * ```typescript
 * import { validatePluginConfig, definePlugin } from 'blecsd';
 * import { z } from 'zod';
 *
 * const plugin = definePlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   configSchema: z.object({ maxItems: z.number().positive() }),
 * });
 *
 * const config = validatePluginConfig(plugin, { maxItems: 10 });
 * ```
 */
export function validatePluginConfig(plugin: Plugin, config: unknown): unknown {
	if (!plugin.configSchema) {
		return config;
	}
	return (plugin.configSchema as z.ZodType).parse(config);
}
