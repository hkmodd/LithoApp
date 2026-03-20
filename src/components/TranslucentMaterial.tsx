import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Custom GLSL ShaderMaterial that simulates realistic lithophane backlight:
 * Thin areas glow warm amber (like real backlit PLA/resin),
 * thick areas stay dark/opaque.
 *
 * Uses per-vertex thickness attribute from the engine to drive
 * light transmission — no uniform material approximation.
 */

const vertexShader = /* glsl */ `
  attribute float aThickness;
  varying float vThickness;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vThickness = aThickness;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uMinThickness;
  uniform float uMaxThickness;
  uniform float uGamma;
  uniform vec3 uBacklightColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uLightDir;
  uniform float uAmbient;

  varying float vThickness;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Normalize thickness to 0–1 range
    float range = uMaxThickness - uMinThickness;
    float t = clamp((vThickness - uMinThickness) / max(range, 0.001), 0.0, 1.0);

    // Transmission: thin (t≈0) → high transmission, thick (t≈1) → low
    float transmission = 1.0 - pow(t, uGamma);

    // Subsurface scattering approximation: backlight through material
    float NdotL = dot(vNormal, normalize(uLightDir));
    // For the back face, we want light coming from behind
    float backlight = max(-NdotL, 0.0) * 0.6 + 0.4;

    // Mix backlight color with surface color based on transmission
    vec3 litColor = mix(uSurfaceColor, uBacklightColor, transmission * backlight);

    // --- Fresnel rim-light: edges catch light like real translucent plastic ---
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    vec3 rimColor = uBacklightColor * fresnel * 0.25 * (0.3 + transmission * 0.7);
    litColor += rimColor;

    // --- Specular highlight: surface sheen on the lit side ---
    vec3 halfDir = normalize(viewDir + normalize(-uLightDir));
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 48.0);
    litColor += vec3(1.0) * spec * 0.12 * transmission;

    // HDR emission for very thin areas — bloom post-processing picks this up
    // Values >1.0 intentionally exceed LDR so the bloom pass creates natural glow
    vec3 emission = uBacklightColor * transmission * transmission * 0.6;

    // Combine
    vec3 finalColor = litColor + emission;

    // Slight ambient fill so thick areas aren't pure black
    finalColor += uSurfaceColor * uAmbient;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface TranslucentMaterialProps {
  minThickness: number;
  maxThickness: number;
  wireframe?: boolean;
  gamma?: number;
}

export default function TranslucentMaterial({
  minThickness,
  maxThickness,
  wireframe = false,
  gamma = 1.4,
}: TranslucentMaterialProps) {
  const uniforms = useMemo(() => ({
    uMinThickness: { value: minThickness },
    uMaxThickness: { value: maxThickness },
    uGamma: { value: gamma },
    uBacklightColor: { value: new THREE.Color('#FFF0D0') },
    uSurfaceColor: { value: new THREE.Color('#1a1410') },
    uLightDir: { value: new THREE.Vector3(0, 0, -1) },
    uAmbient: { value: 0.04 },
  }), [minThickness, maxThickness, gamma]);

  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      wireframe={wireframe}
      side={THREE.DoubleSide}
    />
  );
}
