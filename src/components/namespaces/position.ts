/**
 * Position component namespace.
 *
 * Provides all operations for entity positioning, movement, and z-ordering.
 *
 * @example
 * ```typescript
 * import { position } from 'blecsd/components';
 * position.set(world, eid, 10, 5);
 * position.moveBy(world, eid, 1, 0);
 * position.zIndex.bringToFront(world, eid, siblings);
 * ```
 */
import {
	bringToFront,
	getPosition,
	getZIndex,
	hasPosition,
	isAbsolute,
	moveBackward,
	moveBy,
	moveForward,
	normalizeZIndices,
	sendToBack,
	setAbsolute,
	setPosition,
	setPositionKeyword,
	setPositionPercent,
	setZIndex,
	swapZIndex,
} from '../position';

export const position = Object.freeze({
	set: setPosition,
	get: getPosition,
	has: hasPosition,

	moveBy,
	setKeyword: setPositionKeyword,
	setPercent: setPositionPercent,
	setAbsolute,
	isAbsolute,

	zIndex: Object.freeze({
		get: getZIndex,
		set: setZIndex,
		bringToFront,
		sendToBack,
		moveForward,
		moveBackward,
		normalize: normalizeZIndices,
		swap: swapZIndex,
	}),
});

export type PositionModule = typeof position;
