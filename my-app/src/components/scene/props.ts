/**
 * props.ts - every object that appears in the Park-IT zone scenes, built from simple low-poly parts.
 * All functions draw into a MeshBuilder in world coordinates (x east, y north, z up, 1 unit ~ 1.6 m).
 */
import { MeshBuilder, Rng, P2, V3, tint, mix } from './meshBuilder';

// ------------------------------------------------------------------ motorcycles
export const BIKE_LEN = 1.25; // ~2.0 m
export const BIKE_WID = 0.5; // handlebar width incl. mirrors ~0.8 m

export type BikeKind = 'scooter' | 'sport' | 'adv';
export interface BikeSpec {
  x: number;
  y: number;
  heading: number; // radians, direction the front wheel points
  kind: BikeKind;
  color: number;
  helmet: number | null;
  topBox: boolean;
}

/** colours seen in the photos: lots of black, then red, white, blue, orange, silver, yellow */
export const BIKE_PALETTE = [
  0x1b1c1f, 0x1b1c1f, 0x1b1c1f, 0x1b1c1f, 0x222428, 0x222428, 0x1b1c1f,
  0xc4232b, 0xc4232b, 0xb01d24,
  0xe6e8ea, 0xdfe2e5,
  0x2c5aa8, 0x1f4a99,
  0xe07a1f, 0xd9d9d6, 0x8e949b, 0xe4c21b, 0x3d4349,
];
export const HELMET_PALETTE = [0x141414, 0x141414, 0xf2f2f2, 0xf2f2f2, 0xc62828, 0xf2c200, 0xd86b9a, 0x6f59c9, 0x3a3f45, 0x2b6cb0];

const TIRE = 0x141414;
const RIM = 0x9aa0a6;
const SEAT = 0x17181b;
const PLASTIC = 0x2b2e33;
const CHROME = 0x80858b;

function wheel(b: MeshBuilder, x: number, r: number) {
  b.tube([x, -0.05, r], [x, 0.05, r], r, r, 10, TIRE);
  b.tube([x, -0.057, r], [x, 0.057, r], r * 0.58, r * 0.58, 8, RIM);
}

