import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";
import earthTexture from "@/assets/earth-detailed.jpg";

const AIRLINER_MODEL_URL = "/models/airliner.glb";
import { flightCameraPose, globePoint, locationCameraPose, type Airport } from "@/lib/airmail";

const RADIUS = 10;
const FLIGHT_SECONDS = 10;
declare global {
  interface Window {
    __airmailFlight?: {
      setProgress: (value: number) => void;
      progress: number;
      camera: number[];
      plane: number[];
    };
  }
}
declare global {
  interface Window {
    __airmailLocation?: {
      setProgress: (value: number) => void;
      progress: number;
      camera: number[];
      checkpoint: number[];
    };
  }
}

function Aircraft() {
  const gl = useThree((state) => state.gl);
  const decoder = useMemo(
    () => new KTX2Loader().setTranscoderPath("/decoders/basis/").detectSupport(gl),
    [gl],
  );
  const { scene } = useGLTF(AIRLINER_MODEL_URL, false, true, (loader) =>
    loader.setKTX2Loader(decoder),
  );
  useEffect(
    () => () => {
      decoder.dispose();
    },
    [decoder],
  );
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.2 / Math.max(size.x, size.y, size.z);
    clone.position.copy(center.multiplyScalar(-scale));
    clone.scale.setScalar(scale);
    return clone;
  }, [scene]);
  return <primitive object={model} />;
}

function Earth({ palette }: { palette: Palette }) {
  const texture = useTexture(earthTexture);
  const gl = useThree((state) => state.gl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={1}
        metalness={0}
        emissiveMap={texture}
        emissive={palette.label}
        emissiveIntensity={0.28}
      />
    </mesh>
  );
}

function City({
  lat,
  lon,
  name,
  code,
  palette,
}: {
  lat: number;
  lon: number;
  name: string;
  code: string;
  palette: Palette;
}) {
  const point = new THREE.Vector3(...globePoint(lat, lon, RADIUS + 0.035));
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 112;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = palette.space;
      context.fillRect(0, 0, 256, 112);
      context.fillStyle = palette.route;
      context.fillRect(0, 0, 5, 112);
      context.fillStyle = palette.label;
      context.font = "bold 36px sans-serif";
      context.fillText(name, 20, 48);
      context.font = "22px sans-serif";
      context.fillText(code, 20, 85);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [name, code, palette]);
  useEffect(
    () => () => {
      label.dispose();
    },
    [label],
  );
  const outward = point.clone().normalize().multiplyScalar(0.35);
  return (
    <group position={point}>
      <mesh>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color={palette.route} />
      </mesh>
      <sprite position={outward} scale={[0.85, 0.37, 1]}>
        <spriteMaterial map={label} transparent />
      </sprite>
    </group>
  );
}
type Palette = { space: string; route: string; label: string; marker: string };
function Flight({
  from,
  to,
  onDone,
  palette,
}: {
  from: Airport;
  to: Airport;
  onDone?: (() => void) | undefined;
  palette: Palette;
}) {
  const plane = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const done = useRef(false);
  const override = useRef<number | null>(null);
  const callback = useRef(onDone);
  callback.current = onDone;
  const route = useMemo(() => {
    const a = new THREE.Vector3(...globePoint(from.lat, from.lon, 1));
    const b = new THREE.Vector3(
      ...globePoint(to.lat, to.lon + (from.lat === to.lat && from.lon === to.lon ? 2 : 0), 1),
    );
    const angle = a.angleTo(b);
    const point = (t: number) => {
      const normal = a
        .clone()
        .multiplyScalar(Math.sin((1 - t) * angle))
        .addScaledVector(b, Math.sin(t * angle))
        .divideScalar(Math.sin(angle))
        .normalize();
      return normal.multiplyScalar(RADIUS + 0.12 + Math.sin(Math.PI * t) * 0.3);
    };
    const points = Array.from({ length: 101 }, (_, i) => point(i / 100));
    return { point, curve: new THREE.CatmullRomCurve3(points) };
  }, [from.lat, from.lon, to.lat, to.lon]);
  const trail = useMemo(() => new THREE.TubeGeometry(route.curve, 100, 0.017, 5, false), [route]);
  useEffect(() => () => trail.dispose(), [trail]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__airmailFlight = {
      setProgress: (value) => {
        override.current = Math.max(0, Math.min(1, value));
      },
      progress: 0,
      camera: [],
      plane: [],
    };
    return () => {
      delete window.__airmailFlight;
    };
  }, []);
  useFrame(({ camera, gl }) => {
    if (!plane.current) return;
    if (started.current === null) started.current = performance.now();
    const raw =
      override.current ??
      Math.min(1, (performance.now() - started.current) / (FLIGHT_SECONDS * 1000));
    const t = raw * raw * (3 - 2 * raw);
    const position = route.point(t);
    const normal = position.clone().normalize();
    const tangent = route
      .point(Math.min(1, t + 0.001))
      .sub(route.point(Math.max(0, t - 0.001)))
      .normalize();
    plane.current.position.copy(position);
    plane.current.up.copy(normal);
    plane.current.lookAt(position.clone().add(tangent));
    const pose = flightCameraPose(t);
    plane.current.rotateZ(pose.bank);
    const sideways = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    camera.position
      .copy(position)
      .addScaledVector(normal, pose.altitude)
      .addScaledVector(tangent, -pose.behind)
      .addScaledVector(sideways, pose.sideways);
    camera.up.copy(normal);
    camera.lookAt(
      position
        .clone()
        .addScaledVector(normal, -0.65 - pose.reveal)
        .addScaledVector(tangent, 0.5),
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = pose.fieldOfView;
      camera.updateProjectionMatrix();
    }
    gl.domElement.parentElement?.setAttribute("data-scene-ready", "true");
    if (window.__airmailFlight) {
      window.__airmailFlight.progress = raw;
      window.__airmailFlight.camera = camera.position.toArray();
      window.__airmailFlight.plane = position.toArray();
    }
    if (raw >= 1 && !done.current) {
      done.current = true;
      callback.current?.();
    }
  });
  return (
    <>
      <mesh geometry={trail}>
        <meshBasicMaterial color={palette.route} transparent opacity={0.85} />
      </mesh>
      <group ref={plane}>
        <Aircraft />
      </group>
    </>
  );
}

