/**
 * SplitPane widget namespace.
 *
 * @example
 * ```typescript
 * import { splitPane } from 'blecsd/widgets';
 * const sp = splitPane.create(world, { direction: 'horizontal' });
 * const direction = splitPane.getDirection(world, sp.eid);
 * const dividerInfo = splitPane.getDividerRenderInfo(world, sp.eid);
 * const hit = splitPane.hitTestDivider(world, sp.eid, x, y);
 * const buffer = splitPane.createSharedTextBuffer(world);
 * const shared = splitPane.getSharedTextBuffer(world, sp.eid);
 * ```
 */
import {
	createSharedTextBuffer,
	createSplitPane,
	getDividerRenderInfo,
	getSharedTextBuffer,
	getSplitDirection,
	hitTestDivider,
	isSplitPane,
	resetSplitPaneStore,
} from '../splitPane';

export const splitPane = Object.freeze({
	create: createSplitPane,
	is: isSplitPane,
	getDirection: getSplitDirection,
	getDividerRenderInfo,
	hitTestDivider,
	createSharedTextBuffer,
	getSharedTextBuffer,
	resetStore: resetSplitPaneStore,
});

export type SplitPaneModule = typeof splitPane;
