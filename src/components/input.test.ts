import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	clearInputBufferSelection,
	clearKeyboardInput,
	clearMouseInput,
	getInputBuffer,
	getInputBufferText,
	getKeyboardInput,
	getMouseInput,
	hasInputBuffer,
	hasKeyboardInput,
	hasMouseInput,
	InputBuffer,
	inputBufferStore,
	KeyboardInput,
	ModifierFlags,
	MouseButtons,
	MouseInput,
	packModifiers,
	recordClick,
	removeInputBuffer,
	removeKeyboardInput,
	removeMouseInput,
	setInputBuffer,
	setInputBufferSelection,
	setInputBufferText,
	setKeyboardInput,
	setMouseInput,
	unpackModifiers,
} from './input';

describe('ModifierFlags', () => {
	it('has correct values', () => {
		expect(ModifierFlags.NONE).toBe(0);
		expect(ModifierFlags.CTRL).toBe(1);
		expect(ModifierFlags.META).toBe(2);
		expect(ModifierFlags.SHIFT).toBe(4);
	});
});

describe('packModifiers', () => {
	it('packs no modifiers', () => {
		expect(packModifiers(false, false, false)).toBe(0);
	});

	it('packs ctrl only', () => {
		expect(packModifiers(true, false, false)).toBe(ModifierFlags.CTRL);
	});

	it('packs meta only', () => {
		expect(packModifiers(false, true, false)).toBe(ModifierFlags.META);
	});

	it('packs shift only', () => {
		expect(packModifiers(false, false, true)).toBe(ModifierFlags.SHIFT);
	});

	it('packs multiple modifiers', () => {
		expect(packModifiers(true, true, true)).toBe(
			ModifierFlags.CTRL | ModifierFlags.META | ModifierFlags.SHIFT,
		);
	});
});

describe('unpackModifiers', () => {
	it('unpacks no modifiers', () => {
		const { ctrl, meta, shift } = unpackModifiers(0);
		expect(ctrl).toBe(false);
		expect(meta).toBe(false);
		expect(shift).toBe(false);
	});

	it('unpacks ctrl only', () => {
		const { ctrl, meta, shift } = unpackModifiers(ModifierFlags.CTRL);
		expect(ctrl).toBe(true);
		expect(meta).toBe(false);
		expect(shift).toBe(false);
	});

	it('unpacks multiple modifiers', () => {
		const { ctrl, meta, shift } = unpackModifiers(
			ModifierFlags.CTRL | ModifierFlags.META | ModifierFlags.SHIFT,
		);
		expect(ctrl).toBe(true);
		expect(meta).toBe(true);
		expect(shift).toBe(true);
	});
});

describe('KeyboardInput component', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setKeyboardInput', () => {
		it('adds component and sets values', () => {
			const eid = addEntity(world);

			setKeyboardInput(world, eid, {
				lastKeyCode: 65,
				modifiers: ModifierFlags.SHIFT,
			});

			expect(hasKeyboardInput(world, eid)).toBe(true);
			expect(KeyboardInput.lastKeyCode[eid]).toBe(65);
			expect(KeyboardInput.modifiers[eid]).toBe(ModifierFlags.SHIFT);
		});

		it('sets modifiers from booleans', () => {
			const eid = addEntity(world);

			setKeyboardInput(world, eid, {
				ctrl: true,
				shift: true,
			});

			expect(KeyboardInput.modifiers[eid]).toBe(ModifierFlags.CTRL | ModifierFlags.SHIFT);
		});

		it('updates existing component', () => {
			const eid = addEntity(world);

			setKeyboardInput(world, eid, { lastKeyCode: 65 });
			setKeyboardInput(world, eid, { lastKeyCode: 66 });

			expect(KeyboardInput.lastKeyCode[eid]).toBe(66);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			const result = setKeyboardInput(world, eid, {});
			expect(result).toBe(eid);
		});
	});

	describe('getKeyboardInput', () => {
		it('returns undefined for entity without component', () => {
			const eid = addEntity(world);
			expect(getKeyboardInput(world, eid)).toBeUndefined();
		});

		it('returns keyboard input data', () => {
			const eid = addEntity(world);
			setKeyboardInput(world, eid, {
				lastKeyCode: 65,
				lastKeyTime: 1000,
				ctrl: true,
				shift: true,
			});

			const data = getKeyboardInput(world, eid);

			expect(data).toBeDefined();
			expect(data?.lastKeyCode).toBe(65);
			expect(data?.lastKeyTime).toBe(1000);
			expect(data?.ctrl).toBe(true);
			expect(data?.meta).toBe(false);
			expect(data?.shift).toBe(true);
		});
	});

	describe('clearKeyboardInput', () => {
		it('clears key state', () => {
			const eid = addEntity(world);
			setKeyboardInput(world, eid, {
				lastKeyCode: 65,
				modifiers: ModifierFlags.CTRL,
			});

			clearKeyboardInput(world, eid);

			expect(KeyboardInput.lastKeyCode[eid]).toBe(0);
			expect(KeyboardInput.modifiers[eid]).toBe(0);
		});
	});

	describe('removeKeyboardInput', () => {
		it('removes component', () => {
			const eid = addEntity(world);
			setKeyboardInput(world, eid, {});

			removeKeyboardInput(world, eid);

			expect(hasKeyboardInput(world, eid)).toBe(false);
		});
	});
});

