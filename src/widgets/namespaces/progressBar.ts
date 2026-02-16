/**
 * ProgressBarWidget namespace.
 *
 * @example
 * ```typescript
 * import { progressBarWidget } from 'blecsd/widgets';
 * const pb = progressBarWidget.create(world, { min: 0, max: 100, value: 50 });
 * ```
 */
import { createProgressBar, resetProgressBarStore } from '../progressBar';

export const progressBarWidget = Object.freeze({
	create: createProgressBar,
	resetStore: resetProgressBarStore,
});

export type ProgressBarWidgetModule = typeof progressBarWidget;
