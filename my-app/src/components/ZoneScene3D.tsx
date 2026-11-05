import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { ZoneId, ZoneSceneResult, buildZoneScene } from './scene/zoneScene';
import {
  FOV,
  Orbit,
  START_ORBIT,
  applyDrag,
  applyPinch,
  cameraPose,
  easeOut,
  fitDistance,
} from './scene/orbit';

/**
 * Realistic aerial 3D model of a parking zone (Zone A / Zone B), built from the reference photos.
 *
 *  - one finger: orbit (swing round / tilt up and down), two fingers: pinch to zoom
 *  - `occupancy` (0..1) decides how many of the parking slots hold a motorcycle
 *  - everything is a single vertex-coloured mesh with the lighting baked in, so there are no textures,
 *    no lights and no shadow maps: it runs on low-end phones and needs no assets (no .glb loading).
 *
 * Needs three >= r152 (vertex colours are read as linear sRGB and the renderer converts on output).
 */
export interface ZoneScene3DProps {
  zone: ZoneId;
  /** current_occupancy / capacity, 0..1 */
  occupancy?: number;
  height: number;
  /** should match whatever sits behind the model so the edges blend in */
  backgroundColor?: string;
  /** false = a still picture with no gestures */
  interactive?: boolean;
}

interface ViewState {
  orbit: Orbit;
  vx: number; // spin velocity (degrees per frame) left over after a swipe
  vy: number;
  dragging: boolean;
  dirty: boolean;
  restartIntro: boolean;
}

interface Handle {
  dispose: () => void;
}

const INTRO_MS = 1000;
const INTRO_YAW = -26; // the opening swoop starts this far round and this much higher...
const INTRO_PITCH = 16; // ...and eases into the resting view

// ---- the built scenes are cached, so re-opening a zone popup is instant
const sceneCache = new Map<string, ZoneSceneResult>();
function getBuilt(zone: ZoneId, occ: number): ZoneSceneResult {
  const key = `${zone}:${occ}`;
  let hit = sceneCache.get(key);
  if (!hit) {
    hit = buildZoneScene(zone, occ);
    sceneCache.set(key, hit);
    if (sceneCache.size > 6) sceneCache.delete(sceneCache.keys().next().value as string);
  }
  return hit;
}

function startRenderer(
  gl: any,
  built: ZoneSceneResult,
  start: Orbit,
  opts: { backgroundColor: string; state: React.MutableRefObject<ViewState>; isMounted: () => boolean },
): Handle {
  const renderer: any = new Renderer({ gl, antialias: true });
  const w = gl.drawingBufferWidth as number;
  const h = gl.drawingBufferHeight as number;
  renderer.setSize(w, h);
  renderer.setClearColor(new THREE.Color(opts.backgroundColor), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, w / h, 0.5, 600);
  camera.up.set(0, 0, 1); // the plan is z-up

  // one merged mesh: positions + baked (already linear) vertex colours
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(built.mesh.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(built.mesh.colors, 3));
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const { cx, cy, r } = built.view;
  const baseDist = fitDistance(r, FOV, w / h);
  const target: [number, number, number] = [cx, cy, 0.8];

  let raf = 0;
  let disposed = false;
  let t0 = Date.now();

  const frame = () => {
    if (disposed || !opts.isMounted()) return;
    raf = requestAnimationFrame(frame);
    const st = opts.state.current;
    const now = Date.now();
    if (st.restartIntro) {
      st.restartIntro = false;
      t0 = now;
    }

    // inertia after a swipe
    if (!st.dragging && (Math.abs(st.vx) > 0.015 || Math.abs(st.vy) > 0.015)) {
      st.orbit = applyDrag(st.orbit, st.vx / 0.32, st.vy / (0.32 * 0.8), start, 0.32);
      st.vx *= 0.9;
      st.vy *= 0.9;
      st.dirty = true;
    }

    const introT = (now - t0) / INTRO_MS;
    const intro = introT < 1;
    if (!intro && !st.dirty) return;
    st.dirty = false;

    const k = 1 - easeOut(introT); // 1 at the start of the swoop, 0 when it has settled
    const o = st.orbit;
    const pose = cameraPose(target, baseDist / o.zoom, o.yaw + INTRO_YAW * k, o.pitch + INTRO_PITCH * k);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    renderer.render(scene, camera);
    gl.endFrameEXP();
  };
  frame();

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      renderer.dispose?.();
    },
  };
}

