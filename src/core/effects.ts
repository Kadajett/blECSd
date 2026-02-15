/**
 * Focus and hover effects system for dynamic styling.
 * Manages effect application, removal, and style restoration.
 * @module core/effects
 */

import { Focusable, hasFocusable, isFocused } from '../components/focusable';
import { Interactive } from '../components/interactive';
import { hasRenderable, markDirty, Renderable, type StyleData } from '../components/renderable';
import { hasInteractive, isHovered } from '../systems/interactiveSystem';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A style value that can be static or computed dynamically.
 */
export type DynamicValue<T> = T | ((world: World, entity: Entity) => T);

/**
 * Effect configuration with support for dynamic values.
 * Values can be static or functions that compute the value at render time.
 *
 * @example
 * ```typescript
 * import { EffectConfig } from 'blecsd';
 *
 * // Static effect
 * const staticEffect: EffectConfig = {
 *   fg: 0xff0000ff,
 *   bold: true,
 * };
 *
 * // Dynamic effect based on entity state
 * const dynamicEffect: EffectConfig = {
 *   fg: (world, eid) => isActive(world, eid) ? 0x00ff00ff : 0xff0000ff,
 *   bold: (world, eid) => hasHighPriority(world, eid),
 * };
 * ```
 */
export interface EffectConfig {
	/** Foreground color (static or dynamic) */
	fg?: DynamicValue<number>;
	/** Background color (static or dynamic) */
	bg?: DynamicValue<number>;
	/** Bold text (static or dynamic) */
	bold?: DynamicValue<boolean>;
	/** Underlined text (static or dynamic) */
	underline?: DynamicValue<boolean>;
	/** Blinking text (static or dynamic) */
	blink?: DynamicValue<boolean>;
	/** Inverse colors (static or dynamic) */
	inverse?: DynamicValue<boolean>;
}

/**
 * Resolved effect with all values computed.
 */
export interface ResolvedEffect {
	readonly fg?: number;
	readonly bg?: number;
	readonly bold?: boolean;
	readonly underline?: boolean;
	readonly blink?: boolean;
	readonly inverse?: boolean;
}

/**
 * Stored original style data for an entity.
 * Includes which effect types have been applied.
 */
interface StoredStyle {
	/** Original style before any effects */
	readonly original: StyleData;
	/** Whether focus effect is currently applied */
	focusApplied: boolean;
	/** Whether hover effect is currently applied */
	hoverApplied: boolean;
}

// =============================================================================
// STATE
// =============================================================================

/**
 * Store for original styles before effects are applied.
 * Maps entity IDs to their stored style data.
 */
const storedStyles = new Map<Entity, StoredStyle>();

// =============================================================================
// RESOLUTION
// =============================================================================

/**
 * Resolves a dynamic value to its actual value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - Static value or function
 * @returns The resolved value
 */
function resolveValue<T>(world: World, eid: Entity, value: DynamicValue<T>): T {
	if (typeof value === 'function') {
		return (value as (world: World, entity: Entity) => T)(world, eid);
	}
	return value;
}

/**
 * Resolves an effect configuration to concrete values.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param config - Effect configuration with static or dynamic values
 * @returns Resolved effect with all values computed
 *
 * @example
 * ```typescript
 * import { resolveEffectConfig } from 'blecsd';
 *
 * const effect = { fg: (w, e) => 0xff0000ff, bold: true };
 * const resolved = resolveEffectConfig(world, entity, effect);
 * // resolved.fg === 0xff0000ff
 * // resolved.bold === true
 * ```
 */
export function resolveEffectConfig(
	world: World,
	eid: Entity,
	config: EffectConfig,
): ResolvedEffect {
	const resolved: ResolvedEffect = {};

	if (config.fg !== undefined) {
		(resolved as { fg: number }).fg = resolveValue(world, eid, config.fg);
	}
	if (config.bg !== undefined) {
		(resolved as { bg: number }).bg = resolveValue(world, eid, config.bg);
	}
	if (config.bold !== undefined) {
		(resolved as { bold: boolean }).bold = resolveValue(world, eid, config.bold);
	}
	if (config.underline !== undefined) {
		(resolved as { underline: boolean }).underline = resolveValue(world, eid, config.underline);
	}
	if (config.blink !== undefined) {
		(resolved as { blink: boolean }).blink = resolveValue(world, eid, config.blink);
	}
	if (config.inverse !== undefined) {
		(resolved as { inverse: boolean }).inverse = resolveValue(world, eid, config.inverse);
	}

	return resolved;
}

