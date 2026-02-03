/**
 * Viewport3D widget factory.
 *
 * Creates a 3D rendering viewport as a composable ECS widget.
 * Combines camera setup, viewport configuration, and mesh management
 * into a chainable interface following the existing widget patterns.
 *
 * @module widgets/viewport3d
 */

import { addComponent, addEntity, removeEntity } from 'bitecs';
import type { Entity, World } from '../core/types';
import { setPosition } from '../components/position';
import { setDimensions } from '../components/dimensions';
import { markDirty, setVisible } from '../components/renderable';
import { Camera3D, setCamera3D } from '../3d/components/camera3d';
import { setMaterial3D } from '../3d/components/material';
import { Mesh, getMeshData } from '../3d/components/mesh';
import { Transform3D, setTransform3D } from '../3d/components/transform3d';
import { Viewport3D, setViewport3D } from '../3d/components/viewport3d';
import type { Material3DConfig, Transform3DConfig } from '../3d/schemas/components';
import { type Viewport3DWidgetConfig, Viewport3DWidgetConfigSchema } from '../3d/schemas/viewport3d';
import { framebufferStore } from '../3d/systems/rasterSystem';

const DEFAULT_CAPACITY = 10000;

/**
 * Tag component marking entities as Viewport3D widgets.
 */
export const Viewport3DTag = {
	isViewport3D: new Uint8Array(DEFAULT_CAPACITY),
};

/** Per-widget mesh tracking for cleanup. */
const meshEntityStore = new Map<Entity, Set<Entity>>();

/**
 * Interface for the Viewport3D widget with chainable methods.
 *
 * @example
 * ```typescript
 * const viewport = createViewport3D(world, eid, {
 *   width: 60, height: 20, fov: Math.PI / 3,
 * });
 *
 * const cubeId = createCubeMesh();
 * viewport.addMesh(cubeId, { tz: -5 });
 * viewport.setCameraPosition(0, 2, 0);
 * ```
 */
export interface Viewport3DWidget {
	/** The viewport entity ID. */
	readonly eid: Entity;
	/** The camera entity ID. */
	readonly cameraEid: Entity;

	/** Add a mesh to the viewport scene. Returns the mesh entity ID. */
	addMesh(meshId: number, transform?: Transform3DConfig, material?: Material3DConfig): Entity;
	/** Remove a mesh entity from the viewport scene. */
	removeMesh(meshEid: Entity): void;

	/** Set camera position in world space. */
	setCameraPosition(x: number, y: number, z: number): Viewport3DWidget;
	/** Set camera rotation in radians. */
	setCameraRotation(rx: number, ry: number, rz: number): Viewport3DWidget;
	/** Set camera field of view in radians. */
	setFov(fov: number): Viewport3DWidget;

	/** Resize the viewport in terminal cells. */
	resize(width: number, height: number): Viewport3DWidget;

	/** Show the viewport. */
	show(): Viewport3DWidget;
	/** Hide the viewport. */
	hide(): Viewport3DWidget;
	/** Clean up all entities and stores associated with this viewport. */
	destroy(): void;
}

/**
 * Creates a Viewport3D widget.
 *
 * Sets up a camera entity, configures the viewport component, and returns
 * a chainable interface for managing 3D content within the viewport.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the viewport to
 * @param config - Widget configuration
 * @returns The Viewport3D widget interface
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { createViewport3D } from 'blecsd/widgets';
 * import { createCubeMesh } from 'blecsd/3d/stores';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const viewport = createViewport3D(world, eid, {
 *   left: 5, top: 2, width: 60, height: 20,
 *   fov: Math.PI / 3, backend: 'auto',
 * });
 *
 * const cubeId = createCubeMesh();
 * viewport.addMesh(cubeId, { tz: -5 });
 * viewport.setCameraPosition(0, 2, 5);
 * ```
 */