export function motorcycle(b: MeshBuilder, s: BikeSpec) {
  const R = 0.185;
  const body = s.color;
  const bodyDark = tint(body, 0.78);
  b.push(s.x, s.y, 0, s.heading);

  wheel(b, -0.4, R);
  wheel(b, 0.4, R);

  if (s.kind === 'sport') {
    // underbone / sport (Raider, Sniper style): exposed engine, tank, long thin seat
    b.box(-0.02, 0, 0.14, 0.36, 0.24, 0.27, 0, PLASTIC); // engine block
    b.box(0.1, 0, 0.4, 0.38, 0.27, 0.22, 0, body, tint(body, 1.08)); // tank
    b.box(-0.28, 0, 0.5, 0.52, 0.25, 0.07, 0, SEAT); // seat
    b.box(-0.52, 0, 0.5, 0.22, 0.21, 0.11, 0, body, bodyDark); // tail cowl
    b.box(0.37, 0, 0.47, 0.15, 0.28, 0.25, 0, body, tint(body, 1.1)); // headlight fairing
    b.box(0.445, 0, 0.55, 0.02, 0.2, 0.08, 0, 0xdbe6ee); // lens
    b.tube([0.4, -0.07, R], [0.32, -0.07, 0.72], 0.026, 0.026, 5, CHROME);
    b.tube([0.4, 0.07, R], [0.32, 0.07, 0.72], 0.026, 0.026, 5, CHROME);
    b.tube([-0.05, 0.13, 0.17], [-0.6, 0.12, 0.25], 0.05, 0.062, 6, 0x232528); // exhaust
    b.box(0.4, 0, 0.3, 0.34, 0.15, 0.04, 0, body); // front fender
  } else {
    // scooter / ADV: floorboard, leg shield, big rear body
    b.box(0.04, 0, 0.14, 0.5, 0.34, 0.05, 0, PLASTIC); // floorboard
    b.box(-0.27, 0, 0.2, 0.46, 0.34, 0.29, 0, body, tint(body, 1.08)); // rear body
    b.box(-0.2, 0, 0.49, 0.5, 0.3, 0.07, 0, SEAT); // seat
    b.box(0.26, 0, 0.18, 0.13, 0.3, 0.5, 0, body, bodyDark); // leg shield
    b.box(0.34, 0, 0.5, 0.16, 0.27, 0.19, 0, body, tint(body, 1.1)); // headlight cluster
    b.box(0.425, 0, 0.56, 0.02, 0.19, 0.07, 0, 0xdbe6ee); // lens
    b.box(0.42, 0, 0.3, 0.34, 0.15, 0.04, 0, body); // front fender
    b.box(-0.53, 0, 0.34, 0.06, 0.2, 0.08, 0, 0xb3141a); // tail light
    b.tube([-0.5, 0.14, 0.2], [-0.12, 0.14, 0.14], 0.04, 0.046, 5, CHROME); // exhaust
    if (s.kind === 'adv') {
      b.box(0.3, 0, 0.66, 0.03, 0.3, 0.3, 0, 0x2a3946, 0x3a4c5c); // windscreen
      b.box(-0.1, 0, 0.18, 0.4, 0.4, 0.06, 0, 0x2b2e33);
    }
  }

  // handlebar, grips, mirrors
  b.tube([0.3, -0.27, 0.74], [0.3, 0.27, 0.74], 0.022, 0.022, 5, 0x1c1d20);
  for (const sgn of [-1, 1]) {
    b.tube([0.3, sgn * 0.2, 0.74], [0.26, sgn * 0.27, 0.93], 0.012, 0.012, 4, 0x1c1d20);
    b.box(0.255, sgn * 0.27, 0.93, 0.03, 0.12, 0.09, 0, 0x2a2d31, 0x9fb0bd); // mirror glass
  }
  // kickstand shadow-ish leg
  b.tube([0.02, -0.1, 0.16], [0.05, -0.18, 0.0], 0.015, 0.012, 4, 0x2b2e33);

  if (s.helmet !== null) {
    // helmet hanging on a mirror or sitting on the seat
    const onSeat = (Math.floor(s.x * 31 + s.y * 17) & 1) === 0;
    if (onSeat) b.ellipsoid(-0.2, 0, 0.7, 0.14, 0.12, 0.12, s.helmet, 6, 3);
    else b.ellipsoid(0.24, 0.27, 1.0, 0.13, 0.11, 0.11, s.helmet, 6, 3);
  }
  if (s.topBox) {
    b.box(-0.5, 0, 0.58, 0.34, 0.36, 0.26, 0, 0x1d1f22, 0x2e3237);
    b.box(-0.5, 0, 0.84, 0.3, 0.32, 0.02, 0, 0x6a7078);
  }
  b.pop();
}

// ------------------------------------------------------------------ bicycle
export function bicycle(b: MeshBuilder, x: number, y: number, heading: number, color: number) {
  b.push(x, y, 0, heading);
  const R = 0.21;
  const ring = (cx: number) => {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      b.tube([cx + Math.cos(a0) * R, 0, R + Math.sin(a0) * R], [cx + Math.cos(a1) * R, 0, R + Math.sin(a1) * R], 0.014, 0.014, 4, 0x15171a);
    }
  };
  ring(-0.36);
  ring(0.36);
  const F = (x1: number, z1: number, x2: number, z2: number) => b.tube([x1, 0, z1], [x2, 0, z2], 0.017, 0.017, 4, color);
  F(-0.36, R, -0.05, 0.36); // seat stay
  F(-0.05, 0.36, 0.28, 0.36); // top tube
  F(0.28, 0.36, 0.36, R); // fork
  F(-0.36, R, 0.02, R * 0.55); // chain stay
  F(0.02, R * 0.55, -0.05, 0.36); // seat tube
  F(0.02, R * 0.55, 0.28, 0.36); // down tube
  b.tube([0.28, -0.2, 0.46], [0.28, 0.2, 0.46], 0.012, 0.012, 4, 0x15171a); // bars
  b.box(-0.07, 0, 0.4, 0.14, 0.07, 0.03, 0, 0x15171a); // saddle
  b.pop();
}

