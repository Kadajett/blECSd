/**
 * TextInput validation functions.
 * @module components/textInput/validation
 */

import type { Entity, World } from '../../core/types';
import { getTextInputConfig } from './config';
import { validationErrors } from './types';

/**
 * Validates a value against the text input's validator function.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - Value to validate
 * @returns true if valid, false if invalid
 *
 * @example
 * ```typescript
 * const isValid = validateTextInput(world, textbox, 'test@example.com');
 * if (!isValid) {
 *   const error = getValidationError(world, textbox);
 *   console.log('Validation failed:', error);
 * }
 * ```
 */
export function validateTextInput(world: World, eid: Entity, value: string): boolean {
	const config = getTextInputConfig(world, eid);
	if (!config.validator) {
		// No validator = always valid
		validationErrors.set(eid, null);
		return true;
	}

	const result = config.validator(value);

	if (result === true) {
		validationErrors.set(eid, null);
		return true;
	}

	if (result === false) {
		validationErrors.set(eid, 'Invalid input');
		return false;
	}

	// result is an error message string
	validationErrors.set(eid, result);
	return false;
}

/**
 * Gets the current validation error message for a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Error message or null if valid
 *
 * @example
 * ```typescript
 * const error = getValidationError(world, textbox);
 * if (error) {
 *   console.log('Error:', error);
 * }
 * ```
 */
export function getValidationError(_world: World, eid: Entity): string | null {
	return validationErrors.get(eid) ?? null;
}

/**
 * Checks if a text input currently has a validation error.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if there is a validation error
 */
export function hasValidationError(world: World, eid: Entity): boolean {
	return getValidationError(world, eid) !== null;
}

/**
 * Clears the validation error for a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearValidationError(_world: World, eid: Entity): void {
	validationErrors.set(eid, null);
}
