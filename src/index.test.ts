import { beforeAll, describe, expect, it } from 'vitest';
// Type-only imports to verify type exports compile
import type {
	BoxConfig,
	Cell,
	CleanupCallback,
	DimensionValue,
	DirtyRect,
	Entity,
	HitTestResult,
	KeyHandler,
	MouseHandler,
	PositionValue,
	System,
	TerminalCapabilities,
	TextConfig,
	Unsubscribe,
	World,
} from './index';
import {
	// ECS Core
	addComponent,
	addEntity,
	// Systems
	animationSystem,
	// Schemas
	BoxConfigSchema,
	CursorShape,
	cleanup,
	// Terminal I/O
	clearBuffer,
	clearScreen,
	// Entity Factories
	createBoxEntity,
	createButtonEntity,
	createCheckboxEntity,
	createDoubleBuffer,
	createInputEntity,
	createListEntity,
	createScreenEntity,
	createSelectEntity,
	createTextEntity,
	createWorld,
	destroyWorld,
	disableInput,
	disableKeys,
	disableMouse,
	enableInput,
	enableKeys,
	enableMouse,
	// Component Helpers
	ensureCursorVisible,
	fillRect,
	focusNext,
	focusPrev,
	focusSystem,
	getCell,
	getDimensions,
	// Utility
	getLine,
	getLines,
	getPosition,
	getStats,
	getText,
	getZIndex,
	hasComponent,
	hitTest,
	inputSystem,
	layoutSystem,
	normalizeZIndices,
	outputSystem,
	PositionValueSchema,
	prepend,
	removeEntity,
	renderSystem,
	renderText,
	scrollByLines,
	scrollToBottom,
	scrollToLine,
	scrollToTop,
	setCell,
	setDimensions,
	setPosition,
	setText,
	setZIndex,
	stripAnsi,
	TextAlign,
	TextConfigSchema,
	toggle,
	// Version
	VERSION,
	wrapText,
} from './index';

describe('blECSd Tier 1 exports', () => {
	it('exports VERSION', () => {
		expect(VERSION).toBe('0.6.0');
	});

	describe('ECS Core', () => {
		it('exports world management', () => {
			expect(typeof createWorld).toBe('function');
			expect(typeof destroyWorld).toBe('function');
		});

		it('exports entity management', () => {
			expect(typeof addEntity).toBe('function');
			expect(typeof removeEntity).toBe('function');
		});

		it('exports component management', () => {
			expect(typeof addComponent).toBe('function');
			expect(typeof hasComponent).toBe('function');
		});
	});

	describe('Entity Factories', () => {
		it('exports all Tier 1 factory functions', () => {
			expect(typeof createBoxEntity).toBe('function');
			expect(typeof createTextEntity).toBe('function');
			expect(typeof createButtonEntity).toBe('function');
			expect(typeof createScreenEntity).toBe('function');
			expect(typeof createInputEntity).toBe('function');
			expect(typeof createListEntity).toBe('function');
			expect(typeof createCheckboxEntity).toBe('function');
			expect(typeof createSelectEntity).toBe('function');
		});
	});

	describe('Systems', () => {
		it('exports core systems', () => {
			expect(typeof layoutSystem).toBe('function');
			expect(typeof renderSystem).toBe('function');
			expect(typeof outputSystem).toBe('function');
			expect(typeof inputSystem).toBe('function');
			expect(typeof focusSystem).toBe('function');
			expect(typeof animationSystem).toBe('function');
		});

		it('exports output system utilities', () => {
			expect(typeof cleanup).toBe('function');
			expect(typeof clearScreen).toBe('function');
		});
	});

	describe('Component Helpers', () => {
		it('exports position and dimensions helpers', () => {
			expect(typeof setPosition).toBe('function');
			expect(typeof getPosition).toBe('function');
			expect(typeof setDimensions).toBe('function');
			expect(typeof getDimensions).toBe('function');
			expect(typeof setZIndex).toBe('function');
			expect(typeof getZIndex).toBe('function');
			expect(typeof normalizeZIndices).toBe('function');
		});

		it('exports content helpers', () => {
			expect(typeof setText).toBe('function');
			expect(typeof getText).toBe('function');
			expect(TextAlign).toBeDefined();
		});

		it('exports scroll helpers', () => {
			expect(typeof scrollToTop).toBe('function');
			expect(typeof scrollToBottom).toBe('function');
			expect(typeof scrollToLine).toBe('function');
			expect(typeof scrollByLines).toBe('function');
			expect(typeof ensureCursorVisible).toBe('function');
		});

		it('exports focus helpers', () => {
			expect(typeof focusNext).toBe('function');
			expect(typeof focusPrev).toBe('function');
		});

		it('exports hierarchy helpers', () => {
			expect(typeof prepend).toBe('function');
		});

		it('exports visibility helpers', () => {
			expect(typeof toggle).toBe('function');
		});

		it('exports hit testing', () => {
			expect(typeof hitTest).toBe('function');
		});
	});

	describe('Terminal I/O', () => {
		it('exports input control functions', () => {
			expect(typeof enableInput).toBe('function');
			expect(typeof disableInput).toBe('function');
			expect(typeof enableMouse).toBe('function');
			expect(typeof disableMouse).toBe('function');
			expect(typeof enableKeys).toBe('function');
			expect(typeof disableKeys).toBe('function');
		});

		it('exports screen buffer operations', () => {
			expect(typeof createDoubleBuffer).toBe('function');
			expect(typeof fillRect).toBe('function');
			expect(typeof setCell).toBe('function');
			expect(typeof getCell).toBe('function');
			expect(typeof clearBuffer).toBe('function');
		});

		it('exports ANSI utilities', () => {
			expect(typeof stripAnsi).toBe('function');
		});

		it('exports CursorShape constants', () => {
			expect(CursorShape).toBeDefined();
			expect(typeof CursorShape).toBe('object');
		});

		it('createDoubleBuffer works correctly', () => {
			const buffer = createDoubleBuffer(1, 1);
			expect(buffer.width).toBe(1);
			expect(buffer.height).toBe(1);
		});
	});

	describe('Schemas', () => {
		it('exports validation schemas', () => {
			expect(BoxConfigSchema).toBeDefined();
			expect(TextConfigSchema).toBeDefined();
			expect(PositionValueSchema).toBeDefined();
		});
	});

	describe('Utility', () => {
		it('exports text rendering utilities', () => {
			expect(typeof renderText).toBe('function');
			expect(typeof wrapText).toBe('function');
		});

		it('exports rope utilities', () => {
			expect(typeof getLine).toBe('function');
			expect(typeof getLines).toBe('function');
			expect(typeof getStats).toBe('function');
		});
	});
});

