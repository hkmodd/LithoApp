import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, ContactShadows, Environment } from '@react-three/drei';
import { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import TranslucentMaterial from './TranslucentMaterial';
import HeatmapMaterial from './HeatmapMaterial';
import PostFX from './PostFX';

/** A single palette layer to render in the 3D scene */
export interface PaletteLayer {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array | null;
  uvs?: Float32Array | null;
  color: string;      // filament hex
  visible: boolean;   // toggle from AMS panel
  label: string;      // filament name (for debugging)
}

interface LithoPreviewProps {
  positions: Float32Array | null;
  indices: Uint32Array | null;
  normals: Float32Array | null;
  uvs?: Float32Array | null;
  thickness?: Float32Array | null;
  wireframe: boolean;
  simulateLight: boolean;
  textureUrl?: string | null;
  showTexture?: boolean;
  showHeatmap?: boolean;
  isMobile?: boolean;
  minThickness?: number;
  maxThickness?: number;
  /** When provided, renders stacked palette layers instead of the single mesh */
  paletteLayers?: PaletteLayer[];
}

/** Layer separation in scene units for visual clarity */
const LAYER_OFFSET_Y = 0.5;

/** Inner component: builds a BufferGeometry for one palette layer */
function PaletteLayerMesh({ layer, index, total, wireframe }: {
  layer: PaletteLayer; index: number; total: number; wireframe: boolean;
}) {
  const geoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  useEffect(() => {
    const geo = geoRef.current;
    geo.setAttribute('position', new THREE.BufferAttribute(layer.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(layer.indices, 1));
    if (layer.normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(layer.normals, 3));
    } else {
      geo.deleteAttribute('normal');
      geo.computeVertexNormals();
    }
    geo.attributes.position.needsUpdate = true;
    if (geo.index) geo.index.needsUpdate = true;
    if (geo.attributes.normal) (geo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }, [layer.positions, layer.indices, layer.normals]);

  // Centre the stack around Y=0
  const yOffset = (index - (total - 1) / 2) * LAYER_OFFSET_Y;

  if (!layer.visible) return null;

  return (
    <mesh geometry={geoRef.current} position={[0, yOffset, 0]} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={layer.color}
        transmission={0.55}
        opacity={1}
        metalness={0}
        roughness={0.18}
        ior={1.5}
        thickness={2.0}
        clearcoat={0.3}
        clearcoatRoughness={0.1}
        envMapIntensity={0.7}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

export default function LithoPreview({
  positions, indices, normals, uvs, thickness,
  wireframe, simulateLight,
  textureUrl, showTexture,
  showHeatmap = false,
  isMobile = false,
  minThickness = 0.4,
  maxThickness = 3.0,
  paletteLayers,
}: LithoPreviewProps) {

  // Persistent geometry ref — we update attributes in-place instead of
  // recreating the BufferGeometry each time. This avoids GC pressure and
  // lets Three.js lazily re-upload data on the next render frame.
  const geoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  useEffect(() => {
    if (!positions || !indices) return;
    const geo = geoRef.current;

    // Update (or create) each attribute in-place
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    if (normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      geo.deleteAttribute('normal');
      geo.computeVertexNormals();
    }

    if (uvs) {
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    } else {
      geo.deleteAttribute('uv');
    }

    if (thickness) {
      geo.setAttribute('aThickness', new THREE.BufferAttribute(thickness, 1));
    } else {
      geo.deleteAttribute('aThickness');
    }

    // Signal Three.js to re-upload on next frame
    geo.attributes.position.needsUpdate = true;
    if (geo.index) geo.index.needsUpdate = true;
    if (geo.attributes.normal) (geo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    if (geo.attributes.uv) (geo.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    if (geo.attributes.aThickness) (geo.attributes.aThickness as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  }, [positions, indices, normals, uvs, thickness]);

  // Derive whether geometry has data (for conditional render below)
  const geometry = positions && indices ? geoRef.current : null;

  // Load texture from source image — use ref to avoid stale closure on dispose
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    if (!textureUrl) { setTexture(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textureRef.current = tex;
      setTexture(tex);
    });
    return () => { textureRef.current?.dispose(); textureRef.current = null; };
  }, [textureUrl]);

  const useHeatmap = showHeatmap && thickness;
  const useTexture = showTexture && texture && uvs;
  const useTranslucent = simulateLight && thickness;

  // Check if we have *any* renderable content
  const hasPaletteLayers = paletteLayers && paletteLayers.length > 0;
  if (!geometry && !hasPaletteLayers) return null;

  return (
    <Canvas
      shadows
      camera={{ position: [0, -120, 80], fov: 45 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={isMobile ? { antialias: true, powerPreference: 'low-power' } : { antialias: true }}
    >
      <color attach="background" args={['#050505']} />
      
      {/* Backlight for non-translucent fallback */}
      {simulateLight && !useTranslucent && (
        <directionalLight position={[0, 0, -100]} intensity={3.5} color="#ffffff" />
      )}

      {/* HDRI environment for realistic PBR reflections */}
      <Environment preset="sunset" background={false} />
      
      <Stage
        environment={null}
        intensity={useTranslucent ? 0.15 : 0.4}
        adjustCamera={true}
        shadows
      >
        {/* ── Palette layers (stacked, translucent, coloured) ────── */}
        {hasPaletteLayers ? (
          paletteLayers!.map((layer, i) => (
            <PaletteLayerMesh
              key={`palette-${i}-${layer.label}`}
              layer={layer}
              index={i}
              total={paletteLayers!.length}
              wireframe={wireframe}
            />
          ))
        ) : geometry ? (
          /* ── Single-mesh (classic / color-litho modes) ──────── */
          <mesh geometry={geometry} castShadow receiveShadow>
          {useHeatmap ? (
            /* Thickness heatmap: blue→cyan→green→yellow→red */
            <HeatmapMaterial
              minThickness={minThickness}
              maxThickness={maxThickness}
              wireframe={wireframe}
            />
          ) : useTexture ? (
            /* Color-mapped mode: project source image onto mesh */
            <meshStandardMaterial
              map={texture}
              roughness={0.35}
              metalness={0.02}
              envMapIntensity={0.6}
              wireframe={wireframe}
              side={THREE.FrontSide}
            />
          ) : useTranslucent ? (
            /* Per-vertex translucent backlight shader */
            <TranslucentMaterial
              minThickness={minThickness}
              maxThickness={maxThickness}
              wireframe={wireframe}
            />
          ) : simulateLight ? (
            /* Enhanced PBR: simulate glossy PLA/resin plastic */
            <meshPhysicalMaterial
              color="#ffffff"
              transmission={0.8}
              opacity={1}
              metalness={0.0}
              roughness={0.15}
              ior={1.5}
              thickness={5.0}
              clearcoat={0.4}
              clearcoatRoughness={0.1}
              sheen={0.3}
              sheenRoughness={0.4}
              sheenColor="#FFF8E7"
              envMapIntensity={0.8}
              wireframe={wireframe}
              side={THREE.FrontSide}
            />
          ) : (
            /* Default: clean, slightly warm plastic */
            <meshStandardMaterial
              color="#f0f0f0"
              roughness={0.25}
              metalness={0.05}
              envMapIntensity={0.5}
              wireframe={wireframe}
              side={THREE.FrontSide}
            />
          )}
          </mesh>
        ) : null}
      </Stage>

      {/* Soft contact shadows for grounding */}
      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.4}
        blur={2.5}
        far={150}
        resolution={isMobile ? 128 : 256}
      />
      
      {/* 3D Printer Bed (Floor) */}
      <Grid 
        infiniteGrid 
        fadeDistance={200} 
        sectionColor="#2563EB" 
        cellColor="#141414" 
        position={[0, -0.01, 0]} 
      />

      {/* Screen-space post-processing */}
      <PostFX isMobile={isMobile} />
      
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2 + 0.1}
        enableDamping
        dampingFactor={0.12}
        minDistance={10}
        maxDistance={500}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </Canvas>
  );
}