// ------------------------------------------------------------------ trees
const LEAF = [0x3f7a33, 0x4a8636, 0x356d2d, 0x52913c, 0x2f6529];

export function palm(b: MeshBuilder, rng: Rng, x: number, y: number, h: number) {
  const trunk = 0x8d8573;
  b.cyl(x, y, 0, 0.17, 0.1, h, 7, trunk);
  for (let z = 0.35; z < h - 0.3; z += 0.42) b.cyl(x, y, z, 0.13 - (z / h) * 0.05, 0.13 - (z / h) * 0.05, 0.05, 7, 0x6c6554, undefined, false);
  b.cyl(x, y, h - 0.3, 0.1, 0.12, 0.5, 7, 0x6f8f3f);
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.5;
    const L = 1.9 + rng() * 0.6;
    const dirx = Math.cos(a), diry = Math.sin(a);
    const px = -diry, py = dirx;
    const up = 0.35 + rng() * 0.45;
    const segs = 5;
    const pts: { c: V3; w: number }[] = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const d = L * t * 0.95 + 0.1;
      const z = h + 0.2 + L * up * t - L * 0.95 * t * t;
      const w = 0.46 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.75) + 0.03;
      pts.push({ c: [x + dirx * d, y + diry * d, z], w });
    }
    for (let k = 0; k < segs; k++) {
      const A = pts[k], B = pts[k + 1];
      const col = k % 2 ? 0x4b7c30 : 0x3c6a2a;
      const l0: V3 = [A.c[0] + px * A.w / 2, A.c[1] + py * A.w / 2, A.c[2]];
      const r0: V3 = [A.c[0] - px * A.w / 2, A.c[1] - py * A.w / 2, A.c[2]];
      const l1: V3 = [B.c[0] + px * B.w / 2, B.c[1] + py * B.w / 2, B.c[2]];
      const r1: V3 = [B.c[0] - px * B.w / 2, B.c[1] - py * B.w / 2, B.c[2]];
      b.quad(l0, l1, r1, r0, mix(col, 0x6c9a3c, k / segs * 0.5), undefined, true);
    }
  }
}

export function broadleaf(b: MeshBuilder, rng: Rng, x: number, y: number, trunkH: number, crownR: number, tone = 1) {
  const tr = 0.13 + crownR * 0.05;
  b.cyl(x, y, 0, tr * 1.3, tr, trunkH, 7, 0x6b5a47);
  const cols = LEAF.map((c) => tint(c, tone));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * crownR * 0.55;
    const r = crownR * (0.55 + rng() * 0.28);
    const cz = trunkH + crownR * (0.25 + rng() * 0.45);
    if (i < 2) b.tube([x, y, trunkH * 0.7], [x + Math.cos(a) * d, y + Math.sin(a) * d, cz - r * 0.3], 0.07, 0.05, 5, 0x6b5a47);
    b.ellipsoid(x + Math.cos(a) * d, y + Math.sin(a) * d, cz, r, r * (0.95 + rng() * 0.2), r * 0.7, cols, 7, 4, rng, 0.28);
  }
}

export function fig(b: MeshBuilder, rng: Rng, x: number, y: number, trunkH: number, crownR: number) {
  b.cyl(x, y, 0, 0.42, 0.3, trunkH, 8, 0x6a5848);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.6;
    const L = 0.8 + rng() * 0.5;
    b.tube([x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.2, 0.85], [x + Math.cos(a) * L, y + Math.sin(a) * L, 0.02], 0.11, 0.05, 5, 0x66543f);
  }
  const cols = LEAF.map((c) => tint(c, 0.92));
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * crownR * 0.6;
    const r = crownR * (0.5 + rng() * 0.3);
    b.ellipsoid(x + Math.cos(a) * d, y + Math.sin(a) * d, trunkH + crownR * (0.2 + rng() * 0.45), r, r, r * 0.68, cols, 7, 4, rng, 0.3);
  }
}

