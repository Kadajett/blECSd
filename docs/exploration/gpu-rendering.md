# GPU-Accelerated Rendering Exploration

> **Issue:** #782 | **Type:** Research / Exploration | **Priority:** P3
> **Status:** Complete | **Recommendation:** Not viable as a library-level feature; optimize escape sequence output instead

## Executive Summary

GPU-accelerated rendering is transformative for **terminal emulators** (Alacritty, Kitty, Ghostty, Warp) but is **not directly applicable** to terminal UI **libraries** like blECSd. The fundamental barrier is that blECSd communicates via stdin/stdout escape sequences -- it cannot access the GPU from within a host terminal. However, there are actionable optimizations and long-term paths worth pursuing.

**Recommendation: No-go for direct GPU rendering. Go for output optimization and optional windowed mode.**

## 1. How GPU Terminal Rendering Works

### 1.1 Glyph Atlas Approach (Alacritty, Kitty, Contour)

The dominant technique across GPU-accelerated terminals:

1. **Rasterize** each unique glyph once using FreeType/HarfBuzz
2. **Store** in a GPU texture atlas (a large texture containing all rendered glyphs)
3. **Render** each cell by copying from the atlas to screen position via instanced draw calls
4. Typically achieves the entire screen in **2 draw calls** (backgrounds + foregrounds)

**Alacritty** achieves ~500 FPS with a full screen of text. With VSync at 60Hz, the renderer uses ~2ms per frame.

