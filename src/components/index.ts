/**
 * ECS Components for blECSd
 *
 * This module provides all ECS components organized by category for better tree-shaking
 * and maintainability. Each export category is in a separate file.
 *
 * @module components
 */

// System function re-exports
export * from './exports/systems';

// Core layout components
export * from './exports/core';

// Layout and viewport components
export * from './exports/layout';

// Input and interaction components
export * from './exports/input';

// Form control components
export * from './exports/forms';

// Content and display components
export * from './exports/content';

// Behavior and physics components
export * from './exports/behavior';

// UI widget components
export * from './exports/widgets';

// Graphics components
export * from './exports/graphics';

// Terminal-specific components
export * from './exports/terminal';

// Miscellaneous components
export * from './exports/misc';
