/**
 * PostFX — Screen-space post-processing effects for the 3D viewport.
 *
 * Adds a cinematic, premium look without touching the mesh or material pipeline:
 *   • Bloom — subtle glow on bright/thin backlit areas
 *   • N8AO  — screen-space ambient occlusion (depth in crevices)
 *   • Tone Mapping (ACES Filmic) — cinematic color grading
 *   • Vignette — subtle edge darkening
 *
 * On mobile, heavy effects (SSAO) are disabled for battery/perf.
 */

import { EffectComposer, Bloom, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';

interface PostFXProps {
  /** Disable heavy effects on mobile */
  isMobile?: boolean;
}

export default function PostFX({ isMobile = false }: PostFXProps) {
  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      {/* Bloom: picks up anything >1.0 in the scene (emission from TranslucentMaterial) */}
      <Bloom
        intensity={0.35}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        mipmapBlur
      />

      {/* SSAO: adds realistic shadowing into mesh surface detail — skip on mobile */}
      {!isMobile ? (
        <N8AO
          aoRadius={2.0}
          intensity={1.5}
          distanceFalloff={0.5}
          halfRes
        />
      ) : null}

      {/* Cinematic tone mapping */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* Subtle camera-lens vignette */}
      <Vignette
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
