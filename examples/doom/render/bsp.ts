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
import { viewangletox, viewwidth } from '../math/tables.js';
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
 * Check if a bounding box is potentially visible on screen.
 * Tests against the current solidsegs occlusion state.
 *
 * @param rs - Render state
 * @param bbox - Bounding box to test
 * @returns true if the box may be visible
 */
function checkBBox(rs: RenderState, bbox: BBox): boolean {
	// Compute angles to the four corners of the bounding box
	const bx = bbox.left << FRACBITS;
	const by = bbox.bottom << FRACBITS;
	const bx2 = bbox.right << FRACBITS;
	const by2 = bbox.top << FRACBITS;

	// Find the angle span of the bounding box from the viewer
	let angle1 = pointToAngle2(rs.viewx, rs.viewy, bx2, by2);
	let angle2 = pointToAngle2(rs.viewx, rs.viewy, bx, by);

	// Get all four corner angles and find the widest span
	const a1 = pointToAngle2(rs.viewx, rs.viewy, bx, by2);
	const a2 = pointToAngle2(rs.viewx, rs.viewy, bx2, by);

	// Use the widest visible span
	const angles = [angle1, angle2, a1, a2];
	let minAngle = angle1;
	let maxAngle = angle1;

	for (const a of angles) {
		const rel = ((a - rs.viewangle) >>> 0);
		const relMin = ((minAngle - rs.viewangle) >>> 0);
		const relMax = ((maxAngle - rs.viewangle) >>> 0);

		if (rel < relMin) minAngle = a;
		if (rel > relMax) maxAngle = a;
	}

	// Convert to screen column range
	const span1 = ((minAngle - rs.viewangle + ANG90) >>> 0);
	const span2 = ((maxAngle - rs.viewangle + ANG90) >>> 0);

	const x1fineIdx = (span1 >> ANGLETOFINESHIFT) & 0xfff;
	const x2fineIdx = (span2 >> ANGLETOFINESHIFT) & 0xfff;

	const sx1 = viewangletox[x1fineIdx] ?? 0;
	const sx2 = viewangletox[x2fineIdx] ?? viewwidth;

	if (sx1 >= sx2) return false;

	// Check if the column range is fully occluded by solidsegs
	for (const seg of rs.solidsegs) {
		if (seg.first <= sx1 && seg.last >= sx2 - 1) {
			return false; // fully occluded
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
