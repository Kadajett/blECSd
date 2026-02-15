#!/usr/bin/env python3
"""Rewrite imports in extracted addon packages from relative core paths to blecsd/* subpath imports."""

import os
import re
import sys

WD = '/home/kadajett/Dev/gameDev2026/blECSd-Parent/w-addon-extraction'

# Map of top-level module names to blecsd subpath imports
MODULE_TO_SUBPATH = {
    'core': 'blecsd/core',
    'components': 'blecsd/components',
    'systems': 'blecsd/systems',
    'widgets': 'blecsd/widgets',
    'terminal': 'blecsd/terminal',
    'utils': 'blecsd/utils',
    'schemas': 'blecsd/schemas',
    'errors': 'blecsd/errors',
    'input': 'blecsd/input',
    'debug': 'blecsd/debug',
    'text': 'blecsd',
    'media': None,  # handled per-package
    '3d': None,     # handled per-package
    'game': None,
    'audio': None,
}

IMPORT_RE = re.compile(r"""((?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|[^;{]*?)\s+from\s+['"])(\.\.[^'"]+)(['"])""")


def resolve_import_target(file_path, import_path):
    """Resolve a relative import to an absolute path."""
    file_dir = os.path.dirname(file_path)
    resolved = os.path.normpath(os.path.join(file_dir, import_path))
    return resolved


def is_inside_package(resolved_path, pkg_src):
    """Check if resolved path is inside the package's src/ directory."""
    return resolved_path.startswith(os.path.normpath(pkg_src))


def get_blecsd_subpath(resolved_path, pkg_src):
    """Given a path that resolves outside the package, determine the blecsd/* subpath."""
    # The resolved path would be something like /path/to/w-addon-extraction/packages/3d/core/ecs
    # or /path/to/w-addon-extraction/packages/3d/components/hierarchy
    # We need to find what module it's trying to reach
    # Strip the package base directory
    pkg_base = os.path.dirname(pkg_src)  # e.g., packages/3d/
    if resolved_path.startswith(pkg_base):
        rel = os.path.relpath(resolved_path, pkg_base)
    else:
        # Go up further
        rel = resolved_path

    parts = rel.replace('\\', '/').split('/')
    # First meaningful part is the module name
    for part in parts:
        if part in ('..', '.', 'src'):
            continue
        if part in MODULE_TO_SUBPATH and MODULE_TO_SUBPATH[part] is not None:
            return MODULE_TO_SUBPATH[part]
        break

    # Fallback: try to extract from the original relative path structure
    return None


def compute_new_import(file_path, import_path, pkg_src, pkg_name):
    """Compute the new import path for a relative import."""
    resolved = resolve_import_target(file_path, import_path)

    if is_inside_package(resolved, pkg_src):
        # Internal import - path should still work, no change needed
        return import_path

    # External import - needs to become blecsd/* subpath
    # Figure out what module it's referencing by walking up from the resolved path
    # to find which core module directory it points to

    # Strategy: from the resolved path, find the segment that matches a known module
    # The resolved path goes outside pkg_src, so let's find what it resolves to
    # relative to the original src/ layout

    # Walk the import_path segments to find the first non-.. segment
    parts = import_path.split('/')
    non_dot_idx = 0
    for i, p in enumerate(parts):
        if p != '..':
            non_dot_idx = i
            break

    if non_dot_idx < len(parts):
        first_module = parts[non_dot_idx]
        subpath = MODULE_TO_SUBPATH.get(first_module)
        if subpath is not None:
            return subpath

    # Special cases for specific packages
    return None


def rewrite_file(file_path, pkg_src, pkg_name):
    """Rewrite imports in a single file. Returns (changed, old_content, new_content)."""
    with open(file_path, 'r') as f:
        content = f.read()

    changes = []

    def replace_import(match):
        prefix = match.group(1)
        import_path = match.group(2)
        suffix = match.group(3)

        new_path = compute_new_import(file_path, import_path, pkg_src, pkg_name)
        if new_path is None or new_path == import_path:
            return match.group(0)

        changes.append((import_path, new_path))
        return f"{prefix}{new_path}{suffix}"

    new_content = IMPORT_RE.sub(replace_import, content)
    return len(changes) > 0, changes, new_content


def process_package(pkg_name, pkg_dir):
    """Process all .ts files in a package."""
    pkg_src = os.path.join(pkg_dir, 'src')
    total_changes = 0
    total_files = 0

    for root, dirs, files in os.walk(pkg_src):
        for fname in files:
            if not fname.endswith('.ts'):
                continue
            fpath = os.path.join(root, fname)
            changed, changes, new_content = rewrite_file(fpath, pkg_src, pkg_name)
            if changed:
                with open(fpath, 'w') as f:
                    f.write(new_content)
                total_files += 1
                total_changes += len(changes)
                rel_path = os.path.relpath(fpath, pkg_dir)
                for old, new in changes:
                    print(f"  {rel_path}: '{old}' -> '{new}'")

    print(f"\n  [{pkg_name}] {total_changes} imports rewritten across {total_files} files\n")


def main():
    packages = ['audio', 'game', '3d', 'media', 'ai']
    for pkg in packages:
        pkg_dir = os.path.join(WD, 'packages', pkg)
        print(f"=== Processing @blecsd/{pkg} ===")
        process_package(pkg, pkg_dir)


if __name__ == '__main__':
    main()
