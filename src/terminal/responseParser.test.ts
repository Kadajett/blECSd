/**
 * Tests for terminal response parser
 */

import { describe, expect, it } from 'vitest';
import {
	CursorPositionSchema,
	isCursorPosition,
	isDeviceStatus,
	isIconLabel,
	isLocatorPosition,
	isPrimaryDA,
	isScreenSize,
	isSecondaryDA,
	isTextAreaSize,
	isUnknown,
	isWindowPosition,
	isWindowSizePixels,
	isWindowState,
	isWindowTitle,
	parseResponse,
	query,
	ResponseType,
} from './responseParser';

describe('parseResponse', () => {
	describe('Primary Device Attributes (DA1)', () => {
		it('parses VT100 response', () => {
			const response = '\x1b[?1;2c';
			const parsed = parseResponse(response);

			expect(isPrimaryDA(parsed)).toBe(true);
			if (isPrimaryDA(parsed)) {
				expect(parsed.deviceClass).toBe(1);
				expect(parsed.attributes).toEqual([2]);
			}
		});

		it('parses VT220 response with multiple attributes', () => {
			const response = '\x1b[?62;1;2;6;7;8;9c';
			const parsed = parseResponse(response);

			expect(isPrimaryDA(parsed)).toBe(true);
			if (isPrimaryDA(parsed)) {
				expect(parsed.deviceClass).toBe(62);
				expect(parsed.attributes).toEqual([1, 2, 6, 7, 8, 9]);
			}
		});

		it('parses response with no attributes', () => {
			const response = '\x1b[?1c';
			const parsed = parseResponse(response);

			expect(isPrimaryDA(parsed)).toBe(true);
			if (isPrimaryDA(parsed)) {
				expect(parsed.deviceClass).toBe(1);
				expect(parsed.attributes).toEqual([]);
			}
		});
	});

	describe('Secondary Device Attributes (DA2)', () => {
		it('parses xterm response', () => {
			const response = '\x1b[>41;354;0c';
			const parsed = parseResponse(response);

			expect(isSecondaryDA(parsed)).toBe(true);
			if (isSecondaryDA(parsed)) {
				expect(parsed.terminalType).toBe(41);
				expect(parsed.firmwareVersion).toBe(354);
				expect(parsed.romCartridge).toBe(0);
			}
		});

		it('parses minimal response', () => {
			const response = '\x1b[>0;0;0c';
			const parsed = parseResponse(response);

			expect(isSecondaryDA(parsed)).toBe(true);
			if (isSecondaryDA(parsed)) {
				expect(parsed.terminalType).toBe(0);
				expect(parsed.firmwareVersion).toBe(0);
				expect(parsed.romCartridge).toBe(0);
			}
		});
	});

	describe('Cursor Position Report (CPR)', () => {
		it('parses cursor position response', () => {
			const response = '\x1b[10;20R';
			const parsed = parseResponse(response);

			expect(isCursorPosition(parsed)).toBe(true);
			if (isCursorPosition(parsed)) {
				expect(parsed.row).toBe(10);
				expect(parsed.column).toBe(20);
			}
		});

		it('parses position at origin', () => {
			const response = '\x1b[1;1R';
			const parsed = parseResponse(response);

			expect(isCursorPosition(parsed)).toBe(true);
			if (isCursorPosition(parsed)) {
				expect(parsed.row).toBe(1);
				expect(parsed.column).toBe(1);
			}
		});

		it('parses large position values', () => {
			const response = '\x1b[999;999R';
			const parsed = parseResponse(response);

			expect(isCursorPosition(parsed)).toBe(true);
			if (isCursorPosition(parsed)) {
				expect(parsed.row).toBe(999);
				expect(parsed.column).toBe(999);
			}
		});
	});

	describe('Device Status Report (DSR)', () => {
		it('parses OK status', () => {
			const response = '\x1b[0n';
			const parsed = parseResponse(response);

			expect(isDeviceStatus(parsed)).toBe(true);
			if (isDeviceStatus(parsed)) {
				expect(parsed.status).toBe(0);
				expect(parsed.ok).toBe(true);
			}
		});

		it('parses error status', () => {
			const response = '\x1b[3n';
			const parsed = parseResponse(response);

			expect(isDeviceStatus(parsed)).toBe(true);
			if (isDeviceStatus(parsed)) {
				expect(parsed.status).toBe(3);
				expect(parsed.ok).toBe(false);
			}
		});
	});

	describe('Window Manipulation responses', () => {
		it('parses window state - open', () => {
			const response = '\x1b[1t';
			const parsed = parseResponse(response);

			expect(isWindowState(parsed)).toBe(true);
			if (isWindowState(parsed)) {
				expect(parsed.state).toBe(1);
				expect(parsed.iconified).toBe(false);
			}
		});

		it('parses window state - iconified', () => {
			const response = '\x1b[2t';
			const parsed = parseResponse(response);

			expect(isWindowState(parsed)).toBe(true);
			if (isWindowState(parsed)) {
				expect(parsed.state).toBe(2);
				expect(parsed.iconified).toBe(true);
			}
		});

		it('parses window position', () => {
			const response = '\x1b[3;100;200t';
			const parsed = parseResponse(response);

			expect(isWindowPosition(parsed)).toBe(true);
			if (isWindowPosition(parsed)) {
				expect(parsed.x).toBe(100);
				expect(parsed.y).toBe(200);
			}
		});

		it('parses window size in pixels', () => {
			const response = '\x1b[4;480;640t';
			const parsed = parseResponse(response);

			expect(isWindowSizePixels(parsed)).toBe(true);
			if (isWindowSizePixels(parsed)) {
				expect(parsed.height).toBe(480);
				expect(parsed.width).toBe(640);
			}
		});

		it('parses text area size', () => {
			const response = '\x1b[8;24;80t';
			const parsed = parseResponse(response);

			expect(isTextAreaSize(parsed)).toBe(true);
			if (isTextAreaSize(parsed)) {
				expect(parsed.rows).toBe(24);
				expect(parsed.columns).toBe(80);
			}
		});

		it('parses screen size', () => {
			const response = '\x1b[9;50;120t';
			const parsed = parseResponse(response);

			expect(isScreenSize(parsed)).toBe(true);
			if (isScreenSize(parsed)) {
				expect(parsed.rows).toBe(50);
				expect(parsed.columns).toBe(120);
			}
		});
	});

	describe('OSC responses', () => {
		it('parses window title with BEL terminator', () => {
			const response = '\x1b]76;My Window Title\x07';
			const parsed = parseResponse(response);

			expect(isWindowTitle(parsed)).toBe(true);
			if (isWindowTitle(parsed)) {
				expect(parsed.title).toBe('My Window Title');
			}
		});

		it('parses window title with ST terminator', () => {
			const response = '\x1b]76;Another Title\x1b\\';
			const parsed = parseResponse(response);

			expect(isWindowTitle(parsed)).toBe(true);
			if (isWindowTitle(parsed)) {
				expect(parsed.title).toBe('Another Title');
			}
		});

		it('parses icon label', () => {
			const response = '\x1b]108;MyIcon\x07';
			const parsed = parseResponse(response);

			expect(isIconLabel(parsed)).toBe(true);
			if (isIconLabel(parsed)) {
				expect(parsed.label).toBe('MyIcon');
			}
		});

		it('handles empty title', () => {
			const response = '\x1b]76;\x07';
			const parsed = parseResponse(response);

			expect(isWindowTitle(parsed)).toBe(true);
			if (isWindowTitle(parsed)) {
				expect(parsed.title).toBe('');
			}
		});
	});

	describe('Locator Position', () => {
		it('parses locator position report', () => {
			const response = '\x1b[1;2;10;20;1&w';
			const parsed = parseResponse(response);

			expect(isLocatorPosition(parsed)).toBe(true);
			if (isLocatorPosition(parsed)) {
				expect(parsed.status).toBe(1);
				expect(parsed.button).toBe(2);
				expect(parsed.row).toBe(10);
				expect(parsed.column).toBe(20);
				expect(parsed.page).toBe(1);
			}
		});
	});

	describe('Unknown responses', () => {
		it('returns unknown for unrecognized sequences', () => {
			const response = '\x1b[?unknown';
			const parsed = parseResponse(response);

			expect(isUnknown(parsed)).toBe(true);
			expect(parsed.raw).toBe(response);
		});

		it('returns unknown for plain text', () => {
			const response = 'just plain text';
			const parsed = parseResponse(response);

			expect(isUnknown(parsed)).toBe(true);
		});

		it('returns unknown for empty string', () => {
			const response = '';
			const parsed = parseResponse(response);

			expect(isUnknown(parsed)).toBe(true);
		});
	});

	describe('raw property', () => {
		it('preserves raw response in all parsed types', () => {
			const responses = [
				'\x1b[?1;2c',
				'\x1b[>0;0;0c',
				'\x1b[10;20R',
				'\x1b[0n',
				'\x1b[1t',
				'\x1b]76;Title\x07',
				'unknown',
			];

			for (const response of responses) {
				const parsed = parseResponse(response);
				expect(parsed.raw).toBe(response);
			}
		});
	});
});