describe('MouseInput component', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setMouseInput', () => {
		it('adds component and sets values', () => {
			const eid = addEntity(world);

			setMouseInput(world, eid, {
				x: 10,
				y: 20,
				button: MouseButtons.LEFT,
				pressed: true,
			});

			expect(hasMouseInput(world, eid)).toBe(true);
			expect(MouseInput.x[eid]).toBe(10);
			expect(MouseInput.y[eid]).toBe(20);
			expect(MouseInput.button[eid]).toBe(MouseButtons.LEFT);
			expect(MouseInput.pressed[eid]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			const result = setMouseInput(world, eid, {});
			expect(result).toBe(eid);
		});
	});

	describe('getMouseInput', () => {
		it('returns undefined for entity without component', () => {
			const eid = addEntity(world);
			expect(getMouseInput(world, eid)).toBeUndefined();
		});

		it('returns mouse input data', () => {
			const eid = addEntity(world);
			setMouseInput(world, eid, {
				x: 15,
				y: 25,
				button: MouseButtons.RIGHT,
				pressed: true,
				clickCount: 2,
			});

			const data = getMouseInput(world, eid);

			expect(data).toBeDefined();
			expect(data?.x).toBe(15);
			expect(data?.y).toBe(25);
			expect(data?.button).toBe(MouseButtons.RIGHT);
			expect(data?.pressed).toBe(true);
			expect(data?.clickCount).toBe(2);
		});
	});

	describe('recordClick', () => {
		it('records single click', () => {
			const eid = addEntity(world);

			const count = recordClick(world, eid, 10, 20, MouseButtons.LEFT);

			expect(count).toBe(1);
			expect(MouseInput.clickCount[eid]).toBe(1);
		});

		it('detects double click', () => {
			const eid = addEntity(world);
			const now = Date.now();

			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now);
			const count = recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 100);

			expect(count).toBe(2);
		});

		it('detects triple click', () => {
			const eid = addEntity(world);
			const now = Date.now();

			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now);
			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 100);
			const count = recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 200);

			expect(count).toBe(3);
		});

		it('resets on timeout', () => {
			const eid = addEntity(world);
			const now = Date.now();

			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now);
			const count = recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 1000);

			expect(count).toBe(1);
		});

		it('resets on different button', () => {
			const eid = addEntity(world);
			const now = Date.now();

			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now);
			const count = recordClick(world, eid, 10, 20, MouseButtons.RIGHT, now + 100);

			expect(count).toBe(1);
		});

		it('caps at 3 clicks', () => {
			const eid = addEntity(world);
			const now = Date.now();

			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now);
			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 50);
			recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 100);
			const count = recordClick(world, eid, 10, 20, MouseButtons.LEFT, now + 150);

			expect(count).toBe(3);
		});
	});

	describe('clearMouseInput', () => {
		it('clears mouse state', () => {
			const eid = addEntity(world);
			setMouseInput(world, eid, {
				button: MouseButtons.LEFT,
				pressed: true,
				clickCount: 2,
			});

			clearMouseInput(world, eid);

			expect(MouseInput.button[eid]).toBe(0);
			expect(MouseInput.pressed[eid]).toBe(0);
			expect(MouseInput.clickCount[eid]).toBe(0);
		});
	});

	describe('removeMouseInput', () => {
		it('removes component', () => {
			const eid = addEntity(world);
			setMouseInput(world, eid, {});

			removeMouseInput(world, eid);

			expect(hasMouseInput(world, eid)).toBe(false);
		});
	});
});

