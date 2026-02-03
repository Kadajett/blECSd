/**
 * BSP tree traversal for the Doom renderer.
 *
 * Walks the BSP tree front-to-back from the player's viewpoint.
 * At each leaf (subsector), processes wall segments and builds visplanes.
 *
 * @module render/bsp
 */

import {
	ANG90,
	ANG180,
	ANGLETOFINESHIFT,
	FINEMASK,
	finecosine,
	finesine,
	pointToAngle2,
} from '../math/angles.js';
import { FRACBITS, fixedMul } from '../math/fixed.js';
import { clipangle, viewangletox, viewwidth } from '../math/tables.js';
import { NF_SUBSECTOR } from '../wad/types.js';
import type { BBox, MapNode } from '../wad/types.js';
import type { RenderState, Visplane } from './defs.js';
import { findPlane } from './planes.js';
import { addLine } from './segs.js';

// ─── BSP Traversal ─────────────────────────────────────────────────

/**
 * Render the scene by traversing the BSP tree.
 * Entry point: call with the root node index (nodes.length - 1).
 *
 * @param rs - Current render state
 * @param nodeId - BSP node index (or NF_SUBSECTOR | subsectorIndex for leaves)
 */
export function renderBspNode(rs: RenderState, nodeId: number): void {
	// Check if all screen columns are occluded
	if (isScreenOccluded(rs)) return;

	// Leaf node: render the subsector
	if (nodeId & NF_SUBSECTOR) {
		renderSubsector(rs, nodeId & ~NF_SUBSECTOR);
		return;
	}

	const node = rs.map.nodes[nodeId];
	if (!node) return;

	// Determine which side of the partition line the viewer is on
	const side = pointOnSide(rs.viewx, rs.viewy, node);

	// Render the near side first (front-to-back)
	const nearChild = side === 0 ? node.rightChild : node.leftChild;
	renderBspNode(rs, nearChild);

	// Check if the far side's bounding box is visible
	const farBBox = side === 0 ? node.leftBBox : node.rightBBox;
	const farChild = side === 0 ? node.leftChild : node.rightChild;

	if (checkBBox(rs, farBBox)) {
		renderBspNode(rs, farChild);
	}
}

// ─── Subsector Rendering ───────────────────────────────────────────

/**
 * Process all segs in a subsector (BSP leaf).
 * Matches R_Subsector from r_bsp.c: creates floor/ceiling visplanes
 * for the subsector's sector, then processes each seg.
 *
 * @param rs - Render state
 * @param subsectorIndex - Index into the subsectors array
 */
function renderSubsector(rs: RenderState, subsectorIndex: number): void {
	const subsector = rs.map.subsectors[subsectorIndex];
	if (!subsector) return;

	// Find the front sector for this subsector
	const firstSeg = rs.map.segs[subsector.firstSeg];
	if (!firstSeg) return;

	const linedef = rs.map.linedefs[firstSeg.linedef];
	if (!linedef) return;

	const sidedefIndex = firstSeg.side === 0 ? linedef.frontSidedef : linedef.backSidedef;
	const sidedef = rs.map.sidedefs[sidedefIndex];
	if (!sidedef) return;

	const frontsector = rs.map.sectors[sidedef.sector];
	if (!frontsector) return;

	// Create floor visplane if floor is below viewz
	let floorPlane: Visplane | null = null;
	if ((frontsector.floorHeight << FRACBITS) < rs.viewz) {
		floorPlane = findPlane(rs,
			frontsector.floorHeight << FRACBITS,
			frontsector.floorFlat,
			frontsector.lightLevel,
		);
	}

	// Create ceiling visplane if ceiling is above viewz (or sky)
	let ceilingPlane: Visplane | null = null;
	if ((frontsector.ceilingHeight << FRACBITS) > rs.viewz
		|| frontsector.ceilingFlat === 'F_SKY1') {
		ceilingPlane = findPlane(rs,
			frontsector.ceilingHeight << FRACBITS,
			frontsector.ceilingFlat,
			frontsector.lightLevel,
		);
	}

	// Process each seg in this subsector
	for (let i = 0; i < subsector.numSegs; i++) {
		const segIndex = subsector.firstSeg + i;
		const seg = rs.map.segs[segIndex];
		if (!seg) continue;

		addLine(rs, seg, subsectorIndex, floorPlane, ceilingPlane);
	}
}

