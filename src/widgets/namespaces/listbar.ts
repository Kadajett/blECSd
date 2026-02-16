/**
 * Listbar widget namespace.
 *
 * @example
 * ```typescript
 * import { listbar } from 'blecsd/widgets';
 * const lb = listbar.create(world, { items: [...] });
 * ```
 */
import { createListbar, isListbarWidget, resetListbarStore } from '../listbar';

export const listbar = Object.freeze({
	create: createListbar,
	is: isListbarWidget,
	resetStore: resetListbarStore,
});

export type ListbarModule = typeof listbar;
