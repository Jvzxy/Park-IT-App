/**
 * meshBuilder.ts
 *
 * A tiny, dependency-free low-poly mesh builder. Everything the realistic parking scenes are made of
 * (ground, bikes, trees, buildings ...) is emitted through this class into ONE flat vertex buffer.
 *
 * Why not use three.js primitives?
 *  - thousands of separate Mesh objects are slow on phones; one merged buffer is a single draw call
 *  - the same buffer can be unit-tested in Node, previewed in a browser and exported to .obj
 *  - lighting is BAKED into the vertex colours (a fixed "sun"), so the scene looks identical on every
 *    three.js version and needs no lights, no shadow maps and no textures (all of which are fragile on expo-gl)
 *
 * Axes: x = east (right), y = north (away from the entrance), z = up. 1 unit ~ 1.6 m.
 */

export type V3 = [number, number, number];
export type P2 = [number, number];

export interface BuiltMesh {
  positions: Float32Array; // 3 per vertex, non-indexed triangles
  colors: Float32Array; // 3 per vertex, LINEAR rgb with the lighting already multiplied in
  normals: Float32Array; // 3 per vertex (flat), only used for export
  triColors: Uint32Array; // authored 0xRRGGBB per triangle (un-lit), only used for export
  triangles: number;
  min: V3;
  max: V3;
}

// ------------------------------------------------------------------ small vector helpers
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// ------------------------------------------------------------------ colour + lighting
export const hexToRgb = (hex: number): V3 => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
export const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** direction TOWARDS the sun: from the south-west, fairly high (tropical late morning). */
export const SUN: V3 = norm([-0.42, -0.5, 0.78]);
const HEMI_UP = 0.78; // sky light on up-facing surfaces
const HEMI_DOWN = 0.34; // ground bounce on down-facing surfaces
const SUN_I = 0.5;
const SHADE_NORM = HEMI_UP + SUN_I * SUN[2]; // so an up-facing surface keeps exactly its authored colour

/** brightness multiplier for a surface with the given unit normal */
export function shade(n: V3): number {
  const hemi = HEMI_DOWN + (HEMI_UP - HEMI_DOWN) * (0.5 + 0.5 * n[2]);
  return (hemi + SUN_I * Math.max(0, dot(n, SUN))) / SHADE_NORM;
}

// ------------------------------------------------------------------ deterministic random
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;

/** multiply a 0xRRGGBB colour by a factor (in sRGB space, simple and predictable) */
export function tint(hex: number, k: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * k)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * k)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * k)));
  return (r << 16) | (g << 8) | b;
}
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// ------------------------------------------------------------------ polygon helpers
export function polygonArea(p: P2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
  }
  return a / 2;
}

export function pointInPoly(pt: P2, poly: P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distToPath(p: P2, path: P2[]): number {
  let d = Infinity;
  for (let i = 0; i < path.length - 1; i++) d = Math.min(d, distToSegment(p, path[i], path[i + 1]));
  return d;
}

export function distToPolyEdge(p: P2, poly: P2[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, distToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
}

/** ear-clipping triangulation of a simple polygon (any winding). Returns index triples. */
export function earClip(pts: P2[]): [number, number, number][] {
  const n = pts.length;
  const idx = pts.map((_, i) => i);
  if (polygonArea(pts) < 0) idx.reverse();
  const out: [number, number, number][] = [];
  const cr = (a: P2, b: P2, c: P2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p: P2, a: P2, b: P2, c: P2) => cr(a, b, p) >= -1e-12 && cr(b, c, p) >= -1e-12 && cr(c, a, p) >= -1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cr(a, b, c) <= 1e-12) continue; // reflex or degenerate
      let ear = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inTri(pts[j], a, b, c)) { ear = false; break; }
      }
      if (ear) {
        out.push([i0, i1, i2]);
        idx.splice(i, 1);
        clipped = true;
        break;
      }
    }
    if (!clipped) break; // numerically stuck: bail out with what we have
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  void n;
  return out;
}

/** offset a polyline to its left (d > 0) or right (d < 0) with mitred joins */
export function offsetPath(path: P2[], d: number): P2[] {
  const n = path.length;
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const segs: P2[] = [];
    if (i > 0) segs.push([path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]]);
    if (i < n - 1) segs.push([path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]]);
    let nx = 0, ny = 0;
    const normals: P2[] = segs.map(([dx, dy]) => {
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    for (const [x, y] of normals) { nx += x; ny += y; }
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    // mitre length compensation (clamped so sharp corners do not explode)
    const k = normals.length === 2 ? Math.min(2.2, 1 / Math.max(0.45, nx * normals[0][0] + ny * normals[0][1])) : 1;
    out.push([path[i][0] + nx * d * k, path[i][1] + ny * d * k]);
  }
  return out;
}