export function createViewport3D(
	world: World,
	entity: Entity,
	config: Viewport3DWidgetConfig = {},
): Viewport3DWidget {
	const validated = Viewport3DWidgetConfigSchema.parse(config);
	const eid = entity;

	// Mark as viewport3d widget
	Viewport3DTag.isViewport3D[eid] = 1;

	// Create camera entity
	const cameraEid = addEntity(world) as Entity;
	setTransform3D(world, cameraEid, {});
	setCamera3D(world, cameraEid, {
		fov: validated.fov,
		near: validated.near,
		far: validated.far,
		aspect: validated.width / validated.height,
		projectionMode: validated.projectionMode,
	});

	// Set up viewport component
	setViewport3D(world, eid, {
		left: validated.left,
		top: validated.top,
		width: validated.width,
		height: validated.height,
		cameraEntity: cameraEid,
		backendType: validated.backend,
	});

	// Compute pixel dimensions based on backend
	// Default braille: 2x4 pixels per cell
	const pxPerCellX = 2;
	const pxPerCellY = 4;
	Viewport3D.pixelWidth[eid] = validated.width * pxPerCellX;
	Viewport3D.pixelHeight[eid] = validated.height * pxPerCellY;

	// Set up position and dimensions for the UI layout system
	setPosition(world, eid, validated.left, validated.top);
	setDimensions(world, eid, validated.width, validated.height);

	// Track mesh entities for this viewport
	meshEntityStore.set(eid, new Set());

	const widget: Viewport3DWidget = {
		eid,
		cameraEid,

		addMesh(meshId: number, transform?: Transform3DConfig, material?: Material3DConfig): Entity {
			const meshData = getMeshData(meshId);
			if (!meshData) {
				throw new Error(`Mesh ID ${meshId} not found in mesh store`);
			}

			const meshEid = addEntity(world) as Entity;
			setTransform3D(world, meshEid, transform ?? {});
			addComponent(world, meshEid, Mesh);
			Mesh.meshId[meshEid] = meshId;

			if (material) {
				setMaterial3D(world, meshEid, material);
			}

			meshEntityStore.get(eid)?.add(meshEid);
			return meshEid;
		},

		removeMesh(meshEid: Entity): void {
			meshEntityStore.get(eid)?.delete(meshEid);
			removeEntity(world, meshEid);
		},

		setCameraPosition(x: number, y: number, z: number): Viewport3DWidget {
			Transform3D.tx[cameraEid] = x;
			Transform3D.ty[cameraEid] = y;
			Transform3D.tz[cameraEid] = z;
			Transform3D.dirty[cameraEid] = 1;
			return widget;
		},

		setCameraRotation(rx: number, ry: number, rz: number): Viewport3DWidget {
			Transform3D.rx[cameraEid] = rx;
			Transform3D.ry[cameraEid] = ry;
			Transform3D.rz[cameraEid] = rz;
			Transform3D.dirty[cameraEid] = 1;
			return widget;
		},

		setFov(fov: number): Viewport3DWidget {
			Camera3D.fov[cameraEid] = fov;
			Camera3D.dirty[cameraEid] = 1;
			return widget;
		},

		resize(width: number, height: number): Viewport3DWidget {
			Viewport3D.width[eid] = width;
			Viewport3D.height[eid] = height;
			Viewport3D.pixelWidth[eid] = width * pxPerCellX;
			Viewport3D.pixelHeight[eid] = height * pxPerCellY;
			Camera3D.aspect[cameraEid] = width / height;
			setDimensions(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		show(): Viewport3DWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): Viewport3DWidget {
			setVisible(world, eid, false);
			return widget;
		},

		destroy(): void {
			// Remove all mesh entities
			const meshEntities = meshEntityStore.get(eid);
			if (meshEntities) {
				for (const meshEid of meshEntities) {
					removeEntity(world, meshEid);
				}
				meshEntityStore.delete(eid);
			}

			// Clean up stores
			framebufferStore.delete(eid);

			// Remove camera entity
			removeEntity(world, cameraEid);

			// Remove viewport entity tag
			Viewport3DTag.isViewport3D[eid] = 0;

			// Remove viewport entity
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Check if an entity is a Viewport3D widget.
 *
 * @param eid - Entity ID
 * @returns True if the entity has the Viewport3D widget tag
 */
export function isViewport3DWidget(eid: Entity): boolean {
	return Viewport3DTag.isViewport3D[eid] === 1;
}

/**
 * Reset the viewport3d widget stores. Useful for testing.
 */
export function resetViewport3DStore(): void {
	meshEntityStore.clear();
}
