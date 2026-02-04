/**
 * Zod validation schemas for the 3D subsystem.
 * @module 3d/schemas
 */

export type {
	BackendCapabilities,
	BackendPreference,
	BackendSelection,
	BackendType,
	BrailleConfig,
	EncodedCell,
	EncodedOutput,
	HalfBlockConfig,
	KittyConfig,
	SextantConfig,
	SixelConfig,
} from './backends';
export {
	BackendCapabilitiesSchema,
	BackendPreferenceSchema,
	BackendSelectionSchema,
	BackendTypeSchema,
	BrailleConfigSchema,
	EncodedCellSchema,
	EncodedOutputSchema,
	HalfBlockConfigSchema,
	KittyConfigSchema,
	SextantConfigSchema,
	SixelConfigSchema,
} from './backends';
export type {
	Animation3DConfig,
	Camera3DConfig,
	Material3DConfig,
	MouseInteraction3DConfig,
	Transform3DConfig,
	Viewport3DConfig,
} from './components';
export {
	Animation3DConfigSchema,
	Camera3DConfigSchema,
	Material3DConfigSchema,
	MouseInteraction3DConfigSchema,
	Transform3DConfigSchema,
	Viewport3DConfigSchema,
} from './components';
export type {
	ClipRect,
	EulerAngles,
	OrthographicConfig,
	PerspectiveConfig,
	Vec3Input,
	ViewportConfig,
} from './math';
export {
	ClipRectSchema,
	EulerAnglesSchema,
	Mat4Schema,
	OrthographicConfigSchema,
	PerspectiveConfigSchema,
	Vec3InputSchema,
	Vec3Schema,
	ViewportConfigSchema,
} from './math';
export type {
	CubeMeshOptions,
	CylinderMeshOptions,
	ObjLoadOptions,
	PlaneMeshOptions,
	SphereMeshOptions,
} from './model';
export {
	CubeMeshOptionsSchema,
	CylinderMeshOptionsSchema,
	ObjLoadOptionsSchema,
	PlaneMeshOptionsSchema,
	SphereMeshOptionsSchema,
} from './model';
export type {
	AmbientLight,
	DirectionalLight,
	LineEndpoint,
	PixelBufferConfig,
	RGBAColor,
	TriangleVertex,
} from './rasterizer';
export {
	AmbientLightSchema,
	DirectionalLightSchema,
	LineEndpointSchema,
	PixelBufferConfigSchema,
	RGBAColorSchema,
	TriangleVertexSchema,
} from './rasterizer';
export type { Viewport3DWidgetConfig } from './viewport3d';
export { Viewport3DWidgetConfigSchema } from './viewport3d';