export default function ZoneScene3D({
  zone,
  occupancy = 0.7,
  height,
  backgroundColor = '#f8fafc',
  interactive = true,
}: ZoneScene3DProps) {
  const [width, setWidth] = useState(0);
  const [built, setBuilt] = useState<{ key: string; scene: ZoneSceneResult } | null>(null);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);

  // 2 % steps: the model does not rebuild for tiny occupancy changes
  const occ = Math.round(Math.max(0, Math.min(1, Number.isFinite(occupancy) ? occupancy : 0)) * 50) / 50;
  const sceneKey = `${zone}:${occ}`;
  const start = START_ORBIT[zone];

  const mounted = useRef(true);
  const handle = useRef<Handle | null>(null);
  const state = useRef<ViewState>({ orbit: { ...start }, vx: 0, vy: 0, dragging: false, dirty: true, restartIntro: false });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  // build the geometry after the popup animation (it takes ~0.1 s of JS time)
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        setBuilt({ key: sceneKey, scene: getBuilt(zone, occ) });
      } catch {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [zone, occ, sceneKey]);

  // a different zone starts from its own opening view
  useEffect(() => {
    state.current.orbit = { ...START_ORBIT[zone] };
    state.current.vx = 0;
    state.current.vy = 0;
    state.current.dirty = true;
    state.current.restartIntro = true;
  }, [zone]);

  // stop the old render loop before the GLView below is re-created (see its `key`)
  const glKey = `${sceneKey}-${width}-${height}`;
  useLayoutEffect(
    () => () => {
      handle.current?.dispose();
      handle.current = null;
    },
    [glKey],
  );

  const pan = useMemo(() => {
    const g = { mode: 'none' as 'none' | 'drag' | 'pinch', lx: 0, ly: 0, d0: 1, z0: 1 };
    const end = () => {
      g.mode = 'none';
      state.current.dragging = false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // keep the gesture even inside a ScrollView / Modal
      onPanResponderGrant: () => {
        g.mode = 'none';
        state.current.dragging = true;
        state.current.vx = 0;
        state.current.vy = 0;
        setHint(false);
      },
      onPanResponderMove: (e: any) => {
        const t = e.nativeEvent.touches as { pageX: number; pageY: number }[];
        const st = state.current;
        const s0 = START_ORBIT[zone];
        if (t.length >= 2) {
          const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
          if (g.mode !== 'pinch') {
            g.mode = 'pinch';
            g.d0 = Math.max(d, 1);
            g.z0 = st.orbit.zoom;
            return;
          }
          st.orbit = applyPinch(st.orbit, g.z0, d / g.d0, s0);
        } else if (t.length === 1) {
          if (g.mode !== 'drag') {
            g.mode = 'drag';
            g.lx = t[0].pageX;
            g.ly = t[0].pageY;
            return;
          }
          const dx = t[0].pageX - g.lx;
          const dy = t[0].pageY - g.ly;
          g.lx = t[0].pageX;
          g.ly = t[0].pageY;
          st.orbit = applyDrag(st.orbit, dx, dy, s0);
          st.vx = dx * 0.32; // remembered so the model keeps turning a little after the swipe
          st.vy = dy * 0.32 * 0.8;
        }
        st.dirty = true;
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, [zone]);

  const onContextCreate = (gl: any) => {
    if (!mounted.current || !built || built.key !== sceneKey) return;
    try {
      handle.current?.dispose();
      state.current.dirty = true;
      state.current.restartIntro = true;
      handle.current = startRenderer(gl, built.scene, start, {
        backgroundColor,
        state,
        isMounted: () => mounted.current,
      });
    } catch {
      setFailed(true);
    }
  };

  const resetView = () => {
    state.current.orbit = { ...start };
    state.current.vx = 0;
    state.current.vy = 0;
    state.current.dirty = true;
    state.current.restartIntro = true;
  };

  const ready = width > 0 && built !== null && built.key === sceneKey && !failed;

  return (
    <View
      style={[styles.box, { height, backgroundColor }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {ready ? (
        <GLView key={glKey} style={StyleSheet.absoluteFill} pointerEvents="none" onContextCreate={onContextCreate} />
      ) : null}

      {ready && interactive ? (
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      ) : null}

      {!ready && !failed ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="#64748b" />
          <Text style={styles.muted}>Building 3D model...</Text>
        </View>
      ) : null}

      {failed ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.muted}>The 3D model could not be shown on this device.</Text>
        </View>
      ) : null}

      {ready && interactive ? (
        <>
          <Pressable style={styles.reset} onPress={resetView} hitSlop={8}>
            <Text style={styles.resetText}>Reset view</Text>
          </Pressable>
          {hint ? (
            <View style={styles.hint} pointerEvents="none">
              <Text style={styles.hintText}>Drag to rotate · Pinch to zoom</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#64748b', fontSize: 12 },
  reset: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.62)',
  },
  resetText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  hint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  hintText: { color: '#fff', fontSize: 11 },
});