// ------------------------------------------------------------------ the builder
interface Xf { c: number; s: number; sc: number; tx: number; ty: number; tz: number }

export class MeshBuilder {
  private pos: number[] = [];
  private col: number[] = [];
  private nor: number[] = [];
  private tcol: number[] = [];
  private stack: Xf[] = [];
  private xf: Xf = { c: 1, s: 0, sc: 1, tx: 0, ty: 0, tz: 0 };
  private lin = new Map<number, V3>();
  /** global brightness for everything added until changed (used for fake shading of decals) */
  public tone = 1;

  // ---- transform stack -------------------------------------------------
  push(tx: number, ty: number, tz = 0, rotZ = 0, scale = 1) {
    this.stack.push(this.xf);
    const p = this.xf;
    const c = Math.cos(rotZ), s = Math.sin(rotZ);
    const wx = p.sc * (p.c * tx - p.s * ty) + p.tx;
    const wy = p.sc * (p.s * tx + p.c * ty) + p.ty;
    const wz = p.sc * tz + p.tz;
    // compose rotations
    const nc = p.c * c - p.s * s;
    const ns = p.s * c + p.c * s;
    this.xf = { c: nc, s: ns, sc: p.sc * scale, tx: wx, ty: wy, tz: wz };
  }
  pop() {
    const x = this.stack.pop();
    if (x) this.xf = x;
  }
  private T(p: V3): V3 {
    const x = this.xf;
    return [x.sc * (x.c * p[0] - x.s * p[1]) + x.tx, x.sc * (x.s * p[0] + x.c * p[1]) + x.ty, x.sc * p[2] + x.tz];
  }
  /** world position of a local point (useful for tests) */
  world(p: V3): V3 {
    return this.T(p);
  }

  private linear(hex: number): V3 {
    let v = this.lin.get(hex);
    if (!v) {
      const [r, g, b] = hexToRgb(hex);
      v = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
      this.lin.set(hex, v);
    }
    return v;
  }

  // ---- raw triangle -------------------------------------------------
  /**
   * a,b,c are LOCAL points. `outFrom` (local) makes the normal point away from that point (for closed solids);
   * `up` forces the normal into the upper hemisphere (for thin foliage seen from both sides).
   */
  tri(a: V3, b: V3, c: V3, color: number, outFrom?: V3, up = false) {
    let A = this.T(a), B = this.T(b), C = this.T(c);
    let n = cross(sub(B, A), sub(C, A));
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-10) return;
    n = [n[0] / len, n[1] / len, n[2] / len];
    let flip = false;
    if (outFrom) {
      const o = this.T(outFrom);
      const cen: V3 = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
      if (dot(n, sub(cen, o)) < 0) flip = true;
    } else if (up && n[2] < 0) flip = true;
    if (flip) {
      n = [-n[0], -n[1], -n[2]];
      const t = B; B = C; C = t;
    }
    const k = shade(n) * this.tone;
    const l = this.linear(color);
    this.tcol.push(color);
    for (const p of [A, B, C]) {
      this.pos.push(p[0], p[1], p[2]);
      this.col.push(Math.min(1, l[0] * k), Math.min(1, l[1] * k), Math.min(1, l[2] * k));
      this.nor.push(n[0], n[1], n[2]);
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: number, outFrom?: V3, up = false) {
    this.tri(a, b, c, color, outFrom, up);
    this.tri(a, c, d, color, outFrom, up);
  }

  // ---- primitives ----------------------------------------------------------
  /** axis-aligned (then rotated) box; footprint centred on (cx,cy), standing from z0 up by h */
  box(cx: number, cy: number, z0: number, sx: number, sy: number, h: number, rot = 0, color = 0x888888, topColor?: number, bottom = false) {
    this.push(cx, cy, z0, rot);
    const hx = sx / 2, hy = sy / 2;
    const c: V3 = [0, 0, h / 2];
    const p = (x: number, y: number, z: number): V3 => [x, y, z];
    const tc = topColor ?? color;
    this.quad(p(-hx, -hy, 0), p(hx, -hy, 0), p(hx, -hy, h), p(-hx, -hy, h), color, c); // south
    this.quad(p(hx, -hy, 0), p(hx, hy, 0), p(hx, hy, h), p(hx, -hy, h), color, c); // east
    this.quad(p(hx, hy, 0), p(-hx, hy, 0), p(-hx, hy, h), p(hx, hy, h), color, c); // north
    this.quad(p(-hx, hy, 0), p(-hx, -hy, 0), p(-hx, -hy, h), p(-hx, hy, h), color, c); // west
    this.quad(p(-hx, -hy, h), p(hx, -hy, h), p(hx, hy, h), p(-hx, hy, h), tc, c); // top
    if (bottom) this.quad(p(-hx, -hy, 0), p(-hx, hy, 0), p(hx, hy, 0), p(hx, -hy, 0), color, c);
    this.pop();
  }

