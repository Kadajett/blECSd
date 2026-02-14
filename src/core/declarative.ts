/**
 * Declarative widget composition API.
 *
 * Instead of imperative entity creation and component attachment,
 * this module lets users describe UI structure as functional composition.
 * Reactive signal bindings are set up automatically.
 *
 * @module core/declarative
 *
 * @example
 * ```typescript
 * import { createSignal, el, mount, vbox } from 'blecsd';
 *
 * const [title, setTitle] = createSignal('Dashboard');
 * const [cpu, setCpu] = createSignal(42);
 *
 * const tree = mount(world, vbox({}, [
 *   el('text', { content: title }),
 *   el('gauge', { value: cpu, label: 'CPU' }),
 * ]));
 *
 * setTitle('Updated!'); // text widget re-renders automatically
 * setCpu(87);           // gauge widget re-renders automatically
 *
 * tree.dispose(); // cleanup all entities and reactive bindings
 * ```
 */

import { appendChild } from '../components/hierarchy';
import { createEffect } from './reactiveEffects';
import type { SignalGetter } from './signals';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported widget types for declarative composition.
 */
export type WidgetType = 'box' | 'text' | 'gauge' | 'list' | 'progressbar';

/**
 * A value that may be reactive (a signal getter) or static.
 */
export type ReactiveProp<T> = T | SignalGetter<T>;

/**
 * Configuration for a declarative widget.
 * Any property can be a static value or a reactive signal getter.
 */
export interface ReactiveConfig {
	readonly [key: string]: ReactiveProp<unknown>;
}

/**
 * Describes a widget to be created in the UI tree.
 */
export interface WidgetDescriptor {
	readonly type: WidgetType;
	readonly config: ReactiveConfig;
	readonly children: readonly WidgetDescriptor[];
	readonly ref?: (eid: Entity) => void;
}

/**
 * Result of mounting a descriptor tree into actual entities.
 */
export interface MountedTree {
	readonly root: Entity;
	readonly entities: readonly Entity[];
	readonly dispose: () => void;
}

/**
 * Cleanup handle from a reactive binding.
 */
interface BindingCleanup {
	readonly dispose: () => void;
}

// =============================================================================
// WIDGET CREATION REGISTRY
// =============================================================================

/**
 * Factory function type for creating entities from config.
 */
type WidgetFactory = (world: World, config: Record<string, unknown>) => Entity;

/**
 * Registry of widget type to factory function.
 */
const widgetFactories = new Map<WidgetType, WidgetFactory>();

/**
 * Registry of property setters for widget types.
 * Maps (widgetType, propName) to a setter function.
 */
type PropSetter = (world: World, eid: Entity, value: unknown) => void;
const propSetters = new Map<string, PropSetter>();

/**
 * Gets a composite key for the prop setter registry.
 */
function propKey(type: WidgetType, prop: string): string {
	return `${type}:${prop}`;
}

/**
 * Registers a widget factory for declarative composition.
 *
 * @param type - Widget type name
 * @param factory - Factory function that creates an entity from config
 *
 * @example
 * ```typescript
 * import { registerWidgetFactory, createBoxEntity } from 'blecsd';
 *
 * registerWidgetFactory('box', (world, config) => createBoxEntity(world, config));
 * ```
 */
export function registerWidgetFactory(type: WidgetType, factory: WidgetFactory): void {
	widgetFactories.set(type, factory);
}

/**
 * Registers a property setter for a widget type.
 * Used to update a specific property on an entity when a reactive value changes.
 *
 * @param type - Widget type name
 * @param prop - Property name
 * @param setter - Function that applies the property value to an entity
 *
 * @example
 * ```typescript
 * import { registerPropSetter, setContent } from 'blecsd';
 *
 * registerPropSetter('text', 'content', (world, eid, value) => {
 *   setContent(world, eid, value as string);
 * });
 * ```
 */
export function registerPropSetter(type: WidgetType, prop: string, setter: PropSetter): void {
	propSetters.set(propKey(type, prop), setter);
}

// =============================================================================
// REACTIVE DETECTION
// =============================================================================

/**
 * Checks if a value is a reactive signal getter (a function).
 */
function isReactive<T>(value: ReactiveProp<T>): value is SignalGetter<T> {
	return typeof value === 'function';
}

/**
 * Resolves a reactive prop to its current value.
 */
function resolve<T>(value: ReactiveProp<T>): T {
	if (isReactive(value)) {
		return value();
	}
	return value;
}

// =============================================================================
// DESCRIPTOR CREATION
// =============================================================================

