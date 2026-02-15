/**
 * ECS Components for blECSd
 *
 * This module provides all ECS components organized by category for better tree-shaking
 * and maintainability. Each export category is in a separate file.
 *
 * @module components
 */

// Behavior and physics components
export * from './exports/behavior';
// Content and display components
export * from './exports/content';
// Core layout components
export * from './exports/core';
// Form control components
export * from './exports/forms';
// Graphics components
export * from './exports/graphics';
// Input and interaction components
export * from './exports/input';
// Layout and viewport components
export * from './exports/layout';
// Miscellaneous components
export * from './exports/misc';
// System function re-exports
export * from './exports/systems';

// Terminal-specific components
export * from './exports/terminal';
// UI widget components
export * from './exports/widgets';