export function bamboo(b: MeshBuilder, rng: Rng, x: number, y: number, radius: number, h: number, culms = 42) {
  const stalk = [0xb9a63c, 0xa9a238, 0x9aa03a, 0xc2ae45, 0x8b9a35];
  const foliage = [0x7ba23a, 0x8db443, 0x6b9332, 0x9bbd4c];
  for (let i = 0; i < culms; i++) {
    const a = rng() * Math.PI * 2;
    const r0 = Math.sqrt(rng()) * radius * 0.65;
    const bx = x + Math.cos(a) * r0, by = y + Math.sin(a) * r0;
    const lean = 0.1 + rng() * 0.32;
    const H = h * (0.72 + rng() * 0.32);
    const tx = bx + Math.cos(a) * Math.sin(lean) * H * 0.9;
    const ty = by + Math.sin(a) * Math.sin(lean) * H * 0.9;
    const tz = Math.cos(lean) * H;
    b.tube([bx, by, 0], [tx, ty, tz], 0.05, 0.022, 5, stalk[(i + Math.floor(rng() * 5)) % stalk.length]);
    if (i % 2 === 0) b.ellipsoid(tx, ty, tz - 0.15, 0.55 + rng() * 0.35, 0.55 + rng() * 0.35, 0.22, foliage, 6, 3, rng, 0.3);
  }
  // wide, drooping foliage crown
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2;
    const d = radius * (0.6 + rng() * 0.8);
    b.ellipsoid(x + Math.cos(a) * d, y + Math.sin(a) * d, h * (0.7 + rng() * 0.25), 0.9 + rng() * 0.5, 0.9 + rng() * 0.5, 0.3, foliage, 7, 3, rng, 0.3);
  }
}

export function shrub(b: MeshBuilder, rng: Rng, x: number, y: number, r: number, h = 0.7) {
  const cols = [0x2f6a2d, 0x3b7a35, 0x285a28, 0x4a8a3c];
  for (let i = 0; i < 3; i++) {
    b.ellipsoid(x + (rng() - 0.5) * r, y + (rng() - 0.5) * r, h * 0.45, r * (0.55 + rng() * 0.3), r * (0.55 + rng() * 0.3), h * 0.5, cols, 6, 3, rng, 0.3);
  }
}

// ------------------------------------------------------------------ structures
export interface BuildingSpec {
  cx: number;
  cy: number;
  w: number;
  d: number;
  h: number;
  rot?: number;
  wall: number;
  glass: number;
  floors: number;
  slab?: number;
  roof?: number;
  winFrac?: number;
}

export function building(b: MeshBuilder, s: BuildingSpec) {
  b.push(s.cx, s.cy, 0, s.rot ?? 0);
  const fh = s.h / s.floors;
  b.box(0, 0, 0, s.w, s.d, s.h, 0, s.wall, s.roof ?? tint(s.wall, 0.85));
  const wf = s.winFrac ?? 0.52;
  for (let f = 0; f < s.floors; f++) {
    const z0 = f * fh + fh * (0.5 - wf / 2) + fh * 0.08;
    const z1 = z0 + fh * wf;
    for (const face of [0, 1, 2, 3]) {
      const len = face % 2 === 0 ? s.w : s.d;
      const out = face % 2 === 0 ? s.d / 2 + 0.02 : s.w / 2 + 0.02;
      const cw = 1.25, gap = 0.3;
      const n = Math.max(1, Math.floor((len - 0.6) / (cw + gap)));
      const used = n * cw + (n - 1) * gap;
      for (let k = 0; k < n; k++) {
        const u0 = -used / 2 + k * (cw + gap), u1 = u0 + cw;
        const col = (k + f) % 5 === 0 ? tint(s.glass, 1.25) : s.glass;
        const P = (u: number, z: number): V3 =>
          face === 0 ? [u, -out, z] : face === 1 ? [out, u, z] : face === 2 ? [-u, out, z] : [-out, -u, z];
        b.quad(P(u0, z0), P(u1, z0), P(u1, z1), P(u0, z1), col, [0, 0, z0]);
      }
    }
    if (s.slab !== undefined && f > 0) b.box(0, 0, f * fh - 0.04, s.w + 0.18, s.d + 0.18, 0.08, 0, s.slab);
  }
  b.pop();
}