// =============================================================================
// STYLE STORAGE
// =============================================================================

/**
 * Captures the current style of an entity for later restoration.
 */
function captureCurrentStyle(world: World, eid: Entity): StyleData {
	if (!hasRenderable(world, eid)) {
		return {
			fg: Renderable.fg[eid] as number,
			bg: Renderable.bg[eid] as number,
			bold: false,
			underline: false,
			blink: false,
			inverse: false,
			transparent: false,
			opacity: 1,
		};
	}

	return {
		fg: Renderable.fg[eid] as number,
		bg: Renderable.bg[eid] as number,
		bold: Renderable.bold[eid] === 1,
		underline: Renderable.underline[eid] === 1,
		blink: Renderable.blink[eid] === 1,
		inverse: Renderable.inverse[eid] === 1,
		transparent: Renderable.transparent[eid] === 1,
		opacity: (Renderable.opacity[eid] as number) ?? 1,
	};
}

/**
 * Gets or creates stored style data for an entity.
 */
function getOrCreateStoredStyle(world: World, eid: Entity): StoredStyle {
	let stored = storedStyles.get(eid);
	if (!stored) {
		stored = {
			original: captureCurrentStyle(world, eid),
			focusApplied: false,
			hoverApplied: false,
		};
		storedStyles.set(eid, stored);
	}
	return stored;
}

/**
 * Gets the stored style for an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns Stored style data or undefined
 */
export function getStoredStyle(_world: World, eid: Entity): StoredStyle | undefined {
	return storedStyles.get(eid);
}

/**
 * Checks if an entity has stored style data.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if entity has stored style
 */
export function hasStoredStyle(_world: World, eid: Entity): boolean {
	return storedStyles.has(eid);
}

/**
 * Clears stored style for an entity.
 * Call this when an entity is destroyed.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 */
export function clearStoredStyle(_world: World, eid: Entity): void {
	storedStyles.delete(eid);
}

/**
 * Clears all stored styles.
 * Primarily for testing.
 */
export function clearAllStoredStyles(): void {
	storedStyles.clear();
}

// =============================================================================
// EFFECT APPLICATION
// =============================================================================

/**
 * Applies a resolved effect to an entity's renderable.
 */
function applyResolvedEffect(eid: Entity, effect: ResolvedEffect): void {
	if (effect.fg !== undefined) Renderable.fg[eid] = effect.fg;
	if (effect.bg !== undefined) Renderable.bg[eid] = effect.bg;
	if (effect.bold !== undefined) Renderable.bold[eid] = effect.bold ? 1 : 0;
	if (effect.underline !== undefined) Renderable.underline[eid] = effect.underline ? 1 : 0;
	if (effect.blink !== undefined) Renderable.blink[eid] = effect.blink ? 1 : 0;
	if (effect.inverse !== undefined) Renderable.inverse[eid] = effect.inverse ? 1 : 0;
}

/**
 * Restores an entity's style from stored original.
 */
function restoreOriginalStyle(eid: Entity, original: StyleData): void {
	Renderable.fg[eid] = original.fg;
	Renderable.bg[eid] = original.bg;
	Renderable.bold[eid] = original.bold ? 1 : 0;
	Renderable.underline[eid] = original.underline ? 1 : 0;
	Renderable.blink[eid] = original.blink ? 1 : 0;
	Renderable.inverse[eid] = original.inverse ? 1 : 0;
	Renderable.transparent[eid] = original.transparent ? 1 : 0;
}

// =============================================================================
// FOCUS EFFECTS
// =============================================================================

/**
 * Applies focus effect to an entity.
 * Uses the entity's focusEffectFg and focusEffectBg from the Focusable component.
 * Stores the original style for later restoration.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyFocusEffect, removeFocusEffect, setFocusable } from 'blecsd';
 *
 * // Set up entity with focus effect colors
 * setFocusable(world, entity, {
 *   focusable: true,
 *   focusEffectFg: 0xffff00ff, // Yellow foreground when focused
 * });
 *
 * // Apply effect when entity gains focus
 * applyFocusEffect(world, entity);
 *
 * // Remove effect when entity loses focus
 * removeFocusEffect(world, entity);
 * ```
 */
