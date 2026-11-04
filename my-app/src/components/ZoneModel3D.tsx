import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import {
  COLORS,
  PlateId,
  SceneDef,
  STROKE_HEX,
  ViewFit,
  ViewId,
  fitView,
  getScene,
  layoutLabels,
  pickPlate,
  strokeSegments,
} from './zoneModels';

export interface ZoneModel3DProps {
  /** 'map' = both zones, 'A' / 'B' = the detail floor plans from Blender panels 2 and 3 */
  view: ViewId;
  height: number;
  /** degrees from straight-down; 0 = flat (Figma look), 35 = clear 3D */
  tilt?: number;
  /** should match whatever sits behind the model so the edges blend in */
  backgroundColor?: string;
  /** map view only: fill colour per zone (e.g. availability colours) */
  plateColors?: Partial<Record<PlateId, string>>;
  /** pulse the direction arrows (the old Animated opacity effect) */
  animate?: boolean;
  /** map view only: called with 'A' or 'B' when a zone is tapped */
  onPlatePress?: (id: PlateId) => void;
}

const DEFAULT_MAP_COLORS: Record<string, string> = { A: '#ef4444', B: '#34d399' };

const SIDE_SHADE = 0.55; // side walls = top colour * this, gives the 3D look without any lights
const PULSE_MS = 1600;
const PULSE_MIN = 0.4; // same range as the old Animated.Value(0.4 -> 1)

interface Handle {
  setPlateColors: (c: Partial<Record<PlateId, string>>) => void;
  requestRender: () => void;
  dispose: () => void;
}

function buildAndStart(
  gl: any,
  def: SceneDef,
  fit: ViewFit,
  opts: {
    backgroundColor: string;
    plateColors: Record<string, string>;
    animateRef: React.MutableRefObject<boolean>;
    isMounted: () => boolean;
  },
): Handle {
  const renderer: any = new Renderer({ gl, antialias: true });
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setClearColor(new THREE.Color(opts.backgroundColor), 1);

  const scene = new THREE.Scene();

  // --- camera (orthographic, tilted; same maths as zoneModels.fitView/project) ---
  const camera = new THREE.OrthographicCamera(fit.left, fit.right, fit.top, fit.bottom, 0.1, 1000);
  const dist = 200;
  camera.up.set(0, fit.c, fit.s);
  camera.position.set(fit.cx, fit.cy - fit.s * dist, fit.c * dist);
  camera.lookAt(fit.cx, fit.cy, 0);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // --- plates (extruded polygons) ---
  const plateMats: Record<string, { top: THREE.MeshBasicMaterial; side: THREE.MeshBasicMaterial }> = {};
  const applyPlateColor = (id: string, hex: string) => {
    const m = plateMats[id];
    if (!m) return;
    m.top.color.set(hex);
    m.side.color.set(hex).multiplyScalar(SIDE_SHADE);
  };
  for (const plate of def.plates) {
    const shape = new THREE.Shape(plate.points.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = track(new THREE.ExtrudeGeometry(shape, { depth: plate.depth, bevelEnabled: false }));
    const top = track(new THREE.MeshBasicMaterial());
    const side = track(new THREE.MeshBasicMaterial());
    plateMats[plate.id] = { top, side };
    applyPlateColor(plate.id, plate.id === 'bg' ? COLORS.dark : opts.plateColors[plate.id] ?? '#888888');
    // ExtrudeGeometry: material 0 = top/bottom caps, material 1 = side walls
    scene.add(new THREE.Mesh(geo, [top, side]));
  }

  // --- strokes: arrows, curves, dividers (tubes made of cylinders + round joints) ---
  const topZ = Math.max(...def.plates.map((p) => p.depth));
  const cyl = track(new THREE.CylinderGeometry(1, 1, 1, 6)); // unit cylinder, scaled per segment
  const ball = track(new THREE.SphereGeometry(1, 8, 6));
  const strokeMats: Record<string, THREE.MeshBasicMaterial> = {};
  const matFor = (key: string) =>
    strokeMats[key] ?? (strokeMats[key] = track(new THREE.MeshBasicMaterial({ color: STROKE_HEX[key as keyof typeof STROKE_HEX] })));

  const up = new THREE.Vector3(0, 1, 0);
  for (const s of def.strokes) {
    const mat = matFor(s.color);
    const z = topZ + s.radius * 0.6;
    const addBall = (x: number, y: number) => {
      const m = new THREE.Mesh(ball, mat);
      m.scale.setScalar(s.radius);
      m.position.set(x, y, z);
      scene.add(m);
    };
    for (const [a, b] of strokeSegments(s)) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const m = new THREE.Mesh(cyl, mat);
      m.scale.set(s.radius, len, s.radius);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
      m.quaternion.setFromUnitVectors(up, new THREE.Vector3(dx / len, dy / len, 0));
      scene.add(m);
      addBall(a[0], a[1]);
      addBall(b[0], b[1]);
    }
  }

  // --- pulsing arrows: blend the arrow colour towards the plate colour (no transparency artefacts) ---
  const base = {
    green: new THREE.Color(STROKE_HEX.green),
    red: new THREE.Color(STROKE_HEX.red),
  };
  const plateDark = new THREE.Color(COLORS.dark);

  // --- render loop ---
  let raf = 0;
  let disposed = false;
  let dirty = true;
  const start = Date.now();

  const frame = () => {
    if (disposed || !opts.isMounted()) return;
    raf = requestAnimationFrame(frame);
    const animating = opts.animateRef.current && (strokeMats.green || strokeMats.red);
    if (!animating && !dirty) return;
    dirty = false;

    if (animating) {
      const phase = ((Date.now() - start) % PULSE_MS) / PULSE_MS; // 0..1
      const k = PULSE_MIN + (1 - PULSE_MIN) * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
      if (strokeMats.green) strokeMats.green.color.copy(plateDark).lerp(base.green, k);
      if (strokeMats.red) strokeMats.red.color.copy(plateDark).lerp(base.red, k);
    } else {
      if (strokeMats.green) strokeMats.green.color.copy(base.green);
      if (strokeMats.red) strokeMats.red.color.copy(base.red);
    }

    renderer.render(scene, camera);
    gl.endFrameEXP();
  };
  frame();

  return {
    setPlateColors: (c) => {
      for (const id of Object.keys(c)) applyPlateColor(id, c[id as PlateId] as string);
      dirty = true;
    },
    requestRender: () => {
      dirty = true;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => d.dispose());
      renderer.dispose?.();
    },
  };
}