describe('CursorPositionSchema', () => {
	it('validates correct cursor position response', () => {
		const response = {
			type: ResponseType.CURSOR_POSITION,
			raw: '\x1b[10;20R',
			row: 10,
			column: 20,
		};

		const result = CursorPositionSchema.safeParse(response);
		expect(result.success).toBe(true);
	});

	it('rejects invalid row', () => {
		const response = {
			type: ResponseType.CURSOR_POSITION,
			raw: '\x1b[10;20R',
			row: 0,
			column: 20,
		};

		const result = CursorPositionSchema.safeParse(response);
		expect(result.success).toBe(false);
	});

	it('rejects wrong type', () => {
		const response = {
			type: ResponseType.DEVICE_STATUS,
			raw: '\x1b[0n',
			row: 10,
			column: 20,
		};

		const result = CursorPositionSchema.safeParse(response);
		expect(result.success).toBe(false);
	});
});

describe('query generators', () => {
	describe('primaryDA', () => {
		it('generates correct sequence', () => {
			expect(query.primaryDA()).toBe('\x1b[c');
		});
	});

	describe('secondaryDA', () => {
		it('generates correct sequence', () => {
			expect(query.secondaryDA()).toBe('\x1b[>c');
		});
	});

	describe('tertiaryDA', () => {
		it('generates correct sequence', () => {
			expect(query.tertiaryDA()).toBe('\x1b[=c');
		});
	});

	describe('cursorPosition', () => {
		it('generates correct sequence', () => {
			expect(query.cursorPosition()).toBe('\x1b[6n');
		});
	});

	describe('deviceStatus', () => {
		it('generates correct sequence', () => {
			expect(query.deviceStatus()).toBe('\x1b[5n');
		});
	});

	describe('windowState', () => {
		it('generates correct sequence', () => {
			expect(query.windowState()).toBe('\x1b[11t');
		});
	});

	describe('windowPosition', () => {
		it('generates correct sequence', () => {
			expect(query.windowPosition()).toBe('\x1b[13t');
		});
	});

	describe('windowSizePixels', () => {
		it('generates correct sequence', () => {
			expect(query.windowSizePixels()).toBe('\x1b[14t');
		});
	});

	describe('textAreaSize', () => {
		it('generates correct sequence', () => {
			expect(query.textAreaSize()).toBe('\x1b[18t');
		});
	});

	describe('screenSize', () => {
		it('generates correct sequence', () => {
			expect(query.screenSize()).toBe('\x1b[19t');
		});
	});

	describe('charCellSize', () => {
		it('generates correct sequence', () => {
			expect(query.charCellSize()).toBe('\x1b[16t');
		});
	});

	describe('windowTitle', () => {
		it('generates correct sequence', () => {
			expect(query.windowTitle()).toBe('\x1b[21t');
		});
	});

	describe('iconLabel', () => {
		it('generates correct sequence', () => {
			expect(query.iconLabel()).toBe('\x1b[20t');
		});
	});

	describe('enableLocator', () => {
		it('generates disabled sequence', () => {
			expect(query.enableLocator(0)).toBe("\x1b[0'z");
		});

		it('generates one-shot sequence', () => {
			expect(query.enableLocator(1)).toBe("\x1b[1'z");
		});

		it('generates continuous sequence', () => {
			expect(query.enableLocator(2)).toBe("\x1b[2'z");
		});

		it('defaults to one-shot', () => {
			expect(query.enableLocator()).toBe("\x1b[1'z");
		});
	});

	describe('locatorPosition', () => {
		it('generates correct sequence', () => {
			expect(query.locatorPosition()).toBe("\x1b['|");
		});
	});
});

