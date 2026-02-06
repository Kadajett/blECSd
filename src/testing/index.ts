/**
 * Testing utilities for blECSd.
 *
 * Provides snapshot testing helpers, render utilities, and test buffer
 * setup for visual regression testing of terminal UI components.
 *
 * @module testing
 */

export type { TestBufferContext } from './snapshot';
export {
	captureTestScreen,
	cleanupTestBuffer,
	createTestBuffer,
	getCellBg,
	getCellChar,
	getCellFg,
	getRowText,
	renderBox,
	renderRegionToString,
	renderToString,
	runRender,
} from './snapshot';
