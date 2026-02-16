/**
 * Flexbox widget namespace.
 *
 * @example
 * ```typescript
 * import { flexbox } from 'blecsd/widgets';
 * const container = flexbox.createContainer(world, { direction: 'row' });
 * flexbox.addChild(world, container.eid, childEid, { grow: 1 });
 * ```
 */
import {
	addFlexChild,
	createFlexContainer,
	isFlexContainer,
	resetFlexContainerStore,
} from '../flexbox';

export const flexbox = Object.freeze({
	createContainer: createFlexContainer,
	addChild: addFlexChild,
	isContainer: isFlexContainer,
	resetStore: resetFlexContainerStore,
});

export type FlexboxModule = typeof flexbox;
