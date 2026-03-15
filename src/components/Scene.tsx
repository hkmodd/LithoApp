import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface SceneProps {
  positions: Float32Array | null;
  indices: Uint32Array | null;
  wireframe: boolean;
}

export default function Scene({ positions, indices, wireframe }: SceneProps) {
  const geometry = useMemo(() => {
    if (!positions || !indices) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [positions, indices]);

  return (
    <Canvas shadows camera={{ position: [0, -100, 100], fov: 45 }}>
      <color attach="background" args={['#050505']} />
      <Stage environment="city" intensity={0.5}>
        {geometry && (
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#E4E3E0" 
              roughness={0.4} 
              metalness={0.1} 
              wireframe={wireframe}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </Stage>
      <OrbitControls makeDefault />
    </Canvas>
  );
}
