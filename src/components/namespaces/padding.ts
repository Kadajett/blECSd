/**
 * Padding component namespace.
 *
 * Provides all operations for entity padding configuration.
 *
 * @example
 * ```typescript
 * import { padding } from 'blecsd/components';
 * padding.set(world, eid, { top: 1, right: 2, bottom: 1, left: 2 });
 * padding.setAll(world, eid, 1);
 * ```
 */
import {
	getHorizontalPadding,
	getPadding,
	getVerticalPadding,
	hasPadding,
	hasPaddingValue,
	setPadding,
	setPaddingAll,
	setPaddingHV,
} from '../padding';

export const padding = Object.freeze({
	get: getPadding,
	has: hasPadding,
	set: setPadding,
	setAll: setPaddingAll,
	setHV: setPaddingHV,
	hasValue: hasPaddingValue,
	getHorizontal: getHorizontalPadding,
	getVertical: getVerticalPadding,
});

export type PaddingModule = typeof padding;
