/**
 * StateMachine component namespace.
 *
 * Provides all operations for entity state machine management.
 *
 * @example
 * ```typescript
 * import { stateMachine } from 'blecsd/components';
 * stateMachine.attach(world, eid, config);
 * stateMachine.sendEvent(world, eid, 'CLICK');
 * const state = stateMachine.getState(world, eid);
 * ```
 */
import {
	attachStateMachine,
	canSendEvent,
	detachStateMachine,
	getPreviousState,
	getState,
	getStateAge,
	hasStateMachine,
	isInState,
	sendEvent,
	updateStateAge,
} from '../stateMachine';

export const stateMachine = Object.freeze({
	attach: attachStateMachine,
	detach: detachStateMachine,
	has: hasStateMachine,

	getState,
	getPreviousState,
	isInState,
	getStateAge,
	updateStateAge,

	sendEvent,
	canSendEvent,
});

export type StateMachineModule = typeof stateMachine;
