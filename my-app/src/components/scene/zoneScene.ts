/**
 * zoneScene.ts - the realistic aerial scenes for Zone A and Zone B.
 *
 * Built from the 12 reference photos: Zone B = the shaded, palm-covered lot beside the curved concrete steps
 * and the covered seating; Zone A = the sunny lot along the concrete wall with the bamboo clump, the pond
 * fence and the billboard. Positions are inferred from the photos (there is no survey), so every feature is a
 * plain coordinate in the LAYOUTS table below - nudge them freely.
 *
 * Coordinates are the same plan coordinates as the Blender floor plans (zoneModels.ts), 1 unit ~ 1.6 m.
 */
import {
  MeshBuilder, BuiltMesh, mulberry32, Rng, P2, tint, mix, pointInPoly, distToPath, distToPolyEdge, offsetPath,
} from './meshBuilder';
import * as P from './props';
import { getScene, strokeSegments, STROKE_HEX } from '../zoneModels';

export type ZoneId = 'A' | 'B';

// ------------------------------------------------------------------ layout types
type Feature =
  | { t: 'palm'; x: number; y: number; h: number }
  | { t: 'broad'; x: number; y: number; th: number; r: number; tone?: number; fruit?: boolean }
  | { t: 'fig'; x: number; y: number; th: number; r: number }
  | { t: 'bamboo'; x: number; y: number; r: number; h: number; culms?: number }
  | { t: 'shrub'; x: number; y: number; r: number; h?: number }
  | ({ t: 'building' } & P.BuildingSpec)
  | { t: 'wall'; path: P2[]; thick: number; h: number }
  | { t: 'pavilion'; cx: number; cy: number; w: number; d: number; h: number; rot: number; tables: number }
  | { t: 'billboard'; cx: number; cy: number; w: number; ph: number; lh: number; rot: number }
  | { t: 'fence'; path: P2[]; h: number }
  | { t: 'railing'; path: P2[]; h: number; z: number }
  | { t: 'pond'; poly: P2[] }
  | { t: 'lamp'; x: number; y: number; h: number; rot: number }
  | { t: 'sign'; x: number; y: number; z: number; rot: number; kind: P.SignKind }
  | { t: 'chair'; x: number; y: number; rot: number }
  | { t: 'bicycle'; x: number; y: number; rot: number; color: number }
  | { t: 'steps'; path: P2[]; from: number; n: number; tread: number; rise: number }
  | { t: 'slab'; poly: P2[]; z0: number; z1: number; color: number; top: number }
  | { t: 'curb'; path: P2[]; d0: number; d1: number; h: number };

interface Region {
  poly: P2[];
  angle: number; // degrees; direction the bikes point
  along?: number; // spacing between rows (along the heading)
  lateral?: number; // spacing between bikes inside a row
  flip?: boolean; // alternate rows face opposite ways (nose to nose / tail to tail)
}

