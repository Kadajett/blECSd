/**
 * Component name registration for better validation error messages
 *
 * This file registers all built-in components with their human-readable names
 * to provide clear error messages when component validation fails.
 *
 * @module components/registerNames
 */

import { registerComponentName } from '../core/validation';
import { Animation } from './animation';
import { Border } from './border';
import { Collider } from './collision';
import { Dimensions } from './dimensions';
import { Focusable } from './focusable';
import { Hierarchy } from './hierarchy';
import { Interactive } from './interactive';
import { Label } from './label';
import { Padding } from './padding';
import { Position } from './position';
import { Renderable } from './renderable';
import { Velocity } from './velocity';

/**
 * Registers all built-in component names for better error messages.
 * Call this early in your application (e.g., in initialization code).
 *
 * @example
 * ```typescript
 * import { registerBuiltinComponentNames } from 'blecsd/components';
 *
 * // Call once during app initialization
 * registerBuiltinComponentNames();
 * ```
 */
export function registerBuiltinComponentNames(): void {
	// Core positioning and rendering
	registerComponentName(Position, 'Position');
	registerComponentName(Dimensions, 'Dimensions');
	registerComponentName(Renderable, 'Renderable');

	// Hierarchy
	registerComponentName(Hierarchy, 'Hierarchy');

	// Styling
	registerComponentName(Border, 'Border');
	registerComponentName(Padding, 'Padding');

	// Text and content
	registerComponentName(Label, 'Label');

	// Interaction
	registerComponentName(Interactive, 'Interactive');
	registerComponentName(Focusable, 'Focusable');

	// Animation and physics
	registerComponentName(Animation, 'Animation');
	registerComponentName(Velocity, 'Velocity');
	registerComponentName(Collider, 'Collider');
}
