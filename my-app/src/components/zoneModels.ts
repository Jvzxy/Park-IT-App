/**
 * zoneModels.ts
 *
 * The Blender model as plain data + math. No `three` / `react-native` imports on purpose:
 * everything here is unit-testable in Node, and ZoneModel3D.tsx is just the thin renderer on top.
 *
 * All coordinates are copied from the Blender script (same units, y up, origin at each
 * shape's bottom-left), so the app shows exactly what you built in Blender.
 */

export type Pt = [number, number];
export type ViewId = 'map' | 'A' | 'B';
export type PlateId = 'A' | 'B' | 'bg';
export type StrokeColor = 'green' | 'red' | 'yellow' | 'divider';

export interface Plate {
  id: PlateId;
  points: Pt[];
  depth: number; // extrusion height
}

export interface Stroke {
  kind: 'line' | 'arrow' | 'curve'; // arrow = polyline + arrowhead, curve = quadratic bezier + arrowhead
  color: StrokeColor;
  points: Pt[]; // curve: exactly 3 control points
  radius: number;
}

export interface Label {
  text: string;
  x: number;
  y: number;
  align: 'left' | 'right' | 'center';
  color: string;
  size: number; // Blender text size, in model units
  minPx: number; // never render smaller than this on screen
  bold: boolean;
}

export interface SceneDef {
  plates: Plate[];
  strokes: Stroke[];
  labels: Label[];
}

// ---------------------------------------------------------------------------
// Colours sampled from the Figma frames (same as the Blender script)
// ---------------------------------------------------------------------------
export const COLORS = {
  dark: '#141C2A',
  green: '#4EDEA3',
  red: '#DC2626',
  yellow: '#FFBB10',
  divider: '#DCDDE0',
};

// The Blender strokes are ~2px at Figma's size. On a phone the shapes are drawn smaller,
// so strokes and arrowheads are scaled up a little to stay readable.
export const STROKE_BOOST = 1.6;
export const HEAD_LEN = 0.26 * STROKE_BOOST; // Blender: head_len
export const HEAD_WID = 0.3 * STROKE_BOOST; // Blender: head_wid

// Plates are thicker than in Blender (0.4 / 0.1) so the 3D edge is visible on a phone screen.
const MAP_DEPTH = 1.0;
const DETAIL_DEPTH = 0.5;

const ARROW_R = 0.045 * STROKE_BOOST;
const LINE_R = 0.035 * STROKE_BOOST;
const DIVIDER_R = 0.03 * STROKE_BOOST;

const arrow = (color: StrokeColor, points: Pt[]): Stroke => ({ kind: 'arrow', color, points, radius: ARROW_R });
const curve = (color: StrokeColor, points: Pt[]): Stroke => ({ kind: 'curve', color, points, radius: ARROW_R });
const line = (color: StrokeColor, points: Pt[], radius: number): Stroke => ({ kind: 'line', color, points, radius });

// ---------------------------------------------------------------------------
// PANEL 1 - main map (Blender: coords_a / coords_b)
// ---------------------------------------------------------------------------
const MAP: SceneDef = {
  plates: [
    { id: 'A', depth: MAP_DEPTH, points: [[0, 0], [3.5, 0], [3.5, 4.5], [7.0, 6.5], [4.5, 20.0], [0, 19.0]] },
    { id: 'B', depth: MAP_DEPTH, points: [[3.5, 0], [14.0, 0], [18.0, 6.0], [14.5, 13.0], [5.62, 14.0], [7.0, 6.5], [3.5, 4.5]] },
  ],
  strokes: [],
  labels: [
    // Blender places "A" at (2.0, 9.0) and "B" at (10.0, 5.0) left-aligned; these are the glyph centres
    { text: 'A', x: 2.9, y: 9.0, align: 'center', color: '#FFFFFF', size: 2.5, minPx: 14, bold: true },
    { text: 'B', x: 10.9, y: 5.0, align: 'center', color: '#FFFFFF', size: 2.5, minPx: 14, bold: true },
  ],
};