  /** vertical (tapered) cylinder / cone: r0 at z0, r1 at z0+h */
  cyl(cx: number, cy: number, z0: number, r0: number, r1: number, h: number, seg: number, color: number, topColor?: number, cap = true) {
    const c: V3 = [cx, cy, z0 + h / 2];
    const ring = (r: number, z: number, i: number): V3 => {
      const a = (i / seg) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
    };
    for (let i = 0; i < seg; i++) {
      const j = i + 1;
      this.quad(ring(r0, z0, i), ring(r0, z0, j), ring(r1, z0 + h, j), ring(r1, z0 + h, i), color, c);
      if (cap && r1 > 0) this.tri([cx, cy, z0 + h], ring(r1, z0 + h, i), ring(r1, z0 + h, j), topColor ?? color, c);
    }
  }

  /** cylinder along an arbitrary axis from p0 to p1 (wheels, poles, bamboo, rails) */
  tube(p0: V3, p1: V3, r0: number, r1: number, seg: number, color: number, capColor?: number) {
    const axis = norm(sub(p1, p0));
    const ref: V3 = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const u = norm(cross(axis, ref));
    const v = cross(axis, u);
    const pt = (base: V3, r: number, i: number): V3 => {
      const a = (i / seg) * Math.PI * 2;
      return [base[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, base[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, base[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r];
    };
    const mid: V3 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
    for (let i = 0; i < seg; i++) {
      const j = i + 1;
      this.quad(pt(p0, r0, i), pt(p0, r0, j), pt(p1, r1, j), pt(p1, r1, i), color, mid);
      if (capColor !== undefined || r0 > 0.02) {
        this.tri(p0, pt(p0, r0, j), pt(p0, r0, i), capColor ?? color, mid);
        this.tri(p1, pt(p1, r1, i), pt(p1, r1, j), capColor ?? color, mid);
      }
    }
  }

  /** low-poly ellipsoid; `colors` cycles per face for an organic, leafy look; `rng` jitters the vertices */
  ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, colors: number | number[], seg = 7, rings = 4, rng?: Rng, jit = 0, rotZ = 0) {
    const cols = Array.isArray(colors) ? colors : [colors];
    this.push(cx, cy, cz, rotZ);
    const pts: V3[][] = [];
    for (let r = 0; r <= rings; r++) {
      const phi = (r / rings) * Math.PI; // 0 top .. PI bottom
      const row: V3[] = [];
      const m = r === 0 || r === rings ? 1 : seg;
      for (let i = 0; i < m; i++) {
        const th = (i / seg) * Math.PI * 2;
        const j = rng && jit ? 1 + (rng() - 0.5) * jit : 1;
        row.push([Math.sin(phi) * Math.cos(th) * rx * j, Math.sin(phi) * Math.sin(th) * ry * j, Math.cos(phi) * rz * j]);
      }
      pts.push(row);
    }
    const o: V3 = [0, 0, 0];
    let f = 0;
    for (let r = 0; r < rings; r++) {
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        const a = r === 0 ? pts[0][0] : pts[r][i];
        const b = r === 0 ? pts[0][0] : pts[r][j];
        const c = r + 1 === rings ? pts[rings][0] : pts[r + 1][j];
        const d = r + 1 === rings ? pts[rings][0] : pts[r + 1][i];
        const col = cols[f++ % cols.length];
        if (r === 0) this.tri(a, d, c, col, o);
        else if (r + 1 === rings) this.tri(a, b, c, col, o);
        else this.quad(a, b, c, d, col, o);
      }
    }
    this.pop();
  }

  /** flat polygon (any winding), normal pointing up, at height z */
  poly(pts: P2[], z: number, color: number) {
    for (const [i, j, k] of earClip(pts)) {
      this.tri([pts[i][0], pts[i][1], z], [pts[j][0], pts[j][1], z], [pts[k][0], pts[k][1], z], color, [pts[i][0], pts[i][1], z - 1]);
    }
  }

  /** extruded polygon: vertical sides + flat top (no bottom) */
  prism(pts: P2[], z0: number, z1: number, color: number, topColor?: number) {
    const ccw = polygonArea(pts) > 0 ? pts : [...pts].reverse();
    let cx = 0, cy = 0;
    for (const p of ccw) { cx += p[0] / ccw.length; cy += p[1] / ccw.length; }
    const c: V3 = [cx, cy, (z0 + z1) / 2];
    for (let i = 0; i < ccw.length; i++) {
      const a = ccw[i], b = ccw[(i + 1) % ccw.length];
      this.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], color, c);
    }
    this.poly(ccw, z1, topColor ?? color);
  }

  /** a band along a path between lateral offsets d0 < d1 (left positive), standing z0..z1 (walls, curbs, steps) */
  band(path: P2[], d0: number, d1: number, z0: number, z1: number, color: number, topColor?: number, sideColor?: number) {
    const A = offsetPath(path, d0), B = offsetPath(path, d1);
    const tc = topColor ?? color;
    const sc = sideColor ?? color;
    for (let i = 0; i < path.length - 1; i++) {
      const a0: V3 = [A[i][0], A[i][1], z1], a1: V3 = [A[i + 1][0], A[i + 1][1], z1];
      const b0: V3 = [B[i][0], B[i][1], z1], b1: V3 = [B[i + 1][0], B[i + 1][1], z1];
      const cen: V3 = [(A[i][0] + B[i + 1][0]) / 2, (A[i][1] + B[i + 1][1]) / 2, (z0 + z1) / 2 - 1];
      this.quad(a0, a1, b1, b0, tc, [cen[0], cen[1], z0 - 1]);
      const c2: V3 = [(A[i][0] + B[i][0]) / 2, (A[i][1] + B[i][1]) / 2, (z0 + z1) / 2];
      const lo = (p: P2, z: number): V3 => [p[0], p[1], z];
      this.quad(lo(A[i], z0), lo(A[i + 1], z0), lo(A[i + 1], z1), lo(A[i], z1), sc, c2);
      this.quad(lo(B[i], z0), lo(B[i + 1], z0), lo(B[i + 1], z1), lo(B[i], z1), sc, c2);
    }
  }

  /** flat ribbon of width w along a path at height z (painted lines, tracks) */
  ribbon(path: P2[], w: number, z: number, color: number) {
    const A = offsetPath(path, -w / 2), B = offsetPath(path, w / 2);
    for (let i = 0; i < path.length - 1; i++) {
      this.quad([A[i][0], A[i][1], z], [A[i + 1][0], A[i + 1][1], z], [B[i + 1][0], B[i + 1][1], z], [B[i][0], B[i][1], z], color, [A[i][0], A[i][1], z - 1]);
    }
  }

  /** flat ellipse decal (shadows, patches) */
  disc(cx: number, cy: number, z: number, rx: number, ry: number, rot: number, color: number, seg = 14) {
    this.push(cx, cy, z, rot);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      this.tri([0, 0, 0], [Math.cos(a0) * rx, Math.sin(a0) * ry, 0], [Math.cos(a1) * rx, Math.sin(a1) * ry, 0], color, [0, 0, -1]);
    }
    this.pop();
  }

  // ---- output ---------------------------------------------------------------
  get triangleCount() {
    return this.pos.length / 9;
  }

  build(): BuiltMesh {
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], this.pos[i + k]);
        max[k] = Math.max(max[k], this.pos[i + k]);
      }
    }
    return {
      positions: new Float32Array(this.pos),
      colors: new Float32Array(this.col),
      normals: new Float32Array(this.nor),
      triColors: new Uint32Array(this.tcol),
      triangles: this.pos.length / 9,
      min,
      max,
    };
  }
}