export function applyFocusEffect(world: World, eid: Entity): void {
	if (!hasFocusable(world, eid)) {
		return;
	}

	const stored = getOrCreateStoredStyle(world, eid);

	// Already applied
	if (stored.focusApplied) {
		return;
	}

	// Build effect from Focusable component
	const effect: ResolvedEffect = {};
	const focusEffectFg = Focusable.focusEffectFg[eid] as number;
	const focusEffectBg = Focusable.focusEffectBg[eid] as number;

	// Only apply non-transparent colors
	if ((focusEffectFg & 0xff000000) !== 0) {
		(effect as { fg: number }).fg = focusEffectFg;
	}
	if ((focusEffectBg & 0xff000000) !== 0) {
		(effect as { bg: number }).bg = focusEffectBg;
	}

	applyResolvedEffect(eid, effect);
	stored.focusApplied = true;
	markDirty(world, eid);
}

/**
 * Removes focus effect from an entity.
 * Restores the original style if no other effects are active.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyFocusEffect, removeFocusEffect } from 'blecsd';
 *
 * // Remove focus effect
 * removeFocusEffect(world, entity);
 * ```
 */
export function removeFocusEffect(world: World, eid: Entity): void {
	const stored = storedStyles.get(eid);
	if (!stored || !stored.focusApplied) {
		return;
	}

	stored.focusApplied = false;

	// If hover effect is active, reapply it; otherwise restore original
	if (stored.hoverApplied) {
		reapplyHoverEffect(world, eid, stored);
	} else {
		restoreOriginalStyle(eid, stored.original);
		storedStyles.delete(eid);
	}

	markDirty(world, eid);
}

/**
 * Checks if focus effect is currently applied to an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if focus effect is applied
 */
export function hasFocusEffectApplied(_world: World, eid: Entity): boolean {
	const stored = storedStyles.get(eid);
	return stored?.focusApplied ?? false;
}

// =============================================================================
// HOVER EFFECTS
// =============================================================================

/**
 * Reapplies hover effect from stored data.
 */
function reapplyHoverEffect(world: World, eid: Entity, stored: StoredStyle): void {
	if (!hasInteractive(world, eid)) {
		return;
	}

	// Start from original, then apply hover
	restoreOriginalStyle(eid, stored.original);

	const effect: ResolvedEffect = {};
	const hoverEffectFg = Interactive.hoverEffectFg[eid] as number;
	const hoverEffectBg = Interactive.hoverEffectBg[eid] as number;

	if ((hoverEffectFg & 0xff000000) !== 0) {
		(effect as { fg: number }).fg = hoverEffectFg;
	}
	if ((hoverEffectBg & 0xff000000) !== 0) {
		(effect as { bg: number }).bg = hoverEffectBg;
	}

	applyResolvedEffect(eid, effect);
}

/**
 * Applies hover effect to an entity.
 * Uses the entity's hoverEffectFg and hoverEffectBg from the Interactive component.
 * Stores the original style for later restoration.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyHoverEffect, removeHoverEffect, setInteractive } from 'blecsd';
 *
 * // Set up entity with hover effect colors
 * setInteractive(world, entity, {
 *   hoverable: true,
 *   hoverEffectBg: 0x333333ff, // Dark gray background when hovered
 * });
 *
 * // Apply effect when mouse enters
 * applyHoverEffect(world, entity);
 *
 * // Remove effect when mouse leaves
 * removeHoverEffect(world, entity);
 * ```
 */
export function applyHoverEffect(world: World, eid: Entity): void {
	if (!hasInteractive(world, eid)) {
		return;
	}

	const stored = getOrCreateStoredStyle(world, eid);

	// Already applied
	if (stored.hoverApplied) {
		return;
	}

	// Build effect from Interactive component
	const effect: ResolvedEffect = {};
	const hoverEffectFg = Interactive.hoverEffectFg[eid] as number;
	const hoverEffectBg = Interactive.hoverEffectBg[eid] as number;

	// Only apply non-transparent colors
	if ((hoverEffectFg & 0xff000000) !== 0) {
		(effect as { fg: number }).fg = hoverEffectFg;
	}
	if ((hoverEffectBg & 0xff000000) !== 0) {
		(effect as { bg: number }).bg = hoverEffectBg;
	}

	applyResolvedEffect(eid, effect);
	stored.hoverApplied = true;
	markDirty(world, eid);
}