// ---------------------------------------------------------------------------
// PANEL 2 - Zone A detail (Blender: coords_indicator_a + arrows)
// ---------------------------------------------------------------------------
const ZONE_A: SceneDef = {
  plates: [
    {
      id: 'bg',
      depth: DETAIL_DEPTH,
      points: [[0.24, 0.0], [5.23, 0.08], [5.15, 4.73], [10.07, 6.96], [6.72, 20.0], [0.0, 18.9]],
    },
  ],
  strokes: [
    line('yellow', [[3.63, 16.95], [5.04, 7.91]], LINE_R),
    // entrance arrows (green)
    arrow('green', [[1.54, 1.56], [1.54, 4.04]]),
    arrow('green', [[1.54, 7.56], [1.54, 10.04]]),
    arrow('green', [[1.54, 13.03], [1.54, 15.55]]),
    curve('green', [[2.27, 17.48], [3.3, 19.55], [4.78, 17.69]]),
    // exit arrows (red)
    arrow('red', [[5.44, 16.51], [6.0, 14.12]]),
    arrow('red', [[6.59, 12.14], [6.85, 9.71]]),
    arrow('red', [[6.99, 7.16], [4.73, 6.07]]),
    arrow('red', [[3.9, 4.25], [3.94, 1.72]]),
    // "Entrance | Exit" divider
    line('divider', [[3.08, 0.06], [3.08, 0.9]], DIVIDER_R),
  ],
  labels: [
    { text: 'Entrance', x: 2.62, y: 0.15, align: 'right', color: COLORS.green, size: 0.46, minPx: 8.5, bold: false },
    { text: 'Exit', x: 3.68, y: 0.15, align: 'left', color: COLORS.red, size: 0.46, minPx: 8.5, bold: false },
  ],
};

// ---------------------------------------------------------------------------
// PANEL 3 - Zone B detail (Blender: coords_indicator_b + arrows)
// ---------------------------------------------------------------------------
const ZONE_B: SceneDef = {
  plates: [
    {
      id: 'bg',
      depth: DETAIL_DEPTH,
      points: [[0.06, 0.0], [9.68, 0.09], [12.65, 6.97], [9.54, 12.65], [2.86, 13.86], [4.17, 6.85], [0.0, 4.59]],
    },
  ],
  strokes: [
    line('yellow', [[6.99, 10.04], [7.87, 5.98], [4.91, 2.93]], LINE_R),
    arrow('green', [[1.47, 1.7], [1.47, 3.37], [2.49, 4.08]]),
    arrow('green', [[4.52, 5.49], [6.19, 6.46], [5.85, 7.8]]),
    curve('green', [[5.4, 11.05], [6.43, 13.11], [7.92, 11.26]]),
    arrow('red', [[9.24, 9.29], [9.8, 6.85]]),
    arrow('red', [[9.5, 5.14], [7.99, 3.11]]),
    arrow('red', [[6.55, 2.1], [4.24, 1.01]]),
    line('yellow', [[2.2, 0.11], [2.2, 0.95]], DIVIDER_R),
  ],
  labels: [
    { text: 'Entrance', x: 1.89, y: 0.23, align: 'right', color: COLORS.green, size: 0.38, minPx: 8.5, bold: false },
    { text: 'Exit', x: 2.49, y: 0.23, align: 'left', color: COLORS.red, size: 0.38, minPx: 8.5, bold: false },
  ],
};

export function getScene(view: ViewId): SceneDef {
  return view === 'map' ? MAP : view === 'A' ? ZONE_A : ZONE_B;
}

export const STROKE_HEX: Record<StrokeColor, string> = {
  green: COLORS.green,
  red: COLORS.red,
  yellow: COLORS.yellow,
  divider: COLORS.divider,
};

// ---------------------------------------------------------------------------
// Stroke -> line segments (port of Blender's create_arrow / get_quadratic_bezier)
// ---------------------------------------------------------------------------
export function quadraticBezier(p0: Pt, p1: Pt, p2: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return out;
}

