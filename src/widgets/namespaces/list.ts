/**
 * ListWidget namespace.
 *
 * @example
 * ```typescript
 * import { listWidget } from 'blecsd/widgets';
 * const list = listWidget.create(world, { items: ['a', 'b', 'c'] });
 * ```
 */
import { createList, isListWidget } from '../list';

export const listWidget = Object.freeze({
	create: createList,
	is: isListWidget,
});

export type ListWidgetModule = typeof listWidget;