// ─── Side Determination ────────────────────────────────────────────

/**
 * Determine which side of a BSP partition line a point falls on.
 * Returns 0 for the right (front) side, 1 for the left (back) side.
 *
 * @param x - Point X (fixed-point)
 * @param y - Point Y (fixed-point)
 * @param node - BSP node with partition line
 * @returns 0 for right side, 1 for left side
 */
export function pointOnSide(x: number, y: number, node: MapNode): number {
	// Convert map coordinates to fixed-point if not already
	const dx = x - (node.x << FRACBITS);
	const dy = y - (node.y << FRACBITS);
	const ndx = node.dx << FRACBITS;
	const ndy = node.dy << FRACBITS;

	// Fast path for axis-aligned partition lines
	if (ndx === 0) {
		if (dx <= 0) return ndy > 0 ? 1 : 0;
		return ndy < 0 ? 1 : 0;
	}
	if (ndy === 0) {
		if (dy <= 0) return ndx < 0 ? 1 : 0;
		return ndx > 0 ? 1 : 0;
	}

	// General case: cross product
	// Using BigInt to avoid overflow
	const left = Number((BigInt(ndy) >> BigInt(FRACBITS)) * BigInt(dx));
	const right = Number(BigInt(dy) * (BigInt(ndx) >> BigInt(FRACBITS)));

	if (right < left) return 0; // front (right) side
	return 1; // back (left) side
}

// ─── Bounding Box Visibility ───────────────────────────────────────

/**
 * Lookup table for R_CheckBBox: given the viewer's position relative to
 * the bbox (one of 9 regions in a 3x3 grid), which two corners define
 * the widest angular span.
 *
 * Each entry is [x1, y1, x2, y2] as indices into the bbox coordinate array:
 *   0=top, 1=bottom, 2=left, 3=right
 *
 * Region numbering (boxx * 4 + boxy):
 *   0=above-left  1=above   2=above-right
 *   4=left         5=inside  8=right
 *   8=below-left   9=below  10=below-right
 *
 * Matching original Doom's checkcoord table from r_bsp.c.
 */
const CHECKCOORD: ReadonlyArray<readonly [number, number, number, number] | null> = [
	// boxx=0 (viewer left of bbox)
	[3, 0, 2, 1], // boxy=0: above-left  -> right-top to left-bottom
	[3, 0, 2, 0], // boxy=1: left        -> right-top to left-top
	[3, 1, 2, 0], // boxy=2: below-left  -> right-bottom to left-top
	null,         // padding
	// boxx=1 (viewer horizontally within bbox)
	[2, 0, 2, 1], // boxy=0: above       -> left-top to left-bottom (wide span)
	null,         // boxy=1: INSIDE bbox  -> always visible
	[3, 1, 3, 0], // boxy=2: below       -> right-bottom to right-top
	null,         // padding
	// boxx=2 (viewer right of bbox)
	[2, 0, 3, 1], // boxy=0: above-right -> left-top to right-bottom
	[2, 1, 3, 1], // boxy=1: right       -> left-bottom to right-bottom
	[2, 1, 3, 0], // boxy=2: below-right -> left-bottom to right-top
	null,         // padding
];

/**
 * Check if a bounding box is potentially visible on screen.
 * Matches R_CheckBBox from r_bsp.c: classifies viewer position into
 * a 3x3 grid relative to the bbox, selects the two corners that define
 * the widest angular span, clips against the FOV, and tests solidsegs.
 *
 * @param rs - Render state
 * @param bbox - Bounding box to test
 * @returns true if the box may be visible
 */
