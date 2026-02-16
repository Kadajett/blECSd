/**
 * Calendar widget namespace.
 *
 * @example
 * ```typescript
 * import { calendar } from 'blecsd/widgets';
 * const cal = calendar.create(world, { year: 2026, month: 2 });
 * ```
 */
import { createCalendar, isCalendar, resetCalendarStore } from '../calendar';

export const calendar = Object.freeze({
	create: createCalendar,
	is: isCalendar,
	resetStore: resetCalendarStore,
});

export type CalendarModule = typeof calendar;
