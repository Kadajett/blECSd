/**
 * List Component State Machine Configuration
 *
 * @module components/list/stateMachine
 */

import type { StateMachineConfig } from '../../core/stateMachine';
import type { ListEvent, ListState } from './types';

/**
 * State machine configuration for list widgets.
 *
 * States:
 * - idle: List is not focused
 * - focused: List has focus, ready for navigation
 * - selecting: User is actively selecting (e.g., during mouse drag)
 * - searching: User is typing to search/filter items
 * - disabled: List is disabled and cannot be interacted with
 */
export const LIST_STATE_MACHINE_CONFIG: StateMachineConfig<ListState, ListEvent> = {
	initial: 'idle',
	states: {
		idle: {
			on: {
				focus: 'focused',
				disable: 'disabled',
			},
		},
		focused: {
			on: {
				blur: 'idle',
				startSelect: 'selecting',
				startSearch: 'searching',
				disable: 'disabled',
			},
		},
		selecting: {
			on: {
				endSelect: 'focused',
				blur: 'idle',
				disable: 'disabled',
			},
		},
		searching: {
			on: {
				endSearch: 'focused',
				blur: 'idle',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'idle',
			},
		},
	},
};