**Proposed next-gen renderer** (Alacritty PR #4373): A single full-screen shader pass where the shader computes cell coordinates via integer division and looks up per-cell data from GPU textures. Claims 1.5-20x improvement.

### 1.2 Compute Shader Approach (Zutty)

Zutty uses OpenGL compute shaders with a radically different model:

1. The cell grid is stored as a **Shader Storage Buffer Object (SSBO)** in GPU memory
2. The terminal state machine writes directly to this mapped memory
3. One compute shader invocation per cell, all running in parallel
4. Each shader instance reads its cell data and copies the glyph from the atlas

This exploits the inherent parallelism of a fixed grid -- all cells are independent.

### 1.3 Metal/wgpu Approach (Warp, Ghostty)

**Warp** renders three primitive types (rectangles, images, glyphs) with ~200 lines of shader code. Uses a sub-pixel-aligned glyph atlas with quantized positions (0.0, 0.33, 0.66). Achieves >144 FPS on 4K monitors with ~1.9ms average redraw.

**Ghostty** uses OpenGL 3.3+ on Linux, Metal on macOS. Most notably, it is extracting its core as **libghostty** -- embeddable C-ABI libraries. The upcoming GPU rendering component ("provide us with an OpenGL or Metal surface and we'll take care of the rest") could be the most practical path for blECSd long-term.

### 1.4 Technique Comparison

| Technique | Used By | Draw Calls | GPU Requirement | Parallelism |
|-----------|---------|-----------|-----------------|-------------|
| Instanced VBO + Atlas | Alacritty, Kitty | 2 | GL 3.3+ | Per-draw-call |
| Full-screen Shader | Alacritty (proposed) | 1 | ~GL ES 2.0 | Per-pixel |
| Compute Shader + SSBO | Zutty | 1 | GL 4.3+ | Per-cell |
| Metal/wgpu Primitives | Warp, Ghostty | 1-3 | Metal/Vulkan | Per-primitive |

## 2. The Terminal Library Barrier

### 2.1 Why Direct GPU Rendering Does Not Apply

blECSd is a **library running inside a terminal emulator**, not a terminal emulator itself:

```
[ blECSd Library ]  -->  stdout (escape sequences)  -->  [ Terminal Emulator ]  -->  [ GPU ]
```

The library can only emit ANSI escape sequences. It has no access to:
- The GPU or any rendering surface
- The terminal's glyph atlas or font system
- The terminal's framebuffer or pixel output

GPU rendering only helps when you **are** the terminal emulator.

### 2.2 Node.js GPU Access

Node.js can access the GPU via native addons:

| Library | GPU API | Status | Notes |
|---------|---------|--------|-------|
| @kmamal/gpu | WebGPU (Dawn) | Active | Standard WebGPU API, render + compute |
| nvk | Vulkan | Mature | Low-level Vulkan bindings |
| node-native-gl | OpenGL | Available | OpenGL bindings |
| gpu.js | WebGL/HeadlessGL | Mature | GPGPU only, not rendering |

**None provide text rendering.** Building a full text pipeline requires: font discovery, font loading (FreeType), text shaping (HarfBuzz), glyph rasterization, atlas management, and custom shaders.

## 3. What blECSd Can Do Instead

### 3.1 Near-Term: Optimize Escape Sequence Output (Recommended)

The most impactful optimization is minimizing bytes sent to the terminal. Modern GPU terminals are extremely fast at rendering -- the bottleneck is typically the PTY/pipe throughput.

Strategies already implemented or planned in blECSd:
- **Differential rendering**: Only send changed cells (dirty tracking)
- **Synchronized output** (`CSI ?2026h/l`): Batch updates to prevent tearing
- **Cursor movement optimization**: Skip unchanged regions with cursor jumps
- **SGR coalescing**: Minimize redundant style escape sequences
- **Double buffering**: Compare front/back buffers, emit only diffs

These let the host terminal's GPU renderer do what it does best.

### 3.2 Medium-Term: Optional Windowed GPU Mode

Offer an opt-in mode that opens a standalone GPU-rendered window, bypassing the terminal entirely:

```typescript
import { createGame } from 'blecsd';

const game = createGame({
  renderer: 'gpu',      // Opens a GPU window instead of using terminal
  width: 120,
  height: 40,
  fontFamily: 'JetBrains Mono',
});
```

This would use `@kmamal/gpu` (WebGPU) or native OpenGL to create a window. The ECS architecture maps naturally to GPU buffers -- Position, Renderable, and Color components are already Structure-of-Arrays, which is the ideal format for GPU buffer uploads.

**Trade-offs:**
- Pro: True GPU rendering with sub-millisecond frame times
- Pro: No terminal emulator dependency for games/dashboards
- Con: Heavy native dependency (~50MB)
- Con: Not a terminal application anymore
- Con: Must implement full text rendering pipeline

### 3.3 Long-Term: Embed libghostty

When libghostty's GPU rendering component ships, wrap it via N-API:

```typescript
import { createGame } from 'blecsd';

const game = createGame({
  renderer: 'ghostty',  // Uses libghostty for GPU rendering
});
```

This would provide production-quality GPU text rendering without building the pipeline from scratch. libghostty-vt (terminal parsing) is already available; the rendering component is planned.

## 4. Proof of Concept

A proof-of-concept module is provided at `src/terminal/gpuProbe.ts` that:
- Detects whether the host terminal is GPU-accelerated
- Estimates rendering throughput via escape sequence timing
- Reports which GPU optimization strategies the host supports

This demonstrates the practical approach: **detect the host terminal's capabilities and optimize output accordingly**, rather than attempting GPU rendering from within the library.

## 5. Performance Comparison: CPU vs GPU Terminals

| Metric | CPU Terminal (xterm) | GPU Terminal (Alacritty) | Ratio |
|--------|---------------------|--------------------------|-------|
| Full screen redraw | ~16ms | ~2ms | 8x |
| Scroll throughput | ~5,000 lines/s | ~100,000+ lines/s | 20x |
| Glyph rendering | Per-frame CPU | Cached in VRAM | N/A |
| Memory (text) | System RAM | VRAM atlas + RAM | ~1.5x |

The key insight: blECSd benefits from GPU terminals **automatically** by being a good escape sequence emitter. No library-level GPU work is needed to benefit from Alacritty/Kitty/Ghostty performance.

## 6. Conclusion

| Path | Feasibility | Impact | Effort | Recommendation |
|------|-------------|--------|--------|----------------|
| Direct GPU rendering | Not feasible | N/A | N/A | No-go |
| Escape sequence optimization | High | High | Low | **Do this now** |
| Optional windowed GPU mode | Medium | Medium | Very high | Consider for v2 |
| Embed libghostty | Medium (future) | High | Medium | Watch and wait |

**The go/no-go recommendation is: No-go for GPU rendering as a library feature.** Instead, focus on making blECSd the most efficient escape sequence emitter possible, so users benefit from GPU-accelerated terminals automatically.

## References

- [Announcing Alacritty](https://jwilm.io/blog/announcing-alacritty/) - GPU rendering architecture
- [Alacritty new renderer PR #4373](https://github.com/alacritty/alacritty/pull/4373) - Full-screen shader approach
- [Kitty Performance](https://sw.kovidgoyal.net/kitty/performance/) - Glyph cache and delta updates
- [How Warp Works](https://www.warp.dev/blog/how-warp-works) - Metal/wgpu rendering primitives
- [How Zutty Works](https://tomscii.sig7.se/2020/11/How-Zutty-works) - Compute shader approach
- [Contour Text Stack](https://contour-terminal.org/internals/text-stack/) - Multi-stage text pipeline
- [Libghostty Is Coming](https://mitchellh.com/writing/libghostty-is-coming) - Embeddable GPU terminal rendering
- [@kmamal/gpu](https://github.com/kmamal/gpu) - WebGPU for Node.js
