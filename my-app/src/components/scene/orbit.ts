/**
 * orbit.ts - the camera maths for the zone viewer (pure functions, no three.js / React inside).
 *
 * Scene axes: x east, y north, z up. Yaw 0 = looking north from the south side (the entrance is at the bottom of
 * the picture, like the Figma plan). Pitch is the angle above the ground: 90 = straight down, 0 = horizon.
 */

export interface Orbit {
  /** degrees, positive = camera moves towards the east */
  yaw: number;
  /** degrees above the ground plane */
  pitch: number;
  /** 1 = framed so the whole lot fits, 2 = twice as close */
  zoom: number;
}

export interface OrbitLimits {
  /** how far (degrees) the camera may swing away from the starting yaw, each way */
  yawRange: number;
  pitchMin: number;
  pitchMax: number;
  zoomMin: number;
  zoomMax: number;
}

export const ORBIT_LIMITS: OrbitLimits = { yawRange: 80, pitchMin: 32, pitchMax: 86, zoomMin: 0.7, zoomMax: 2.2 };

/** the aerial view each zone opens with (looks good against the photos: above and slightly from the side) */
export const START_ORBIT: Record<'A' | 'B', Orbit> = {
  A: { yaw: -20, pitch: 52, zoom: 1.3 },
  B: { yaw: 14, pitch: 52, zoom: 1.3 },
};

/** vertical field of view of the perspective camera, degrees */
export const FOV = 36;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Distance at which a sphere of radius r (around the target) just fits a camera with this fov and aspect. */
export function fitDistance(r: number, fovDeg: number, aspect: number): number {
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * Math.max(0.1, aspect));
  return (r * 1.04) / Math.sin(Math.min(v, h) / 2);
}

export function clampOrbit(o: Orbit, start: Orbit, lim: OrbitLimits = ORBIT_LIMITS): Orbit {
  return {
    yaw: clamp(o.yaw, start.yaw - lim.yawRange, start.yaw + lim.yawRange),
    pitch: clamp(o.pitch, lim.pitchMin, lim.pitchMax),
    zoom: clamp(o.zoom, lim.zoomMin, lim.zoomMax),
  };
}

/** One-finger drag: dragging right swings the camera round to the left (the model follows the finger). */
export function applyDrag(o: Orbit, dx: number, dy: number, start: Orbit, degPerPx = 0.32): Orbit {
  return clampOrbit({ ...o, yaw: o.yaw - dx * degPerPx, pitch: o.pitch + dy * degPerPx * 0.8 }, start);
}

/** Two-finger pinch: ratio of the current finger distance to the distance when the pinch began. */
export function applyPinch(o: Orbit, startZoom: number, ratio: number, start: Orbit): Orbit {
  return clampOrbit({ ...o, zoom: startZoom * ratio }, start);
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export function cameraPose(target: [number, number, number], dist: number, yawDeg: number, pitchDeg: number): CameraPose {
  const yaw = (yawDeg * Math.PI) / 180;
  const pit = (pitchDeg * Math.PI) / 180;
  return {
    target,
    position: [
      target[0] + dist * Math.sin(yaw) * Math.cos(pit),
      target[1] - dist * Math.cos(yaw) * Math.cos(pit),
      target[2] + dist * Math.sin(pit),
    ],
  };
}

/** Ease-out cubic used by the opening swoop (0..1 -> 0..1). */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