interface Layout {
  plate: P2[];
  lane: P2[]; // centre line of the one-way loop (entrance -> exit)
  laneHalf: number;
  keepClear: { path: P2[]; r: number }[];
  apron: [number, number, number, number];
  gaps: [number, number][]; // x-ranges where the sidewalk is open (lane entrance / exit)
  text: { entranceRight: number; exitLeft: number; dividerX: number; y: number; h: number };
  view: { cx: number; cy: number; r: number };
  features: Feature[];
  regions: Region[];
  seed: number;
  lawn: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

// ------------------------------------------------------------------ smoothing helper (curved steps)
function chaikin(path: P2[], iterations: number): P2[] {
  let p = path;
  for (let it = 0; it < iterations; it++) {
    const q: P2[] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

// ------------------------------------------------------------------ LAYOUT: ZONE A (photos 7-12)
// plate: [(0.24,0),(5.23,0.08),(5.15,4.73),(10.07,6.96),(6.72,20),(0,18.9)]
const WALL_A = offsetPath([[0, 18.9], [6.72, 20], [10.07, 6.96]], 0.35);
const WALL_A_DIR = Math.atan2(6.96 - 20, 10.07 - 6.72); // along the right wall, pointing south
const PINK = { cx: 11.6, cy: 13.6 };

const LAYOUT_A: Layout = {
  plate: getScene('A').plates[0].points as P2[],
  lane: [
    [1.54, 0], [1.54, 16.3], [2.0, 17.4], [3.3, 18.2], [4.78, 17.7], [5.44, 16.5], [6.0, 14.1], [6.59, 12.1],
    [6.85, 9.7], [6.99, 7.2], [4.73, 6.07], [3.9, 4.25], [3.94, 1.7], [3.94, 0],
  ],
  laneHalf: 0.56,
  keepClear: [{ path: [[3.63, 16.95], [5.04, 7.91]], r: 0.22 }],
  apron: [-10, -7.5, 17.5, 25],
  gaps: [[0.85, 2.25], [3.3, 4.6]],
  text: { entranceRight: 3.0, exitLeft: 3.5, dividerX: 3.25, y: -3.3, h: 0.7 },
  view: { cx: 4.6, cy: 9.2, r: 12.4 },
  seed: 1011,
  lawn: 0x6f8f4c,
  features: [
    // --- perimeter concrete wall (top + right) and the low curb to Zone B
    { t: 'wall', path: WALL_A, thick: 0.3, h: 1.5 },
    { t: 'curb', path: [[5.23, 0.08], [5.15, 4.73], [10.07, 6.96]], d0: -0.32, d1: -0.08, h: 0.12 },
    // --- the pink 7-storey building behind the wall, the billboard frame, the white building by the pond
    { t: 'building', cx: PINK.cx, cy: PINK.cy, w: 11.5, d: 4.4, h: 13.5, rot: WALL_A_DIR, wall: 0xdf6f82, glass: 0x2f3f58, floors: 8, slab: 0xf2e9e4, roof: 0xc95a6d },
    { t: 'building', cx: -8.2, cy: 19.5, w: 6, d: 5, h: 9, wall: 0xe8e8e3, glass: 0x2e6fb5, floors: 5, slab: 0xf6f6f2 },
    { t: 'billboard', cx: 2.6, cy: 21.8, w: 3.8, ph: 1.9, lh: 2.5, rot: 0 },
    // --- pond with the black / white striped fence, bicycles leaning on it, the plastic chair
    { t: 'pond', poly: [[-8.6, 5.2], [-2.6, 4.4], [-1.5, 8.2], [-1.6, 12.8], [-6.2, 13.6], [-8.9, 10]] },
    { t: 'fence', path: [[-0.75, 4.3], [-0.65, 8.6], [-0.75, 13.8]], h: 0.75 },
    { t: 'bicycle', x: -0.32, y: 6.4, rot: rad(95), color: 0xb7bcc2 },
    { t: 'bicycle', x: -0.3, y: 8.1, rot: rad(80), color: 0x2a3a5a },
    { t: 'bicycle', x: -0.32, y: 10.0, rot: rad(92), color: 0x2f3338 },
    { t: 'chair', x: -0.2, y: 12.4, rot: rad(200) },
    // --- the bamboo clump with the "DO NOT LOCK YOUR STEERING" notice
    { t: 'bamboo', x: 3.05, y: 12.5, r: 0.85, h: 5.2, culms: 46 },
    { t: 'sign', x: 3.05, y: 11.62, z: 0.95, rot: 0, kind: 'nolock' },
    { t: 'bamboo', x: -0.9, y: 15.6, r: 0.55, h: 4.3, culms: 26 },
    // --- palms, shade trees, hedge
    { t: 'palm', x: -1.0, y: 2.7, h: 4.6 },
    { t: 'palm', x: -1.1, y: 16.9, h: 5.0 },
    { t: 'palm', x: 0.3, y: 19.4, h: 4.2 },
    { t: 'palm', x: 9.6, y: 5.3, h: 4.8 },
    { t: 'broad', x: 5.9, y: 20.2, th: 2.6, r: 1.5 },
    { t: 'broad', x: 9.1, y: 15.2, th: 2.6, r: 1.6, tone: 1.05 },
    { t: 'broad', x: -3.6, y: 17.2, th: 2.3, r: 1.7 },
    { t: 'broad', x: 2.9, y: 6.8, th: 2.2, r: 1.1, tone: 1.1 },
    { t: 'shrub', x: -0.9, y: 18.6, r: 1.0 },
    { t: 'shrub', x: 1.4, y: 19.9, r: 0.9 },
    { t: 'shrub', x: 4.2, y: 20.6, r: 0.9 },
    { t: 'shrub', x: -2.0, y: 14.6, r: 0.9 },
    { t: 'lamp', x: 5.6, y: 3.2, h: 3.4, rot: rad(200) },
  ],
  regions: [
    { poly: [[5.9, 6.4], [10.3, 6.9], [7.0, 20.2], [5.4, 20.2]], angle: 14.4, along: 1.4, flip: false }, // facing the wall
    { poly: [[0, 16.2], [7, 16.2], [7, 20.3], [0, 20.3]], angle: 90, along: 1.4 },
    { poly: [[1.9, 1.3], [5.1, 1.3], [5.1, 17.2], [1.9, 17.2]], angle: 0, along: 1.4, flip: true },
    { poly: [[-0.1, 1.2], [1.2, 1.2], [1.2, 19.0], [-0.1, 19.0]], angle: 90, along: 1.4 },
    { poly: [[4.9, 4.6], [10.3, 6.9], [10.3, 7.6], [4.9, 7.6]], angle: 24, along: 1.4 },
    { poly: [[4.2, 1.1], [5.3, 1.1], [5.3, 4.8], [4.2, 4.8]], angle: 90, along: 1.4 },
  ],
};

// ------------------------------------------------------------------ LAYOUT: ZONE B (photos 1-6)
// plate: [(0.06,0),(9.68,0.09),(12.65,6.97),(9.54,12.65),(2.86,13.86),(4.17,6.85),(0,4.59)]
const STEP_PATH = chaikin([[0, 4.59], [4.17, 6.85], [2.86, 13.86]], 2);
const STEP_MID = STEP_PATH[Math.floor(STEP_PATH.length * 0.62)];

const LAYOUT_B: Layout = {
  plate: getScene('B').plates[0].points as P2[],
  lane: [
    [1.47, 0], [1.47, 3.37], [2.49, 4.08], [4.52, 5.49], [6.19, 6.46], [5.85, 7.8], [5.6, 10.2], [6.43, 12.2],
    [7.92, 11.26], [9.24, 9.29], [9.8, 6.85], [9.5, 5.14], [7.99, 3.11], [6.55, 2.1], [4.24, 1.01], [3.2, 0],
  ],
  laneHalf: 0.5,
  keepClear: [{ path: [[6.99, 10.04], [7.87, 5.98], [4.91, 2.93]], r: 0.22 }],
  apron: [-9.5, -7.5, 20, 27],
  gaps: [[0.8, 2.15], [2.6, 3.8]],
  text: { entranceRight: 2.0, exitLeft: 2.7, dividerX: 2.35, y: -3.3, h: 0.7 },
  view: { cx: 6.2, cy: 7.6, r: 10.8 },
  seed: 2027,
  lawn: 0x6a8b49,
  features: [
    // --- curved concrete amphitheatre steps in the notch, retaining wall, planter with the fruit tree
    { t: 'steps', path: STEP_PATH, from: 0.14, n: 4, tread: 0.74, rise: 0.14 },
    { t: 'curb', path: STEP_PATH, d0: 3.25, d1: 3.55, h: 0.55 },
    { t: 'broad', x: STEP_MID[0] - 4.5, y: STEP_MID[1] - 0.2, th: 1.8, r: 1.5, fruit: true },
    // --- raised walkway with the black railing, the two covered seating areas, the blue-glass buildings
    { t: 'slab', poly: [[-3.2, 14.3], [3.2, 15.2], [3.2, 17.2], [-3.2, 16.4]], z0: 0, z1: 0.5, color: 0xa7a49b, top: 0xbdbab1 },
    { t: 'railing', path: [[-3.2, 14.3], [3.2, 15.2]], h: 0.7, z: 0.5 },
    { t: 'pavilion', cx: 6.4, cy: 16.5, w: 5.8, d: 3.1, h: 2.2, rot: -0.05, tables: 3 },
    { t: 'pavilion', cx: 12.2, cy: 15.6, w: 4.6, d: 2.8, h: 2.2, rot: 0.3, tables: 2 },
    { t: 'building', cx: 2.6, cy: 24.5, w: 9, d: 5, h: 15, wall: 0xcdd7e2, glass: 0x2e6fb5, floors: 9, slab: 0xeef2f6 },
    { t: 'building', cx: 14.8, cy: 22, w: 6.5, d: 4.5, h: 12, rot: -0.2, wall: 0xd9dee5, glass: 0x2a5fa3, floors: 7, slab: 0xf0f3f6 },
    { t: 'building', cx: 17.4, cy: 6.8, w: 3.6, d: 9, h: 3.4, wall: 0xe8e6e0, glass: 0x3b4f6b, floors: 1, roof: 0x2a5cab },
    // --- lamp post, signs, bicycles
    { t: 'lamp', x: 3.1, y: 11.3, h: 3.6, rot: rad(190) },
    { t: 'bicycle', x: 0.45, y: 2.1, rot: rad(92), color: 0x2f6fb0 },
    { t: 'bicycle', x: 0.5, y: 3.5, rot: rad(88), color: 0xb7bcc2 },
    // --- palms (the "THIS WAY" arrow and the "MOTORCYCLE PARKING FOR STUDENTS" board are tied to trunks)
    { t: 'palm', x: 3.4, y: 3.3, h: 4.2 },
    { t: 'sign', x: 3.4, y: 3.14, z: 1.1, rot: 0, kind: 'thisway' },
    { t: 'palm', x: 10.7, y: 10.4, h: 5.0 },
    { t: 'sign', x: 10.7, y: 10.24, z: 1.1, rot: 0, kind: 'student' },
    { t: 'palm', x: 0.4, y: 2.9, h: 4.6 },
    { t: 'palm', x: 8.9, y: 13.7, h: 5.4 },
    { t: 'palm', x: 12.9, y: 2.2, h: 4.4 },
    { t: 'fig', x: 4.65, y: 9.4, th: 1.9, r: 1.5 },
    { t: 'broad', x: 11.7, y: 11.9, th: 2.6, r: 1.6 },
    { t: 'broad', x: 14.6, y: 0.2, th: 2.4, r: 1.5, tone: 1.05 },
    { t: 'broad', x: -2.4, y: 2.0, th: 2.5, r: 1.6 },
    { t: 'shrub', x: 13.6, y: 6.2, r: 1.0 },
    { t: 'shrub', x: 11.3, y: 14.2, r: 0.9 },
  ],
  regions: [
    { poly: [[8.0, 7.4], [12.8, 7.0], [9.7, 12.9], [8.0, 12.6]], angle: 28.7, along: 1.4, flip: false },
    { poly: [[4.6, 0.3], [9.9, 0.3], [12.8, 7.0], [8.2, 7.4], [5.2, 3.2]], angle: -23.4, along: 1.4, flip: false },
    { poly: [[3.6, 7.8], [8.2, 7.8], [8.2, 12.8], [3.4, 13.9]], angle: 0, along: 1.4, flip: true },
    { poly: [[0.0, 0.8], [1.15, 0.8], [1.15, 4.7], [0.0, 4.7]], angle: 90, along: 1.4 },
    { poly: [[2.1, 0.9], [4.6, 0.9], [4.6, 3.1], [2.1, 3.1]], angle: 90, along: 1.4 },
    { poly: [[2.4, 5.0], [6.0, 5.0], [6.0, 7.8], [2.4, 7.8]], angle: 60, along: 1.4, flip: true },
    { poly: [[4.6, 2.0], [8.4, 2.0], [8.4, 6.2], [4.6, 6.2]], angle: 38, along: 1.4, flip: true }, // inside the loop, low
    { poly: [[5.3, 5.0], [9.3, 5.0], [9.3, 11.8], [5.3, 11.8]], angle: 82, along: 1.4 }, // inside the loop, high
  ],
};

export const LAYOUTS: Record<ZoneId, Layout> = { A: LAYOUT_A, B: LAYOUT_B };

// ------------------------------------------------------------------ rectangles (bike footprints) + collisions
interface Rect { x: number; y: number; l: number; w: number; h: number }
function corners(r: Rect): P2[] {
  const c = Math.cos(r.h), s = Math.sin(r.h), hl = r.l / 2, hw = r.w / 2;
  return ([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]] as P2[]).map(([u, v]) => [r.x + u * c - v * s, r.y + u * s + v * c] as P2);
}
export function rectsOverlap(a: Rect, b: Rect): boolean {
  const A = corners(a), B = corners(b);
  for (const ang of [a.h, a.h + Math.PI / 2, b.h, b.h + Math.PI / 2]) {
    const ax = Math.cos(ang), ay = Math.sin(ang);
    const pa = A.map((p) => p[0] * ax + p[1] * ay), pb = B.map((p) => p[0] * ax + p[1] * ay);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}
function rectCircle(r: Rect, cx: number, cy: number, rd: number): boolean {
  const c = Math.cos(-r.h), s = Math.sin(-r.h);
  const lx = (cx - r.x) * c - (cy - r.y) * s, ly = (cx - r.x) * s + (cy - r.y) * c;
  const dx = Math.max(Math.abs(lx) - r.l / 2, 0), dy = Math.max(Math.abs(ly) - r.w / 2, 0);
  return dx * dx + dy * dy < rd * rd;
}
function samples(r: Rect): P2[] {
  const k = corners(r);
  const mids = k.map((p, i) => [(p[0] + k[(i + 1) % 4][0]) / 2, (p[1] + k[(i + 1) % 4][1]) / 2] as P2);
  return [...k, ...mids, [r.x, r.y]];
}

interface Circle { x: number; y: number; r: number }
interface Obstacles { circles: Circle[]; rects: Rect[] }

function obstaclesOf(features: Feature[]): Obstacles {
  const circles: Circle[] = [], rects: Rect[] = [];
  for (const f of features) {
    if (f.t === 'palm') circles.push({ x: f.x, y: f.y, r: 0.3 });
    else if (f.t === 'broad') circles.push({ x: f.x, y: f.y, r: 0.32 });
    else if (f.t === 'fig') circles.push({ x: f.x, y: f.y, r: 0.7 });
    else if (f.t === 'bamboo') circles.push({ x: f.x, y: f.y, r: f.r * 1.05 });
    else if (f.t === 'lamp') circles.push({ x: f.x, y: f.y, r: 0.2 });
    else if (f.t === 'chair') circles.push({ x: f.x, y: f.y, r: 0.3 });
    else if (f.t === 'bicycle') rects.push({ x: f.x, y: f.y, l: 1.4, w: 0.5, h: f.rot });
  }
  return { circles, rects };
}

// ------------------------------------------------------------------ bike placement
export interface BikeSlot extends P.BikeSpec {
  rect: Rect;
}

function validBike(r: Rect, L: Layout, obs: Obstacles, placed: BikeSlot[]): boolean {
  for (const p of samples(r)) {
    if (!pointInPoly(p, L.plate) || distToPolyEdge(p, L.plate) < 0.09) return false;
    if (distToPath(p, L.lane) < L.laneHalf) return false;
    for (const k of L.keepClear) if (distToPath(p, k.path) < k.r) return false;
  }
  for (const c of obs.circles) if (rectCircle(r, c.x, c.y, c.r)) return false;
  for (const o of obs.rects) if (rectsOverlap(r, o)) return false;
  for (const b of placed) {
    if (Math.abs(b.rect.x - r.x) > 1.5 || Math.abs(b.rect.y - r.y) > 1.5) continue;
    if (rectsOverlap(r, b.rect)) return false;
  }
  return true;
}

/** Fill one region with a grid of bikes; `so` / `to` shift the grid so we can search for the best fit. */
function fillRegion(reg: Region, so: number, to: number, seed: number, L: Layout, obs: Obstacles, base: BikeSlot[]): BikeSlot[] {
  const rng = mulberry32(seed);
  const ang = rad(reg.angle);
  const dir: P2 = [Math.cos(ang), Math.sin(ang)], perp: P2 = [-Math.sin(ang), Math.cos(ang)];
  const along = reg.along ?? 1.4, lat = reg.lateral ?? 0.56;
  let smin = Infinity, smax = -Infinity, tmin = Infinity, tmax = -Infinity;
  for (const v of reg.poly) {
    const s = v[0] * dir[0] + v[1] * dir[1], t = v[0] * perp[0] + v[1] * perp[1];
    smin = Math.min(smin, s); smax = Math.max(smax, s); tmin = Math.min(tmin, t); tmax = Math.max(tmax, t);
  }
  const placed: BikeSlot[] = [];
  const all = () => (placed.length ? base.concat(placed) : base);
  let row = 0;
  for (let s = smin + along * 0.35 + so; s <= smax - along * 0.1; s += along, row++) {
    const flip = reg.flip && row % 2 === 1;
    let t = tmin + to;
    while (t <= tmax) {
      const js = (rng() - 0.5) * 0.1, jt = (rng() - 0.5) * 0.04, jh = (rng() - 0.5) * 0.12;
      const cx = (s + js) * dir[0] + (t + jt) * perp[0], cy = (s + js) * dir[1] + (t + jt) * perp[1];
      const rect: Rect = { x: cx, y: cy, l: 1.2, w: 0.46, h: ang + (flip ? Math.PI : 0) + jh };
      if (pointInPoly([cx, cy], reg.poly) && validBike(rect, L, obs, all())) {
        const kr = rng();
        placed.push({
          x: cx, y: cy, heading: rect.h,
          kind: kr < 0.5 ? 'scooter' : kr < 0.82 ? 'sport' : 'adv',
          color: P.BIKE_PALETTE[Math.floor(rng() * P.BIKE_PALETTE.length)],
          helmet: rng() < 0.55 ? P.HELMET_PALETTE[Math.floor(rng() * P.HELMET_PALETTE.length)] : null,
          topBox: rng() < 0.18,
          rect,
        });
        t += lat;
      } else t += 0.07;
    }
  }
  return placed;
}

export function placeBikes(zone: ZoneId): BikeSlot[] {
  const L = LAYOUTS[zone];
  const obs = obstaclesOf(L.features);
  const placed: BikeSlot[] = [];
  L.regions.forEach((reg, ri) => {
    const along = reg.along ?? 1.4, lat = reg.lateral ?? 0.56;
    let best: BikeSlot[] = [];
    // try a handful of grid offsets and keep the one that fits the most bikes
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const cand = fillRegion(reg, (i / 6) * along, (j / 4) * lat, L.seed + ri * 131, L, obs, placed);
        if (cand.length > best.length) best = cand;
      }
    }
    placed.push(...best);
  });
  return placed;
}

// ------------------------------------------------------------------ ground: soft noise + baked shadows
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// sun shift per unit of height: shadows fall towards the north-east
const SHX = 0.27, SHY = 0.33;
interface Caster { kind: 'ell'; x: number; y: number; rx: number; ry: number; rot: number; k: number }
interface HullCaster { kind: 'hull'; pts: P2[]; k: number }
type AnyCaster = Caster | HullCaster;

function hull(points: P2[]): P2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function sdPoly(p: P2, poly: P2[]): number {
  return (pointInPoly(p, poly) ? 1 : -1) * distToPolyEdge(p, poly);
}

function shadowCasters(features: Feature[]): AnyCaster[] {
  const out: AnyCaster[] = [];
  const dirAng = Math.atan2(SHY, SHX);
  for (const f of features) {
    if (f.t === 'palm') out.push({ kind: 'ell', x: f.x + SHX * f.h, y: f.y + SHY * f.h, rx: 1.5, ry: 1.05, rot: dirAng, k: 0.55 });
    else if (f.t === 'broad' || f.t === 'fig') {
      const hh = f.th + f.r * 0.55;
      out.push({ kind: 'ell', x: f.x + SHX * hh, y: f.y + SHY * hh, rx: f.r * 1.25, ry: f.r * 1.0, rot: dirAng, k: 0.66 });
    } else if (f.t === 'bamboo') out.push({ kind: 'ell', x: f.x + SHX * f.h * 0.55, y: f.y + SHY * f.h * 0.55, rx: f.r * 2.0, ry: f.r * 1.6, rot: dirAng, k: 0.62 });
    else if (f.t === 'pavilion') {
      const c = Math.cos(f.rot), s = Math.sin(f.rot);
      const pts: P2[] = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as P2[]).map(([u, v]) => [f.cx + (u * (f.w / 2 + 0.25)) * c - (v * (f.d / 2 + 0.25)) * s, f.cy + (u * (f.w / 2 + 0.25)) * s + (v * (f.d / 2 + 0.25)) * c] as P2);
      out.push({ kind: 'hull', pts: hull([...pts, ...pts.map((p) => [p[0] + SHX * f.h, p[1] + SHY * f.h] as P2)]), k: 0.5 });
    } else if (f.t === 'billboard') {
      const hh = f.lh + f.ph;
      const pts: P2[] = [[f.cx - f.w / 2, f.cy - 0.1], [f.cx + f.w / 2, f.cy - 0.1], [f.cx + f.w / 2, f.cy + 0.1], [f.cx - f.w / 2, f.cy + 0.1]];
      out.push({ kind: 'hull', pts: hull([...pts, ...pts.map((p) => [p[0] + SHX * hh, p[1] + SHY * hh] as P2)]), k: 0.5 });
    } else if (f.t === 'wall') {
      for (let i = 0; i < f.path.length - 1; i++) {
        const a = f.path[i], b = f.path[i + 1];
        const pts: P2[] = [a, b];
        out.push({ kind: 'hull', pts: hull([...pts, ...pts.map((p) => [p[0] + SHX * f.h, p[1] + SHY * f.h] as P2), [a[0] + 0.02, a[1]], [b[0] + 0.02, b[1]]]), k: 0.4 });
      }
    }
  }
  return out;
}

