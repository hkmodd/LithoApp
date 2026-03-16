import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid } from '@react-three/drei';
import { useMemo, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import TranslucentMaterial from './TranslucentMaterial';

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
  isMobile?: boolean;
  minThickness?: number;
  maxThickness?: number;
}

export default function LithoPreview({
  positions, indices, normals, uvs, thickness,
  wireframe, simulateLight,
  textureUrl, showTexture,
  isMobile = false,
  minThickness = 0.4,
  maxThickness = 3.0,
}: LithoPreviewProps) {

  // Build geometry with optional UVs and thickness attribute
  const geometry = useMemo(() => {
    if (!positions || !indices) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    if (normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      geo.computeVertexNormals();
    }
    if (uvs) {
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
    if (thickness) {
      geo.setAttribute('aThickness', new THREE.BufferAttribute(thickness, 1));
    }
    return geo;
  }, [positions, indices, normals, uvs, thickness]);

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

  const useTexture = showTexture && texture && uvs;
  const useTranslucent = simulateLight && thickness;

  if (!geometry) return null;

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
      
      <Stage
        environment="city"
        intensity={useTranslucent ? 0.15 : 0.4}
        adjustCamera={true}
        shadows
      >
        <mesh geometry={geometry} castShadow receiveShadow>
          {useTexture ? (
            /* Color-mapped mode: project source image onto mesh */
            <meshStandardMaterial
              map={texture}
              roughness={0.4}
              metalness={0.05}
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
            <meshPhysicalMaterial
              color="#ffffff"
              transmission={0.8}
              opacity={1}
              metalness={0.0}
              roughness={0.2}
              ior={1.5}
              thickness={5.0}
              wireframe={wireframe}
              side={THREE.FrontSide}
            />
          ) : (
            <meshStandardMaterial
              color="#f0f0f0"
              roughness={0.3}
              metalness={0.1}
              wireframe={wireframe}
              side={THREE.FrontSide}
            />
          )}
        </mesh>
      </Stage>
      
      {/* 3D Printer Bed (Floor) */}
      <Grid 
        infiniteGrid 
        fadeDistance={200} 
        sectionColor="#2563EB" 
        cellColor="#141414" 
        position={[0, -0.01, 0]} 
      />
      
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 + 0.1} />
    </Canvas>
  );
}
