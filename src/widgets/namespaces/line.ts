/**
 * Line widget namespace.
 *
 * @example
 * ```typescript
 * import { line } from 'blecsd/widgets';
 * const l = line.create(world, { orientation: 'horizontal', length: 40 });
 * const char = line.getChar(world, l.eid);
 * line.setChar(world, l.eid, '=');
 * const orientation = line.getOrientation(world, l.eid);
 * ```
 */
import {
	createLine,
	DEFAULT_HORIZONTAL_CHAR,
	DEFAULT_LINE_LENGTH,
	DEFAULT_VERTICAL_CHAR,
	getLineChar,
	getLineOrientation,
	isLine,
	resetLineStore,
	setLineChar,
} from '../line';

export const line = Object.freeze({
	create: createLine,
	is: isLine,
	getChar: getLineChar,
	setChar: setLineChar,
	getOrientation: getLineOrientation,
	resetStore: resetLineStore,
	DEFAULT_HORIZONTAL_CHAR,
	DEFAULT_VERTICAL_CHAR,
	DEFAULT_LINE_LENGTH,
});

export type LineModule = typeof line;
