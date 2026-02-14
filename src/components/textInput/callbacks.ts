/**
 * TextInput event callbacks.
 * @module components/textInput/callbacks
 */

import type { Entity, World } from '../../core/types';
import {
	cancelCallbacks,
	configStore,
	submitCallbacks,
	validationErrors,
	valueChangeCallbacks,
} from './types';
import { getTextInputConfig } from './config';
import { validateTextInput } from './validation';

/**
 * Registers a callback for value changes.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param callback - Function to call on value change
 * @returns Unsubscribe function
 */
export function onTextInputChange(
	_world: World,
	eid: Entity,
	callback: (value: string) => void,
): () => void {
	let callbacks = valueChangeCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		valueChangeCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = valueChangeCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for submit events.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param callback - Function to call on submit
 * @returns Unsubscribe function
 */
export function onTextInputSubmit(
	_world: World,
	eid: Entity,
	callback: (value: string) => void,
): () => void {
	let callbacks = submitCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		submitCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = submitCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for cancel events.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param callback - Function to call on cancel
 * @returns Unsubscribe function
 */
export function onTextInputCancel(_world: World, eid: Entity, callback: () => void): () => void {
	let callbacks = cancelCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		cancelCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = cancelCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Emits a value change event.
 * Runs validation if validationTiming is 'onChange' or 'both'.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - New value
 */
export function emitValueChange(world: World, eid: Entity, value: string): void {
	const config = getTextInputConfig(world, eid);

	// Run validation on change if configured
	if (
		config.validator &&
		(config.validationTiming === 'onChange' || config.validationTiming === 'both')
	) {
		validateTextInput(world, eid, value);
	}

	const callbacks = valueChangeCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(value);
		}
	}
}

/**
 * Emits a submit event.
 * Runs validation if validationTiming is 'onSubmit' or 'both'.
 * If validation fails, the submit event is not emitted.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - Submitted value
 * @returns true if submitted, false if validation failed
 */
export function emitSubmit(world: World, eid: Entity, value: string): boolean {
	const config = getTextInputConfig(world, eid);

	// Run validation on submit if configured
	if (
		config.validator &&
		(config.validationTiming === 'onSubmit' || config.validationTiming === 'both')
	) {
		const isValid = validateTextInput(world, eid, value);
		if (!isValid) {
			// Validation failed - do not emit submit
			return false;
		}
	}

	const callbacks = submitCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(value);
		}
	}
	return true;
}

/**
 * Emits a cancel event.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function emitCancel(_world: World, eid: Entity): void {
	const callbacks = cancelCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}
}

/**
 * Clears all callbacks for a text input.
 * Call this when destroying a text input entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearTextInputCallbacks(_world: World, eid: Entity): void {
	valueChangeCallbacks.delete(eid);
	submitCallbacks.delete(eid);
	cancelCallbacks.delete(eid);
	configStore.delete(eid);
	validationErrors.delete(eid);
}
