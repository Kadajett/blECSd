/**
 * TextInput configuration functions.
 * @module components/textInput/config
 */

import type { Entity, World } from '../../core/types';
import {
	DEFAULT_CENSOR_CHAR,
	DEFAULT_PLACEHOLDER,
	type TextInputConfig,
	type TextInputConfigOptions,
	type ValidationTiming,
	configStore,
} from './types';

/**
 * Sets the text input configuration.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * setTextInputConfig(world, textbox, {
 *   secret: true,
 *   censor: '*',
 *   maxLength: 20,
 *   validator: (value) => value.length >= 8 || 'Password must be at least 8 characters',
 *   validationTiming: 'onSubmit',
 * });
 * ```
 */
export function setTextInputConfig(
	_world: World,
	eid: Entity,
	options: TextInputConfigOptions,
): void {
	const current = configStore.get(eid) ?? {
		secret: false,
		censor: DEFAULT_CENSOR_CHAR,
		placeholder: DEFAULT_PLACEHOLDER,
		maxLength: 0,
		multiline: false,
		validator: undefined,
		validationTiming: 'both' as ValidationTiming,
	};

	configStore.set(eid, {
		secret: options.secret ?? current.secret,
		censor: options.censor ?? current.censor,
		placeholder: options.placeholder ?? current.placeholder,
		maxLength: options.maxLength ?? current.maxLength,
		multiline: options.multiline ?? current.multiline,
		validator: options.validator ?? current.validator,
		validationTiming: options.validationTiming ?? current.validationTiming,
	});
}

/**
 * Gets the text input configuration.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Configuration or defaults
 */
export function getTextInputConfig(_world: World, eid: Entity): TextInputConfig {
	return (
		configStore.get(eid) ?? {
			secret: false,
			censor: DEFAULT_CENSOR_CHAR,
			placeholder: DEFAULT_PLACEHOLDER,
			maxLength: 0,
			multiline: false,
			validator: undefined,
			validationTiming: 'both',
		}
	);
}

/**
 * Checks if the text input is in secret/password mode.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if in secret mode
 */
export function isSecretMode(world: World, eid: Entity): boolean {
	return getTextInputConfig(world, eid).secret;
}

/**
 * Gets the censor character for password display.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Censor character
 */
export function getCensorChar(world: World, eid: Entity): string {
	return getTextInputConfig(world, eid).censor;
}

/**
 * Gets the placeholder text.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Placeholder text
 */
export function getPlaceholder(world: World, eid: Entity): string {
	return getTextInputConfig(world, eid).placeholder;
}

/**
 * Gets the maximum input length.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Maximum length (0 = unlimited)
 */
export function getMaxLength(world: World, eid: Entity): number {
	return getTextInputConfig(world, eid).maxLength;
}

/**
 * Checks if the text input is multiline (textarea mode).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if multiline
 */
export function isMultiline(world: World, eid: Entity): boolean {
	return getTextInputConfig(world, eid).multiline;
}

/**
 * Masks a string for password display.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - The value to mask
 * @returns Masked string
 *
 * @example
 * ```typescript
 * const masked = maskValue(world, textbox, 'secret');
 * // Returns '******'
 * ```
 */
export function maskValue(world: World, eid: Entity, value: string): string {
	if (!isSecretMode(world, eid)) {
		return value;
	}
	const censor = getCensorChar(world, eid);
	return censor.repeat(value.length);
}
