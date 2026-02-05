/**
 * Log Widget Tests
 */

import { afterEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createLog, isLog, Log, resetLogStore } from './log';

describe('Log Widget', () => {
	let world: World;

	afterEach(() => {
		resetLogStore();
	});

	describe('createLog', () => {
		it('creates a log widget with default config', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.eid).toBe(eid);
			expect(isLog(world, eid)).toBe(true);
			expect(Log.scrollback[eid]).toBe(1000); // default
			expect(Log.scrollOnInput[eid]).toBe(1); // default true
			expect(Log.timestamps[eid]).toBe(0); // default false
		});

		it('creates a log widget with custom scrollback', () => {
			world = createWorld();
			const eid = addEntity(world);
			createLog(world, eid, {
				scrollback: 500,
			});

			expect(Log.scrollback[eid]).toBe(500);
		});

		it('creates a log widget with timestamps enabled', () => {
			world = createWorld();
			const eid = addEntity(world);
			createLog(world, eid, {
				timestamps: true,
				timestampFormat: 'HH:mm:ss',
			});

			expect(Log.timestamps[eid]).toBe(1);
		});

		it('creates a log widget with scroll on input disabled', () => {
			world = createWorld();
			const eid = addEntity(world);
			createLog(world, eid, {
				scrollOnInput: false,
			});

			expect(Log.scrollOnInput[eid]).toBe(0);
		});
	});

	describe('log()', () => {
		it('logs a simple string message', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Hello, world!');

			expect(log.getLines()).toEqual(['Hello, world!']);
			expect(log.getLineCount()).toBe(1);
		});

		it('logs multiple messages', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Line 1');
			log.log('Line 2');
			log.log('Line 3');

			expect(log.getLines()).toEqual(['Line 1', 'Line 2', 'Line 3']);
			expect(log.getLineCount()).toBe(3);
		});

		it('formats messages with %s substitution', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Hello, %s!', 'world');

			expect(log.getLines()).toEqual(['Hello, world!']);
		});

		it('formats messages with %d substitution', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('The answer is %d', 42);

			expect(log.getLines()).toEqual(['The answer is 42']);
		});

		it('formats messages with multiple substitutions', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('User %s has %d items', 'alice', 5);

			expect(log.getLines()).toEqual(['User alice has 5 items']);
		});

		it('formats objects with %j substitution', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Data: %j', { key: 'value' });

			expect(log.getLines()).toEqual(['Data: {"key":"value"}']);
		});

		it('logs non-string values directly', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log(42);
			log.log({ foo: 'bar' });

			expect(log.getLines()).toEqual(['42', '[object Object]']);
		});

		it('adds timestamps when enabled', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				timestamps: true,
				timestampFormat: 'HH:mm:ss',
			});

			log.log('Test message');

			const lines = log.getLines();
			expect(lines.length).toBe(1);
			expect(lines[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Test message$/);
		});

		it('returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			const result = log.log('test');

			expect(result).toBe(log);
		});
	});

	describe('scrollback limit', () => {
		it('prunes old lines when exceeding scrollback', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				scrollback: 3,
			});

			log.log('Line 1');
			log.log('Line 2');
			log.log('Line 3');
			log.log('Line 4');
			log.log('Line 5');

			expect(log.getLines()).toEqual(['Line 3', 'Line 4', 'Line 5']);
			expect(log.getLineCount()).toBe(3);
		});

		it('handles scrollback of 1', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				scrollback: 1,
			});

			log.log('Line 1');
			log.log('Line 2');

			expect(log.getLines()).toEqual(['Line 2']);
			expect(log.getLineCount()).toBe(1);
		});
	});

	describe('clear()', () => {
		it('clears all lines', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Line 1');
			log.log('Line 2');
			log.clear();

			expect(log.getLines()).toEqual([]);
			expect(log.getLineCount()).toBe(0);
		});

		it('returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			const result = log.clear();

			expect(result).toBe(log);
		});
	});

	describe('getLines()', () => {
		it('returns a copy of lines', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Line 1');
			const lines = log.getLines() as string[];
			lines.push('Modified');

			// Original should be unmodified since getLines returns a copy
			expect(log.getLines()).toEqual(['Line 1']);
		});

		it('returns empty array when no lines', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.getLines()).toEqual([]);
		});
	});

	describe('visibility', () => {
		it('show() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.show()).toBe(log);
		});

		it('hide() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.hide()).toBe(log);
		});
	});

	describe('focus', () => {
		it('focus() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.focus()).toBe(log);
		});

		it('blur() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.blur()).toBe(log);
		});

		it('isFocused() returns boolean', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(typeof log.isFocused()).toBe('boolean');
		});
	});

	describe('scrolling', () => {
		it('scrollTo() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.scrollTo(0, 0)).toBe(log);
		});

		it('scrollBy() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.scrollBy(0, 5)).toBe(log);
		});

		it('scrollToTop() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.scrollToTop()).toBe(log);
		});

		it('scrollToBottom() returns widget for chaining', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			expect(log.scrollToBottom()).toBe(log);
		});
	});

	describe('destroy()', () => {
		it('cleans up log state', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid);

			log.log('Line 1');
			log.destroy();

			expect(isLog(world, eid)).toBe(false);
			expect(Log.scrollback[eid]).toBe(0);
			expect(Log.lineCount[eid]).toBe(0);
		});
	});

	describe('isLog()', () => {
		it('returns true for log widgets', () => {
			world = createWorld();
			const eid = addEntity(world);
			createLog(world, eid);

			expect(isLog(world, eid)).toBe(true);
		});

		it('returns false for non-log entities', () => {
			world = createWorld();
			const eid = addEntity(world);

			expect(isLog(world, eid)).toBe(false);
		});
	});

	describe('config validation', () => {
		it('validates position values', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				left: 10,
				top: 5,
				width: 80,
				height: 20,
			});

			expect(log.eid).toBe(eid);
		});

		it('validates border config', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				border: {
					type: 'line',
					ch: 'rounded',
				},
			});

			expect(log.eid).toBe(eid);
		});

		it('validates scrollbar config', () => {
			world = createWorld();
			const eid = addEntity(world);
			const log = createLog(world, eid, {
				scrollbar: {
					mode: 'visible',
					fg: '#ffffff',
					bg: '#000000',
				},
			});

			expect(log.eid).toBe(eid);
		});
	});
});
