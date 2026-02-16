/**
 * Timer component namespace.
 *
 * Provides all operations for entity timers and periodic callbacks.
 *
 * @example
 * ```typescript
 * import { timer } from 'blecsd/components';
 * timer.set(world, eid, { duration: 1000, repeat: 5 });
 * timer.start(world, eid);
 * timer.onComplete(world, eid, () => { ... });
 * ```
 */
import {
	clearTimerCallbacks,
	getTimer,
	getTimerProgress,
	hasTimer,
	isTimerComplete,
	isTimerRunning,
	onTimerComplete,
	onTimerFire,
	pauseTimer,
	removeTimer,
	resetTimer,
	resetTimerStore,
	resumeTimer,
	setTimer,
	startTimer,
	stopTimer,
	updateTimers,
} from '../timer';

export const timer = Object.freeze({
	get: getTimer,
	has: hasTimer,
	set: setTimer,
	remove: removeTimer,

	start: startTimer,
	stop: stopTimer,
	pause: pauseTimer,
	resume: resumeTimer,
	reset: resetTimer,
	update: updateTimers,

	isRunning: isTimerRunning,
	isComplete: isTimerComplete,
	getProgress: getTimerProgress,

	callbacks: Object.freeze({
		onFire: onTimerFire,
		onComplete: onTimerComplete,
		clear: clearTimerCallbacks,
	}),

	resetStore: resetTimerStore,
});

export type TimerModule = typeof timer;
