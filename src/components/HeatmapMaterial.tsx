/**
 * HeatmapMaterial — GLSL shader that color-codes vertices by wall thickness.
 *
 * Blue → Cyan → Green → Yellow → Red gradient mapped to minThickness…maxThickness.
 * Helps users visually identify thin spots (blue = fragile) and thick areas
 * (red = opaque/structural) before printing.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

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

  varying float vThickness;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  // Classic heatmap: blue → cyan → green → yellow → red
  vec3 heatmap(float t) {
    // 5-stop gradient
    vec3 c;
    if (t < 0.25) {
      c = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), t / 0.25);
    } else if (t < 0.5) {
      c = mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), (t - 0.25) / 0.25);
    } else if (t < 0.75) {
      c = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.5) / 0.25);
    } else {
      c = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (t - 0.75) / 0.25);
    }
    return c;
  }

  void main() {
    // Normalize thickness to 0–1
    float range = uMaxThickness - uMinThickness;
    float t = clamp((vThickness - uMinThickness) / max(range, 0.001), 0.0, 1.0);

    // Main heatmap color
    vec3 color = heatmap(t);

    // Simple directional lighting for depth perception
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;

    // Slight metallic highlight
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * 0.15;

    color = color * diffuse + vec3(spec);

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface HeatmapMaterialProps {
  minThickness: number;
  maxThickness: number;
  wireframe?: boolean;
}

export default function HeatmapMaterial({
  minThickness,
  maxThickness,
  wireframe = false,
}: HeatmapMaterialProps) {
  const uniforms = useMemo(() => ({
    uMinThickness: { value: minThickness },
    uMaxThickness: { value: maxThickness },
  }), [minThickness, maxThickness]);

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
