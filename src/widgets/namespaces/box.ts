/**
 * Box widget namespace.
 *
 * @example
 * ```typescript
 * import { box } from 'blecsd/widgets';
 * const b = box.create(world, { x: 0, y: 0, width: 40, height: 10 });
 * box.setContent(world, b.eid, 'Hello');
 * ```
 */
import { createBox, getBoxContent, isBox, resetBoxStore, setBoxContent } from '../box';

export const box = Object.freeze({
	create: createBox,
	is: isBox,
	getContent: getBoxContent,
	setContent: setBoxContent,
	resetStore: resetBoxStore,
});

export type BoxModule = typeof box;
