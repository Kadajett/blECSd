/**
 * Tree widget namespace.
 *
 * @example
 * ```typescript
 * import { tree } from 'blecsd/widgets';
 * const t = tree.create(world, { nodes: [...] });
 * ```
 */
import { createTree, isTreeWidget, resetTreeStore } from '../tree';

export const tree = Object.freeze({
	create: createTree,
	is: isTreeWidget,
	resetStore: resetTreeStore,
});

export type TreeModule = typeof tree;
