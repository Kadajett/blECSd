/**
 * ListTable widget namespace.
 *
 * @example
 * ```typescript
 * import { listTable } from 'blecsd/widgets';
 * const lt = listTable.create(world, { headers: [...], rows: [...] });
 * ```
 */
import { createListTable, isListTableWidget } from '../listTable';

export const listTable = Object.freeze({
	create: createListTable,
	is: isListTableWidget,
});

export type ListTableModule = typeof listTable;
