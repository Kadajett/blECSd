/**
 * Dimensions component namespace.
 *
 * Provides all operations for entity sizing and constraints.
 *
 * @example
 * ```typescript
 * import { dimensions } from 'blecsd/components';
 * dimensions.set(world, eid, { width: 40, height: 10 });
 * dimensions.setConstraints(world, eid, { minWidth: 20, maxWidth: 80 });
 * ```
 */
import {
	decodePercentage,
	encodePercentage,
	getDimensions,
	getResolvedHeight,
	getResolvedWidth,
	hasDimensions,
	isPercentage,
	setConstraints,
	setDimensions,
	setShrink,
	shouldShrink,
} from '../dimensions';

export const dimensions = Object.freeze({
	set: setDimensions,
	get: getDimensions,
	has: hasDimensions,

	getResolvedWidth,
	getResolvedHeight,
	setConstraints,

	setShrink,
	shouldShrink,

	percentage: Object.freeze({
		encode: encodePercentage,
		decode: decodePercentage,
		is: isPercentage,
	}),
});

export type DimensionsModule = typeof dimensions;
