# 3D Rendering Guide

This guide explains blECSd's 3D rendering subsystem, when to use it, and how to build 3D terminal applications.

## Table of Contents

1. [Why 3D in a Terminal?](#why-3d-in-a-terminal)
2. [Performance Expectations](#performance-expectations)
3. [Quick Start](#quick-start)
4. [Rendering Backends](#rendering-backends)
5. [The 3D Pipeline](#the-3d-pipeline)
6. [Creating Meshes](#creating-meshes)
7. [Camera and Transforms](#camera-and-transforms)
8. [Materials and Shading](#materials-and-shading)
9. [Animation](#animation)
10. [Mouse Interaction](#mouse-interaction)
11. [Performance Optimization](#performance-optimization)
12. [Use Cases](#use-cases)

## Why 3D in a Terminal?

### Real-World Applications

3D rendering in terminals is practical for:

**1. Data Visualization**
- 3D scatter plots for scientific data
- Network topology visualization
- Financial data in 3D space

**2. CAD/3D Model Preview**
- Preview `.obj` files without GUI
- SSH into servers and inspect models
- Lightweight 3D viewer for terminals

**3. Retro Games and Demos**
- ASCII/Unicode raycasting engines (Doom-style)
- Terminal-based 3D games
- Generative art and demos

**4. System Monitoring**
- 3D resource usage graphs
- Server infrastructure visualization
- Real-time performance monitoring

### Why blECSd for 3D?

- **Pure TypeScript**: No native dependencies, works everywhere Node.js runs
- **Multiple backends**: From ASCII (universal) to Kitty graphics (high-res)
- **ECS architecture**: Handle thousands of entities efficiently
- **Fully testable**: Render to buffers, no GPU required
- **Terminal-native**: Designed for terminal constraints from day one

### What This Is NOT

- ❌ Not a replacement for Unity/Godot/Three.js
- ❌ Not real-time photorealistic graphics
- ❌ Not GPU-accelerated (CPU rasterizer)

## Performance Expectations

### Frame Rates

Based on measured benchmarks (see `docs/performance/3d-baseline.md`):

| Scene Complexity | Braille Backend | Kitty Backend | Target FPS |
|------------------|-----------------|---------------|------------|
| Simple (< 100 verts) | 0.3ms/frame | 0.4ms/frame | 60 FPS ✅ |
| Medium (500 verts) | 0.8ms/frame | 1.2ms/frame | 60 FPS ✅ |
| Complex (2000 verts) | 2.5ms/frame | 3.8ms/frame | 60 FPS ✅ |
| Heavy (10,000 verts) | 10.5ms/frame | 15ms/frame | 60 FPS ✅ |
| Very Heavy (50,000 verts) | ~50ms/frame | ~75ms/frame | 20 FPS ⚠️ |

**Rule of thumb:**
- **< 10,000 vertices total**: Smooth 60 FPS
- **10,000-20,000 vertices**: 30-60 FPS (still playable)
- **> 20,000 vertices**: Consider LOD or culling

### Backend Performance

From fastest to slowest:

1. **Kitty** - 0.3ms per 400x200 frame (native graphics)
2. **Braille** - 0.4ms per frame (2x4 dot grid, universal)
3. **Sextant** - 0.5ms per frame (2x3 dot grid, Unicode 13+)
4. **Half-block** - 1.4ms per frame (1x2 pixels, universal)
5. **Sixel** - 129ms per frame (slow encoding, wide terminal support)

**Recommendation:** Start with **Braille** (universal + fast), upgrade to **Kitty** if available.

## Quick Start

### Spinning Cube Example

```typescript
import { createWorld, addEntity, createScheduler, LoopPhase } from 'blecsd';
import { three, createViewport3D } from 'blecsd';

// Create world and viewport entity
const world = createWorld();
const vpEntity = addEntity(world);

// Create 3D viewport
const viewport = createViewport3D(world, vpEntity, {
  left: 2,
  top: 1,
  width: 60,
  height: 20,
  fov: Math.PI / 3,  // 60 degrees
  backend: 'braille',
});

// Add a cube mesh
const cubeId = three.createCubeMesh({ size: 1 });
viewport.addMesh(cubeId,
  { tx: 0, ty: 0, tz: -5 },  // Position (5 units away from camera)
  { renderMode: 'wireframe', wireColor: 0x00FF88 }  // Green wireframe
);

// Set up scheduler with 3D systems
const scheduler = createScheduler(world, { targetFPS: 60 });

scheduler.addSystem(LoopPhase.UPDATE, three.sceneGraphSystem);
scheduler.addSystem(LoopPhase.RENDER, three.projectionSystem);
scheduler.addSystem(LoopPhase.RENDER, three.rasterSystem);
scheduler.addSystem(LoopPhase.RENDER, three.viewportOutputSystem);

// Add rotation animation
scheduler.addSystem(LoopPhase.ANIMATION, (world) => {
  const meshes = three.queryMeshes(world);
  for (const eid of meshes) {
    const transform = three.Transform3D;
    transform.ry[eid] = (transform.ry[eid] ?? 0) + 0.02;  // Rotate around Y axis
  }
  return world;
});

// Start rendering
scheduler.start();

// Output is automatically written to the terminal
// Or read it programmatically:
// const output = three.outputStore.get(vpEntity);
```

### Output

```
   ╱──╲
  ╱    ╲
 ╱      ╲
╱________╲
│        │
│        │
│        │
╲________╱
```

The cube rotates smoothly at 60 FPS.

## Rendering Backends

blECSd supports 5 terminal rendering backends:

### 1. Braille (Recommended)

**Best for:** Universal compatibility, fast performance

```typescript
const viewport = createViewport3D(world, vpEntity, {
  backend: 'braille',
  width: 60,
  height: 20,
});
```

**Characteristics:**
- ✅ Works in ALL terminals (Unicode support)
- ✅ Fast (0.4ms per frame)
- ✅ 2x4 dot resolution per character cell
- ⚠️ Only 2 colors per cell (fg + bg)

**Output:**
```
⠀⠀⠀⠀⠀⠀⣠⣴⣶⣶⣤⣄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀
⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀
⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀
```

### 2. Kitty Graphics

**Best for:** High resolution, if using Kitty terminal

```typescript
const viewport = createViewport3D(world, vpEntity, {
  backend: 'kitty',
  width: 400,   // Actual pixels
  height: 300,
});
```

**Characteristics:**
- ✅ True pixel rendering (not character-based)
- ✅ True color + alpha channel
- ✅ Fastest backend (0.3ms per frame)
- ❌ Only works in Kitty terminal

### 3. Half-Block

**Best for:** More colors per cell than braille

```typescript
const viewport = createViewport3D(world, vpEntity, {
  backend: 'halfblock',
  width: 60,
  height: 20,
});
```

**Characteristics:**
- ✅ Universal (Unicode)
- ✅ 2 independent colors per cell (top/bottom)
- ⚠️ 1x2 pixel resolution per cell
- ⚠️ Slower than braille (1.4ms per frame)

**Output:**
```
▀▀▀▄▄▄
▀▀▄▄▄▄
▄▄▄▄▄▄
```

### 4. Sextant

**Best for:** Unicode 13+ terminals

```typescript
const viewport = createViewport3D(world, vpEntity, {
  backend: 'sextant',
  width: 60,
  height: 20,
});
```

**Characteristics:**
- ⚠️ Requires Unicode 13+ (2020+)
- ✅ 2x3 dot resolution per cell
- ✅ Fast (0.5ms per frame)
- ⚠️ Only 2 colors per cell

### 5. Sixel

**Best for:** Wide terminal support with pixel graphics

```typescript
const viewport = createViewport3D(world, vpEntity, {
  backend: 'sixel',
  width: 400,
  height: 300,
});
```

**Characteristics:**
- ✅ True pixel rendering
- ✅ Works in xterm, mlterm, foot, WezTerm
- ❌ Very slow encoding (129ms per frame = 7 FPS)
- ⚠️ 256 color palette limit

### Backend Selection Guide

```typescript
function selectBackend(): string {
  if (process.env.TERM === 'xterm-kitty') {
    return 'kitty';  // Best quality + performance
  }
  if (supportsUnicode13()) {
    return 'sextant';  // Good balance
  }
  return 'braille';  // Universal fallback
}
```

## The 3D Pipeline

### System Execution Order

Run these systems in the correct order each frame:

```typescript
import { LoopPhase } from 'blecsd';

// 1. ANIMATION phase - Update transforms
scheduler.addSystem(LoopPhase.ANIMATION, three.animation3DSystem);
scheduler.addSystem(LoopPhase.ANIMATION, three.mouseInteraction3DSystem);

// 2. UPDATE phase - Compute world matrices
scheduler.addSystem(LoopPhase.UPDATE, three.sceneGraphSystem);

// 3. RENDER phase - Project and rasterize
scheduler.addSystem(LoopPhase.RENDER, three.projectionSystem);
scheduler.addSystem(LoopPhase.RENDER, three.rasterSystem);
scheduler.addSystem(LoopPhase.RENDER, three.viewportOutputSystem);
```

### What Each System Does

| System | Purpose | Input | Output |
|--------|---------|-------|--------|
| `animation3DSystem` | Applies rotation/orbit animations | Animation3D components | Updated Transform3D |
| `mouseInteraction3DSystem` | Handles camera rotation via mouse | Mouse events | Updated Camera3D |
| `sceneGraphSystem` | Computes world-space matrices | Transform3D hierarchy | World matrices |
| `projectionSystem` | Projects 3D vertices to 2D screen | World matrices + Camera3D | Screen coordinates |
| `rasterSystem` | Draws triangles/lines to pixel buffer | Screen coordinates + Material3D | PixelFramebuffer |
| `viewportOutputSystem` | Encodes pixels for terminal | PixelFramebuffer | Terminal output string |

### Manual Pipeline (Without Scheduler)

You can also call systems manually:

```typescript
// Every frame
three.sceneGraphSystem(world);
three.projectionSystem(world);
three.rasterSystem(world);
three.viewportOutputSystem(world);

// Read output
const output = three.outputStore.get(vpEntity);
process.stdout.write(output);
```

## Creating Meshes

### Built-in Primitives

```typescript
import { three } from 'blecsd';

// Cube (8 vertices)
const cubeId = three.createCubeMesh({ size: 1 });

// Sphere (configurable subdivisions)
const sphereId = three.createSphereMesh({
  radius: 1,
  segments: 16,  // More segments = smoother but slower
});

// Plane
const planeId = three.createPlaneMesh({ width: 2, height: 2 });

// Cylinder
const cylinderId = three.createCylinderMesh({
  radius: 1,
  height: 2,
  segments: 16,
});
```

### Loading OBJ Files

```typescript
import { three } from 'blecsd';
import { readFileSync } from 'node:fs';

// Load OBJ file
const objData = readFileSync('./models/teapot.obj', 'utf-8');
const meshId = three.loadOBJ(objData);

// Add to viewport
viewport.addMesh(meshId,
  { tx: 0, ty: 0, tz: -5 },
  { renderMode: 'solid', solidColor: 0xFF6600 }
);
```

**OBJ support:**
- ✅ Vertices (`v`)
- ✅ Texture coordinates (`vt`)
- ✅ Normals (`vn`)
- ✅ Faces (`f`)
- ❌ Materials (`.mtl` files not supported yet)

### Custom Meshes

```typescript
import { three } from 'blecsd';

const meshId = three.createMesh({
  vertices: new Float32Array([
    // x,   y,   z
    -1.0, -1.0, 0.0,  // Bottom left
     1.0, -1.0, 0.0,  // Bottom right
     0.0,  1.0, 0.0,  // Top center
  ]),
  indices: new Uint32Array([
    0, 1, 2,  // Triangle connecting all 3 vertices
  ]),
  normals: new Float32Array([
    0, 0, 1,  // Normal pointing toward camera
    0, 0, 1,
    0, 0, 1,
  ]),
});
```

## Camera and Transforms

### Camera Setup

```typescript
const viewport = createViewport3D(world, vpEntity, {
  fov: Math.PI / 3,  // 60 degrees field of view
  near: 0.1,         // Near clipping plane
  far: 100,          // Far clipping plane
  camX: 0,           // Camera position
  camY: 2,
  camZ: 5,
  lookX: 0,          // Look-at target
  lookY: 0,
  lookZ: 0,
});
```

### Moving the Camera

```typescript
import { three } from 'blecsd';

// Update camera position
const cam = three.Camera3D;
cam.camX[vpEntity] = 10;
cam.camY[vpEntity] = 5;
cam.camZ[vpEntity] = 10;

// Update look-at target
cam.lookX[vpEntity] = 0;
cam.lookY[vpEntity] = 0;
cam.lookZ[vpEntity] = 0;
```

### Transform Hierarchy

Create parent-child relationships:

```typescript
const parentId = three.createCubeMesh({ size: 2 });
const childId = three.createSphereMesh({ radius: 0.5 });

// Add parent
viewport.addMesh(parentId, { tx: 0, ty: 0, tz: -5 });

// Add child (positioned relative to parent)
viewport.addMesh(childId,
  { tx: 2, ty: 0, tz: 0 },  // 2 units to the right of parent
  { renderMode: 'wireframe' },
  parentMeshEntity  // Parent entity
);

// Rotating parent also rotates child
three.Transform3D.ry[parentMeshEntity] = Math.PI / 4;
```

### Transform Properties

```typescript
import { three } from 'blecsd';

const transform = three.Transform3D;

// Translation (position)
transform.tx[meshEntity] = 1.0;
transform.ty[meshEntity] = 2.0;
transform.tz[meshEntity] = -5.0;

// Rotation (radians)
transform.rx[meshEntity] = 0;        // Pitch
transform.ry[meshEntity] = Math.PI / 4;  // Yaw (45°)
transform.rz[meshEntity] = 0;        // Roll

// Scale
transform.sx[meshEntity] = 1.0;
transform.sy[meshEntity] = 1.0;
transform.sz[meshEntity] = 1.0;
```

## Materials and Shading

### Render Modes

```typescript
// Wireframe (edges only)
viewport.addMesh(meshId, transform, {
  renderMode: 'wireframe',
  wireColor: 0x00FF00,  // Green
});

// Solid (filled triangles)
viewport.addMesh(meshId, transform, {
  renderMode: 'solid',
  solidColor: 0xFF6600,  // Orange
});

// Shaded (uses normals)
viewport.addMesh(meshId, transform, {
  renderMode: 'shaded',
  shadingMode: 'flat',  // or 'smooth'
  baseColor: 0xFFFFFF,
  lightDir: [0.5, 0.7, 0.3],  // Directional light
});
```

### Shading Modes

**Flat shading** (per-face):
```typescript
{
  renderMode: 'shaded',
  shadingMode: 'flat',  // One color per triangle
  baseColor: 0xCCCCCC,
}
```

**Smooth shading** (interpolated):
```typescript
{
  renderMode: 'shaded',
  shadingMode: 'smooth',  // Interpolate across triangle
  baseColor: 0xCCCCCC,
}
```

### Depth Buffer

Depth testing is **enabled by default**:

```typescript
const viewport = createViewport3D(world, vpEntity, {
  depthTest: true,  // Default
  // ...
});
```

Disable for transparent/overlapping effects:

```typescript
{
  depthTest: false,  // Render in draw order, no depth sorting
}
```

## Animation

### Manual Animation

```typescript
scheduler.addSystem(LoopPhase.ANIMATION, (world) => {
  const meshEntities = three.queryMeshes(world);

  for (const eid of meshEntities) {
    // Rotate around Y axis
    three.Transform3D.ry[eid] = (three.Transform3D.ry[eid] ?? 0) + 0.02;
  }

  return world;
});
```

### Built-in Animation System

```typescript
import { three, addEntity } from 'blecsd';

// Add Animation3D component
const meshEntity = addEntity(world);
const anim = three.Animation3D;

anim.mode[meshEntity] = 0;  // 0 = rotate, 1 = orbit
anim.axis[meshEntity] = 1;  // 0 = X, 1 = Y, 2 = Z
anim.speed[meshEntity] = 1.0;  // Radians per second

// Register system
scheduler.addSystem(LoopPhase.ANIMATION, three.animation3DSystem);
```

**Animation modes:**
- `mode: 0` - **Rotate** around own axis
- `mode: 1` - **Orbit** around parent

### Keyframe Animation

```typescript
const keyframes = [
  { time: 0, tx: 0, ty: 0, tz: -5 },
  { time: 1, tx: 2, ty: 1, tz: -5 },
  { time: 2, tx: 0, ty: 0, tz: -5 },
];

let t = 0;

scheduler.addSystem(LoopPhase.ANIMATION, (world) => {
  t += 0.016;  // 16ms per frame

  // Find keyframe pair
  let k0 = keyframes[0];
  let k1 = keyframes[1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].time && t < keyframes[i + 1].time) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  // Linear interpolation
  const alpha = (t - k0.time) / (k1.time - k0.time);
  three.Transform3D.tx[meshEntity] = k0.tx + (k1.tx - k0.tx) * alpha;
  three.Transform3D.ty[meshEntity] = k0.ty + (k1.ty - k0.ty) * alpha;
  three.Transform3D.tz[meshEntity] = k0.tz + (k1.tz - k0.tz) * alpha;

  return world;
});
```

## Mouse Interaction

### Enabling Mouse Control

```typescript
import { three, queueMouseEvent, parseMouseEvent } from 'blecsd';

// Enable mouse interaction for viewport
const viewport = createViewport3D(world, vpEntity, {
  // ... other options
});

// Register mouse interaction system
scheduler.addSystem(LoopPhase.ANIMATION, three.mouseInteraction3DSystem);

// Queue mouse events
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseEvent(buffer);
  if (mouseEvent) {
    queueMouseEvent(mouseEvent);
  }
});
```

### Mouse Controls

**Drag with left button:** Rotate camera around look-at point
**Scroll up/down:** Zoom in/out
**Drag with right button:** Pan camera

### Custom Mouse Handling

```typescript
import { hitTest3D } from 'blecsd';

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseEvent(buffer);

  if (mouseEvent && mouseEvent.action === 'press') {
    // Test which mesh was clicked
    const hit = hitTest3D(world, vpEntity, mouseEvent.x, mouseEvent.y);

    if (hit) {
      console.log(`Clicked mesh entity: ${hit.entity}`);
      console.log(`3D position: ${hit.worldX}, ${hit.worldY}, ${hit.worldZ}`);
    }
  }
});
```

## Performance Optimization

### 1. Use LOD (Level of Detail)

Switch mesh complexity based on distance:

```typescript
const highDetail = three.createSphereMesh({ radius: 1, segments: 32 });
const mediumDetail = three.createSphereMesh({ radius: 1, segments: 16 });
const lowDetail = three.createSphereMesh({ radius: 1, segments: 8 });

function updateLOD(world: World, cameraZ: number, meshEntity: Entity): void {
  const distance = Math.abs(three.Transform3D.tz[meshEntity] ?? 0 - cameraZ);

  let meshId: number;
  if (distance < 5) {
    meshId = highDetail;
  } else if (distance < 10) {
    meshId = mediumDetail;
  } else {
    meshId = lowDetail;
  }

  three.Mesh.meshId[meshEntity] = meshId;
}
```

### 2. Frustum Culling

Don't render objects outside camera view:

```typescript
import { isInFrustum } from 'blecsd';

scheduler.addSystem(LoopPhase.RENDER, (world) => {
  const meshes = three.queryMeshes(world);

  for (const eid of meshes) {
    if (!isInFrustum(world, vpEntity, eid)) {
      // Skip rendering this mesh
      continue;
    }

    // ... render mesh
  }

  return world;
});
```

### 3. Backface Culling

Enabled by default, skips triangles facing away from camera.

### 4. Choose Faster Backend

```typescript
// Fastest to slowest:
// 1. Kitty (0.3ms) - if available
// 2. Braille (0.4ms) - universal
// 3. Sextant (0.5ms) - Unicode 13+
// 4. Half-block (1.4ms) - universal but slower
// 5. Sixel (129ms) - avoid for real-time

const viewport = createViewport3D(world, vpEntity, {
  backend: 'braille',  // Fast + universal
});
```

### 5. Reduce Viewport Size

Smaller framebuffers = faster rasterization:

```typescript
// Full terminal (slower)
{ width: 160, height: 96 }

// Half terminal (faster)
{ width: 80, height: 48 }

// Quarter terminal (fastest)
{ width: 40, height: 24 }
```

### 6. Limit Mesh Complexity

**Target vertex counts:**
- **Interactive (60 FPS):** < 10,000 vertices total
- **Playable (30 FPS):** < 20,000 vertices total
- **Slideshow (15 FPS):** < 50,000 vertices total

### 7. Batch Static Geometry

Combine multiple static meshes into one:

```typescript
// Instead of 100 cube meshes (slow)
for (let i = 0; i < 100; i++) {
  viewport.addMesh(cubeId, { tx: i, ty: 0, tz: -5 });
}

// Combine into one mesh (fast)
const combinedMesh = three.combineMeshes([...cubes]);
viewport.addMesh(combinedMesh, { tx: 0, ty: 0, tz: -5 });
```

## Use Cases

### 1. 3D Data Visualization

**Example: Scatter Plot**

```typescript
import { three, createViewport3D } from 'blecsd';

function createScatterPlot(data: Array<{ x: number; y: number; z: number; value: number }>): void {
  const world = createWorld();
  const vpEntity = addEntity(world);

  const viewport = createViewport3D(world, vpEntity, {
    left: 0, top: 0, width: 80, height: 40,
    fov: Math.PI / 3,
    backend: 'braille',
  });

  const sphereId = three.createSphereMesh({ radius: 0.05, segments: 4 });

  for (const point of data) {
    const color = valueToColor(point.value);
    viewport.addMesh(sphereId,
      { tx: point.x, ty: point.y, tz: point.z - 5 },
      { renderMode: 'solid', solidColor: color }
    );
  }

  // Enable mouse rotation
  setupMouseControl(world, vpEntity);
}
```

### 2. OBJ File Viewer

**Example: CLI Tool**

```typescript
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { three, createViewport3D } from 'blecsd';

const objPath = process.argv[2];
if (!objPath) {
  console.error('Usage: obj-viewer <file.obj>');
  process.exit(1);
}

const objData = readFileSync(objPath, 'utf-8');
const meshId = three.loadOBJ(objData);

const world = createWorld();
const vpEntity = addEntity(world);

const viewport = createViewport3D(world, vpEntity, {
  left: 0, top: 0, width: 80, height: 40,
  backend: 'braille',
});

viewport.addMesh(meshId,
  { tx: 0, ty: 0, tz: -5 },
  { renderMode: 'wireframe', wireColor: 0x00FF88 }
);

setupMouseControl(world, vpEntity);
startRenderLoop(world);
```

### 3. System Monitor with 3D Graphs

**Example: CPU Usage Visualization**

```typescript
import { three, createViewport3D } from 'blecsd';

function create3DResourceMonitor(): void {
  const world = createWorld();
  const vpEntity = addEntity(world);

  const viewport = createViewport3D(world, vpEntity, {
    left: 0, top: 0, width: 60, height: 30,
    backend: 'braille',
  });

  const history: number[] = [];
  const maxHistory = 60;

  setInterval(() => {
    const cpuUsage = os.loadavg()[0];
    history.push(cpuUsage);
    if (history.length > maxHistory) history.shift();

    // Clear old meshes
    viewport.clearMeshes();

    // Add bars for each data point
    const barId = three.createCubeMesh({ size: 0.1 });

    for (let i = 0; i < history.length; i++) {
      const height = history[i] / 100 * 3;  // Scale to 0-3 units
      const color = history[i] > 80 ? 0xFF0000 : 0x00FF00;

      viewport.addMesh(barId,
        { tx: i * 0.2 - 6, ty: height / 2, tz: -10, sy: height },
        { renderMode: 'solid', solidColor: color }
      );
    }
  }, 1000);
}
```

### 4. Terminal Game (Doom-style Raycaster)

**Example: Simple Raycasting Engine**

```typescript
import { three, createViewport3D } from 'blecsd';

function createRaycaster(): void {
  const world = createWorld();
  const vpEntity = addEntity(world);

  const viewport = createViewport3D(world, vpEntity, {
    left: 0, top: 0, width: 80, height: 40,
    fov: Math.PI / 2,  // 90 degree FOV
    backend: 'braille',
  });

  // Create level geometry
  const wallId = three.createCubeMesh({ size: 1 });

  const level = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  for (let y = 0; y < level.length; y++) {
    for (let x = 0; x < level[y].length; x++) {
      if (level[y][x] === 1) {
        viewport.addMesh(wallId,
          { tx: x * 2, ty: 1, tz: y * 2 - 10 },
          { renderMode: 'solid', solidColor: 0x888888 }
        );
      }
    }
  }

  // Handle WASD movement
  setupKeyboardControls(world, vpEntity);
  startRenderLoop(world);
}
```

### 5. Generative Art

**Example: Animated Spirograph**

```typescript
import { three, createViewport3D } from 'blecsd';

function createSpirograph(): void {
  const world = createWorld();
  const vpEntity = addEntity(world);

  const viewport = createViewport3D(world, vpEntity, {
    left: 0, top: 0, width: 80, height: 40,
    backend: 'braille',
  });

  const sphereId = three.createSphereMesh({ radius: 0.05, segments: 4 });

  let t = 0;

  scheduler.addSystem(LoopPhase.ANIMATION, (world) => {
    t += 0.05;

    // Clear previous frame
    viewport.clearMeshes();

    // Draw parametric curve
    for (let i = 0; i < 100; i++) {
      const angle = i / 100 * Math.PI * 2 + t;
      const r1 = 2;
      const r2 = 1;
      const x = (r1 + r2) * Math.cos(angle) - r2 * Math.cos((r1 / r2 + 1) * angle);
      const y = (r1 + r2) * Math.sin(angle) - r2 * Math.sin((r1 / r2 + 1) * angle);
      const z = Math.sin(angle * 3) * 0.5;

      const hue = (i / 100) * 360;
      const color = hslToRgb(hue, 100, 50);

      viewport.addMesh(sphereId,
        { tx: x, ty: y, tz: z - 5 },
        { renderMode: 'solid', solidColor: color }
      );
    }

    return world;
  });
}
```

## Related Documentation

- [3D API Reference](../api/3d/index.md)
- [Math Module](../api/3d/math.md) - Vec3, Mat4, projection
- [Rasterizer](../api/3d/rasterizer.md) - PixelFramebuffer, drawing primitives
- [Backends](../api/3d/backends.md) - Terminal encoding backends
- [Systems](../api/3d/systems.md) - Pipeline systems reference
- [Performance Baseline](../performance/3d-baseline.md) - Measured benchmarks
- [Performance Guide](./performance.md) - General optimization techniques
