/**
 * Flat shading for 3D face rendering.
 *
 * Computes face normals and applies directional + ambient lighting
 * to produce a single color per face.
 *
 * @module 3d/rasterizer/shading
 */

import type { AmbientLight, DirectionalLight, RGBAColor } from '../schemas/rasterizer';
import { type Vec3, vec3Cross, vec3Normalize, vec3Sub } from '../math/vec3';

/**
 * Compute the face normal of a triangle from its three vertices.
 * The normal is computed as the normalized cross product of two edges.
 *
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 * @returns Normalized face normal vector
 *
 * @example
 * ```typescript
 * import { vec3 } from '../math/vec3';
 * const normal = computeFaceNormal(vec3(0,0,0), vec3(1,0,0), vec3(0,1,0));
 * // normal ~ (0, 0, 1) for CCW triangle in XY plane
 * ```
 */
export function computeFaceNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
	const edge1 = vec3Sub(v1, v0);
	const edge2 = vec3Sub(v2, v0);
	return vec3Normalize(vec3Cross(edge1, edge2));
}

/**
 * Compute flat shading color given a face normal, light, and base color.
 *
 * Uses Lambert's cosine law: diffuse = max(0, dot(normal, -lightDir)).
 * Final color = (ambient + diffuse) * baseColor, clamped to [0, 255].
 *
 * @param normal - Normalized face normal
 * @param light - Directional light source
 * @param ambient - Ambient light
 * @param baseColor - Base material color
 * @returns Shaded RGBA color
 *
 * @example
 * ```typescript
 * const color = computeFlatShading(
 *   faceNormal,
 *   { direction: [0, -1, 0], intensity: 1.0 },
 *   { intensity: 0.1 },
 *   { r: 200, g: 100, b: 50, a: 255 },
 * );
 * ```
 */
export function computeFlatShading(
	normal: Vec3,
	light: DirectionalLight,
	ambient: AmbientLight,
	baseColor: RGBAColor,
): RGBAColor {
	const lightDir = light.direction;
	const lightIntensity = light.intensity ?? 1.0;
	const ambientIntensity = ambient.intensity ?? 0.1;

	// Negate light direction (light shines from direction toward origin)
	const ndotl = -(
		(normal[0] as number) * lightDir[0] +
		(normal[1] as number) * lightDir[1] +
		(normal[2] as number) * lightDir[2]
	);

	const diffuse = Math.max(0, ndotl) * lightIntensity;
	const totalLight = Math.min(1, ambientIntensity + diffuse);

	const lightColor = light.color ?? { r: 255, g: 255, b: 255, a: 255 };
	const ambientColor = ambient.color ?? { r: 255, g: 255, b: 255, a: 255 };

	// Mix ambient and diffuse light colors
	const lr = (ambientColor.r * ambientIntensity + lightColor.r * diffuse) / Math.max(0.001, totalLight);
	const lg = (ambientColor.g * ambientIntensity + lightColor.g * diffuse) / Math.max(0.001, totalLight);
	const lb = (ambientColor.b * ambientIntensity + lightColor.b * diffuse) / Math.max(0.001, totalLight);

	return {
		r: Math.round(Math.min(255, (baseColor.r * totalLight * lr) / 255)),
		g: Math.round(Math.min(255, (baseColor.g * totalLight * lg) / 255)),
		b: Math.round(Math.min(255, (baseColor.b * totalLight * lb) / 255)),
		a: baseColor.a,
	};
}

/**
 * Convenience function: compute face normal and apply flat shading in one call.
 *
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 * @param light - Directional light source
 * @param ambient - Ambient light
 * @param baseColor - Base material color
 * @returns Shaded RGBA color for the face
 *
 * @example
 * ```typescript
 * import { vec3 } from '../math/vec3';
 * const color = shadeFace(
 *   vec3(0,0,0), vec3(1,0,0), vec3(0,1,0),
 *   { direction: [0, 0, -1], intensity: 1.0 },
 *   { intensity: 0.1 },
 *   { r: 200, g: 100, b: 50, a: 255 },
 * );
 * ```
 */
export function shadeFace(
	v0: Vec3,
	v1: Vec3,
	v2: Vec3,
	light: DirectionalLight,
	ambient: AmbientLight,
	baseColor: RGBAColor,
): RGBAColor {
	const normal = computeFaceNormal(v0, v1, v2);
	return computeFlatShading(normal, light, ambient, baseColor);
}