export function strokeSegments(s: Stroke): [Pt, Pt][] {
  const path = s.kind === 'curve' ? quadraticBezier(s.points[0], s.points[1], s.points[2]) : s.points;
  const segs: [Pt, Pt][] = [];
  for (let i = 0; i < path.length - 1; i++) segs.push([path[i], path[i + 1]]);

  if (s.kind !== 'line') {
    const p1 = path[path.length - 2];
    const p2 = path[path.length - 1];
    let dx = p2[0] - p1[0];
    let dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      const w1: Pt = [p2[0] - dx * HEAD_LEN - dy * HEAD_WID, p2[1] - dy * HEAD_LEN + dx * HEAD_WID];
      const w2: Pt = [p2[0] - dx * HEAD_LEN + dy * HEAD_WID, p2[1] - dy * HEAD_LEN - dx * HEAD_WID];
      segs.push([p2, w1], [p2, w2]);
    }
  }
  return segs;
}

// ---------------------------------------------------------------------------
// Camera: orthographic, tilted `tilt` degrees from straight-down (0 = flat Figma look).
// Same maths is used for the three.js camera, the labels and tap detection.
// ---------------------------------------------------------------------------
export interface ViewFit {
  width: number;
  height: number;
  tilt: number;
  scale: number; // screen px per model unit (horizontal)
  cx: number; // model point the camera looks at (z = 0)
  cy: number;
  c: number; // cos(tilt)
  s: number; // sin(tilt)
  left: number; // ortho frustum, in camera-plane units, relative to (cx, cy)
  right: number;
  top: number;
  bottom: number;
}

export function fitView(scene: SceneDef, width: number, height: number, tiltDeg: number, padding = 0.08): ViewFit {
  const all = scene.plates.flatMap((p) => p.points);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const t = (tiltDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const p of scene.plates) {
    for (const [x, y] of p.points) {
      for (const z of [0, p.depth]) {
        const u = x - cx;
        const v = (y - cy) * c + z * s;
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
    }
  }
  const scale = Math.min((width * (1 - 2 * padding)) / (maxU - minU), (height * (1 - 2 * padding)) / (maxV - minV));
  const midU = (minU + maxU) / 2;
  const midV = (minV + maxV) / 2;
  const halfW = width / (2 * scale);
  const halfH = height / (2 * scale);
  return {
    width, height, tilt: tiltDeg, scale, cx, cy, c, s,
    left: midU - halfW, right: midU + halfW, top: midV + halfH, bottom: midV - halfH,
  };
}

/** Model point (x, y, z) -> pixel inside the view. */
export function project(fit: ViewFit, x: number, y: number, z = 0): Pt {
  const u = x - fit.cx;
  const v = (y - fit.cy) * fit.c + z * fit.s;
  return [(u - fit.left) * fit.scale, (fit.top - v) * fit.scale];
}

/** Pixel -> model (x, y) on the horizontal plane at height z. */
export function unproject(fit: ViewFit, px: number, py: number, z = 0): Pt | null {
  if (fit.c < 1e-3) return null;
  const u = fit.left + px / fit.scale;
  const v = fit.top - py / fit.scale;
  return [fit.cx + u, fit.cy + (v - z * fit.s) / fit.c];
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Which plate (if any) is under the pixel (px, py)? Used for taps on the map. */
export function pickPlate(fit: ViewFit, scene: SceneDef, px: number, py: number): PlateId | null {
  // 1) the visible top faces
  for (const plate of scene.plates) {
    const q = unproject(fit, px, py, plate.depth);
    if (q && pointInPolygon(q, plate.points)) return plate.id;
  }
  // 2) the side walls: on screen they sit over the footprint at z = 0
  for (const plate of scene.plates) {
    const q = unproject(fit, px, py, 0);
    if (q && pointInPolygon(q, plate.points)) return plate.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Labels -> screen positions (rendered as normal React Native <Text> over the GL view)
// ---------------------------------------------------------------------------
export interface LabelBox {
  text: string;
  x: number; // anchor pixel (left edge / right edge / centre depending on align)
  y: number; // baseline pixel
  align: Label['align'];
  color: string;
  fontPx: number;
  bold: boolean;
}

export function layoutLabels(fit: ViewFit, scene: SceneDef): LabelBox[] {
  const topZ = Math.max(...scene.plates.map((p) => p.depth));
  return scene.labels.map((l) => {
    const [x, y] = project(fit, l.x, l.y, topZ);
    return {
      text: l.text,
      x,
      y,
      align: l.align,
      color: l.color,
      fontPx: Math.max(l.minPx, l.size * fit.scale * 1.05),
      bold: l.bold,
    };
  });
}