export function wallAlong(b: MeshBuilder, path: P2[], thick: number, h: number, color = 0x9d9c95, top = 0xb2b1aa) {
  b.band(path, -thick / 2, thick / 2, 0, h, color, top);
  // pilasters every ~3 units
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (let t = 1.5 - acc; t < L; t += 3.0) {
      const u = t / L;
      b.box(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 0, 0.3, thick + 0.12, h + 0.08, ang, tint(color, 0.93), top);
    }
    acc = (acc + L) % 3.0;
  }
}

export function pavilion(b: MeshBuilder, cx: number, cy: number, w: number, d: number, h: number, rot: number, tables: number) {
  b.push(cx, cy, 0, rot);
  const hx = w / 2 - 0.15, hy = d / 2 - 0.15;
  for (const [px, py] of [[-hx, -hy], [hx, -hy], [-hx, hy], [hx, hy], [0, -hy], [0, hy]]) b.cyl(px, py, 0, 0.07, 0.07, h, 5, 0x3b4249);
  b.box(0, 0, h, w + 0.5, d + 0.5, 0.1, 0, 0x34404a, 0x566574);
  b.box(0, 0, h - 0.14, w, 0.1, 0.12, 0, 0x2a323a);
  for (let i = 0; i < tables; i++) {
    const tx = -w / 2 + (i + 0.5) * (w / tables);
    b.box(tx, 0, 0.42, 0.62, 1.05, 0.05, 0, 0xb07840, 0xc08a50);
    for (const sgn of [-1, 1]) {
      b.box(tx + sgn * 0.5, 0, 0.25, 0.22, 1.05, 0.05, 0, 0x2a5ba5, 0x3a6bb5);
      b.box(tx + sgn * 0.5, -0.45, 0, 0.05, 0.05, 0.25, 0, 0x2a2f35);
      b.box(tx + sgn * 0.5, 0.45, 0, 0.05, 0.05, 0.25, 0, 0x2a2f35);
    }
    b.box(tx - 0.24, 0, 0, 0.05, 0.9, 0.42, 0, 0x6a4a2a);
    b.box(tx + 0.24, 0, 0, 0.05, 0.9, 0.42, 0, 0x6a4a2a);
  }
  b.pop();
}

export function billboard(b: MeshBuilder, cx: number, cy: number, w: number, panelH: number, legH: number, rot: number) {
  b.push(cx, cy, 0, rot);
  const hx = w / 2 - 0.1;
  const steel = 0x1d2127;
  for (const sx of [-hx, hx]) for (const sy of [-0.45, 0.45]) b.tube([sx, sy, 0], [sx, sy, legH + panelH], 0.07, 0.07, 6, steel);
  for (const z of [0.9, legH * 0.55, legH]) {
    b.box(0, -0.45, z, w, 0.07, 0.07, 0, steel);
    b.box(0, 0.45, z, w, 0.07, 0.07, 0, steel);
  }
  for (const sx of [-hx, hx]) b.tube([sx, -0.45, 0.9], [sx, 0.45, legH * 0.55], 0.03, 0.03, 4, steel);
  b.box(0, 0, legH, w, 0.25, panelH, 0, 0x131822, 0x232b38);
  for (let i = 1; i < 6; i++) b.box(-w / 2 + (i * w) / 6, -0.14, legH + 0.05, 0.04, 0.02, panelH - 0.1, 0, 0x2a3446);
  for (let j = 1; j < 3; j++) b.box(0, -0.14, legH + (j * panelH) / 3, w - 0.1, 0.02, 0.04, 0, 0x2a3446);
  b.box(0, -0.6, legH - 0.05, w, 0.5, 0.06, 0, 0x30363d, 0x4a525b);
  b.pop();
}

