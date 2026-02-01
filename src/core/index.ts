/**
 * Core module - ECS foundation
 * @module core
 */

export type {
	BoxConfig,
	ButtonConfig,
	InputConfig,
	ListConfig,
	ScreenConfig,
	TextConfig,
} from './entities';
export {
	BoxConfigSchema,
	ButtonConfigSchema,
	createBoxEntity,
	createButtonEntity,
	createInputEntity,
	createListEntity,
	createScreenEntity,
	createTextEntity,
	InputConfigSchema,
	ListConfigSchema,
	ScreenConfigSchema,
	TextConfigSchema,
} from './entities';
// Event system
export type { EventHandler, EventMap, ScreenEventMap, UIEventMap } from './events';
export { createEventBus, EventBus } from './events';
export {
	filterClickable,
	filterDirty,
	filterFocusable,
	filterVisible,
	filterVisibleDirty,
	getChildEntities,
	getDescendantEntities,
	getRootEntities,
	queryBorder,
	queryContent,
	queryFocusable,
	queryHierarchy,
	queryInteractive,
	queryPadding,
	queryRenderable,
	queryScrollable,
	sortByDepth,
	sortByTabIndex,
	sortByZIndex,
} from './queries';
export { createScheduler, getDeltaTime, Scheduler } from './scheduler';
export type { Entity, System, Unsubscribe, World } from './types';
export { LoopPhase } from './types';
export { createWorld, resetWorld } from './world';
