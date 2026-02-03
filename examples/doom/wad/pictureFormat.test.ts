import { describe, expect, it } from 'vitest';
import { parsePicture, renderPictureToFlat } from './pictureFormat.js';

/**
 * Build a minimal valid Doom picture for testing.
 *
 * Creates a 2x3 picture with:
 * - Column 0: one post at y=0 with pixels [10, 11, 12]
 * - Column 1: one post at y=1 with pixels [20, 21]
 */
function buildTestPicture(): Uint8Array {
	const width = 2;
	const height = 3;

	// Column 0 post data: topdelta=0, length=3, pad, pixels[10,11,12], pad, 0xFF end
	const col0Posts = [0, 3, 0, 10, 11, 12, 0, 0xff];
	// Column 1 post data: topdelta=1, length=2, pad, pixels[20,21], pad, 0xFF end
	const col1Posts = [1, 2, 0, 20, 21, 0, 0xff];

	// Header: 8 bytes + column offsets: 2 * 4 = 8 bytes = 16 bytes before data
	const headerSize = 8 + width * 4;
	const col0Offset = headerSize;
	const col1Offset = col0Offset + col0Posts.length;
	const totalSize = col1Offset + col1Posts.length;

	const buf = new ArrayBuffer(totalSize);
	const view = new DataView(buf);
	const arr = new Uint8Array(buf);

	// Header
	view.setUint16(0, width, true);
	view.setUint16(2, height, true);
	view.setInt16(4, 0, true);  // leftOffset
	view.setInt16(6, 0, true);  // topOffset

	// Column offsets
	view.setUint32(8, col0Offset, true);
	view.setUint32(12, col1Offset, true);

	// Column 0 posts
	for (let i = 0; i < col0Posts.length; i++) {
		arr[col0Offset + i] = col0Posts[i]!;
	}

	// Column 1 posts
	for (let i = 0; i < col1Posts.length; i++) {
		arr[col1Offset + i] = col1Posts[i]!;
	}

	return arr;
}

describe('parsePicture', () => {
	it('parses header correctly', () => {
		const pic = parsePicture(buildTestPicture());

		expect(pic.width).toBe(2);
		expect(pic.height).toBe(3);
		expect(pic.leftOffset).toBe(0);
		expect(pic.topOffset).toBe(0);
	});

	it('parses correct number of columns', () => {
		const pic = parsePicture(buildTestPicture());
		expect(pic.columns.length).toBe(2);
	});

	it('parses column 0 post data', () => {
		const pic = parsePicture(buildTestPicture());
		const col0 = pic.columns[0]!;

		expect(col0.length).toBe(1);
		expect(col0[0]?.topDelta).toBe(0);
		expect(col0[0]?.pixels.length).toBe(3);
		expect(col0[0]?.pixels[0]).toBe(10);
		expect(col0[0]?.pixels[1]).toBe(11);
		expect(col0[0]?.pixels[2]).toBe(12);
	});

	it('parses column 1 post data with offset', () => {
		const pic = parsePicture(buildTestPicture());
		const col1 = pic.columns[1]!;

		expect(col1.length).toBe(1);
		expect(col1[0]?.topDelta).toBe(1);
		expect(col1[0]?.pixels.length).toBe(2);
		expect(col1[0]?.pixels[0]).toBe(20);
		expect(col1[0]?.pixels[1]).toBe(21);
	});

	it('throws on too-small data', () => {
		expect(() => parsePicture(new Uint8Array(4))).toThrow('too small');
	});

	it('throws on zero dimensions', () => {
		const buf = new ArrayBuffer(8);
		const view = new DataView(buf);
		view.setUint16(0, 0, true); // width = 0
		view.setUint16(2, 10, true);

		expect(() => parsePicture(new Uint8Array(buf))).toThrow('Invalid picture dimensions');
	});
});

describe('renderPictureToFlat', () => {
	it('renders a picture to a flat pixel array', () => {
		const pic = parsePicture(buildTestPicture());
		const flat = renderPictureToFlat(pic);

		// 2x3 = 6 pixels
		expect(flat.length).toBe(6);

		// Column 0: pixels at y=0,1,2
		expect(flat[0 * 2 + 0]).toBe(10); // (0,0)
		expect(flat[1 * 2 + 0]).toBe(11); // (0,1)
		expect(flat[2 * 2 + 0]).toBe(12); // (0,2)

		// Column 1: pixel at y=1,2 (y=0 is transparent)
		expect(flat[0 * 2 + 1]).toBe(0xff); // (1,0) = transparent
		expect(flat[1 * 2 + 1]).toBe(20);   // (1,1)
		expect(flat[2 * 2 + 1]).toBe(21);   // (1,2)
	});
});
