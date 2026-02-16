/**
 * Label component namespace.
 *
 * Provides all operations for entity labels.
 *
 * @example
 * ```typescript
 * import { label } from 'blecsd/components';
 * label.set(world, eid, { text: 'Username', position: LabelPosition.Top });
 * ```
 */
import {
	getLabel,
	getLabelPosition,
	getLabelText,
	hasLabel,
	hasLabelText,
	removeLabel,
	setLabel,
	setLabelOffset,
	setLabelPosition,
} from '../label';

export const label = Object.freeze({
	get: getLabel,
	has: hasLabel,
	set: setLabel,
	remove: removeLabel,
	getText: getLabelText,
	hasText: hasLabelText,
	getPosition: getLabelPosition,
	setPosition: setLabelPosition,
	setOffset: setLabelOffset,
});

export type LabelModule = typeof label;
