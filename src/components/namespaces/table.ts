/**
 * Table component namespace.
 *
 * Provides all operations for table data management and rendering.
 *
 * @example
 * ```typescript
 * import { table } from 'blecsd/components';
 * table.attach(world, eid);
 * table.data.set(world, eid, rows);
 * table.render(world, eid, width);
 * ```
 */
import {
	appendRow,
	attachTableBehavior,
	calculateColumnWidths,
	clearData,
	clearTableDisplay,
	detachTableBehavior,
	getCell,
	getCellPadding,
	getCellValue,
	getColCount,
	getColumn,
	getColumns,
	getData,
	getDataAsStrings,
	getDataRows,
	getHeaderRowCount,
	getHeaderRows,
	getRow,
	getRowCount,
	getTableDisplay,
	hasCellBorders,
	insertRow,
	isTable,
	removeRow,
	renderTableLines,
	setCell,
	setCellBorders,
	setCellPadding,
	setData,
	setHeaderRowCount,
	setHeaders,
	setTableDisplay,
} from '../../systems/tableSystem';

export const table = Object.freeze({
	attach: attachTableBehavior,
	detach: detachTableBehavior,
	is: isTable,
	render: renderTableLines,
	calculateColumnWidths,

	data: Object.freeze({
		get: getData,
		set: setData,
		getAsStrings: getDataAsStrings,
		clear: clearData,
		getRowCount,
		getColCount,
	}),

	rows: Object.freeze({
		get: getRow,
		getHeaders: getHeaderRows,
		getData: getDataRows,
		append: appendRow,
		insert: insertRow,
		remove: removeRow,
		getHeaderCount: getHeaderRowCount,
		setHeaderCount: setHeaderRowCount,
	}),

	columns: Object.freeze({
		get: getColumn,
		getAll: getColumns,
		setHeaders: setHeaders,
	}),

	cells: Object.freeze({
		get: getCell,
		set: setCell,
		getValue: getCellValue,
		getPadding: getCellPadding,
		setPadding: setCellPadding,
		hasBorders: hasCellBorders,
		setBorders: setCellBorders,
	}),

	display: Object.freeze({
		get: getTableDisplay,
		set: setTableDisplay,
		clear: clearTableDisplay,
	}),
});

export type TableModule = typeof table;
