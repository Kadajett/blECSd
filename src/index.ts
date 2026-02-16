/**
 * blECSd Terminal UI Library
 *
 * A modern terminal UI library built on TypeScript and ECS architecture.
 *
 * This is the curated top-level API (Tier 1). For full module access, use
 * subpath imports: `blecsd/components`, `blecsd/terminal`, `blecsd/systems`, etc.
 *
 * @packageDocumentation
 */

export const VERSION = '0.6.0';

// ─── ECS Core ────────────────────────────────────────────────────────────────

export { destroyWorld } from './core/disposal';
export { addComponent, addEntity, hasComponent, removeEntity } from './core/ecs';
export type { Entity, System, World } from './core/types';
export { createWorld } from './core/world';

// ─── Entity Factories ────────────────────────────────────────────────────────

export {
	createBoxEntity,
	createButtonEntity,
	createCheckboxEntity,
	createInputEntity,
	createListEntity,
	createScreenEntity,
	createSelectEntity,
	createTextEntity,
} from './core/entities/factories';

// ─── Systems ─────────────────────────────────────────────────────────────────

export { animationSystem } from './systems/animationSystem';
export { focusSystem } from './systems/focusSystem';
export { inputSystem } from './systems/inputSystem';
export { layoutSystem } from './systems/layoutSystem';
export { cleanup, clearScreen, outputSystem } from './systems/outputSystem';
export { renderSystem } from './systems/renderSystem';

// ─── Component Helpers ───────────────────────────────────────────────────────

// Content
export { getText, setText, TextAlign } from './components/content';
export { getDimensions, setDimensions } from './components/dimensions';
// Focus
export { focusNext, focusPrev } from './components/focusable';
// Hierarchy
export { prepend } from './components/hierarchy';
// Position & dimensions
export {
	getPosition,
	getZIndex,
	normalizeZIndices,
	setPosition,
	setZIndex,
} from './components/position';
// Visibility
export { toggle } from './components/renderable';
// Scroll
export {
	ensureCursorVisible,
	scrollByLines,
	scrollToBottom,
	scrollToLine,
	scrollToTop,
} from './components/virtualViewport';

// Z-order
export { hitTest } from './core/hitTest';

// ─── Terminal I/O ────────────────────────────────────────────────────────────

// Input control (ECS-aware)
export {
	disableInput,
	disableKeys,
	disableMouse,
	enableInput,
	enableKeys,
	enableMouse,
} from './systems/interactiveSystem';
// ANSI utilities
export { stripAnsi } from './terminal/ansi/parser';
export { clearBuffer, fillRect, getCell, setCell } from './terminal/screen/cell';
// Screen buffer operations
export { createDoubleBuffer } from './terminal/screen/doubleBuffer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export { BoxConfigSchema, PositionValueSchema, TextConfigSchema } from './core';

// ─── Utility ─────────────────────────────────────────────────────────────────

export { renderText } from './utils/box';
export { getLine, getLines, getStats } from './utils/rope';
export { wrapText } from './utils/textWrap';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { DimensionValue } from './components';
export type {
	BoxConfig,
	CleanupCallback,
	HitTestResult,
	PositionValue,
	TextConfig,
	Unsubscribe,
} from './core';
export type { DirtyRect } from './systems';
export type {
	Cell,
	KeyHandler,
	MouseHandler,
	TerminalCapabilities,
} from './terminal';
export { CursorShape } from './terminal';
