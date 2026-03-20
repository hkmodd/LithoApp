import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, ContactShadows, Environment } from '@react-three/drei';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import TranslucentMaterial from './TranslucentMaterial';
import HeatmapMaterial from './HeatmapMaterial';
import PostFX from './PostFX';

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
  /** Hex colour to tint the mesh (palette mode) */
  paletteColor?: string | null;
}

export default function LithoPreview({
  positions, indices, normals, uvs, thickness,
  wireframe, simulateLight,
  textureUrl, showTexture,
  showHeatmap = false,
  isMobile = false,
  minThickness = 0.4,
  maxThickness = 3.0,
  paletteColor,
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

  if (!geometry) return null;

  // Resolve the colour used for default / simulateLight materials
  const meshColor = paletteColor || '#f0f0f0';
  const meshColorLight = paletteColor || '#ffffff';

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
            color={meshColorLight}
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
          /* Default: clean plastic, tinted with paletteColor if present */
          <meshStandardMaterial
            color={meshColor}
            roughness={0.25}
            metalness={0.05}
            envMapIntensity={0.5}
            wireframe={wireframe}
            side={THREE.FrontSide}
          />
        )}
        </mesh>
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
