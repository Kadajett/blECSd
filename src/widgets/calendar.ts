/**
 * Calendar Widget - Monthly calendar display with date selection
 * @module widgets/calendar
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Calendar theme configuration for styling different elements.
 */
export interface CalendarTheme {
	/** Header (month/year) foreground color */
	readonly headerFg?: string | number;
	/** Header background color */
	readonly headerBg?: string | number;
	/** Weekday labels foreground color */
	readonly weekdayFg?: string | number;
	/** Regular day foreground color */
	readonly dayFg?: string | number;
	/** Selected day foreground color */
	readonly selectedFg?: string | number;
	/** Selected day background color */
	readonly selectedBg?: string | number;
	/** Today's date foreground color */
	readonly todayFg?: string | number;
	/** Today's date background color */
	readonly todayBg?: string | number;
	/** Marked date foreground color */
	readonly markedFg?: string | number;
	/** Marked date background color */
	readonly markedBg?: string | number;
	/** Outside month day foreground color */
	readonly outsideFg?: string | number;
	/** Cursor (current focus) foreground color */
	readonly cursorFg?: string | number;
	/** Cursor background color */
	readonly cursorBg?: string | number;
}

/**
 * Calendar widget configuration.
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createCalendar } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Basic calendar
 * const calendar = createCalendar(world, eid, {
 *   left: 0,
 *   top: 0,
 *   initialDate: new Date('2026-02-08'),
 * });
 *
 * // With custom theme and marked dates
 * const calendar = createCalendar(world, eid, {
 *   left: 10,
 *   top: 5,
 *   initialDate: new Date(),
 *   minDate: new Date('2026-01-01'),
 *   maxDate: new Date('2026-12-31'),
 *   firstDayOfWeek: 1, // Monday
 *   showWeekNumbers: true,
 *   markedDates: [
 *     new Date('2026-02-14'), // Valentine's Day
 *     new Date('2026-12-25'), // Christmas
 *   ],
 *   theme: {
 *     headerFg: 0xffffffff,
 *     headerBg: 0x333333ff,
 *     selectedBg: 0x0000ffff,
 *     todayBg: 0x00ff00ff,
 *   }
 * });
 *
 * // Handle selection
 * calendar.onSelect((date) => {
 *   console.log('Selected:', date.toISOString());
 * });
 * ```
 */
export interface CalendarConfig {
	/**
	 * X position (left coordinate)
	 * @default 0
	 */
	readonly left?: number;
	/**
	 * Y position (top coordinate)
	 * @default 0
	 */
	readonly top?: number;
	/**
	 * Initial date to display (defaults to today)
	 */
	readonly initialDate?: Date;
	/**
	 * Minimum selectable date (inclusive)
	 */
	readonly minDate?: Date;
	/**
	 * Maximum selectable date (inclusive)
	 */
	readonly maxDate?: Date;
	/**
	 * First day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
	 * @default 0 (Sunday)
	 */
	readonly firstDayOfWeek?: number;
	/**
	 * Show week numbers in the left column
	 * @default false
	 */
	readonly showWeekNumbers?: boolean;
	/**
	 * Dates to highlight/mark
	 * @default []
	 */
	readonly markedDates?: readonly Date[];
	/**
	 * Theme configuration for styling calendar elements
	 */
	readonly theme?: CalendarTheme;
}

/**
 * Calendar widget interface providing chainable methods.
 */
