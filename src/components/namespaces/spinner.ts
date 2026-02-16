/**
 * Spinner component namespace.
 *
 * Provides all operations for loading spinner components.
 *
 * @example
 * ```typescript
 * import { spinner } from 'blecsd/components';
 * spinner.add(world, eid, { interval: 100 });
 * spinner.advance(world, eid, dt);
 * const char = spinner.getChar(world, eid);
 * ```
 */
import {
	addSpinner,
	advanceSpinnerFrame,
	getSpinnerChar,
	getSpinnerData,
	hasSpinner,
	removeSpinner,
	resetSpinner,
	resetSpinnerStore,
	setSpinnerFrames,
	setSpinnerInterval,
	updateSpinner,
} from '../spinner';

export const spinner = Object.freeze({
	add: addSpinner,
	has: hasSpinner,
	remove: removeSpinner,
	getData: getSpinnerData,
	getChar: getSpinnerChar,

	advance: advanceSpinnerFrame,
	update: updateSpinner,
	reset: resetSpinner,

	setFrames: setSpinnerFrames,
	setInterval: setSpinnerInterval,

	resetStore: resetSpinnerStore,
});

export type SpinnerModule = typeof spinner;
