/**
 * Velocity component namespace.
 *
 * Provides all operations for entity velocity, acceleration, and physics.
 *
 * @example
 * ```typescript
 * import { velocity } from 'blecsd/components';
 * velocity.set(world, eid, 1, 0);
 * velocity.updateMovement(world, eid, dt);
 * velocity.stop(world, eid);
 * ```
 */
import {
	addVelocity,
	applyAccelerationToEntity,
	applyFrictionToEntity,
	applyVelocityToEntity,
	clampSpeedForEntity,
	clearAcceleration,
	getAcceleration,
	getSpeed,
	getVelocity,
	hasAcceleration,
	hasVelocity,
	removeAcceleration,
	removeVelocity,
	setAcceleration,
	setFriction,
	setMaxSpeed,
	setVelocity,
	setVelocityOptions,
	stopEntity,
	updateEntityMovement,
} from '../velocity';

export const velocity = Object.freeze({
	get: getVelocity,
	has: hasVelocity,
	set: setVelocity,
	add: addVelocity,
	remove: removeVelocity,
	setOptions: setVelocityOptions,

	getSpeed,
	setMaxSpeed,
	setFriction,
	stop: stopEntity,

	applyToEntity: applyVelocityToEntity,
	clampSpeed: clampSpeedForEntity,
	applyFriction: applyFrictionToEntity,
	updateMovement: updateEntityMovement,

	acceleration: Object.freeze({
		get: getAcceleration,
		has: hasAcceleration,
		set: setAcceleration,
		clear: clearAcceleration,
		remove: removeAcceleration,
		applyToEntity: applyAccelerationToEntity,
	}),
});

export type VelocityModule = typeof velocity;