/**
 * Removes hover effect from an entity.
 * Restores the original style if no other effects are active.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyHoverEffect, removeHoverEffect } from 'blecsd';
 *
 * // Remove hover effect
 * removeHoverEffect(world, entity);
 * ```
 */
export function removeHoverEffect(world: World, eid: Entity): void {
	const stored = storedStyles.get(eid);
	if (!stored || !stored.hoverApplied) {
		return;
	}

	stored.hoverApplied = false;

	// If focus effect is active, reapply it; otherwise restore original
	if (stored.focusApplied) {
		reapplyFocusEffect(world, eid, stored);
	} else {
		restoreOriginalStyle(eid, stored.original);
		storedStyles.delete(eid);
	}

	markDirty(world, eid);
}

/**
 * Reapplies focus effect from stored data.
 */
function reapplyFocusEffect(world: World, eid: Entity, stored: StoredStyle): void {
	if (!hasFocusable(world, eid)) {
		return;
	}

	// Start from original, then apply focus
	restoreOriginalStyle(eid, stored.original);

	const effect: ResolvedEffect = {};
	const focusEffectFg = Focusable.focusEffectFg[eid] as number;
	const focusEffectBg = Focusable.focusEffectBg[eid] as number;

	if ((focusEffectFg & 0xff000000) !== 0) {
		(effect as { fg: number }).fg = focusEffectFg;
	}
	if ((focusEffectBg & 0xff000000) !== 0) {
		(effect as { bg: number }).bg = focusEffectBg;
	}

	applyResolvedEffect(eid, effect);
}

/**
 * Checks if hover effect is currently applied to an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if hover effect is applied
 */
export function hasHoverEffectApplied(_world: World, eid: Entity): boolean {
	const stored = storedStyles.get(eid);
	return stored?.hoverApplied ?? false;
}

// =============================================================================
// CUSTOM EFFECTS
// =============================================================================

/**
 * Applies a custom effect configuration to an entity.
 * Stores the original style for later restoration.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param config - Effect configuration
 *
 * @example
 * ```typescript
 * import { applyCustomEffect } from 'blecsd';
 *
 * // Apply a custom pulsing effect
 * applyCustomEffect(world, entity, {
 *   fg: (world, eid) => {
 *     const time = Date.now() / 1000;
 *     const pulse = Math.sin(time * 2) * 0.5 + 0.5;
 *     return packColor(255, Math.floor(pulse * 255), 0);
 *   },
 *   bold: true,
 * });
 * ```
 */
export function applyCustomEffect(world: World, eid: Entity, config: EffectConfig): void {
	// Ensure we have stored style
	getOrCreateStoredStyle(world, eid);

	const resolved = resolveEffectConfig(world, eid, config);
	applyResolvedEffect(eid, resolved);
	markDirty(world, eid);
}

/**
 * Removes all effects from an entity and restores original style.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { removeAllEffects } from 'blecsd';
 *
 * // Clear all active effects
 * removeAllEffects(world, entity);
 * ```
 */
export function removeAllEffects(world: World, eid: Entity): void {
	const stored = storedStyles.get(eid);
	if (!stored) {
		return;
	}

	restoreOriginalStyle(eid, stored.original);
	storedStyles.delete(eid);
	markDirty(world, eid);
}

// =============================================================================
// STATE SYNC
// =============================================================================

/**
 * Synchronizes effects with current focus/hover state.
 * Call this to ensure effects match the current state of the entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { syncEffects } from 'blecsd';
 *
 * // After programmatic state change, sync effects
 * focus(world, entity);
 * syncEffects(world, entity);
 * ```
 */
export function syncEffects(world: World, eid: Entity): void {
	const focused = hasFocusable(world, eid) && isFocused(world, eid);
	const hovered = hasInteractive(world, eid) && isHovered(world, eid);

	const focusApplied = hasFocusEffectApplied(world, eid);
	const hoverApplied = hasHoverEffectApplied(world, eid);

	// Sync focus effect
	if (focused && !focusApplied) {
		applyFocusEffect(world, eid);
	} else if (!focused && focusApplied) {
		removeFocusEffect(world, eid);
	}

	// Sync hover effect
	if (hovered && !hoverApplied) {
		applyHoverEffect(world, eid);
	} else if (!hovered && hoverApplied) {
		removeHoverEffect(world, eid);
	}
}