function Location({
  location,
  palette,
  onDone,
}: {
  location: Airport;
  palette: Palette;
  onDone?: (() => void) | undefined;
}) {
  const checkpoint = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const override = useRef<number | null>(null);
  const callback = useRef(onDone);
  callback.current = onDone;
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const normal = useMemo(
    () => new THREE.Vector3(...globePoint(location.lat, location.lon, 1)),
    [location.lat, location.lon],
  );
  const north = useMemo(
    () => new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize(),
    [normal],
  );
  const rotation = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
    [normal],
  );
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__airmailLocation = {
      setProgress: (value) => {
        override.current = Math.max(0, Math.min(1, value));
      },
      progress: 0,
      camera: [],
      checkpoint: [],
    };
    return () => {
      delete window.__airmailLocation;
    };
  }, []);
  useFrame(({ camera, gl }) => {
    if (!checkpoint.current) return;
    const now = performance.now();
    if (start.current === null) start.current = now;
    const seconds = (now - start.current) / 1000;
    const progress = override.current ?? Math.min(1, seconds / 4);
    const pose = locationCameraPose(progress, seconds, reducedMotion);
    checkpoint.current.position.copy(normal).multiplyScalar(RADIUS + pose.checkpointHeight);
    camera.position
      .copy(normal)
      .multiplyScalar(RADIUS + pose.altitude)
      .addScaledVector(north, -pose.altitude * 0.18);
    camera.up.copy(north);
    camera.lookAt(normal.clone().multiplyScalar(RADIUS + 0.35));
    gl.domElement.parentElement?.setAttribute("data-scene-ready", "true");
    if (window.__airmailLocation) {
      window.__airmailLocation.progress = progress;
      window.__airmailLocation.camera = camera.position.toArray();
      window.__airmailLocation.checkpoint = checkpoint.current.position.toArray();
    }
    if ((progress >= 1 || reducedMotion) && !done.current) {
      done.current = true;
      callback.current?.();
    }
  });
  return (
    <>
      <group position={normal.clone().multiplyScalar(RADIUS + 0.045)} quaternion={rotation}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.17, 0.22, 48]} />
          <meshBasicMaterial color={palette.route} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={checkpoint} quaternion={rotation}>
        <mesh>
          <sphereGeometry args={[0.14, 24, 16]} />
          <meshStandardMaterial
            color={palette.marker}
            emissive={palette.marker}
            emissiveIntensity={0.35}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation-z={Math.PI}>
          <coneGeometry args={[0.1, 0.24, 24]} />
          <meshStandardMaterial color={palette.marker} />
        </mesh>
      </group>
    </>
  );
}

export default function Flight3D({
  from,
  to,
  mode,
  onDone,
}: {
  from: Airport;
  to: Airport;
  mode?: "location" | undefined;
  onDone?: (() => void) | undefined;
}) {
  const palette = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return {
      space: css.getPropertyValue("--globe-space").trim(),
      route: css.getPropertyValue("--globe-route").trim(),
      label: css.getPropertyValue("--globe-label").trim(),
      marker: css.getPropertyValue("--globe-marker").trim(),
    };
  }, []);
  return (
    <Canvas
      camera={{ position: [-2, 15, -18], fov: 46, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[palette.space]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[-5, 20, -20]} intensity={2} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 20, 0]} scale={[30, 30, 1]} />
        <Lightformer intensity={1} position={[0, 0, -20]} scale={[20, 20, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Earth palette={palette} />
        {mode === "location" ? (
          <Location location={from} palette={palette} onDone={onDone} />
        ) : (
          <>
            <City {...from} palette={palette} />
            <City {...to} palette={palette} />
            <Flight from={from} to={to} onDone={onDone} palette={palette} />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