export interface CalendarWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Sets the selected date */
	setDate(date: Date): CalendarWidget;
	/** Gets the selected date */
	getDate(): Date | undefined;
	/** Gets the currently displayed month */
	getMonth(): { year: number; month: number };

	/** Moves to the previous month */
	prevMonth(): CalendarWidget;
	/** Moves to the next month */
	nextMonth(): CalendarWidget;
	/** Moves to the previous year */
	prevYear(): CalendarWidget;
	/** Moves to the next year */
	nextYear(): CalendarWidget;

	/** Moves cursor up one week */
	cursorUp(): CalendarWidget;
	/** Moves cursor down one week */
	cursorDown(): CalendarWidget;
	/** Moves cursor left one day */
	cursorLeft(): CalendarWidget;
	/** Moves cursor right one day */
	cursorRight(): CalendarWidget;

	/** Selects the current cursor date */
	selectCursor(): CalendarWidget;

	/** Sets marked dates */
	setMarkedDates(dates: readonly Date[]): CalendarWidget;
	/** Adds a marked date */
	addMarkedDate(date: Date): CalendarWidget;
	/** Removes a marked date */
	removeMarkedDate(date: Date): CalendarWidget;
	/** Gets all marked dates */
	getMarkedDates(): readonly Date[];

	/** Handles a key press, returns true if handled */
	handleKey(key: string): boolean;

	/** Registers callback for date selection */
	onSelect(callback: (date: Date) => void): () => void;

	/** Renders and marks dirty */
	render(): CalendarWidget;

	/** Destroys the widget */
	destroy(): void;
}

/**
 * Zod schema for calendar configuration validation.
 */
export const CalendarConfigSchema = z
	.object({
		left: z.number().default(0),
		top: z.number().default(0),
		initialDate: z.date().optional(),
		minDate: z.date().optional(),
		maxDate: z.date().optional(),
		firstDayOfWeek: z.number().int().min(0).max(6).default(0),
		showWeekNumbers: z.boolean().default(false),
		markedDates: z.array(z.date()).default([]),
		theme: z
			.object({
				headerFg: z.union([z.string(), z.number()]).optional(),
				headerBg: z.union([z.string(), z.number()]).optional(),
				weekdayFg: z.union([z.string(), z.number()]).optional(),
				dayFg: z.union([z.string(), z.number()]).optional(),
				selectedFg: z.union([z.string(), z.number()]).optional(),
				selectedBg: z.union([z.string(), z.number()]).optional(),
				todayFg: z.union([z.string(), z.number()]).optional(),
				todayBg: z.union([z.string(), z.number()]).optional(),
				markedFg: z.union([z.string(), z.number()]).optional(),
				markedBg: z.union([z.string(), z.number()]).optional(),
				outsideFg: z.union([z.string(), z.number()]).optional(),
				cursorFg: z.union([z.string(), z.number()]).optional(),
				cursorBg: z.union([z.string(), z.number()]).optional(),
			})
			.optional(),
	})
	.strict();

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

interface CalendarState {
	year: number;
	month: number; // 0-11 (JavaScript month convention)
	selectedDay: number | undefined; // Day of month (1-31)
	cursorDay: number; // Day of month for cursor (1-31)
	minDate: Date | undefined;
	maxDate: Date | undefined;
	firstDayOfWeek: number;
	showWeekNumbers: boolean;
	markedDates: Set<string>; // ISO date strings (YYYY-MM-DD)
	theme: {
		headerFg?: string | number | undefined;
		headerBg?: string | number | undefined;
		weekdayFg?: string | number | undefined;
		dayFg?: string | number | undefined;
		selectedFg?: string | number | undefined;
		selectedBg?: string | number | undefined;
		todayFg?: string | number | undefined;
		todayBg?: string | number | undefined;
		markedFg?: string | number | undefined;
		markedBg?: string | number | undefined;
		outsideFg?: string | number | undefined;
		cursorFg?: string | number | undefined;
		cursorBg?: string | number | undefined;
	};
	onSelectCallbacks: ((date: Date) => void)[];
}

const calendarStateMap = new Map<Entity, CalendarState>();

/**
 * Gets the calendar state for an entity.
 */
function getCalendarState(eid: Entity): CalendarState | undefined {
	return calendarStateMap.get(eid);
}

/**
 * Sets the calendar state for an entity.
 */
function setCalendarState(eid: Entity, state: CalendarState): void {
	calendarStateMap.set(eid, state);
}

/**
 * Removes the calendar state for an entity.
 */
function deleteCalendarState(eid: Entity): void {
	calendarStateMap.delete(eid);
}

/**
 * Resets the calendar store (for testing).
 */
