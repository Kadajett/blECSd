/**
 * Tests for Textarea widget.
 */

import { describe, expect, it } from 'vitest';
import { createWorld } from '../core/ecs';
import { createTextarea, isTextarea } from './textarea';

describe('Textarea', () => {
	it('creates a textarea with default config', () => {
		const world = createWorld();
		const textarea = createTextarea(world);

		expect(isTextarea(world, textarea.eid)).toBe(true);
		expect(textarea.getValue()).toBe('');
	});

	it('creates textarea with initial value', () => {
		const world = createWorld();
		const textarea = createTextarea(world, {
			value: 'Line 1\nLine 2',
		});

		expect(textarea.getValue()).toBe('Line 1\nLine 2');
	});

	it('sets and gets value', () => {
		const world = createWorld();
		const textarea = createTextarea(world);

		textarea.setValue('Multi\nLine\nText');
		expect(textarea.getValue()).toBe('Multi\nLine\nText');
	});

	it('handles character insertion', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Test' });

		textarea.handleKey('!');
		expect(textarea.getValue()).toBe('Test!');
	});

	it('handles newline insertion', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Line 1' });

		textarea.handleKey('enter');
		expect(textarea.getValue()).toBe('Line 1\n');
	});

	it('handles backspace across lines', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Line 1\n' });

		textarea.handleKey('backspace');
		expect(textarea.getValue()).toBe('Line 1');
	});

	it('handles up/down navigation', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Line 1\nLine 2\nLine 3' });

		// Cursor starts at end of Line 3
		textarea.handleKey('up');
		const cursor = textarea.getCursor();
		expect(cursor.line).toBe(1); // Now on Line 2
	});

	it('handles Ctrl+Home to go to document start', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Line 1\nLine 2\nLine 3' });

		textarea.handleKey('home', true);
		const cursor = textarea.getCursor();
		expect(cursor).toEqual({ line: 0, column: 0 });
	});

	it('handles Ctrl+End to go to document end', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Line 1\nLine 2\nLine 3' });

		textarea.handleKey('home', true); // Go to start first
		textarea.handleKey('end', true); // Then to end
		const cursor = textarea.getCursor();
		expect(cursor).toEqual({ line: 2, column: 6 });
	});

	it('calls onChange callback', () => {
		const world = createWorld();
		const textarea = createTextarea(world);
		let changedValue = '';

		textarea.onChange((value) => {
			changedValue = value;
		});

		textarea.setValue('Test');
		expect(changedValue).toBe('Test');
	});

	it('calls onSubmit callback on escape', () => {
		const world = createWorld();
		const textarea = createTextarea(world, { value: 'Submit' });
		let submittedValue = '';

		textarea.onSubmit((value) => {
			submittedValue = value;
		});

		textarea.handleKey('escape');
		expect(submittedValue).toBe('Submit');
	});

	it('destroys cleanly', () => {
		const world = createWorld();
		const textarea = createTextarea(world);

		expect(isTextarea(world, textarea.eid)).toBe(true);
		textarea.destroy();
		expect(isTextarea(world, textarea.eid)).toBe(false);
	});
});
