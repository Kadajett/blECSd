/**
 * Mouse bindings.
 * @module input/mouseBindings
 */

/**
 * Local mouse event type for file manager.
 */
interface LocalMouseEvent {
	x: number;
	y: number;
	action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheelup' | 'wheeldown';
	button: 'left' | 'middle' | 'right' | 'none';
	ctrl: boolean;
	shift: boolean;
	meta: boolean;
}

/**
 * Mouse action types.
 */
export type MouseAction =
	| { type: 'click'; index: number }
	| { type: 'doubleClick'; index: number }
	| { type: 'ctrlClick'; index: number }
	| { type: 'shiftClick'; index: number }
	| { type: 'scroll'; direction: 'up' | 'down'; lines: number }
	| { type: 'headerClick'; column: number }
	| { type: 'dividerDrag'; x: number }
	| { type: 'previewScroll'; direction: 'up' | 'down'; lines: number };

/**
 * UI regions for hit testing.
 */
export interface UIRegions {
	/** List region bounds */
	list: { x: number; y: number; width: number; height: number };
	/** Preview region bounds */
	preview: { x: number; y: number; width: number; height: number };
	/** Column header region */
	columnHeader: { x: number; y: number; width: number; height: number };
	/** Divider x position */
	dividerX: number;
}

/**
 * Double-click detection state.
 */
interface DoubleClickState {
	lastClickTime: number;
	lastClickX: number;
	lastClickY: number;
}

const doubleClickState: DoubleClickState = {
	lastClickTime: 0,
	lastClickX: -1,
	lastClickY: -1,
};

const DOUBLE_CLICK_MS = 300;
const DOUBLE_CLICK_DISTANCE = 2;

/**
 * Processes a mouse event and returns the action.
 */
export function processMouseEvent(
	event: LocalMouseEvent,
	regions: UIRegions,
	listStartIndex: number,
): MouseAction | null {
	const { x, y, action, button } = event;

	// Scroll wheel
	if (action === 'wheelup' || action === 'wheeldown') {
		const direction = action === 'wheelup' ? 'up' : 'down';

		// Check if in preview region
		if (isInRegion(x, y, regions.preview)) {
			return { type: 'previewScroll', direction, lines: 3 };
		}

		// Check if in list region
		if (isInRegion(x, y, regions.list) || isInRegion(x, y, regions.columnHeader)) {
			return { type: 'scroll', direction, lines: 3 };
		}

		return null;
	}

	// Mouse button events
	if (action === 'mousedown' && button === 'left') {
		// Check for column header click
		if (isInRegion(x, y, regions.columnHeader)) {
			const column = getColumnAtX(x, regions.columnHeader.width);
			return { type: 'headerClick', column };
		}

		// Check for divider drag
		if (Math.abs(x - regions.dividerX) <= 1) {
			return { type: 'dividerDrag', x };
		}

		// Check for list click
		if (isInRegion(x, y, regions.list)) {
			const rowIndex = y - regions.list.y;
			const dataIndex = listStartIndex + rowIndex;

			// Check for double click
			const now = Date.now();
			const isDoubleClick =
				now - doubleClickState.lastClickTime < DOUBLE_CLICK_MS &&
				Math.abs(x - doubleClickState.lastClickX) < DOUBLE_CLICK_DISTANCE &&
				Math.abs(y - doubleClickState.lastClickY) < DOUBLE_CLICK_DISTANCE;

			doubleClickState.lastClickTime = now;
			doubleClickState.lastClickX = x;
			doubleClickState.lastClickY = y;

			if (isDoubleClick) {
				return { type: 'doubleClick', index: dataIndex };
			}

			// Check for modifier clicks
			if (event.ctrl) {
				return { type: 'ctrlClick', index: dataIndex };
			}
			if (event.shift) {
				return { type: 'shiftClick', index: dataIndex };
			}

			return { type: 'click', index: dataIndex };
		}
	}

	return null;
}

/**
 * Checks if a point is within a region.
 */
function isInRegion(
	x: number,
	y: number,
	region: { x: number; y: number; width: number; height: number },
): boolean {
	return (
		x >= region.x &&
		x < region.x + region.width &&
		y >= region.y &&
		y < region.y + region.height
	);
}

/**
 * Gets the column index at an x position.
 */
function getColumnAtX(x: number, headerWidth: number): number {
	// Simplified: divide header into 3 columns
	const nameWidth = headerWidth - 20;

	if (x < nameWidth) return 0; // Name column
	if (x < nameWidth + 9) return 1; // Size column
	return 2; // Date column
}

/**
 * Creates UI regions based on terminal dimensions.
 * Layout:
 * - Row 0: Header
 * - Row 1: Column headers (list side)
 * - Rows 2 to height-5: File list / Preview content
 * - Row height-2: Status bar
 * - Row height-1: Action bar
 */
export function createUIRegions(
	width: number,
	height: number,
	splitRatio: number,
): UIRegions {
	const listWidth = Math.floor((width - 1) * splitRatio);
	const previewWidth = width - listWidth - 1;
	// List height: total - header(1) - column header(1) - status bar(1) - action bar(1) = height - 4
	const listHeight = height - 4;
	// Preview height: total - header(1) - status bar(1) - action bar(1) = height - 3
	const previewHeight = height - 3;

	return {
		list: {
			x: 0,
			y: 2,
			width: listWidth,
			height: listHeight,
		},
		preview: {
			x: listWidth + 1,
			y: 1,
			width: previewWidth,
			height: previewHeight,
		},
		columnHeader: {
			x: 0,
			y: 1,
			width: listWidth,
			height: 1,
		},
		dividerX: listWidth,
	};
}