describe('type guards', () => {
	it('isPrimaryDA correctly identifies type', () => {
		const response = parseResponse('\x1b[?1;2c');
		expect(isPrimaryDA(response)).toBe(true);
		expect(isSecondaryDA(response)).toBe(false);
	});

	it('isSecondaryDA correctly identifies type', () => {
		const response = parseResponse('\x1b[>41;354;0c');
		expect(isSecondaryDA(response)).toBe(true);
		expect(isPrimaryDA(response)).toBe(false);
	});

	it('isCursorPosition correctly identifies type', () => {
		const response = parseResponse('\x1b[10;20R');
		expect(isCursorPosition(response)).toBe(true);
		expect(isDeviceStatus(response)).toBe(false);
	});

	it('isDeviceStatus correctly identifies type', () => {
		const response = parseResponse('\x1b[0n');
		expect(isDeviceStatus(response)).toBe(true);
		expect(isCursorPosition(response)).toBe(false);
	});
});

describe('ResponseType constants', () => {
	it('has all expected types', () => {
		expect(ResponseType.PRIMARY_DA).toBe('primary_da');
		expect(ResponseType.SECONDARY_DA).toBe('secondary_da');
		expect(ResponseType.CURSOR_POSITION).toBe('cursor_position');
		expect(ResponseType.DEVICE_STATUS).toBe('device_status');
		expect(ResponseType.WINDOW_TITLE).toBe('window_title');
		expect(ResponseType.ICON_LABEL).toBe('icon_label');
		expect(ResponseType.WINDOW_STATE).toBe('window_state');
		expect(ResponseType.WINDOW_POSITION).toBe('window_position');
		expect(ResponseType.WINDOW_SIZE_PIXELS).toBe('window_size_pixels');
		expect(ResponseType.TEXT_AREA_SIZE).toBe('text_area_size');
		expect(ResponseType.SCREEN_SIZE).toBe('screen_size');
		expect(ResponseType.CHAR_CELL_SIZE).toBe('char_cell_size');
		expect(ResponseType.LOCATOR_POSITION).toBe('locator_position');
		expect(ResponseType.UNKNOWN).toBe('unknown');
	});
});
