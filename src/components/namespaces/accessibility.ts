/**
 * Accessibility component namespace.
 *
 * Provides all operations for ARIA-like accessibility labels and roles.
 *
 * @example
 * ```typescript
 * import { accessibility } from 'blecsd/components';
 * accessibility.setLabel(world, eid, 'Submit button');
 * accessibility.setRole(world, eid, 'button');
 * accessibility.announce('Form submitted');
 * ```
 */
import {
	announce,
	clearAccessibilityLabels,
	getAccessibleLabel,
	getAccessibleRole,
	setAccessibleLabel,
	setAccessibleRole,
} from '../accessibility';

export const accessibility = Object.freeze({
	getLabel: getAccessibleLabel,
	setLabel: setAccessibleLabel,
	getRole: getAccessibleRole,
	setRole: setAccessibleRole,
	clearLabels: clearAccessibilityLabels,
	announce,
});

export type AccessibilityModule = typeof accessibility;
