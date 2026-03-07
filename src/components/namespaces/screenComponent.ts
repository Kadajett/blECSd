/**
 * Screen component namespace.
 *
 * Provides all operations for the screen entity (singleton).
 *
 * @example
 * ```typescript
 * import { screenComponent } from 'blecsd/components';
 * screenComponent.init(world, eid, { width: 80, height: 24 });
 * screenComponent.resize(world, eid, 120, 40);
 * ```
 */
import {
	destroyScreen,
	getScreen,
	getScreenCursor,
	getScreenData,
	getScreenFocus,
	getScreenHover,
	getScreenSize,
	hasScreen,
	hasScreenSingleton,
	initScreenComponent,
	isAutoPadding,
	isFullUnicode,
	isScreen,
	registerScreenSingleton,
	resetScreenSingleton,
	resizeScreen,
	screenExec,
	screenSpawn,
	setAutoPadding,
	setFullUnicode,
	setScreenCursor,
	setScreenCursorShape,
	setScreenCursorVisible,
	setScreenFocus,
	setScreenHover,
} from '../screen';

export const screenComponent = Object.freeze({
	get: getScreen,
	has: hasScreen,
	is: isScreen,
	getData: getScreenData,
	getSize: getScreenSize,
	init: initScreenComponent,
	destroy: destroyScreen,
	resize: resizeScreen,

	hasSingleton: hasScreenSingleton,
	registerSingleton: registerScreenSingleton,
	resetSingleton: resetScreenSingleton,

	getFocus: getScreenFocus,
	setFocus: setScreenFocus,
	getHover: getScreenHover,
	setHover: setScreenHover,

	isAutoPadding,
	setAutoPadding,
	isFullUnicode,
	setFullUnicode,

	cursor: Object.freeze({
		get: getScreenCursor,
		set: setScreenCursor,
		setShape: setScreenCursorShape,
		setVisible: setScreenCursorVisible,
	}),

	spawn: screenSpawn,
	exec: screenExec,
});

export type ScreenComponentModule = typeof screenComponent;
