/**
 * Content manipulation utilities namespace.
 *
 * @example
 * ```typescript
 * import { contentManipulation } from 'blecsd/widgets';
 * contentManipulation.pushLine(world, eid, 'new line');
 * const line = contentManipulation.popLine(world, eid);
 * contentManipulation.insertLine(world, eid, 5, 'inserted');
 * contentManipulation.deleteLine(world, eid, 3);
 * ```
 */
import {
	clearLines,
	contentGetLine,
	contentGetLineCount,
	deleteBottom,
	deleteLine,
	deleteTop,
	getBaseLine,
	getLines,
	insertBottom,
	insertLine,
	insertTop,
	popLine,
	pushLine,
	replaceLines,
	setBaseLine,
	setLine,
	setLines,
	shiftLine,
	spliceLines,
	unshiftLine,
} from '../contentManipulation';

export const contentManipulation = Object.freeze({
	pushLine,
	popLine,
	shiftLine,
	unshiftLine,
	insertLine,
	deleteLine,
	insertTop,
	insertBottom,
	deleteTop,
	deleteBottom,
	getLine: contentGetLine,
	getLineCount: contentGetLineCount,
	setLine,
	getLines,
	setLines,
	clearLines,
	replaceLines,
	spliceLines,
	getBaseLine,
	setBaseLine,
});

export type ContentManipulationModule = typeof contentManipulation;
