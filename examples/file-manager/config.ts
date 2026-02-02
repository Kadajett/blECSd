/**
 * File manager configuration and user preferences.
 * @module config
 */

/**
 * Size format display mode.
 */
export enum SizeFormat {
	/** Raw bytes (1234567) */
	Bytes = 0,
	/** Kilobytes (1205 KB) */
	Kilobytes = 1,
	/** Megabytes (1.2 MB) */
	Megabytes = 2,
	/** Human-readable auto (1.2 MB, 4.5 KB) */
	Human = 3,
}

/**
 * Sort field for file list.
 */
export enum SortField {
	Name = 0,
	Size = 1,
	Modified = 2,
	Type = 3,
}

/**
 * Sort direction.
 */
export enum SortDirection {
	Ascending = 0,
	Descending = 1,
}

/**
 * File manager configuration.
 */
export interface FileManagerConfig {
	/** Show hidden files (dotfiles) */
	showHidden: boolean;
	/** Size format display mode */
	sizeFormat: SizeFormat;
	/** Sort field */
	sortField: SortField;
	/** Sort direction */
	sortDirection: SortDirection;
	/** Panel split ratio (0-1, left panel width) */
	splitRatio: number;
	/** Show preview panel */
	showPreview: boolean;
	/** Buffer rows above/below viewport for virtualization */
	bufferRows: number;
}

/**
 * Default configuration.
 */
export const DEFAULT_CONFIG: FileManagerConfig = {
	showHidden: false,
	sizeFormat: SizeFormat.Human,
	sortField: SortField.Name,
	sortDirection: SortDirection.Ascending,
	splitRatio: 0.6,
	showPreview: true,
	bufferRows: 5,
};

/**
 * Creates a new configuration with defaults.
 */
export function createConfig(overrides?: Partial<FileManagerConfig>): FileManagerConfig {
	return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Cycles to the next size format.
 */
export function nextSizeFormat(current: SizeFormat): SizeFormat {
	return ((current + 1) % 4) as SizeFormat;
}

/**
 * Cycles to the next sort field.
 */
export function nextSortField(current: SortField): SortField {
	return ((current + 1) % 4) as SortField;
}

/**
 * Toggles sort direction.
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
	return current === SortDirection.Ascending
		? SortDirection.Descending
		: SortDirection.Ascending;
}

/**
 * Formats file size according to the specified format.
 */
export function formatSize(bytes: number, format: SizeFormat): string {
	switch (format) {
		case SizeFormat.Bytes:
			return `${bytes} B`;
		case SizeFormat.Kilobytes:
			return `${Math.round(bytes / 1024)} KB`;
		case SizeFormat.Megabytes:
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		case SizeFormat.Human:
			return formatHumanSize(bytes);
	}
}

/**
 * Formats file size in human-readable format.
 */
function formatHumanSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Formats a date for display.
 * Shows "HH:MM" for today, "Mon DD" for this year, "Mon DD YY" for older.
 */
export function formatDate(date: Date): string {
	const now = new Date();
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[date.getMonth()] ?? 'Jan';
	const day = date.getDate().toString().padStart(2, ' ');

	// Same day: show time
	if (date.toDateString() === now.toDateString()) {
		const hours = date.getHours().toString().padStart(2, '0');
		const mins = date.getMinutes().toString().padStart(2, '0');
		return `   ${hours}:${mins}`;
	}

	// Same year: show month and day
	if (date.getFullYear() === now.getFullYear()) {
		return `${month} ${day}   `;
	}

	// Older: show month, day, and year
	const year = (date.getFullYear() % 100).toString().padStart(2, '0');
	return `${month} ${day} '${year}`;
}