/**
 * Creates a widget descriptor for declarative composition.
 *
 * @param type - Widget type ('box', 'text', 'gauge', etc.)
 * @param config - Configuration object; values can be static or signal getters
 * @param children - Optional child descriptors
 * @returns Widget descriptor
 *
 * @example
 * ```typescript
 * import { el, createSignal } from 'blecsd';
 *
 * const [count, setCount] = createSignal(0);
 *
 * const desc = el('text', { content: count });
 * ```
 */
export function el(
	type: WidgetType,
	config: ReactiveConfig = {},
	children: WidgetDescriptor[] = [],
): WidgetDescriptor {
	return { type, config, children };
}

/**
 * Creates a widget descriptor with a ref callback.
 *
 * @param type - Widget type
 * @param config - Configuration object
 * @param ref - Callback receiving the created entity ID
 * @param children - Optional child descriptors
 * @returns Widget descriptor
 *
 * @example
 * ```typescript
 * import { elRef } from 'blecsd';
 *
 * let myEntity: Entity;
 * const desc = elRef('box', { width: 20 }, (eid) => { myEntity = eid; });
 * ```
 */
export function elRef(
	type: WidgetType,
	config: ReactiveConfig,
	ref: (eid: Entity) => void,
	children: WidgetDescriptor[] = [],
): WidgetDescriptor {
	return { type, config, children, ref };
}

/**
 * Creates a vertical box layout descriptor.
 *
 * @param config - Box configuration
 * @param children - Child widget descriptors
 * @returns Box descriptor with vertical layout
 *
 * @example
 * ```typescript
 * import { vbox, el } from 'blecsd';
 *
 * const layout = vbox({}, [
 *   el('text', { content: 'Header' }),
 *   el('text', { content: 'Body' }),
 * ]);
 * ```
 */
export function vbox(
	config: ReactiveConfig = {},
	children: WidgetDescriptor[] = [],
): WidgetDescriptor {
	return el('box', { ...config, layout: 'vertical' }, children);
}

/**
 * Creates a horizontal box layout descriptor.
 *
 * @param config - Box configuration
 * @param children - Child widget descriptors
 * @returns Box descriptor with horizontal layout
 *
 * @example
 * ```typescript
 * import { hbox, el } from 'blecsd';
 *
 * const layout = hbox({}, [
 *   el('text', { content: 'Left' }),
 *   el('text', { content: 'Right' }),
 * ]);
 * ```
 */
export function hbox(
	config: ReactiveConfig = {},
	children: WidgetDescriptor[] = [],
): WidgetDescriptor {
	return el('box', { ...config, layout: 'horizontal' }, children);
}

// =============================================================================
// MOUNTING
// =============================================================================

/**
 * Mounts a widget descriptor tree, creating entities and setting up reactive bindings.
 *
 * For each descriptor node:
 * 1. Creates the entity using the registered factory
 * 2. Sets static properties immediately
 * 3. Creates reactive effects for signal-backed properties
 * 4. Recursively mounts children and establishes parent-child relationships
 *
 * @param world - The ECS world
 * @param descriptor - Root widget descriptor
 * @param parent - Optional parent entity
 * @returns Mounted tree with root entity, all entities, and dispose function
 *
 * @example
 * ```typescript
 * import { mount, el, createSignal } from 'blecsd';
 *
 * const [status, setStatus] = createSignal('Ready');
 *
 * const tree = mount(world, el('text', { content: status }));
 * setStatus('Running'); // widget updates automatically
 *
 * tree.dispose(); // cleanup
 * ```
 */
export function mount(world: World, descriptor: WidgetDescriptor, parent?: Entity): MountedTree {
	const entities: Entity[] = [];
	const bindings: BindingCleanup[] = [];

	mountNode(world, descriptor, parent, entities, bindings);

	const root = entities[0];
	if (root === undefined) {
		throw new Error(`Failed to mount widget of type '${descriptor.type}': no entity created`);
	}

	return {
		root,
		entities: [...entities],
		dispose: (): void => {
			for (const binding of bindings) {
				binding.dispose();
			}
			bindings.length = 0;
		},
	};
}

/**
 * Recursively mounts a descriptor node and its children.
 */
