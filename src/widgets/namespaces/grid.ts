/**
 * Grid widget namespace.
 *
 * @example
 * ```typescript
 * import { grid } from 'blecsd/widgets';
 * const g = grid.create(world, { rows: 3, cols: 3 });
 * grid.addTo(world, g.eid, childEid, { row: 1, col: 1 });
 * ```
 */
import { addToGrid, createGrid, isGrid, resetGridStore } from '../grid';

export const grid = Object.freeze({
	create: createGrid,
	is: isGrid,
	addTo: addToGrid,
	resetStore: resetGridStore,
});

export type GridModule = typeof grid;