/** black / white striped railing (the pond fence) with chain-link look */
export function stripedFence(b: MeshBuilder, path: P2[], h: number) {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(L / 0.3));
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n;
      const col = (Math.floor(acc / 0.3) + k) % 2 ? 0xf0f0ee : 0x15171a;
      const a: V3 = [x0 + (x1 - x0) * u0, y0 + (y1 - y0) * u0, h];
      const c: V3 = [x0 + (x1 - x0) * u1, y0 + (y1 - y0) * u1, h];
      b.tube(a, c, 0.03, 0.03, 4, col);
      b.tube([a[0], a[1], h * 0.45], [c[0], c[1], h * 0.45], 0.018, 0.018, 4, 0x3a3d42);
    }
    for (let t = 0; t <= L + 1e-6; t += 1.1) {
      const u = t / L;
      b.tube([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 0], [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, h], 0.032, 0.032, 4, 0x2a2d31);
    }
    acc += L;
  }
}

export function pond(b: MeshBuilder, poly: P2[]) {
  const closed = [...poly, poly[0]];
  b.poly(poly, 0.03, 0x4c7a5c);
  b.band(closed, -0.18, 0.22, 0, 0.14, 0xa9a79f, 0xc3c1b8);
}

export function lamp(b: MeshBuilder, x: number, y: number, h: number, rot: number) {
  b.cyl(x, y, 0, 0.07, 0.045, h, 6, 0x6d7278);
  b.push(x, y, h, rot);
  b.tube([0, 0, 0], [0.5, 0, 0.12], 0.03, 0.03, 4, 0x6d7278);
  b.box(0.55, 0, 0.1, 0.5, 0.22, 0.09, 0, 0x2d3238, 0x474e56);
  b.pop();
}

export type SignKind = 'thisway' | 'student' | 'nolock';
export function sign(b: MeshBuilder, x: number, y: number, z: number, rot: number, kind: SignKind) {
  b.push(x, y, z, rot);
  if (kind === 'thisway') {
    b.box(0, 0, 0, 0.55, 0.04, 0.32, 0, 0x6a3b25);
    b.box(-0.06, -0.025, 0.18, 0.3, 0.012, 0.06, 0, 0xf4efe6);
    b.tri([0.1, -0.026, 0.11], [0.1, -0.026, 0.27], [0.22, -0.026, 0.19], 0xf4efe6, [0, 1, 0.19]);
    b.box(0, -0.025, 0.05, 0.4, 0.012, 0.06, 0, 0xe8e2d4);
  } else if (kind === 'student') {
    b.box(0, 0, 0, 0.62, 0.03, 0.44, 0, 0xf2f2ef);
    for (let i = 0; i < 4; i++) b.box(0, -0.02, 0.07 + i * 0.09, 0.5 - (i % 2) * 0.12, 0.012, 0.045, 0, 0x2b2e33);
  } else {
    b.box(0, 0, 0, 0.36, 0.025, 0.5, 0, 0xf6f6f3);
    b.box(0, -0.016, 0.36, 0.3, 0.012, 0.08, 0, 0xb3261e);
    b.box(0, -0.016, 0.2, 0.3, 0.012, 0.1, 0, 0xc2352b);
    b.box(0, -0.016, 0.07, 0.3, 0.012, 0.05, 0, 0x555a60);
  }
  b.pop();
}

export function plasticChair(b: MeshBuilder, x: number, y: number, rot: number) {
  b.push(x, y, 0, rot);
  b.box(0, 0, 0.3, 0.3, 0.3, 0.035, 0, 0x2a55a0);
  b.box(-0.14, 0, 0.3, 0.035, 0.3, 0.3, 0, 0x2a55a0);
  for (const [px, py] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) b.box(px, py, 0, 0.03, 0.03, 0.3, 0, 0x244b90);
  b.pop();
}

/** stepped concrete terraces along a path (the curved amphitheatre steps) */
export function stepsAlong(b: MeshBuilder, path: P2[], from: number, steps: number, tread: number, rise: number) {
  const d = Math.sign(from) || 1;
  for (let i = 0; i < steps; i++) {
    const a = from + d * tread * i;
    const c = a + d * tread;
    const lo = Math.min(a, c), hi = Math.max(a, c);
    b.band(path, lo, hi, 0, rise * (i + 1), 0xa7a49b, 0xbdbab1, 0x8f8c84);
  }
}
