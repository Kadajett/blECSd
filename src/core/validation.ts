/**
 * Entity and component validation utilities
 *
 * Provides helpful error messages when components are missing or entities are invalid.
 *
 * @module core/validation
 */

import type { ComponentRef } from './ecs';
import { entityExists, hasComponent } from './ecs';
import type { Entity, World } from './types';

/**
 * Creates an entity validation error with the given message.
 *
 * @param message - The error message
 * @returns An Error with name set to 'EntityValidationError'
 *
 * @example
 * ```typescript
 * import { createEntityValidationError, isEntityValidationError } from 'blecsd';
 *
 * const error = createEntityValidationError('Entity 5 is missing Position');
 * console.log(error.name); // 'EntityValidationError'
 * console.log(isEntityValidationError(error)); // true
 * ```
 */
export function createEntityValidationError(message: string): Error {
	const error = new Error(message);
	error.name = 'EntityValidationError';
	return error;
}

/**
 * Type guard to check if an error is an entity validation error.
 *
 * @param error - The value to check
 * @returns True if the error is an EntityValidationError
 *
 * @example
 * ```typescript
 * import { isEntityValidationError } from 'blecsd';
 *
 * try {
 *   validateEntity(world, eid, [Position], 'test');
 * } catch (error) {
 *   if (isEntityValidationError(error)) {
 *     console.log('Validation failed:', error.message);
 *   }
 * }
 * ```
 */
export function isEntityValidationError(error: unknown): error is Error {
	return error instanceof Error && error.name === 'EntityValidationError';
}

/**
 * Component name registry - maps component objects to their names for better error messages
 */
const componentNameRegistry = new WeakMap<ComponentRef, string>();

/**
 * Registers a component name for better error messages.
 * This is optional but recommended for clearer validation errors.
 *
 * @param component - The component to register
 * @param name - The human-readable name for the component
 *
 * @example
 * ```typescript
 * import { registerComponentName, Position, Velocity } from 'blecsd';
 *
 * registerComponentName(Position, 'Position');
 * registerComponentName(Velocity, 'Velocity');
 * ```
 */
export function registerComponentName(component: ComponentRef, name: string): void {
	componentNameRegistry.set(component, name);
}

/**
 * Gets a human-readable name for a component.
 * Returns the registered name if available, otherwise falls back to inspecting the component structure.
 *
 * @param component - The component to get the name of
 * @returns Human-readable component name
 */
function getComponentName(component: ComponentRef): string {
	// Check registry first
	const registeredName = componentNameRegistry.get(component);
	if (registeredName) {
		return registeredName;
	}

	// Try to infer from object structure - bitecs components have typed array properties
	if (component && typeof component === 'object') {
		const keys = Object.keys(component);
		if (keys.length > 0) {
			// If component has properties like 'x', 'y' => likely Position
			// This is a fallback - registration is better
			return `Component(${keys.slice(0, 2).join(', ')}${keys.length > 2 ? ', ...' : ''})`;
		}
	}

	return 'Component';
}

/**
 * Validates that an entity exists and has all required components.
 * Throws a descriptive error if validation fails.
 *
 * @param world - The ECS world
 * @param eid - The entity ID to validate
 * @param requiredComponents - Array of components the entity must have
 * @param context - Context string describing where this validation is happening (e.g., "layoutSystem", "createBox")
 * @throws {Error} An EntityValidationError if entity doesn't exist or is missing required components
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, validateEntity, Position, Velocity } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // This will throw because entity is missing Position and Velocity
 * try {
 *   validateEntity(world, entity, [Position, Velocity], 'movementSystem');
 * } catch (error) {
 *   console.error(error.message);
 *   // "Entity 0 is missing required components for movementSystem: Position, Velocity.
 *   //  Did you forget to call addComponent(world, eid, Position)?"
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, validateEntity, Position } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * addComponent(world, entity, Position);
 *
 * // This passes - no error thrown
 * validateEntity(world, entity, [Position], 'renderSystem');
 * ```
 */
export function validateEntity(
	world: World,
	eid: Entity,
	requiredComponents: ComponentRef[],
	context: string,
): void {
	// Check if entity exists
	if (!entityExists(world, eid)) {
		throw createEntityValidationError(
			`Entity ${eid} does not exist in the world (context: ${context}). ` +
				'The entity may have been removed or never created.',
		);
	}

	// Check for missing components
	const missingComponents: string[] = [];
	for (const component of requiredComponents) {
		if (!hasComponent(world, eid, component)) {
			missingComponents.push(getComponentName(component));
		}
	}

	if (missingComponents.length > 0) {
		const componentList = missingComponents.join(', ');
		const firstMissing = missingComponents[0];
		throw createEntityValidationError(
			`Entity ${eid} is missing required component${missingComponents.length > 1 ? 's' : ''} for ${context}: ${componentList}. ` +
				`Did you forget to call addComponent(world, ${eid}, ${firstMissing})?`,
		);
	}
}

/**
 * Validates that an entity exists and has all required components.
 * Returns true if valid, false if invalid (does not throw).
 *
 * @param world - The ECS world
 * @param eid - The entity ID to validate
 * @param requiredComponents - Array of components the entity must have
 * @returns True if entity exists and has all required components, false otherwise
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, addComponent, isEntityValid, Position, Velocity } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 * addComponent(world, entity, Position);
 *
 * console.log(isEntityValid(world, entity, [Position])); // true
 * console.log(isEntityValid(world, entity, [Position, Velocity])); // false
 * ```
 */
export function isEntityValid(
	world: World,
	eid: Entity,
	requiredComponents: ComponentRef[],
): boolean {
	if (!entityExists(world, eid)) {
		return false;
	}

	for (const component of requiredComponents) {
		if (!hasComponent(world, eid, component)) {
			return false;
		}
	}

	return true;
}
