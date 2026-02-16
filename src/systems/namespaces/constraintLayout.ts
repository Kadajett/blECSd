/**
 * Constraint layout namespace.
 *
 * @example
 * ```typescript
 * import { constraintLayout } from 'blecsd/systems';
 * const constraints = [
 *   constraintLayout.fixed(100),
 *   constraintLayout.percentage(0.5),
 *   constraintLayout.ratio(1.5),
 * ];
 * const rects = constraintLayout.horizontal({ x: 0, y: 0, width: 800, height: 600 }, constraints);
 * ```
 */
import {
	fixed,
	layoutHorizontal,
	layoutVertical,
	max,
	min,
	percentage,
	ratio,
} from '../constraintLayout';

export const constraintLayout = Object.freeze({
	fixed,
	percentage,
	ratio,
	min,
	max,
	horizontal: layoutHorizontal,
	vertical: layoutVertical,
});

export type ConstraintLayoutModule = typeof constraintLayout;
