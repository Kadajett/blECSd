/**
 * ProgressBar component namespace.
 *
 * Provides all operations for progress bar components.
 *
 * @example
 * ```typescript
 * import { progressBar } from 'blecsd/components';
 * progressBar.attach(world, eid);
 * progressBar.set(world, eid, 75);
 * progressBar.complete(world, eid);
 * ```
 */
import {
	attachProgressBarBehavior,
	clearProgressBarCallbacks,
	clearProgressBarDisplay,
	completeProgress,
	decrementProgress,
	getProgress,
	getProgressBarDisplay,
	getProgressEmptyChar,
	getProgressFillChar,
	getProgressMax,
	getProgressMin,
	getProgressOrientation,
	getProgressPercentage,
	incrementProgress,
	isProgressBar,
	isProgressComplete,
	isShowingPercentage,
	onProgressChange,
	onProgressComplete,
	renderProgressString,
	resetProgress,
	setProgress,
	setProgressBarDisplay,
	setProgressOrientation,
	setProgressRange,
	setShowPercentage,
} from '../progressBar';

export const progressBar = Object.freeze({
	attach: attachProgressBarBehavior,
	is: isProgressBar,
	render: renderProgressString,

	get: getProgress,
	set: setProgress,
	reset: resetProgress,
	complete: completeProgress,
	increment: incrementProgress,
	decrement: decrementProgress,

	getPercentage: getProgressPercentage,
	isComplete: isProgressComplete,
	getMin: getProgressMin,
	getMax: getProgressMax,
	setRange: setProgressRange,

	getOrientation: getProgressOrientation,
	setOrientation: setProgressOrientation,

	isShowingPercentage,
	setShowPercentage,
	getFillChar: getProgressFillChar,
	getEmptyChar: getProgressEmptyChar,

	display: Object.freeze({
		get: getProgressBarDisplay,
		set: setProgressBarDisplay,
		clear: clearProgressBarDisplay,
	}),

	callbacks: Object.freeze({
		onChange: onProgressChange,
		onComplete: onProgressComplete,
		clear: clearProgressBarCallbacks,
	}),
});

export type ProgressBarModule = typeof progressBar;