/** export to Wavefront OBJ + MTL (one material per distinct colour) so the scene opens in Blender */
export function toObj(mesh: BuiltMesh, name: string): { obj: string; mtl: string } {
  const mats = new Map<number, string>();
  const lines: string[] = [`# ${name} - generated from the Park-IT scene builder`, `mtllib ${name}.mtl`, `o ${name}`];
  const n = mesh.triangles;
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 3; k++) {
      const i = (t * 3 + k) * 3;
      lines.push(`v ${mesh.positions[i].toFixed(4)} ${mesh.positions[i + 1].toFixed(4)} ${mesh.positions[i + 2].toFixed(4)}`);
    }
  }
  let curMat = '';
  for (let t = 0; t < n; t++) {
    const col = mesh.triColors[t];
    if (!mats.has(col)) mats.set(col, `c${mats.size}`);
    const m = mats.get(col) as string;
    if (m !== curMat) { lines.push(`usemtl ${m}`); curMat = m; }
    const b = t * 3 + 1;
    lines.push(`f ${b} ${b + 1} ${b + 2}`);
  }
  const mtl: string[] = [];
  for (const [col, m] of mats) {
    const [r, g, b] = hexToRgb(col).map((v) => srgbToLinear(v).toFixed(4));
    mtl.push(`newmtl ${m}`, `Kd ${r} ${g} ${b}`, 'Ka 0 0 0', 'Ks 0 0 0', 'd 1', 'illum 1', '');
  }
  return { obj: lines.join('\n'), mtl: mtl.join('\n') };
}
