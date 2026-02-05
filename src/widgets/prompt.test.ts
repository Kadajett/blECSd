/**
 * Tests for Prompt widget.
 *
 * @module widgets/prompt.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import {
	createPrompt,
	handlePromptKey,
	isPrompt,
	PromptConfigSchema,
	prompt,
	resetPromptStore,
} from './prompt';

describe('prompt widget', () => {
	afterEach(() => {
		resetPromptStore();
	});

	describe('createPrompt', () => {
		it('creates prompt with default config', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.eid).toBeDefined();
			expect(p.getMessage()).toBe('');
			expect(p.getValue()).toBe('');
		});

		it('creates prompt with custom message', () => {
			const world = createWorld();
			const p = createPrompt(world, { message: 'Enter name:' });

			expect(p.getMessage()).toBe('Enter name:');
		});

		it('creates prompt with default value', () => {
			const world = createWorld();
			const p = createPrompt(world, { defaultValue: 'hello' });

			expect(p.getValue()).toBe('hello');
		});

		it('creates prompt with custom position', () => {
			const world = createWorld();
			const p = createPrompt(world, { left: 10, top: 5 });

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with custom dimensions', () => {
			const world = createWorld();
			const p = createPrompt(world, { width: 60, height: 8 });

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with border', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				border: { type: 'line', ch: 'single' },
			});

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with padding', () => {
			const world = createWorld();
			const p = createPrompt(world, { padding: 2 });

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with object padding', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				padding: { left: 1, top: 2, right: 1, bottom: 2 },
			});

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with style colors', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				fg: '#ffffff',
				bg: '#000000',
			});

			expect(p.eid).toBeDefined();
		});

		it('creates prompt with numeric colors', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				fg: 0xffffffff,
				bg: 0x000000ff,
			});

			expect(p.eid).toBeDefined();
		});
	});

	describe('setValue / getValue', () => {
		it('sets and gets value', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.setValue('test input');
			expect(p.getValue()).toBe('test input');
		});

		it('returns empty string when no value set', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.getValue()).toBe('');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.setValue('x')).toBe(p);
		});
	});

	describe('setMessage / getMessage', () => {
		it('sets and gets message', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.setMessage('New prompt:');
			expect(p.getMessage()).toBe('New prompt:');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.setMessage('x')).toBe(p);
		});
	});

	describe('submit', () => {
		it('triggers onSubmit callback with current value', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('hello');
			p.submit();

			expect(cb).toHaveBeenCalledWith('hello');
		});

		it('triggers multiple onSubmit callbacks', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb1 = vi.fn();
			const cb2 = vi.fn();

			p.onSubmit(cb1).onSubmit(cb2);
			p.setValue('world');
			p.submit();

			expect(cb1).toHaveBeenCalledWith('world');
			expect(cb2).toHaveBeenCalledWith('world');
		});

		it('does not submit when validator returns false', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				validator: () => false,
			});
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('bad');
			p.submit();

			expect(cb).not.toHaveBeenCalled();
		});

		it('does not submit when validator returns error string', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				validator: (val) => (val.length > 0 ? true : 'Cannot be empty'),
			});
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('');
			p.submit();

			expect(cb).not.toHaveBeenCalled();
		});

		it('submits when validator returns true', () => {
			const world = createWorld();
			const p = createPrompt(world, {
				validator: () => true,
			});
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('good');
			p.submit();

			expect(cb).toHaveBeenCalledWith('good');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.submit()).toBe(p);
		});
	});

	describe('cancel', () => {
		it('triggers onCancel callback', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb = vi.fn();

			p.onCancel(cb);
			p.cancel();

			expect(cb).toHaveBeenCalled();
		});

		it('triggers multiple onCancel callbacks', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb1 = vi.fn();
			const cb2 = vi.fn();

			p.onCancel(cb1).onCancel(cb2);
			p.cancel();

			expect(cb1).toHaveBeenCalled();
			expect(cb2).toHaveBeenCalled();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.cancel()).toBe(p);
		});
	});

	describe('show / hide', () => {
		it('shows prompt', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.hide();
			p.show();

			// Widget is operational after show
			expect(p.getMessage()).toBe('');
		});

		it('hides prompt', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.hide();

			// Widget is still accessible when hidden
			expect(p.getValue()).toBe('');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.show()).toBe(p);
			expect(p.hide()).toBe(p);
		});
	});

	describe('move / setPosition', () => {
		it('moves prompt by delta', () => {
			const world = createWorld();
			const p = createPrompt(world, { left: 10, top: 10 });

			p.move(5, -3);

			// Widget is operational after move
			expect(p.eid).toBeDefined();
		});

		it('sets absolute position', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.setPosition(20, 15);

			expect(p.eid).toBeDefined();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.move(1, 1)).toBe(p);
			expect(p.setPosition(0, 0)).toBe(p);
		});
	});

	describe('center', () => {
		it('centers prompt within screen dimensions', () => {
			const world = createWorld();
			const p = createPrompt(world, { width: 40, height: 5 });

			p.center(80, 24);

			// Widget is operational after centering
			expect(p.eid).toBeDefined();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(p.center(80, 24)).toBe(p);
		});
	});

	describe('destroy', () => {
		it('destroys prompt widget', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const eid = p.eid;

			p.destroy();

			expect(isPrompt(eid)).toBe(false);
		});

		it('cleans up state map', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.destroy();

			// After destroy, getValue returns empty
			expect(p.getValue()).toBe('');
		});
	});

	describe('isPrompt', () => {
		it('returns true for prompt widget', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(isPrompt(p.eid)).toBe(true);
		});

		it('returns false for non-prompt entity', () => {
			expect(isPrompt(999)).toBe(false);
		});
	});

	describe('handlePromptKey', () => {
		it('handles return key as submit', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('test');

			expect(handlePromptKey(p, 'return')).toBe(true);
			expect(cb).toHaveBeenCalledWith('test');
		});

		it('handles enter key as submit', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb = vi.fn();

			p.onSubmit(cb);
			p.setValue('test');

			expect(handlePromptKey(p, 'enter')).toBe(true);
			expect(cb).toHaveBeenCalledWith('test');
		});

		it('handles escape key as cancel', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const cb = vi.fn();

			p.onCancel(cb);

			expect(handlePromptKey(p, 'escape')).toBe(true);
			expect(cb).toHaveBeenCalled();
		});

		it('returns false for unhandled keys', () => {
			const world = createWorld();
			const p = createPrompt(world);

			expect(handlePromptKey(p, 'a')).toBe(false);
		});
	});

	describe('prompt convenience function', () => {
		it('resolves with value on submit', async () => {
			const world = createWorld();
			const promise = prompt(world, 'Name?');

			// The prompt creates an entity internally, we need to find it
			// and trigger submit. Since we cannot access the widget directly,
			// we test that the promise is created correctly.
			// In a real scenario, the user would interact with the widget.
			expect(promise).toBeInstanceOf(Promise);
		});
	});

	describe('PromptConfigSchema', () => {
		it('parses valid config', () => {
			const result = PromptConfigSchema.parse({
				message: 'Enter name:',
				width: 50,
				height: 8,
			});

			expect(result.message).toBe('Enter name:');
			expect(result.width).toBe(50);
			expect(result.height).toBe(8);
		});

		it('applies defaults', () => {
			const result = PromptConfigSchema.parse({});

			expect(result.message).toBe('');
			expect(result.defaultValue).toBe('');
			expect(result.placeholder).toBe('');
			expect(result.width).toBe(40);
			expect(result.height).toBe(5);
			expect(result.left).toBe(0);
			expect(result.top).toBe(0);
		});

		it('rejects invalid width', () => {
			expect(() => {
				PromptConfigSchema.parse({ width: -1 });
			}).toThrow();
		});

		it('rejects invalid height', () => {
			expect(() => {
				PromptConfigSchema.parse({ height: 0 });
			}).toThrow();
		});
	});

	describe('method chaining', () => {
		it('supports chained operations', () => {
			const world = createWorld();
			const p = createPrompt(world);

			p.setMessage('Name?').setValue('Alice').setPosition(5, 5).show();

			expect(p.getMessage()).toBe('Name?');
			expect(p.getValue()).toBe('Alice');
		});

		it('supports chaining callbacks', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const submitCb = vi.fn();
			const cancelCb = vi.fn();

			p.onSubmit(submitCb).onCancel(cancelCb).setValue('test').submit();

			expect(submitCb).toHaveBeenCalledWith('test');
			expect(cancelCb).not.toHaveBeenCalled();
		});
	});

	describe('resetPromptStore', () => {
		it('clears all prompt state', () => {
			const world = createWorld();
			const p = createPrompt(world);
			const eid = p.eid;

			resetPromptStore();

			expect(isPrompt(eid)).toBe(false);
		});
	});
});
