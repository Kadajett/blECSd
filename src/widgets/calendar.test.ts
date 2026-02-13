/**
 * Tests for Calendar widget
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createCalendar, isCalendar, resetCalendarStore } from './calendar';

describe('Calendar Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetCalendarStore();
	});

	describe('createCalendar', () => {
		it('creates a calendar with default config', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid);

			expect(calendar.eid).toBe(eid);
			expect(isCalendar(eid)).toBe(true);

			const month = calendar.getMonth();
			expect(month.year).toBeGreaterThan(2020);
			expect(month.month).toBeGreaterThanOrEqual(0);
			expect(month.month).toBeLessThan(12);
		});

		it('creates a calendar with initial date', () => {
			const eid = addEntity(world);
			const initialDate = new Date(2026, 1, 8); // Feb 8, 2026

			const calendar = createCalendar(world, eid, {
				initialDate,
			});

			const month = calendar.getMonth();
			expect(month.year).toBe(2026);
			expect(month.month).toBe(1); // February (0-indexed)
		});

		it('creates a calendar with custom position', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				left: 10,
				top: 5,
			});

			expect(calendar.eid).toBe(eid);
		});

		it('creates a calendar with week numbers', () => {
			const eid = addEntity(world);
			createCalendar(world, eid, {
				showWeekNumbers: true,
			});

			expect(isCalendar(eid)).toBe(true);
		});

		it('creates a calendar with marked dates', () => {
			const eid = addEntity(world);
			const markedDates = [new Date(2026, 1, 14), new Date(2026, 1, 28)];

			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 8),
				markedDates,
			});

			const marked = calendar.getMarkedDates();
			expect(marked).toHaveLength(2);
		});

		it('creates a calendar with first day of week set to Monday', () => {
			const eid = addEntity(world);
			createCalendar(world, eid, {
				firstDayOfWeek: 1, // Monday
			});

			expect(isCalendar(eid)).toBe(true);
		});

		it('creates a calendar with min and max dates', () => {
			const eid = addEntity(world);
			const minDate = new Date(2026, 0, 1);
			const maxDate = new Date(2026, 11, 31);

			createCalendar(world, eid, {
				minDate,
				maxDate,
			});

			expect(isCalendar(eid)).toBe(true);
		});
	});

	describe('navigation', () => {
		it('navigates to next month', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 8),
			});

			calendar.nextMonth();

			const month = calendar.getMonth();
			expect(month.year).toBe(2026);
			expect(month.month).toBe(2); // March
		});

		it('navigates to previous month', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 8),
			});

			calendar.prevMonth();

			const month = calendar.getMonth();
			expect(month.year).toBe(2026);
			expect(month.month).toBe(0); // January
		});

		it('wraps to next year when advancing from December', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 11, 15),
			});

			calendar.nextMonth();

			const month = calendar.getMonth();
			expect(month.year).toBe(2027);
			expect(month.month).toBe(0); // January
		});

		it('wraps to previous year when going back from January', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 0, 15),
			});

			calendar.prevMonth();

			const month = calendar.getMonth();
			expect(month.year).toBe(2025);
			expect(month.month).toBe(11); // December
		});

		it('navigates to next year', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 8),
			});

			calendar.nextYear();

			const month = calendar.getMonth();
			expect(month.year).toBe(2027);
			expect(month.month).toBe(1); // Still February
		});

		it('navigates to previous year', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 8),
			});

			calendar.prevYear();

			const month = calendar.getMonth();
			expect(month.year).toBe(2025);
			expect(month.month).toBe(1); // Still February
		});
	});

	describe('cursor movement', () => {
		it('moves cursor up (one week earlier)', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			calendar.cursorUp();
			// Cursor should now be on Feb 8
			// We can't directly check cursorDay, but we can select and verify
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(8);
			expect(selected?.getMonth()).toBe(1); // February
		});

		it('moves cursor down (one week later)', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			calendar.cursorDown();
			// Cursor should now be on Feb 22
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(22);
			expect(selected?.getMonth()).toBe(1); // February
		});

		it('moves cursor left (one day earlier)', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			calendar.cursorLeft();
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(14);
		});

		it('moves cursor right (one day later)', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			calendar.cursorRight();
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(16);
		});

		it('wraps cursor to previous month when moving left from day 1', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 1),
			});

			calendar.cursorLeft();
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(31); // Jan 31
			expect(selected?.getMonth()).toBe(0); // January
		});

		it('wraps cursor to next month when moving right from last day', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 28),
			});

			calendar.cursorRight();
			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(1); // March 1
			expect(selected?.getMonth()).toBe(2); // March
		});

		it('wraps cursor to previous month when moving up from first week', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 3),
			});

			calendar.cursorUp();
			const month = calendar.getMonth();
			expect(month.month).toBe(0); // January (wrapped)
		});

		it('wraps cursor to next month when moving down from last week', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 25),
			});

			calendar.cursorDown();
			const month = calendar.getMonth();
			expect(month.month).toBe(2); // March (wrapped)
		});
	});

	describe('date selection', () => {
		it('selects cursor date', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(15);
			expect(selected?.getMonth()).toBe(1); // February
			expect(selected?.getFullYear()).toBe(2026);
		});

		it('sets date programmatically', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const newDate = new Date(2026, 2, 20);
			calendar.setDate(newDate);

			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(20);
			expect(selected?.getMonth()).toBe(2); // March
		});

		it('triggers callback on selection', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			let selectedDate: Date | undefined;
			calendar.onSelect((date) => {
				selectedDate = date;
			});

			calendar.selectCursor();

			expect(selectedDate).toBeDefined();
			expect(selectedDate?.getDate()).toBe(15);
		});

		it('allows unsubscribing from selection callback', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			let callCount = 0;
			const unsubscribe = calendar.onSelect(() => {
				callCount++;
			});

			calendar.selectCursor();
			expect(callCount).toBe(1);

			unsubscribe();
			calendar.selectCursor();
			expect(callCount).toBe(1); // Should not have incremented
		});

		it('respects min date constraint', () => {
			const eid = addEntity(world);
			const minDate = new Date(2026, 1, 10);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 5),
				minDate,
			});

			let selectedDate: Date | undefined;
			calendar.onSelect((date) => {
				selectedDate = date;
			});

			calendar.selectCursor(); // Try to select Feb 5 (before minDate)

			expect(selectedDate).toBeUndefined(); // Should not trigger callback
		});

		it('respects max date constraint', () => {
			const eid = addEntity(world);
			const maxDate = new Date(2026, 1, 20);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 25),
				maxDate,
			});

			let selectedDate: Date | undefined;
			calendar.onSelect((date) => {
				selectedDate = date;
			});

			calendar.selectCursor(); // Try to select Feb 25 (after maxDate)

			expect(selectedDate).toBeUndefined(); // Should not trigger callback
		});
	});

	describe('marked dates', () => {
		it('sets marked dates', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid);

			const dates = [new Date(2026, 1, 14), new Date(2026, 1, 28)];
			calendar.setMarkedDates(dates);

			const marked = calendar.getMarkedDates();
			expect(marked).toHaveLength(2);
		});

		it('adds a marked date', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				markedDates: [new Date(2026, 1, 14)],
			});

			calendar.addMarkedDate(new Date(2026, 1, 28));

			const marked = calendar.getMarkedDates();
			expect(marked).toHaveLength(2);
		});

		it('removes a marked date', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				markedDates: [new Date(2026, 1, 14), new Date(2026, 1, 28)],
			});

			calendar.removeMarkedDate(new Date(2026, 1, 14));

			const marked = calendar.getMarkedDates();
			expect(marked).toHaveLength(1);
		});
	});

	describe('keyboard handling', () => {
		it('handles arrow up key', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('up');
			expect(handled).toBe(true);

			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(8);
		});

		it('handles arrow down key', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('down');
			expect(handled).toBe(true);

			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(22);
		});

		it('handles arrow left key', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('left');
			expect(handled).toBe(true);

			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(14);
		});

		it('handles arrow right key', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('right');
			expect(handled).toBe(true);

			calendar.selectCursor();
			const selected = calendar.getDate();
			expect(selected?.getDate()).toBe(16);
		});

		it('handles enter key for selection', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			let selected: Date | undefined;
			calendar.onSelect((date) => {
				selected = date;
			});

			const handled = calendar.handleKey('enter');
			expect(handled).toBe(true);
			expect(selected).toBeDefined();
		});

		it('handles pageup key for previous month', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('pageup');
			expect(handled).toBe(true);

			const month = calendar.getMonth();
			expect(month.month).toBe(0); // January
		});

		it('handles pagedown key for next month', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('pagedown');
			expect(handled).toBe(true);

			const month = calendar.getMonth();
			expect(month.month).toBe(2); // March
		});

		it('handles shift+pageup for previous year', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('S-pageup');
			expect(handled).toBe(true);

			const month = calendar.getMonth();
			expect(month.year).toBe(2025);
		});

		it('handles shift+pagedown for next year', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const handled = calendar.handleKey('S-pagedown');
			expect(handled).toBe(true);

			const month = calendar.getMonth();
			expect(month.year).toBe(2027);
		});

		it('returns false for unhandled keys', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid);

			const handled = calendar.handleKey('x');
			expect(handled).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles leap year navigation correctly', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2024, 1, 29), // Leap year
			});

			// Navigate to non-leap year
			calendar.nextYear();

			const month = calendar.getMonth();
			expect(month.year).toBe(2025);
			expect(month.month).toBe(1); // Still February
		});

		it('adjusts cursor when navigating to month with fewer days', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 0, 31), // January 31
			});

			// Navigate to February (28 days in 2026)
			calendar.nextMonth();
			calendar.selectCursor();
			const selected = calendar.getDate();

			expect(selected?.getDate()).toBe(28); // Should adjust to Feb 28
			expect(selected?.getMonth()).toBe(1); // February
		});

		it('handles navigation across year boundaries', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2025, 11, 31),
			});

			calendar.cursorRight(); // Move to Jan 1, 2026
			calendar.selectCursor();
			const selected = calendar.getDate();

			expect(selected?.getFullYear()).toBe(2026);
			expect(selected?.getMonth()).toBe(0); // January
			expect(selected?.getDate()).toBe(1);
		});
	});

	describe('rendering and chaining', () => {
		it('supports method chaining', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const result = calendar.nextMonth().cursorDown().selectCursor();

			expect(result).toBe(calendar);
			const selected = calendar.getDate();
			expect(selected?.getMonth()).toBe(2); // March (navigated forward)
		});

		it('renders calendar after operations', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid, {
				initialDate: new Date(2026, 1, 15),
			});

			const result = calendar.render();
			expect(result).toBe(calendar);
		});
	});

	describe('cleanup', () => {
		it('cleans up state on destroy', () => {
			const eid = addEntity(world);
			const calendar = createCalendar(world, eid);

			expect(isCalendar(eid)).toBe(true);

			calendar.destroy();

			expect(isCalendar(eid)).toBe(false);
		});
	});
});