function mountNode(
	world: World,
	descriptor: WidgetDescriptor,
	parent: Entity | undefined,
	entities: Entity[],
	bindings: BindingCleanup[],
): Entity {
	const factory = widgetFactories.get(descriptor.type);
	if (!factory) {
		throw new Error(
			`No factory registered for widget type '${descriptor.type}'. Call registerWidgetFactory() first.`,
		);
	}

	// Resolve all config values for initial entity creation
	const resolvedConfig: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(descriptor.config)) {
		resolvedConfig[key] = resolve(value);
	}

	// Create the entity
	const eid = factory(world, resolvedConfig);
	entities.push(eid);

	// Set parent relationship
	if (parent !== undefined) {
		appendChild(world, parent, eid);
	}

	// Set up reactive bindings for signal-backed properties
	for (const [key, value] of Object.entries(descriptor.config)) {
		if (!isReactive(value)) {
			continue;
		}

		const setter = propSetters.get(propKey(descriptor.type, key));
		if (!setter) {
			continue;
		}

		// Create an effect that re-applies the property when the signal changes
		const signalGetter = value as SignalGetter<unknown>;
		const effect = createEffect(() => {
			const currentValue = signalGetter();
			setter(world, eid, currentValue);
			return undefined;
		});
		bindings.push(effect);
	}

	// Call ref callback if provided
	if (descriptor.ref) {
		descriptor.ref(eid);
	}

	// Mount children
	for (const child of descriptor.children) {
		mountNode(world, child, eid, entities, bindings);
	}

	return eid;
}

/**
 * Convenience function to unmount a tree.
 * Disposes all reactive bindings. Entity cleanup should be done
 * separately using the entity disposal system.
 *
 * @param tree - The mounted tree to unmount
 *
 * @example
 * ```typescript
 * import { mount, unmount, el } from 'blecsd';
 *
 * const tree = mount(world, el('box', {}));
 * // ... later ...
 * unmount(tree); // clean up reactive bindings
 * ```
 */
export function unmount(tree: MountedTree): void {
	tree.dispose();
}

// =============================================================================
// REACTIVE BINDING UTILITIES
// =============================================================================

/**
 * Creates a reactive binding between a signal and an entity property.
 * The setter is called immediately with the current value, and again
 * whenever the signal changes.
 *
 * @param world - The ECS world
 * @param eid - The entity to bind to
 * @param signal - Signal getter providing the value
 * @param setter - Function that applies the value to the entity
 * @returns Cleanup handle
 *
 * @example
 * ```typescript
 * import { bind, createSignal, setContent } from 'blecsd';
 *
 * const [text, setText] = createSignal('Hello');
 *
 * const cleanup = bind(world, myEntity, text, (world, eid, value) => {
 *   setContent(world, eid, value);
 * });
 *
 * setText('World'); // entity content updates automatically
 * cleanup.dispose(); // stop watching
 * ```
 */
export function bind<T>(
	world: World,
	eid: Entity,
	signal: SignalGetter<T>,
	setter: (world: World, eid: Entity, value: T) => void,
): BindingCleanup {
	return createEffect(() => {
		const value = signal();
		setter(world, eid, value);
		return undefined;
	});
}

// =============================================================================
// DEFAULT REGISTRATIONS
// =============================================================================

// Default prop setters shared across widget types.
// These are registered lazily to avoid circular imports.
// Widget-specific factories must be registered by the consumer
// or via the built-in registration function below.

/**
 * Registers the default property setters for common widget properties.
 * Call this once during application setup to enable reactive bindings
 * for standard properties like content, width, height.
 *
 * @param deps - Dependencies injected to avoid circular imports
 *
 * @example
 * ```typescript
 * import { registerDefaultPropSetters, setContent } from 'blecsd';
 *
 * registerDefaultPropSetters({
 *   setContent: (world, eid, value) => setContent(world, eid, value as string),
 *   setWidth: (world, eid, value) => setDimensions(world, eid, { width: value as number }),
 *   setHeight: (world, eid, value) => setDimensions(world, eid, { height: value as number }),
 * });
 * ```
 */
export function registerDefaultPropSetters(deps: {
	readonly setContent: PropSetter;
	readonly setWidth: PropSetter;
	readonly setHeight: PropSetter;
}): void {
	const types: readonly WidgetType[] = ['box', 'text', 'gauge', 'list', 'progressbar'];
	for (const type of types) {
		registerPropSetter(type, 'content', deps.setContent);
		registerPropSetter(type, 'width', deps.setWidth);
		registerPropSetter(type, 'height', deps.setHeight);
	}
}

/**
 * Clears all widget factory and prop setter registrations.
 * Used for testing.
 *
 * @internal
 */
export function resetDeclarativeRegistrations(): void {
	widgetFactories.clear();
	propSetters.clear();
}