/**
 * Gets the computed style for an entity, considering all active effects.
 * This resolves dynamic effect values and returns the final style.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current style (may have effects applied)
 *
 * @example
 * ```typescript
 * import { getComputedEffectStyle } from 'blecsd';
 *
 * const style = getComputedEffectStyle(world, entity);
 * // style.fg will be the effect color if effects are active
 * ```
 */
export function getComputedEffectStyle(_world: World, eid: Entity): StyleData {
	return {
		fg: Renderable.fg[eid] as number,
		bg: Renderable.bg[eid] as number,
		bold: Renderable.bold[eid] === 1,
		underline: Renderable.underline[eid] === 1,
		blink: Renderable.blink[eid] === 1,
		inverse: Renderable.inverse[eid] === 1,
		transparent: Renderable.transparent[eid] === 1,
		opacity: (Renderable.opacity[eid] as number) ?? 1,
	};
}

/**
 * Gets the original (un-effected) style for an entity.
 * Returns the current style if no effects have been applied.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The original style before effects
 *
 * @example
 * ```typescript
 * import { getOriginalStyle } from 'blecsd';
 *
 * const original = getOriginalStyle(world, entity);
 * // original.fg is the color before any effects were applied
 * ```
 */
export function getOriginalStyle(world: World, eid: Entity): StyleData {
	const stored = storedStyles.get(eid);
	if (stored) {
		return stored.original;
	}
	return getComputedEffectStyle(world, eid);
}

// =============================================================================
// SETEFFECTS API
// =============================================================================

/**
 * Comprehensive effects configuration.
 * Allows configuring all effect types for an entity in one call.
 */
export interface EffectsConfig {
	/** Effect to apply when entity gains focus */
	focus?: EffectConfig;
	/** Effect to apply when mouse hovers over entity */
	hover?: EffectConfig;
	/** Effect to apply when entity is pressed/active */
	press?: EffectConfig;
	/** Effect to apply when entity is disabled */
	disabled?: EffectConfig;
	/** Whether effects should be combined (layered) or replaced */
	combineEffects?: boolean;
}

/** Store for entity effect configurations */
const effectConfigs = new Map<Entity, EffectsConfig>();

/** Store for custom effect states (press, disabled, etc.) */
interface CustomEffectState {
	pressApplied: boolean;
	disabledApplied: boolean;
}
const customEffectStates = new Map<Entity, CustomEffectState>();

/**
 * Sets the effects configuration for an entity.
 *
 * This is the main API for configuring visual effects on interactive elements.
 * Effects are automatically applied/removed when the entity state changes.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param config - Effects configuration
 *
 * @example
 * ```typescript
 * import { setEffects, packColor } from 'blecsd';
 *
 * // Configure effects for a button
 * setEffects(world, buttonEntity, {
 *   // Yellow foreground when focused
 *   focus: { fg: packColor(255, 255, 0) },
 *   // Lighter background when hovered
 *   hover: { bg: packColor(80, 80, 80) },
 *   // Darker background when pressed
 *   press: { bg: packColor(40, 40, 40) },
 *   // Grayed out when disabled
 *   disabled: { fg: packColor(128, 128, 128) },
 * });
 * ```
 */
export function setEffects(world: World, eid: Entity, config: EffectsConfig): void {
	effectConfigs.set(eid, config);

	// Update component effect colors if focus/hover effects are provided
	if (config.focus && hasFocusable(world, eid)) {
		const resolved = resolveEffectConfig(world, eid, config.focus);
		if (resolved.fg !== undefined) {
			Focusable.focusEffectFg[eid] = resolved.fg;
		}
		if (resolved.bg !== undefined) {
			Focusable.focusEffectBg[eid] = resolved.bg;
		}
	}

	if (config.hover && hasInteractive(world, eid)) {
		const resolved = resolveEffectConfig(world, eid, config.hover);
		if (resolved.fg !== undefined) {
			Interactive.hoverEffectFg[eid] = resolved.fg;
		}
		if (resolved.bg !== undefined) {
			Interactive.hoverEffectBg[eid] = resolved.bg;
		}
	}

	// Sync effects with current state
	syncEffects(world, eid);
}

/**
 * Gets the effects configuration for an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns The effects configuration or undefined
 */
export function getEffects(_world: World, eid: Entity): EffectsConfig | undefined {
	return effectConfigs.get(eid);
}

/**
 * Clears the effects configuration for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearEffects(world: World, eid: Entity): void {
	effectConfigs.delete(eid);
	customEffectStates.delete(eid);
	removeAllEffects(world, eid);
}

/**
 * Gets or creates custom effect state for an entity.
 */
