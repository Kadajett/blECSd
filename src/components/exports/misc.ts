/**
 * Miscellaneous components (userData, stateMachine, registerNames)
 * @module components/exports/misc
 */

// Component name registration
export { registerBuiltinComponentNames } from '../registerNames';

// State Machine component
export {
	attachStateMachine,
	canSendEvent,
	detachStateMachine,
	getPreviousState,
	getState,
	getStateAge,
	hasStateMachine,
	isInState,
	StateMachineStore,
	sendEvent,
	updateStateAge,
} from '../stateMachine';

// UserData component
export type { UserDataObject } from '../userData';
export {
	clearAllUserData,
	getOrCreateUserData,
	getUserData,
	getUserDataCount,
	hasUserData,
	removeUserData,
	setUserData,
	UserData,
} from '../userData';
