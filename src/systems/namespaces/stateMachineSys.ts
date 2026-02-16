/**
 * State machine system namespace.
 *
 * @example
 * ```typescript
 * import { stateMachineSys } from 'blecsd/systems';
 * const world = createWorld();
 * stateMachineSys.register(world);
 * stateMachineSys.updateAges(world, deltaMs);
 * const age = stateMachineSys.getStateAge(world, eid);
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

export const stateMachineSys = Object.freeze({
	create: createStateMachineSystem,
	register: registerStateMachineSystem,
	system: stateMachineSystem,
	query: queryStateMachine,
	updateAges: updateStateAges,
	getStateAge: getSystemStateAge,
	getAgeStore: getStateAgeStore,
	resetAge: resetStateAge,
});

export type StateMachineSysModule = typeof stateMachineSys;