function getOrCreateCustomState(eid: Entity): CustomEffectState {
	let state = customEffectStates.get(eid);
	if (!state) {
		state = { pressApplied: false, disabledApplied: false };
		customEffectStates.set(eid, state);
	}
	return state;
}

/**
 * Applies the press effect to an entity.
 *
 * Call this when a mouse button is pressed on the entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyPressEffect, removePressEffect } from 'blecsd';
 *
 * // On mouse down
 * applyPressEffect(world, entity);
 *
 * // On mouse up
 * removePressEffect(world, entity);
 * ```
 */
export function applyPressEffect(world: World, eid: Entity): void {
	const config = effectConfigs.get(eid);
	if (!config?.press) {
		return;
	}

	const state = getOrCreateCustomState(eid);
	if (state.pressApplied) {
		return;
	}

	// Store original style if not already stored
	getOrCreateStoredStyle(world, eid);

	const resolved = resolveEffectConfig(world, eid, config.press);
	applyResolvedEffect(eid, resolved);
	state.pressApplied = true;
	markDirty(world, eid);
}

/**
 * Removes the press effect from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function removePressEffect(world: World, eid: Entity): void {
	const state = customEffectStates.get(eid);
	if (!state?.pressApplied) {
		return;
	}

	state.pressApplied = false;

	// Re-sync other effects
	syncEffects(world, eid);
}

/**
 * Applies the disabled effect to an entity.
 *
 * Call this when the entity becomes disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { applyDisabledEffect, removeDisabledEffect } from 'blecsd';
 *
 * // When entity becomes disabled
 * applyDisabledEffect(world, entity);
 *
 * // When entity becomes enabled
 * removeDisabledEffect(world, entity);
 * ```
 */
export function applyDisabledEffect(world: World, eid: Entity): void {
	const config = effectConfigs.get(eid);
	if (!config?.disabled) {
		return;
	}

	const state = getOrCreateCustomState(eid);
	if (state.disabledApplied) {
		return;
	}

	// Store original style if not already stored
	getOrCreateStoredStyle(world, eid);

	const resolved = resolveEffectConfig(world, eid, config.disabled);
	applyResolvedEffect(eid, resolved);
	state.disabledApplied = true;
	markDirty(world, eid);
}

/**
 * Removes the disabled effect from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function removeDisabledEffect(world: World, eid: Entity): void {
	const state = customEffectStates.get(eid);
	if (!state?.disabledApplied) {
		return;
	}

	state.disabledApplied = false;

	// Re-sync other effects
	syncEffects(world, eid);
}

/**
 * Checks if press effect is currently applied.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if press effect is applied
 */
export function hasPressEffectApplied(_world: World, eid: Entity): boolean {
	return customEffectStates.get(eid)?.pressApplied ?? false;
}

/**
 * Checks if disabled effect is currently applied.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if disabled effect is applied
 */
export function hasDisabledEffectApplied(_world: World, eid: Entity): boolean {
	return customEffectStates.get(eid)?.disabledApplied ?? false;
}

/**
 * Checks if any effect is currently applied to an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if any effect is active
 */
export function hasAnyEffectApplied(_world: World, eid: Entity): boolean {
	return (
		hasFocusEffectApplied(_world, eid) ||
		hasHoverEffectApplied(_world, eid) ||
		hasPressEffectApplied(_world, eid) ||
		hasDisabledEffectApplied(_world, eid)
	);
}

/**
 * Gets the current effect state for an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns Object describing which effects are applied
 */
export function getEffectState(_world: World, eid: Entity): {
	focus: boolean;
	hover: boolean;
	press: boolean;
	disabled: boolean;
} {
	return {
		focus: hasFocusEffectApplied(_world, eid),
		hover: hasHoverEffectApplied(_world, eid),
		press: hasPressEffectApplied(_world, eid),
		disabled: hasDisabledEffectApplied(_world, eid),
	};
}

/**
 * Clears all effect-related state for an entity.
 * Call this when an entity is destroyed.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 */
export function clearEffectState(_world: World, eid: Entity): void {
	storedStyles.delete(eid);
	effectConfigs.delete(eid);
	customEffectStates.delete(eid);
}

/**
 * Clears all effect configs.
 * Primarily for testing.
 */
export function clearAllEffectConfigs(): void {
	effectConfigs.clear();
	customEffectStates.clear();
}
