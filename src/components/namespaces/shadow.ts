/**
 * Shadow component namespace.
 *
 * Provides all operations for entity shadow effects.
 *
 * @example
 * ```typescript
 * import { shadow } from 'blecsd/components';
 * shadow.set(world, eid, { offsetX: 1, offsetY: 1, opacity: 0.5 });
 * shadow.enable(world, eid);
 * ```
 */
import {
	blendShadowColor,
	calculateShadowPositions,
	disableShadow,
	enableShadow,
	getShadow,
	getShadowChar,
	getShadowColor,
	getShadowOffset,
	getShadowOpacity,
	hasShadow,
	isShadowBlending,
	isShadowEnabled,
	removeShadow,
	setShadow,
	setShadowBlend,
	setShadowChar,
	setShadowColor,
	setShadowOffset,
	setShadowOpacity,
	toggleShadow,
} from '../shadow';

export const shadow = Object.freeze({
	get: getShadow,
	has: hasShadow,
	set: setShadow,
	remove: removeShadow,

	enable: enableShadow,
	disable: disableShadow,
	toggle: toggleShadow,
	isEnabled: isShadowEnabled,

	getChar: getShadowChar,
	setChar: setShadowChar,
	getColor: getShadowColor,
	setColor: setShadowColor,
	getOffset: getShadowOffset,
	setOffset: setShadowOffset,
	getOpacity: getShadowOpacity,
	setOpacity: setShadowOpacity,

	isBlending: isShadowBlending,
	setBlend: setShadowBlend,
	blendColor: blendShadowColor,
	calculatePositions: calculateShadowPositions,
});

export type ShadowModule = typeof shadow;