export default function ZoneModel3D({
  view,
  height,
  tilt = view === 'map' ? 35 : 25,
  backgroundColor = '#0B1120',
  plateColors,
  animate = view !== 'map',
  onPlatePress,
}: ZoneModel3DProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const def = useMemo(() => getScene(view), [view]);
  const fit = useMemo(() => (width > 0 ? fitView(def, width, height, tilt) : null), [def, width, height, tilt]);
  const labels = useMemo(() => (fit ? layoutLabels(fit, def) : []), [fit, def]);

  const mergedColors = useMemo(() => ({ ...DEFAULT_MAP_COLORS, ...(plateColors ?? {}) }), [plateColors]);

  const animateRef = useRef(animate);
  animateRef.current = animate;
  const mounted = useRef(true);
  const handle = useRef<Handle | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  // The GLView below is re-created when view / size / tilt change (see its `key`).
  // Stop the old render loop first so it never draws into a context that is going away.
  useLayoutEffect(
    () => () => {
      handle.current?.dispose();
      handle.current = null;
    },
    [view, width, height, tilt],
  );

  // live colour updates (e.g. availability changes) without rebuilding the scene
  const colorKey = JSON.stringify(mergedColors);
  useEffect(() => {
    handle.current?.setPlateColors(mergedColors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey]);

  const onContextCreate = (gl: any) => {
    if (!fit || !mounted.current) return;
    handle.current?.dispose();
    handle.current = buildAndStart(gl, def, fit, {
      backgroundColor,
      plateColors: mergedColors,
      animateRef,
      isMounted: () => mounted.current,
    });
  };

  const onPress = (e: any) => {
    if (!fit || !onPlatePress) return;
    const { locationX, locationY } = e.nativeEvent;
    const id = pickPlate(fit, def, locationX, locationY);
    if (id && id !== 'bg') onPlatePress(id);
  };

  return (
    <View style={{ width: '100%', height, backgroundColor }} onLayout={onLayout}>
      {fit ? (
        <Pressable style={{ width, height }} onPress={onPress} disabled={!onPlatePress}>
          {/* key: rebuild the GL scene whenever the model, size or tilt changes */}
          <GLView
            key={`${view}-${width}-${height}-${tilt}`}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            onContextCreate={onContextCreate}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {labels.map((l) => {
              const top = l.y - l.fontPx * 0.85;
              const pos =
                l.align === 'left'
                  ? { left: l.x }
                  : l.align === 'right'
                    ? { right: width - l.x }
                    : { left: l.x - 40, width: 80, alignItems: 'center' as const };
              return (
                <View key={l.text} style={[styles.label, { top }, pos]}>
                  <Text
                    style={{
                      color: l.color,
                      fontSize: l.fontPx,
                      lineHeight: l.fontPx * 1.1,
                      fontWeight: l.bold ? '700' : '400',
                      textAlign: l.align === 'center' ? 'center' : undefined,
                    }}
                    numberOfLines={1}
                  >
                    {l.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute' },
});
