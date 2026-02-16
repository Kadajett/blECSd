/**
 * State machine system namespace.
 *
 * @example
 * ```typescript
 * import { stateMachine } from 'blecsd/systems';
 * const world = createWorld();
 * stateMachine.register(world);
 * stateMachine.updateAges(world, deltaMs);
 * const age = stateMachine.getStateAge(world, eid);
 * ```
 */
import {
	createStateMachineSystem,
	getStateAgeStore,
	getSystemStateAge,
	queryStateMachine,
	registerStateMachineSystem,
	resetStateAge,
	stateMachineSystem,
	updateStateAges,
} from '../stateMachineSystem';

export const stateMachine = Object.freeze({
	create: createStateMachineSystem,
	register: registerStateMachineSystem,
	system: stateMachineSystem,
	query: queryStateMachine,
	updateAges: updateStateAges,
	getStateAge: getSystemStateAge,
	getAgeStore: getStateAgeStore,
	resetAge: resetStateAge,
});

export type StateMachineSystemModule = typeof stateMachine;