export function resetCalendarStore(): void {
	calendarStateMap.clear();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Converts a Date to ISO date string (YYYY-MM-DD).
 */
function toISODateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Gets the number of days in a given month.
 */
function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/**
 * Gets the day of week for the first day of a month.
 * Returns 0-6 (Sunday-Saturday).
 */
function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

/**
 * Gets the week number for a date (ISO 8601).
 */
function getWeekNumber(date: Date): number {
	const target = new Date(date.valueOf());
	const dayNr = (date.getDay() + 6) % 7;
	target.setDate(target.getDate() - dayNr + 3);
	const firstThursday = target.valueOf();
	target.setMonth(0, 1);
	if (target.getDay() !== 4) {
		target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
	}
	return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Checks if a date is within the allowed range.
 */
function isDateInRange(date: Date, minDate: Date | undefined, maxDate: Date | undefined): boolean {
	if (minDate && date < minDate) return false;
	if (maxDate && date > maxDate) return false;
	return true;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders the calendar to content lines.
 */
function renderCalendar(world: World, eid: Entity): void {
	const state = getCalendarState(eid);
	if (!state) return;

	const lines: string[] = [];

	// Month names
	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	// Weekday names (short)
	const weekdayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	// Rotate weekday names based on firstDayOfWeek
	const rotatedWeekdays = [
		...weekdayNames.slice(state.firstDayOfWeek),
		...weekdayNames.slice(0, state.firstDayOfWeek),
	];

	// Header: Month Year
	const header = `${monthNames[state.month]} ${state.year}`;
	const headerPadding = Math.max(0, Math.floor((23 - header.length) / 2));
	lines.push(' '.repeat(headerPadding) + header);

	// Weekday labels
	let weekdayLine = state.showWeekNumbers ? '   ' : '';
	weekdayLine += rotatedWeekdays.join(' ');
	lines.push(weekdayLine);

	// Calculate grid
	const daysInMonth = getDaysInMonth(state.year, state.month);
	const firstDay = getFirstDayOfMonth(state.year, state.month);
	const adjustedFirstDay = (firstDay - state.firstDayOfWeek + 7) % 7;

	// Build calendar grid (6 weeks max)
	const dayNum = 1;
	let currentDate = 1 - adjustedFirstDay;

	for (let week = 0; week < 6; week++) {
		let weekLine = '';

		// Week number
		if (state.showWeekNumbers) {
			const dateForWeek = new Date(state.year, state.month, currentDate > 0 ? currentDate : 1);
			const weekNum = getWeekNumber(dateForWeek);
			weekLine += `${String(weekNum).padStart(2, ' ')} `;
		}

		// Days
		for (let day = 0; day < 7; day++) {
			if (currentDate < 1 || currentDate > daysInMonth) {
				weekLine += '   ';
			} else {
				const dayStr = String(currentDate).padStart(2, ' ');
				weekLine += `${dayStr} `;
			}
			currentDate++;
		}

		lines.push(weekLine.trimEnd());

		if (dayNum > daysInMonth && currentDate > daysInMonth) break;
	}

	// Set content
	setContent(world, eid, lines.join('\n'));
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Calendar widget with the given configuration.
 *
 * The Calendar widget displays a monthly calendar with date selection,
 * keyboard navigation, and support for marked dates.
 *
 * Key bindings:
 * - Arrow keys: Navigate dates
 * - Enter: Select current cursor date
 * - PageUp: Previous month
 * - PageDown: Next month
 * - Shift+PageUp: Previous year
 * - Shift+PageDown: Next year
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Calendar widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createCalendar } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const calendar = createCalendar(world, eid, {
 *   left: 5,
 *   top: 5,
 *   initialDate: new Date(),
 *   showWeekNumbers: true,
 * });
 *
 * calendar.onSelect((date) => {
 *   console.log('Selected date:', date.toISOString());
 * });
 *
 * // Navigate with methods
 * calendar.nextMonth().render();
 *
 * // Or handle keys
 * calendar.handleKey('down'); // Move cursor down one week
 * calendar.handleKey('enter'); // Select cursor date
 *
 * // Clean up
 * calendar.destroy();
 * ```
 */
export function createCalendar(
	world: World,
	entity: Entity,
	config: CalendarConfig = {},
): CalendarWidget {
	const validated = CalendarConfigSchema.parse(config);
	const eid = entity;

	// Get year, month, day from initialDate, handling timezone properly
	// Use local timezone to ensure consistency
	const initialDate = validated.initialDate ?? new Date();
	const year = initialDate.getFullYear();
	const month = initialDate.getMonth();
	const day = initialDate.getDate();

	// Set position
	setPosition(world, eid, validated.left, validated.top);

	// Calculate dimensions (width based on showWeekNumbers)
	const width = validated.showWeekNumbers ? 23 : 20;
	const height = 8; // Header + weekdays + 6 weeks
	setDimensions(world, eid, width, height);

	// Initialize state
	const markedDates = new Set<string>(validated.markedDates.map(toISODateString));

	const state: CalendarState = {
		year,
		month,
		selectedDay: undefined,
		cursorDay: day,
		minDate: validated.minDate,
		maxDate: validated.maxDate,
		firstDayOfWeek: validated.firstDayOfWeek,
		showWeekNumbers: validated.showWeekNumbers,
		markedDates,
		theme: validated.theme ?? {},
		onSelectCallbacks: [],
	};

	setCalendarState(eid, state);

	// Initial render
	renderCalendar(world, eid);

	// Create the widget object with chainable methods
	const widget: CalendarWidget = {
		eid,

		setDate(date: Date): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.year = date.getFullYear();
			st.month = date.getMonth();
			st.selectedDay = date.getDate();
			st.cursorDay = date.getDate();
			renderCalendar(world, eid);
			return widget;
		},

		getDate(): Date | undefined {
			const st = getCalendarState(eid);
			if (!st || st.selectedDay === undefined) return undefined;
			return new Date(st.year, st.month, st.selectedDay);
		},

		getMonth(): { year: number; month: number } {
			const st = getCalendarState(eid);
			if (!st) return { year: new Date().getFullYear(), month: new Date().getMonth() };
			return { year: st.year, month: st.month };
		},

		prevMonth(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.month--;
			if (st.month < 0) {
				st.month = 11;
				st.year--;
			}

			// Adjust cursor day if it's out of range for the new month
			const daysInMonth = getDaysInMonth(st.year, st.month);
			if (st.cursorDay > daysInMonth) {
				st.cursorDay = daysInMonth;
			}

			renderCalendar(world, eid);
			return widget;
		},

		nextMonth(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.month++;
			if (st.month > 11) {
				st.month = 0;
				st.year++;
			}

			// Adjust cursor day if it's out of range for the new month
			const daysInMonth = getDaysInMonth(st.year, st.month);
			if (st.cursorDay > daysInMonth) {
				st.cursorDay = daysInMonth;
			}

			renderCalendar(world, eid);
			return widget;
		},

		prevYear(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.year--;

			// Adjust for leap year
			const daysInMonth = getDaysInMonth(st.year, st.month);
			if (st.cursorDay > daysInMonth) {
				st.cursorDay = daysInMonth;
			}

			renderCalendar(world, eid);
			return widget;
		},

		nextYear(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.year++;

			// Adjust for leap year
			const daysInMonth = getDaysInMonth(st.year, st.month);
			if (st.cursorDay > daysInMonth) {
				st.cursorDay = daysInMonth;
			}

			renderCalendar(world, eid);
			return widget;
		},

		cursorUp(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			// Create a date from current cursor position and subtract 7 days
			const currentDate = new Date(st.year, st.month, st.cursorDay);
			currentDate.setDate(currentDate.getDate() - 7);

			// Update state with new date
			st.year = currentDate.getFullYear();
			st.month = currentDate.getMonth();
			st.cursorDay = currentDate.getDate();

			renderCalendar(world, eid);
			return widget;
		},

		cursorDown(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			// Create a date from current cursor position and add 7 days
			const currentDate = new Date(st.year, st.month, st.cursorDay);
			currentDate.setDate(currentDate.getDate() + 7);

			// Update state with new date
			st.year = currentDate.getFullYear();
			st.month = currentDate.getMonth();
			st.cursorDay = currentDate.getDate();

			renderCalendar(world, eid);
			return widget;
		},

		cursorLeft(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			// Create a date from current cursor position and subtract 1 day
			const currentDate = new Date(st.year, st.month, st.cursorDay);
			currentDate.setDate(currentDate.getDate() - 1);

			// Update state with new date
			st.year = currentDate.getFullYear();
			st.month = currentDate.getMonth();
			st.cursorDay = currentDate.getDate();

			renderCalendar(world, eid);
			return widget;
		},

		cursorRight(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			// Create a date from current cursor position and add 1 day
			const currentDate = new Date(st.year, st.month, st.cursorDay);
			currentDate.setDate(currentDate.getDate() + 1);

			// Update state with new date
			st.year = currentDate.getFullYear();
			st.month = currentDate.getMonth();
			st.cursorDay = currentDate.getDate();

			renderCalendar(world, eid);
			return widget;
		},

		selectCursor(): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			const selectedDate = new Date(st.year, st.month, st.cursorDay);

			// Check if date is in allowed range
			if (!isDateInRange(selectedDate, st.minDate, st.maxDate)) {
				return widget;
			}

			st.selectedDay = st.cursorDay;
			renderCalendar(world, eid);

			// Trigger callbacks
			for (const callback of st.onSelectCallbacks) {
				callback(selectedDate);
			}

			return widget;
		},

		setMarkedDates(dates: readonly Date[]): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.markedDates = new Set(dates.map(toISODateString));
			renderCalendar(world, eid);
			return widget;
		},

		addMarkedDate(date: Date): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.markedDates.add(toISODateString(date));
			renderCalendar(world, eid);
			return widget;
		},

		removeMarkedDate(date: Date): CalendarWidget {
			const st = getCalendarState(eid);
			if (!st) return widget;

			st.markedDates.delete(toISODateString(date));
			renderCalendar(world, eid);
			return widget;
		},

		getMarkedDates(): readonly Date[] {
			const st = getCalendarState(eid);
			if (!st) return [];

			return Array.from(st.markedDates).map((isoStr) => new Date(isoStr));
		},

		handleKey(key: string): boolean {
			const st = getCalendarState(eid);
			if (!st) return false;

			switch (key) {
				case 'up':
					widget.cursorUp();
					return true;
				case 'down':
					widget.cursorDown();
					return true;
				case 'left':
					widget.cursorLeft();
					return true;
				case 'right':
					widget.cursorRight();
					return true;
				case 'enter':
				case 'return':
					widget.selectCursor();
					return true;
				case 'pageup':
					widget.prevMonth();
					return true;
				case 'pagedown':
					widget.nextMonth();
					return true;
				case 'S-pageup': // Shift+PageUp
					widget.prevYear();
					return true;
				case 'S-pagedown': // Shift+PageDown
					widget.nextYear();
					return true;
				default:
					return false;
			}
		},

		onSelect(callback: (date: Date) => void): () => void {
			const st = getCalendarState(eid);
			if (!st) return () => {};

			st.onSelectCallbacks.push(callback);

			// Return unsubscribe function
			return () => {
				const idx = st.onSelectCallbacks.indexOf(callback);
				if (idx >= 0) {
					st.onSelectCallbacks.splice(idx, 1);
				}
			};
		},

		render(): CalendarWidget {
			renderCalendar(world, eid);
			return widget;
		},

		destroy(): void {
			deleteCalendarState(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a calendar.
 *
 * @param eid - The entity ID
 * @returns true if the entity is a calendar
 */
export function isCalendar(eid: Entity): boolean {
	return calendarStateMap.has(eid);
}

/**
 * Calendar component tag for registry.
 */
export const Calendar = 'Calendar' as const;
