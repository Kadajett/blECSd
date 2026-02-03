# 3D Subsystem Performance Characteristics

Measured on Linux 6.14.0-37-generic, 2026-02-03.

## Performance Targets and Results

| Scenario | Target | Result | Status |
|----------|--------|--------|--------|
| Wireframe cube (braille) | < 2ms | 0.28ms | PASS |
| Filled cube (braille) | < 2ms | 0.39ms | PASS |
| 500-vert model (braille) | < 8ms | 0.82ms | PASS |
| 2000-vert model (braille) | < 8ms | 2.45ms | PASS |
| 5000-vert model (braille) | < 16.6ms | 6.82ms | PASS |
| 10000-vert model (braille) | < 16.6ms | 10.45ms | PASS |

All targets met. Full pipeline fits within the 16.6ms budget for 60fps up to ~10K vertices (wireframe, braille backend).

## Frame Budget Reference

| FPS | Budget (ms) | Max vertices (wireframe, braille) | Max entities (50 verts each) |
|-----|-------------|-----------------------------------|------------------------------|
| 60 | 16.6 | ~10,000 | ~100 |
| 30 | 33.3 | ~20,000+ | ~200+ |

## Full Pipeline Benchmarks

### Single Mesh (braille 160x96)

| Scenario | Mean (ms) | p99 (ms) | Ops/sec |
|----------|-----------|----------|---------|
| Wireframe cube (8 verts) | 0.28 | 0.56 | 3,527 |
| Filled cube | 0.39 | 0.75 | 2,535 |
| ~500 vertex sphere | 0.82 | 1.29 | 1,221 |
| ~2,000 vertex sphere | 2.45 | 4.23 | 408 |
| ~5,000 vertex sphere | 6.82 | 17.2 | 147 |
| ~10,000 vertex sphere | 10.45 | 13.3 | 96 |

### Multiple Entities

| Scenario | Mean (ms) | Ops/sec |
|----------|-----------|---------|
| 10 meshes, 50 verts each | 0.54 | 1,850 |
| 50 meshes, 50 verts each | 2.19 | 457 |
| 100 meshes, 50 verts each | 3.31 | 303 |
| 10 meshes, 500 verts each | 3.12 | 321 |
| 5 meshes, 2000 verts each | 6.27 | 159 |

### Multi-Viewport

| Scenario | Mean (ms) | Ops/sec |
|----------|-----------|---------|
| 3 viewports, cube each | 0.97 | 1,031 |
| 3 viewports, ~500 vert sphere each | 6.82 | 147 |
| 3 viewports, 10 meshes x 500 verts | 6.85 | 146 |

## System Breakdown

### Individual System Cost (Cube)

| System | Mean (ms) | Ops/sec | % of Pipeline |
|--------|-----------|---------|---------------|
| sceneGraphSystem | 0.159 | 6,281 | 28% |
| projectionSystem | 0.121 | 8,280 | 21% |
| rasterSystem | 0.189 | 5,296 | 33% |
| viewportOutputSystem (braille) | ~0.10 | ~10,000 | 18% |

The rasterSystem is the most expensive system for simple geometry due to line/triangle drawing.

## Backend Encoding Performance

### 400x200 Framebuffer

| Backend | Mean (ms) | Ops/sec |
|---------|-----------|---------|
| Kitty | 0.295 | 3,391 |
| Braille | 0.404 | 2,477 |
| Sextant | 0.546 | 1,833 |
| Half-block | 1.363 | 734 |
| Sixel (256 colors) | 129.0 | 7.8 |

### 800x400 Framebuffer

| Backend | Mean (ms) | Ops/sec |
|---------|-----------|---------|
| Kitty | 0.384 | 2,607 |
| Braille | 1.747 | 572 |
| Sixel | 446.5 | 2.2 |

## Recommendations

### Backend Selection

- **Braille** (recommended default): Best balance of compatibility and performance. Works on all Unicode terminals. 0.4ms encoding at 400x200.
- **Kitty**: Fastest encoding, best visual quality. Only works in Kitty terminal. Ideal for users with Kitty.
- **Sixel**: Pixel-perfect rendering but very slow encoding (129ms at 400x200). Only viable for static or very low FPS scenes.
- **Half-block**: Simpler character set, slower than braille. Useful as fallback when braille isn't available.
- **Sextant**: Similar performance to braille, different character resolution (2x3 vs 2x4).

### Mesh Complexity Guidelines

| Use Case | Recommended Vertices | Expected FPS (braille) |
|----------|---------------------|----------------------|
| Simple shapes (cube, tetrahedron) | 8-20 | 60+ |
| Low-poly models | 50-200 | 60+ |
| Medium detail models | 500-2000 | 30-60 |
| High detail models | 2000-5000 | 15-30 |
| Very detailed models | 5000-10000 | 10-15 |

### Performance Tips

1. **Use wireframe mode** for maximum performance. Wireframe rendering is 30-40% faster than filled.
2. **Keep vertex counts low** for terminal rendering. Terminal resolution is fundamentally limited, so high-poly models don't add visual fidelity.
3. **Limit visible entities**. Each entity adds projection and rasterization cost. 50-100 entities is a good ceiling for 60fps.
4. **Prefer braille backend** unless the user's terminal supports Kitty graphics.
5. **Avoid sixel for real-time rendering**. Sixel encoding is currently too slow for interactive frame rates.
6. **Minimize viewport size** when possible. Smaller viewports have proportionally less rasterization and encoding work.

### Optimization History

Initial implementation optimized with:
- Incremental edge functions in triangle rasterizer (avoids per-pixel barycentric recalculation)
- Inline MVP transform in projection system (eliminates per-vertex allocations)
- Pre-computed braille character lookup table (eliminates String.fromCharCode per cell)
- Array-join string building in sixel encoder (replaces string concatenation)
- Pre-allocated reusable buffers across frames (reduces GC pressure)
