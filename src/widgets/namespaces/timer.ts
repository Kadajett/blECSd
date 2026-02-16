/**
 * TimerWidget namespace.
 *
 * @example
 * ```typescript
 * import { timerWidget } from 'blecsd/widgets';
 * const timer = timerWidget.createTimer(world, { duration: 60 });
 * const stopwatch = timerWidget.createStopwatch(world, {});
 * timerWidget.updateWidgets(world, deltaTime);
 * ```
 */
import {
	createStopwatch,
	createTimer,
	isStopwatch,
	isTimer,
	resetStopwatchWidgetStore,
	resetTimerWidgetStore,
	updateTimeWidgets,
} from '../timer';

export const timerWidget = Object.freeze({
	createTimer,
	createStopwatch,
	isTimer,
	isStopwatch,
	updateWidgets: updateTimeWidgets,
	resetTimerStore: resetTimerWidgetStore,
	resetStopwatchStore: resetStopwatchWidgetStore,
});

export type TimerWidgetModule = typeof timerWidget;