describe('InputBuffer component', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		inputBufferStore.clear();
	});

	afterEach(() => {
		inputBufferStore.clear();
	});

	describe('inputBufferStore', () => {
		it('creates buffer with initial text', () => {
			const id = inputBufferStore.create('Hello');
			expect(inputBufferStore.getText(id)).toBe('Hello');
		});

		it('creates buffer with empty text', () => {
			const id = inputBufferStore.create();
			expect(inputBufferStore.getText(id)).toBe('');
		});

		it('sets text', () => {
			const id = inputBufferStore.create('Hello');
			inputBufferStore.setText(id, 'World');
			expect(inputBufferStore.getText(id)).toBe('World');
		});

		it('inserts text', () => {
			const id = inputBufferStore.create('Hello');
			inputBufferStore.insert(id, 5, ' World');
			expect(inputBufferStore.getText(id)).toBe('Hello World');
		});

		it('deletes text', () => {
			const id = inputBufferStore.create('Hello World');
			inputBufferStore.delete(id, 5, 11);
			expect(inputBufferStore.getText(id)).toBe('Hello');
		});

		it('gets length', () => {
			const id = inputBufferStore.create('Hello');
			expect(inputBufferStore.getLength(id)).toBe(5);
		});

		it('removes buffer', () => {
			const id = inputBufferStore.create('Hello');
			expect(inputBufferStore.remove(id)).toBe(true);
			expect(inputBufferStore.has(id)).toBe(false);
		});

		it('clears all buffers', () => {
			const id1 = inputBufferStore.create('A');
			const id2 = inputBufferStore.create('B');

			inputBufferStore.clear();

			expect(inputBufferStore.has(id1)).toBe(false);
			expect(inputBufferStore.has(id2)).toBe(false);
		});
	});

	describe('setInputBuffer', () => {
		it('adds component and sets values', () => {
			const eid = addEntity(world);
			const bufferId = inputBufferStore.create('Test');

			setInputBuffer(world, eid, {
				bufferId,
				cursorPos: 4,
			});

			expect(hasInputBuffer(world, eid)).toBe(true);
			expect(InputBuffer.bufferId[eid]).toBe(bufferId);
			expect(InputBuffer.cursorPos[eid]).toBe(4);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			const result = setInputBuffer(world, eid, {});
			expect(result).toBe(eid);
		});
	});

	describe('getInputBuffer', () => {
		it('returns undefined for entity without component', () => {
			const eid = addEntity(world);
			expect(getInputBuffer(world, eid)).toBeUndefined();
		});

		it('returns input buffer data', () => {
			const eid = addEntity(world);
			const bufferId = inputBufferStore.create('Test');
			setInputBuffer(world, eid, {
				bufferId,
				cursorPos: 2,
				selectionStart: 1,
				selectionEnd: 3,
			});

			const data = getInputBuffer(world, eid);

			expect(data).toBeDefined();
			expect(data?.bufferId).toBe(bufferId);
			expect(data?.cursorPos).toBe(2);
			expect(data?.selectionStart).toBe(1);
			expect(data?.selectionEnd).toBe(3);
			expect(data?.hasSelection).toBe(true);
		});

		it('reports no selection correctly', () => {
			const eid = addEntity(world);
			setInputBuffer(world, eid, {});

			const data = getInputBuffer(world, eid);

			expect(data?.hasSelection).toBe(false);
		});
	});

	describe('getInputBufferText / setInputBufferText', () => {
		it('gets and sets buffer text', () => {
			const eid = addEntity(world);
			const bufferId = inputBufferStore.create('Initial');
			setInputBuffer(world, eid, { bufferId });

			expect(getInputBufferText(world, eid)).toBe('Initial');

			setInputBufferText(world, eid, 'Updated');

			expect(getInputBufferText(world, eid)).toBe('Updated');
		});

		it('returns empty string for entity without component', () => {
			const eid = addEntity(world);
			expect(getInputBufferText(world, eid)).toBe('');
		});
	});

	describe('selection', () => {
		it('sets selection range', () => {
			const eid = addEntity(world);
			setInputBuffer(world, eid, {});

			setInputBufferSelection(world, eid, 5, 10);

			expect(InputBuffer.selectionStart[eid]).toBe(5);
			expect(InputBuffer.selectionEnd[eid]).toBe(10);
		});

		it('clears selection', () => {
			const eid = addEntity(world);
			setInputBuffer(world, eid, {
				selectionStart: 5,
				selectionEnd: 10,
			});

			clearInputBufferSelection(world, eid);

			expect(InputBuffer.selectionStart[eid]).toBe(-1);
			expect(InputBuffer.selectionEnd[eid]).toBe(-1);
		});
	});

	describe('removeInputBuffer', () => {
		it('removes component and buffer', () => {
			const eid = addEntity(world);
			const bufferId = inputBufferStore.create('Test');
			setInputBuffer(world, eid, { bufferId });

			removeInputBuffer(world, eid);

			expect(hasInputBuffer(world, eid)).toBe(false);
			expect(inputBufferStore.has(bufferId)).toBe(false);
		});
	});
});

describe('MouseButtons constants', () => {
	it('has correct values', () => {
		expect(MouseButtons.NONE).toBe(0);
		expect(MouseButtons.LEFT).toBe(1);
		expect(MouseButtons.MIDDLE).toBe(2);
		expect(MouseButtons.RIGHT).toBe(3);
		expect(MouseButtons.WHEEL_UP).toBe(4);
		expect(MouseButtons.WHEEL_DOWN).toBe(5);
	});
});
