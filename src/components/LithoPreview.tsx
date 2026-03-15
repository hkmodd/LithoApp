import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface LithoPreviewProps {
  positions: Float32Array | null;
  indices: Uint32Array | null;
  wireframe: boolean;
  simulateLight: boolean;
}

export default function LithoPreview({ positions, indices, wireframe, simulateLight }: LithoPreviewProps) {
  const geometry = useMemo(() => {
    if (!positions || !indices) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [positions, indices]);

  if (!geometry) return null;

  return (
    <Canvas shadows camera={{ position: [0, -120, 80], fov: 45 }}>
      <color attach="background" args={['#050505']} />
      
      {/* Backlight to simulate lithophane effect */}
      {simulateLight && (
        <directionalLight position={[0, 0, -100]} intensity={3.5} color="#ffffff" />
      )}
      
      <Stage environment="city" intensity={0.4} adjustCamera={true}>
        <mesh geometry={geometry} castShadow receiveShadow>
          {simulateLight ? (
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