function shadowAt(x: number, y: number, casters: AnyCaster[]): number {
  let s = 0;
  for (const c of casters) {
    let v = 0;
    if (c.kind === 'ell') {
      const dx = x - c.x, dy = y - c.y;
      if (Math.abs(dx) > c.rx * 1.3 || Math.abs(dy) > c.rx * 1.3) continue;
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      const u = (dx * cs + dy * sn) / c.rx, w = (-dx * sn + dy * cs) / c.ry;
      v = (1 - smooth(0.55, 1.1, Math.hypot(u, w))) * c.k;
    } else {
      v = smooth(-0.18, 0.18, sdPoly([x, y], c.pts)) * c.k;
    }
    s = Math.max(s, v);
  }
  return s;
}

function dirt(x: number, y: number, seed: number): number {
  const n1 = vnoise(x * 0.55, y * 0.55, seed), n2 = vnoise(x * 1.9 + 7, y * 1.9 + 3, seed + 5);
  const k = (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.5;
  const base = 0x9b7d5c;
  return k > 0 ? mix(base, 0xb7a07c, Math.min(1, k * 1.6)) : mix(base, 0x7c6347, Math.min(1, -k * 1.8));
}
function lawn(x: number, y: number, seed: number, base: number): number {
  const n = vnoise(x * 0.35, y * 0.35, seed + 11) - 0.5 + (vnoise(x * 1.4, y * 1.4, seed + 3) - 0.5) * 0.5;
  return n > 0 ? mix(base, 0x88a65b, Math.min(1, n * 1.8)) : mix(base, 0x587a3c, Math.min(1, -n * 1.8));
}

// ------------------------------------------------------------------ painted markings
const FONT_W = 0.62; // letter width / height
function glyph(ch: string): P2[][] {
  const W = 1, H = 1;
  switch (ch) {
    case 'E': return [[[W, H], [0, H], [0, 0], [W, 0]], [[0, H / 2], [W * 0.8, H / 2]]];
    case 'N': return [[[0, 0], [0, H], [W, 0], [W, H]]];
    case 'T': return [[[0, H], [W, H]], [[W / 2, H], [W / 2, 0]]];
    case 'R': return [[[0, 0], [0, H], [W, H], [W, H * 0.55], [0, H * 0.5]], [[W * 0.4, H * 0.5], [W, 0]]];
    case 'A': return [[[0, 0], [W / 2, H], [W, 0]], [[W * 0.2, H * 0.4], [W * 0.8, H * 0.4]]];
    case 'C': return [[[W, H], [0, H], [0, 0], [W, 0]]];
    case 'X': return [[[0, 0], [W, H]], [[0, H], [W, 0]]];
    case 'I': return [[[W / 2, 0], [W / 2, H]], [[W * 0.15, H], [W * 0.85, H]], [[W * 0.15, 0], [W * 0.85, 0]]];
    default: return [];
  }
}
function textWidth(text: string, h: number): number {
  return text.length * (FONT_W * h + 0.16 * h) - 0.16 * h;
}
function paintText(b: MeshBuilder, text: string, x: number, y: number, h: number, color: number, z: number, align: 'left' | 'right') {
  const w = FONT_W * h, gap = 0.16 * h;
  const total = textWidth(text, h);
  let cx = align === 'left' ? x : x - total;
  for (const ch of text) {
    for (const stroke of glyph(ch)) {
      b.ribbon(stroke.map(([u, v]) => [cx + u * w, y + v * h] as P2), h * 0.15, z, color);
      // round the joints a little so the strokes do not show gaps
      for (const [u, v] of stroke) b.disc(cx + u * w, y + v * h, z, h * 0.075, h * 0.075, 0, color, 6);
    }
    cx += w + gap;
  }
}

// ------------------------------------------------------------------ drawing of features
function drawFeature(b: MeshBuilder, f: Feature, rng: Rng) {
  switch (f.t) {
    case 'palm': P.palm(b, rng, f.x, f.y, f.h); break;
    case 'broad':
      P.broadleaf(b, rng, f.x, f.y, f.th, f.r, f.tone ?? 1);
      if (f.fruit) {
        for (let i = 0; i < 5; i++) {
          const a = rng() * Math.PI * 2, d = f.r * (0.2 + rng() * 0.5);
          b.ellipsoid(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, f.th + f.r * (0.1 + rng() * 0.4), 0.12, 0.12, 0.12, 0xa9c34a, 5, 3);
        }
      }
      break;
    case 'fig': P.fig(b, rng, f.x, f.y, f.th, f.r); break;
    case 'bamboo': P.bamboo(b, rng, f.x, f.y, f.r, f.h, f.culms ?? 40); break;
    case 'shrub': P.shrub(b, rng, f.x, f.y, f.r, f.h ?? 0.7); break;
    case 'building': P.building(b, f); break;
    case 'wall': P.wallAlong(b, f.path, f.thick, f.h); break;
    case 'pavilion': P.pavilion(b, f.cx, f.cy, f.w, f.d, f.h, f.rot, f.tables); break;
    case 'billboard': P.billboard(b, f.cx, f.cy, f.w, f.ph, f.lh, f.rot); break;
    case 'fence': P.stripedFence(b, f.path, f.h); break;
    case 'railing': {
      for (let i = 0; i < f.path.length - 1; i++) {
        const [x0, y0] = f.path[i], [x1, y1] = f.path[i + 1];
        const L = Math.hypot(x1 - x0, y1 - y0);
        b.tube([x0, y0, f.z + f.h], [x1, y1, f.z + f.h], 0.03, 0.03, 4, 0x15171a);
        b.tube([x0, y0, f.z + f.h * 0.5], [x1, y1, f.z + f.h * 0.5], 0.02, 0.02, 4, 0x15171a);
        for (let t = 0; t <= L + 1e-6; t += 0.9) {
          const u = t / L;
          b.tube([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, f.z], [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, f.z + f.h], 0.03, 0.03, 4, 0x15171a);
        }
      }
      break;
    }
    case 'pond': P.pond(b, f.poly); break;
    case 'lamp': P.lamp(b, f.x, f.y, f.h, f.rot); break;
    case 'sign': P.sign(b, f.x, f.y, f.z, f.rot, f.kind); break;
    case 'chair': P.plasticChair(b, f.x, f.y, f.rot); break;
    case 'bicycle': P.bicycle(b, f.x, f.y, f.rot, f.color); break;
    case 'steps': P.stepsAlong(b, f.path, f.from, f.n, f.tread, f.rise); break;
    case 'slab': b.prism(f.poly, f.z0, f.z1, f.color, f.top); break;
    case 'curb': b.band(f.path, f.d0, f.d1, 0, f.h, 0xb9b6ac, 0xcfccc2); break;
  }
}

// ------------------------------------------------------------------ the scene
export interface ZoneSceneResult {
  mesh: BuiltMesh;
  view: { cx: number; cy: number; r: number };
  plate: P2[];
  stats: { bikes: number; slots: number; triangles: number };
}

const bbox = (poly: P2[]) => {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

export function buildZoneScene(zone: ZoneId, occupancy = 0.9): ZoneSceneResult {
  const L = LAYOUTS[zone];
  const rng = mulberry32(L.seed + 99);
  const b = new MeshBuilder();
  const [ax0, ay0, ax1, ay1] = L.apron;
  const casters = shadowCasters(L.features);

  // --- base tile (the diorama): soil sides + lawn top
  b.prism([[ax0, ay0], [ax1, ay0], [ax1, ay1], [ax0, ay1]], -0.7, 0, 0x5b4733, L.lawn);

  // --- road + sidewalk in front of the entrance
  b.poly([[ax0, -7.5], [ax1, -7.5], [ax1, -1.6], [ax0, -1.6]], 0.012, 0x45474c);
  for (let x = ax0 + 0.5; x < ax1 - 1; x += 2.4) b.ribbon([[x, -4.55], [x + 1.2, -4.55]], 0.12, 0.02, 0xe4e1d6);
  const sw = (x0: number, x1: number) => b.prism([[x0, -1.55], [x1, -1.55], [x1, 0], [x0, 0]], 0, 0.08, 0xa6a39a, 0xbebbb1);
  let cur = ax0;
  for (const [g0, g1] of L.gaps) { if (g0 > cur) sw(cur, g0); b.poly([[g0, -1.55], [g1, -1.55], [g1, 0], [g0, 0]], 0.025, 0xbebbb1); cur = g1; }
  sw(cur, ax1);

  // --- lawn mottling (cells outside the plate, road and sidewalk)
  const plate = L.plate;
  const pb = bbox(plate);
  const LC = 0.55;
  for (let x = ax0; x < ax1 - 1e-6; x += LC) {
    for (let y = -1.55; y < ay1 - 1e-6; y += LC) {
      const cx = x + LC / 2, cy = y + LC / 2;
      if (cy < 0.05) continue;
      const nearPlate = cx > pb.x0 - 0.4 && cx < pb.x1 + 0.4 && cy > pb.y0 - 0.4 && cy < pb.y1 + 0.4;
      if (nearPlate && (pointInPoly([cx, cy], plate) || distToPolyEdge([cx, cy], plate) < 0.5)) continue;
      const s = shadowAt(cx, cy, casters);
      const col = mix(lawn(cx, cy, L.seed, L.lawn), tint(lawn(cx, cy, L.seed, L.lawn), 0.6), s);
      b.poly([[x, y], [x + LC, y], [x + LC, y + LC], [x, y + LC]], 0.006, col);
    }
  }

  // --- the parking plate: dirt, dappled shade, tracks, litter
  b.poly(plate, 0.01, 0x9b7d5c);
  const DC = 0.3;
  for (let x = pb.x0 - 0.2; x < pb.x1; x += DC) {
    for (let y = pb.y0 - 0.2; y < pb.y1; y += DC) {
      const cs: P2[] = [[x, y], [x + DC, y], [x + DC, y + DC], [x, y + DC]];
      if (!cs.every((p) => pointInPoly(p, plate))) continue;
      const cx = x + DC / 2, cy = y + DC / 2;
      let s = shadowAt(cx, cy, casters);
      if (s > 0) { // sun dapples inside the shade
        const dap = vnoise(cx * 2.1, cy * 2.1, L.seed + 9) * 0.6 + vnoise(cx * 4.3, cy * 4.3, L.seed + 4) * 0.4;
        s *= 1 - smooth(0.58, 0.78, dap) * 0.7;
      }
      const base = dirt(cx, cy, L.seed);
      const jit = 1 + (hash2(Math.floor(cx * 50), Math.floor(cy * 50), L.seed) - 0.5) * 0.07;
      b.poly(cs, 0.0115, tint(mix(base, tint(base, 0.6), s), jit));
    }
  }
  // worn tracks along the loop
  for (const off of [-0.22, 0.22]) {
    const edge = offsetPath(L.lane, off);
    for (let i = 0; i < edge.length - 1; i++) {
      if (!pointInPoly([(edge[i][0] + edge[i + 1][0]) / 2, (edge[i][1] + edge[i + 1][1]) / 2], plate)) continue;
      b.ribbon([edge[i], edge[i + 1]], 0.2, 0.0125, 0xb6a07f);
    }
  }
  // leaf litter
  for (let i = 0; i < 170; i++) {
    const x = pb.x0 + rng() * (pb.x1 - pb.x0), y = pb.y0 + rng() * (pb.y1 - pb.y0);
    if (!pointInPoly([x, y], plate) || distToPolyEdge([x, y], plate) < 0.15) continue;
    const r = 0.05 + rng() * 0.07, a = rng() * Math.PI;
    const col = [0x6b5436, 0x8a6f3a, 0x7a7a3a, 0x5a4a30, 0xa08a52][Math.floor(rng() * 5)];
    b.disc(x, y, 0.0135, r * 1.4, r, a, col, 5);
  }

  // --- painted guidance: the Figma arrows + yellow median, laid flat on the dirt
  for (const s of getScene(zone).strokes) {
    if (s.color === 'divider') continue;
    if (s.kind === 'line' && s.color === 'yellow' && s.radius < 0.07 && s.points.length === 2 && Math.hypot(s.points[1][0] - s.points[0][0], s.points[1][1] - s.points[0][1]) < 1.3) continue;
    const w = s.color === 'yellow' ? 0.11 : 0.16;
    const rgb = STROKE_HEX[s.color];
    const hex = parseInt(rgb.slice(1), 16);
    for (const [a, c] of strokeSegments(s)) {
      b.ribbon([a, c], w, 0.016, hex);
      b.disc(a[0], a[1], 0.016, w / 2, w / 2, 0, hex, 6);
      b.disc(c[0], c[1], 0.016, w / 2, w / 2, 0, hex, 6);
    }
  }

  // --- the entrance / exit markings on the road in front of the zone
  const T = L.text;
  paintText(b, 'ENTRANCE', T.entranceRight, T.y, T.h, 0x4ede9b, 0.03, 'right');
  paintText(b, 'EXIT', T.exitLeft, T.y, T.h, 0xe0463f, 0.03, 'left');
  b.ribbon([[T.dividerX, T.y - 0.15], [T.dividerX, T.y + T.h + 0.15]], 0.1, 0.03, 0xf1efe6);

  // --- all scenery
  for (const f of L.features) drawFeature(b, f, rng);

  // --- parked motorcycles (occupancy decides how many of the slots are filled)
  const slots = placeBikes(zone);
  const order = slots.map((_, i) => i);
  const sr = mulberry32(L.seed + 1234);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(sr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const n = Math.max(0, Math.min(slots.length, Math.round(occupancy * slots.length)));
  const shown = new Set(order.slice(0, n));
  slots.forEach((s, i) => {
    if (!shown.has(i)) return;
    b.disc(s.x + 0.07, s.y + 0.08, 0.017, 0.68, 0.22, s.heading, 0x5c4833, 12); // contact shadow
    P.motorcycle(b, s);
  });

  const mesh = b.build();
  return { mesh, view: L.view, plate: L.plate, stats: { bikes: n, slots: slots.length, triangles: mesh.triangles } };
}

/** quick helper used by the preview + tests */
export function sceneMesh(zone: ZoneId, occupancy: number): BuiltMesh {
  return buildZoneScene(zone, occupancy).mesh;
}
