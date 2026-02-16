/**
 * Loading widget namespace.
 *
 * @example
 * ```typescript
 * import { loading } from 'blecsd/widgets';
 * const loader = loading.create(world, { message: 'Loading...' });
 * loading.show(world, loader.eid);
 * loading.setMessage(world, loader.eid, 'Processing...');
 * loading.hide(world, loader.eid);
 * loading.updateAnimation(world, deltaTime);
 * ```
 */
import {
	createLoading,
	DEFAULT_LOADING_BG,
	DEFAULT_LOADING_FG,
	hideLoading,
	isLoadingWidget,
	resetLoadingStore,
	setLoadingMessage,
	showLoading,
	updateLoadingAnimation,
} from '../loading';

export const loading = Object.freeze({
	create: createLoading,
	is: isLoadingWidget,
	show: showLoading,
	hide: hideLoading,
	setMessage: setLoadingMessage,
	updateAnimation: updateLoadingAnimation,
	resetStore: resetLoadingStore,
	DEFAULT_LOADING_BG,
	DEFAULT_LOADING_FG,
});

export type LoadingModule = typeof loading;
