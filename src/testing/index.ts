/**
 * Testing utilities for blECSd.
 *
 * Provides test fixtures, helper utilities, snapshot testing helpers,
 * render utilities, and test buffer setup for visual regression testing
 * of terminal UI components.
 *
 * @module testing
 */

export * from './fixtures';
export type { IntegrationTestContext } from './integration';
export {
	createInteractiveEntity,
	createTestScreen,
	simulateClick,
	simulateKey,
	simulateMouse,
	teardownTestScreen,
} from './integration';
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