function checkBBox(rs: RenderState, bbox: BBox): boolean {
	const bboxCoords = [
		bbox.top << FRACBITS,    // 0: top (max y)
		bbox.bottom << FRACBITS, // 1: bottom (min y)
		bbox.left << FRACBITS,   // 2: left (min x)
		bbox.right << FRACBITS,  // 3: right (max x)
	];

	// Classify viewer position relative to bbox (3x3 grid)
	let boxx: number;
	if (rs.viewx <= bboxCoords[2]!) {
		boxx = 0; // left of bbox
	} else if (rs.viewx < bboxCoords[3]!) {
		boxx = 1; // horizontally inside bbox
	} else {
		boxx = 2; // right of bbox
	}

	let boxy: number;
	if (rs.viewy >= bboxCoords[0]!) {
		boxy = 0; // above bbox
	} else if (rs.viewy > bboxCoords[1]!) {
		boxy = 1; // vertically inside bbox
	} else {
		boxy = 2; // below bbox
	}

	const boxpos = boxx * 4 + boxy;

	// If viewer is inside the bbox, it's always visible
	if (boxpos === 5) return true;

	const coords = CHECKCOORD[boxpos];
	if (!coords) return true;

	// Compute angles to the two selected corners
	let angle1 = pointToAngle2(
		rs.viewx, rs.viewy,
		bboxCoords[coords[0]]!, bboxCoords[coords[1]]!,
	);
	let angle2 = pointToAngle2(
		rs.viewx, rs.viewy,
		bboxCoords[coords[2]]!, bboxCoords[coords[3]]!,
	);

	// Make view-relative
	const span = ((angle1 - angle2) >>> 0);
	if (span >= ANG180) return true; // bbox wraps around behind us

	angle1 = ((angle1 - rs.viewangle) >>> 0);
	angle2 = ((angle2 - rs.viewangle) >>> 0);

	// Clip against FOV using clipangle (same logic as R_AddLine)
	let tspan = ((angle1 + clipangle) >>> 0);
	if (tspan > ((2 * clipangle) >>> 0)) {
		tspan = ((tspan - ((2 * clipangle) >>> 0)) >>> 0);
		if (tspan >= span) return false;
		angle1 = clipangle;
	}
	tspan = ((clipangle - angle2) >>> 0);
	if (tspan > ((2 * clipangle) >>> 0)) {
		tspan = ((tspan - ((2 * clipangle) >>> 0)) >>> 0);
		if (tspan >= span) return false;
		angle2 = ((-clipangle) >>> 0);
	}

	// Convert to screen X coordinates
	const fineIdx1 = ((angle1 + ANG90) >>> 0) >> ANGLETOFINESHIFT;
	const fineIdx2 = ((angle2 + ANG90) >>> 0) >> ANGLETOFINESHIFT;

	const sx1 = viewangletox[fineIdx1 & 0xfff] ?? 0;
	const sx2 = viewangletox[fineIdx2 & 0xfff] ?? viewwidth;

	if (sx1 >= sx2) return false;

	// Check if the column range is fully occluded by solidsegs
	for (const seg of rs.solidsegs) {
		if (seg.first <= sx1 && seg.last >= sx2 - 1) {
			return false;
		}
	}

	return true;
}

// ─── Occlusion Check ───────────────────────────────────────────────

/**
 * Check if the entire screen is occluded (all columns drawn).
 */
function isScreenOccluded(rs: RenderState): boolean {
	// If the first solidsegs entry covers the entire screen, we're done
	if (rs.solidsegs.length > 0) {
		const first = rs.solidsegs[0];
		if (first && first.first <= 0 && first.last >= rs.screenWidth - 1) {
			return true;
		}
	}
	return false;
}
