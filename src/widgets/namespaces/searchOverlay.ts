/**
 * SearchOverlay widget namespace.
 *
 * @example
 * ```typescript
 * import { searchOverlay } from 'blecsd/widgets';
 * const so = searchOverlay.create(world, {});
 * searchOverlay.attach(world, so.eid, targetEid);
 * const target = searchOverlay.getTarget(world, so.eid);
 * const colors = searchOverlay.getColors(world, so.eid);
 * ```
 */
import {
	attachSearchOverlay,
	createSearchOverlay,
	getSearchOverlayColors,
	getSearchOverlayTarget,
	isSearchOverlay,
	resetSearchOverlayStore,
} from '../searchOverlay';

export const searchOverlay = Object.freeze({
	create: createSearchOverlay,
	is: isSearchOverlay,
	attach: attachSearchOverlay,
	getTarget: getSearchOverlayTarget,
	getColors: getSearchOverlayColors,
	resetStore: resetSearchOverlayStore,
});

export type SearchOverlayModule = typeof searchOverlay;
