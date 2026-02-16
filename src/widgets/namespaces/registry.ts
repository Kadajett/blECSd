/**
 * Widget Registry namespace.
 *
 * @example
 * ```typescript
 * import { registry } from 'blecsd/widgets';
 * const reg = registry.create(world);
 * registry.registerBuiltins(reg);
 * const types = registry.getWidgetTypes(reg);
 * const widgetsByTag = registry.getWidgetsByTag(reg, 'input');
 * const isValid = registry.isWidgetType(reg, 'box');
 * ```
 */
import {
	createWidgetRegistry,
	defaultRegistry,
	getWidgetsByTag,
	getWidgetTypes,
	isWidgetType,
	registerBuiltinWidgets,
} from '../registry';

export const registry = Object.freeze({
	create: createWidgetRegistry,
	registerBuiltins: registerBuiltinWidgets,
	getWidgetTypes,
	getWidgetsByTag,
	isWidgetType,
	defaultRegistry,
});

export type RegistryModule = typeof registry;
