/**
 * Component Namespace Objects
 *
 * Frozen plain objects that group related component functions into
 * discoverable, well-organized namespaces. These are NOT classes:
 * they are purely functional module containers with no `this`, no
 * state, and no inheritance.
 *
 * @example
 * ```typescript
 * import { position, content, scroll } from 'blecsd/components';
 *
 * position.set(world, eid, 10, 5);
 * content.setText(world, eid, 'Hello');
 * scroll.toTop(world, eid);
 * ```
 *
 * @module components/namespaces
 */

export type { AccessibilityModule } from './accessibility';
// Utility components
export { accessibility } from './accessibility';
export type { AnimationModule } from './animation';
// Game/animation
export { animation } from './animation';
export type { BehaviorModule } from './behavior';
export { behavior } from './behavior';
export type { BorderModule } from './border';
// Visual decoration
export { border } from './border';
export type { ButtonModule } from './button';
export { button } from './button';
export type { CameraModule } from './camera';
export { camera } from './camera';
export type { CheckboxModule } from './checkbox';
export { checkbox } from './checkbox';
export type { CollisionModule } from './collision';
export { collision } from './collision';
export type { ContentModule } from './content';
export { content } from './content';
export type { DimensionsModule } from './dimensions';
export { dimensions } from './dimensions';
export type { FocusableModule } from './focus';
// Interaction
export { focusable } from './focus';
export type { FormModule } from './form';
export { form } from './form';
export type { HealthModule } from './health';
export { health } from './health';
export type { HierarchyModule } from './hierarchy';
// Tree/relationships
export { hierarchy } from './hierarchy';
export type { InteractiveModule } from './interactive';
export { interactive } from './interactive';
export type { LabelModule } from './label';
export { label } from './label';
export type { ListModule } from './list';
export { list } from './list';
export type { PaddingModule } from './padding';
export { padding } from './padding';
export type { ParticleModule } from './particle';
export { particle } from './particle';
export type { PositionModule } from './position';
// Core layout/rendering
export { position } from './position';
export type { ProgressBarModule } from './progressBar';
export { progressBar } from './progressBar';
export type { RadioModule } from './radio';
export { radio } from './radio';
export type { RenderableModule } from './renderable';
export { renderable } from './renderable';
export type { ScreenComponentModule } from './screenComponent';
export { screenComponent } from './screenComponent';
export type { ScrollModule } from './scroll';
// Scrolling
export { scroll } from './scroll';
export type { SelectModule } from './select';
export { select } from './select';
export type { ShadowModule } from './shadow';
export { shadow } from './shadow';
export type { SliderModule } from './slider';
export { slider } from './slider';
export type { SpinnerModule } from './spinner';
export { spinner } from './spinner';
export type { SpriteModule } from './sprite';
export { sprite } from './sprite';
export type { StateMachineModule } from './stateMachine';
export { stateMachine } from './stateMachine';
export type { TableModule } from './table';
export { table } from './table';
export type { TextInputModule } from './textInput';
// Form controls
export { textInput } from './textInput';
export type { TileMapModule } from './tilemap';
export { tilemap } from './tilemap';
export type { TimerModule } from './timer';
export { timer } from './timer';
export type { UserDataModule } from './userData';
export { userData } from './userData';
export type { VelocityModule } from './velocity';
export { velocity } from './velocity';
