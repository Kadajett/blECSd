/**
 * Tests for Textbox widget.
 */

import { describe, expect, it } from 'vitest';
import { createWorld } from '../core/ecs';
import { createTextbox, isTextbox } from './textbox';

describe('Textbox', () => {
	it('creates a textbox with default config', () => {
		const world = createWorld();
		const textbox = createTextbox(world);

		expect(isTextbox(world, textbox.eid)).toBe(true);
		expect(textbox.getValue()).toBe('');
	});

	it('creates textbox with initial value', () => {
		const world = createWorld();
		const textbox = createTextbox(world, {
			value: 'Hello',
		});

		expect(textbox.getValue()).toBe('Hello');
	});

	it('sets and gets value', () => {
		const world = createWorld();
		const textbox = createTextbox(world);

		textbox.setValue('Test');
		expect(textbox.getValue()).toBe('Test');
	});

	it('handles character insertion', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Hello' });

		textbox.handleKey('!');
		expect(textbox.getValue()).toBe('Hello!');
	});

	it('handles backspace', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Hello' });

		// Cursor starts at end (position 5), backspace should delete 'o' at position 4
		const handled = textbox.handleKey('backspace');
		expect(handled).toBe(true);
		expect(textbox.getValue()).toBe('Hell');
	});

	it('handles delete key', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Hello' });

		// Move cursor to start, then delete
		textbox.handleKey('home');
		textbox.handleKey('delete');
		expect(textbox.getValue()).toBe('ello');
	});

	it('handles cursor movement', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Hello' });

		// Cursor starts at end
		textbox.handleKey('left');
		textbox.handleKey('X');
		expect(textbox.getValue()).toBe('HellXo');
	});

	it('handles home/end keys', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Hello' });

		textbox.handleKey('home');
		textbox.handleKey('A');
		expect(textbox.getValue()).toBe('AHello');

		textbox.handleKey('end');
		textbox.handleKey('Z');
		expect(textbox.getValue()).toBe('AHelloZ');
	});

	it('calls onChange callback', () => {
		const world = createWorld();
		const textbox = createTextbox(world);
		let changedValue = '';

		textbox.onChange((value) => {
			changedValue = value;
		});

		textbox.setValue('Test');
		expect(changedValue).toBe('Test');
	});

	it('calls onSubmit callback on enter', () => {
		const world = createWorld();
		const textbox = createTextbox(world, { value: 'Submit' });
		let submittedValue = '';

		textbox.onSubmit((value) => {
			submittedValue = value;
		});

		textbox.handleKey('enter');
		expect(submittedValue).toBe('Submit');
	});

	it('handles focus and blur', () => {
		const world = createWorld();
		const textbox = createTextbox(world);

		const focused = textbox.focus();
		expect(focused).toBe(textbox);

		const blurred = textbox.blur();
		expect(blurred).toBe(textbox);
	});

	it('destroys cleanly', () => {
		const world = createWorld();
		const textbox = createTextbox(world);

		expect(isTextbox(world, textbox.eid)).toBe(true);
		textbox.destroy();
		expect(isTextbox(world, textbox.eid)).toBe(false);
	});
});