describe('Tier 1 does NOT export internal symbols', () => {
	// biome-ignore lint/suspicious/noExplicitAny: testing that internals are not exported
	let indexModule: Record<string, any>;

	beforeAll(async () => {
		indexModule = await import('./index');
	});

	it('does not export advanced ECS primitives (use blecsd/core)', () => {
		expect(indexModule.defineComponent).toBeUndefined();
		expect(indexModule.defineQuery).toBeUndefined();
		expect(indexModule.pipe).toBeUndefined();
		expect(indexModule.removeComponent).toBeUndefined();
	});

	it('does not export widget-specific factory functions (use blecsd/widgets)', () => {
		expect(indexModule.createTextboxEntity).toBeUndefined();
		expect(indexModule.createTextareaEntity).toBeUndefined();
		expect(indexModule.createSliderEntity).toBeUndefined();
		expect(indexModule.createFormEntity).toBeUndefined();
		expect(indexModule.createProgressBarEntity).toBeUndefined();
		expect(indexModule.createRadioSetEntity).toBeUndefined();
		expect(indexModule.createRadioButtonEntity).toBeUndefined();
	});

	it('does not export widget internals (use blecsd/widgets)', () => {
		expect(indexModule.createBox).toBeUndefined();
		expect(indexModule.createList).toBeUndefined();
		expect(indexModule.createText).toBeUndefined();
		expect(indexModule.Accordion).toBeUndefined();
		expect(indexModule.createAccordion).toBeUndefined();
		expect(indexModule.BigText).toBeUndefined();
		expect(indexModule.createBigText).toBeUndefined();
	});

	it('does not export terminal detection internals (use blecsd/terminal)', () => {
		expect(indexModule.isScreen).toBeUndefined();
		expect(indexModule.setCursorVisible).toBeUndefined();
		expect(indexModule.isCursorVisible).toBeUndefined();
		expect(indexModule.resetCursorBlink).toBeUndefined();
	});

	it('does not export debug/error modules (use blecsd/debug, blecsd/errors)', () => {
		expect(indexModule.debugLog).toBeUndefined();
		expect(indexModule.createBlECSdError).toBeUndefined();
	});

	it('does not export specialized systems (use blecsd/systems)', () => {
		expect(indexModule.scrollSystem).toBeUndefined();
	});
});

describe('Type exports compile correctly', () => {
	it('type aliases are usable', () => {
		// These are compile-time checks. If the types don't exist, TypeScript
		// will fail before this test runs. This test just documents the contract.
		const _world: World | null = null;
		const _entity: Entity | null = null;
		const _system: System | null = null;
		const _boxConfig: BoxConfig | null = null;
		const _textConfig: TextConfig | null = null;
		const _positionValue: PositionValue | null = null;
		const _dimensionValue: DimensionValue | null = null;
		const _hitTestResult: HitTestResult | null = null;
		const _cleanupCallback: CleanupCallback | null = null;
		const _unsubscribe: Unsubscribe | null = null;
		const _cell: Cell | null = null;
		const _cursorShape: typeof CursorShape | null = null;
		const _capabilities: TerminalCapabilities | null = null;
		const _keyHandler: KeyHandler | null = null;
		const _mouseHandler: MouseHandler | null = null;
		const _dirtyRect: DirtyRect | null = null;

		// Prevent unused variable warnings
		expect(_world).toBeNull();
		expect(_entity).toBeNull();
		expect(_system).toBeNull();
		expect(_boxConfig).toBeNull();
		expect(_textConfig).toBeNull();
		expect(_positionValue).toBeNull();
		expect(_dimensionValue).toBeNull();
		expect(_hitTestResult).toBeNull();
		expect(_cleanupCallback).toBeNull();
		expect(_unsubscribe).toBeNull();
		expect(_cell).toBeNull();
		expect(_cursorShape).toBeNull();
		expect(_capabilities).toBeNull();
		expect(_keyHandler).toBeNull();
		expect(_mouseHandler).toBeNull();
		expect(_dirtyRect).toBeNull();
	});
});
