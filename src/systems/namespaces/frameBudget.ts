/**
 * Frame budget manager namespace.
 *
 * @example
 * ```typescript
 * import { frameBudget } from 'blecsd/systems';
 * const manager = frameBudget.create({ targetFps: 60, budgetMs: 16 });
 * const wrappedSystem = frameBudget.profiledSystem('mySystem', mySystem, manager);
 * frameBudget.recordFrame(manager, deltaMs);
 * const stats = frameBudget.getStats(manager);
 * ```
 */
import {
	createFrameBudgetManager,
	destroyFrameBudgetManager,
	exportFrameBudgetMetrics,
	getFrameBudgetStats,
	onBudgetAlert,
	profiledSystem,
	recordFrameBudgetSystemTime,
	recordFrameTime,
	recordPhaseTime,
	resetFrameBudget,
} from '../frameBudget';

export const frameBudget = Object.freeze({
	create: createFrameBudgetManager,
	destroy: destroyFrameBudgetManager,
	profiledSystem,
	recordFrame: recordFrameTime,
	recordSystemTime: recordFrameBudgetSystemTime,
	recordPhase: recordPhaseTime,
	getStats: getFrameBudgetStats,
	onAlert: onBudgetAlert,
	reset: resetFrameBudget,
	export: exportFrameBudgetMetrics,
});

export type FrameBudgetModule = typeof frameBudget;
