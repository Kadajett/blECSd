/**
 * TableWidget namespace.
 *
 * @example
 * ```typescript
 * import { tableWidget } from 'blecsd/widgets';
 * const table = tableWidget.create(world, { headers: [...], rows: [...] });
 * ```
 */
import { createTable, isTableWidget } from '../table';

export const tableWidget = Object.freeze({
	create: createTable,
	is: isTableWidget,
});

export type TableWidgetModule = typeof tableWidget;
