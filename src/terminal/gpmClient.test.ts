import { describe, expect, it } from 'vitest';
import {
	buildGpmConnectPacket,
	detectVirtualConsole,
	GpmButton,
	GpmEventType,
	gpmButtonToMouseButton,
	gpmEventToMouseEvent,
	gpmTypeToMouseAction,
	parseGpmEventBuffer,
	parseGpmModifiers,
} from './gpmClient';

describe('GpmClient', () => {
	describe('parseGpmEventBuffer', () => {
		it('parses a valid 20-byte GPM event', () => {
			const buf = new Uint8Array(20);
			const view = new DataView(buf.buffer);

			buf[0] = GpmButton.LEFT; // buttons
			buf[1] = 0; // modifiers
			view.setUint16(2, 1, true); // vc
			view.setInt16(4, 0, true); // dx
			view.setInt16(6, 0, true); // dy
			view.setInt16(8, 10, true); // x
			view.setInt16(10, 20, true); // y
			view.setInt16(12, GpmEventType.DOWN, true); // type

			const event = parseGpmEventBuffer(buf);
			expect(event).not.toBeNull();
			expect(event?.buttons).toBe(GpmButton.LEFT);
			expect(event?.x).toBe(10);
			expect(event?.y).toBe(20);
			expect(event?.type).toBe(GpmEventType.DOWN);
		});

		it('returns null for too-small buffer', () => {
			const buf = new Uint8Array(10);
			expect(parseGpmEventBuffer(buf)).toBeNull();
		});

		it('parses modifiers', () => {
			const buf = new Uint8Array(20);
			buf[1] = 5; // shift + ctrl
			const event = parseGpmEventBuffer(buf);
			expect(event?.modifiers).toBe(5);
		});
	});

	describe('gpmButtonToMouseButton', () => {
		it('maps LEFT to left', () => {
			expect(gpmButtonToMouseButton(GpmButton.LEFT)).toBe('left');
		});

		it('maps MIDDLE to middle', () => {
			expect(gpmButtonToMouseButton(GpmButton.MIDDLE)).toBe('middle');
		});

		it('maps RIGHT to right', () => {
			expect(gpmButtonToMouseButton(GpmButton.RIGHT)).toBe('right');
		});

		it('maps UP to wheelUp', () => {
			expect(gpmButtonToMouseButton(GpmButton.UP)).toBe('wheelUp');
		});

		it('maps DOWN to wheelDown', () => {
			expect(gpmButtonToMouseButton(GpmButton.DOWN)).toBe('wheelDown');
		});

		it('maps NONE to unknown', () => {
			expect(gpmButtonToMouseButton(GpmButton.NONE)).toBe('unknown');
		});
	});

	describe('gpmTypeToMouseAction', () => {
		it('maps DOWN to press', () => {
			expect(gpmTypeToMouseAction(GpmEventType.DOWN, GpmButton.LEFT)).toBe('press');
		});

		it('maps UP to release', () => {
			expect(gpmTypeToMouseAction(GpmEventType.UP, GpmButton.LEFT)).toBe('release');
		});

		it('maps MOVE to move', () => {
			expect(gpmTypeToMouseAction(GpmEventType.MOVE, GpmButton.NONE)).toBe('move');
		});

		it('maps DRAG to move', () => {
			expect(gpmTypeToMouseAction(GpmEventType.DRAG, GpmButton.LEFT)).toBe('move');
		});

		it('maps wheel buttons to wheel', () => {
			expect(gpmTypeToMouseAction(GpmEventType.DOWN, GpmButton.UP)).toBe('wheel');
			expect(gpmTypeToMouseAction(GpmEventType.DOWN, GpmButton.DOWN)).toBe('wheel');
		});
	});

	describe('parseGpmModifiers', () => {
		it('detects no modifiers', () => {
			const mods = parseGpmModifiers(0);
			expect(mods.shift).toBe(false);
			expect(mods.ctrl).toBe(false);
			expect(mods.meta).toBe(false);
		});

		it('detects shift', () => {
			const mods = parseGpmModifiers(1);
			expect(mods.shift).toBe(true);
		});

		it('detects ctrl', () => {
			const mods = parseGpmModifiers(4);
			expect(mods.ctrl).toBe(true);
		});

		it('detects meta', () => {
			const mods = parseGpmModifiers(8);
			expect(mods.meta).toBe(true);
		});

		it('detects combined modifiers', () => {
			const mods = parseGpmModifiers(5); // shift + ctrl
			expect(mods.shift).toBe(true);
			expect(mods.ctrl).toBe(true);
			expect(mods.meta).toBe(false);
		});
	});

	describe('gpmEventToMouseEvent', () => {
		it('converts GPM event to MouseEvent', () => {
			const raw = {
				buttons: GpmButton.LEFT,
				modifiers: 0,
				vc: 1,
				dx: 0,
				dy: 0,
				x: 10,
				y: 20,
				type: GpmEventType.DOWN,
				clicks: 1,
			};

			const event = gpmEventToMouseEvent(raw);
			expect(event.x).toBe(9); // 0-indexed
			expect(event.y).toBe(19); // 0-indexed
			expect(event.button).toBe('left');
			expect(event.action).toBe('press');
			expect(event.ctrl).toBe(false);
		});

		it('converts coordinates to 0-indexed', () => {
			const raw = {
				buttons: GpmButton.RIGHT,
				modifiers: 4, // ctrl
				vc: 1,
				dx: 0,
				dy: 0,
				x: 1,
				y: 1,
				type: GpmEventType.UP,
				clicks: 0,
			};

			const event = gpmEventToMouseEvent(raw);
			expect(event.x).toBe(0);
			expect(event.y).toBe(0);
			expect(event.button).toBe('right');
			expect(event.action).toBe('release');
			expect(event.ctrl).toBe(true);
		});

		it('handles wheel events', () => {
			const raw = {
				buttons: GpmButton.UP,
				modifiers: 0,
				vc: 1,
				dx: 0,
				dy: 0,
				x: 5,
				y: 5,
				type: GpmEventType.DOWN,
				clicks: 0,
			};

			const event = gpmEventToMouseEvent(raw);
			expect(event.button).toBe('wheelUp');
			expect(event.action).toBe('wheel');
		});
	});

	describe('buildGpmConnectPacket', () => {
		it('builds a 16-byte packet', () => {
			const config = {
				socketPath: '/dev/gpmctl',
				eventMask: 0xffff,
				defaultMask: 0,
				minMod: 0,
				maxMod: 0xffff,
				pid: 1234,
				vc: 1,
			};

			const packet = buildGpmConnectPacket(config);
			expect(packet.length).toBe(16);

			const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
			expect(view.getUint16(0, true)).toBe(0xffff); // eventMask
			expect(view.getUint16(2, true)).toBe(0); // defaultMask
			expect(view.getInt32(8, true)).toBe(1234); // pid
			expect(view.getInt32(12, true)).toBe(1); // vc
		});
	});

	describe('detectVirtualConsole', () => {
		it('returns 0 when not on a virtual console', () => {
			// In test environment, we're not on a TTY
			expect(detectVirtualConsole()).toBe(0);
		});
	});
});
