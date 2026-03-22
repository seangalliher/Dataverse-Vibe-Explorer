import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { World } from '@/scene/World'
import { FlyControls } from '@/controls/FlyControls'
import { CameraManager } from '@/controls/CameraManager'
import { LoadingScreen } from '@/ui/LoadingScreen'
import { HudOverlay } from '@/ui/HudOverlay'
import { SearchBar } from '@/ui/SearchBar'
import { Minimap } from '@/ui/Minimap'
import { ChatPanel } from '@/ui/ChatPanel'
import { Toolbar } from '@/ui/Toolbar'
import SyncProgressBar from '@/ui/SyncProgressBar'
import TableBrowser from '@/ui/TableBrowser'
import { HoverTooltip } from '@/ui/HoverTooltip'
import { RecordPreviewPanel } from '@/ui/RecordPreviewPanel'
import { useAppStore } from '@/store/appStore'
import { useOnDemandCount } from '@/hooks/useOnDemandCount'

export default function App() {
  const loaded = useAppStore((s) => s.loaded)
  useOnDemandCount()

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#050510' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{ fov: 65, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <World />
          <FlyControls />
          <CameraManager />

          {/* Post-processing pipeline — the "wow" layer */}
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.8}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <Vignette
              offset={0.3}
              darkness={0.7}
              blendFunction={BlendFunction.NORMAL}
            />
            <ChromaticAberration
              offset={new THREE.Vector2(0.0005, 0.0005)}
              blendFunction={BlendFunction.NORMAL}
              radialModulation
              modulationOffset={0.5}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* HTML overlay layer */}
      <LoadingScreen />
      {loaded && (
        <>
          <HudOverlay />
          <RecordPreviewPanel />
          <SearchBar />
          <Minimap />
          <ChatPanel />
          <Toolbar />
          <TableBrowser />
          <SyncProgressBar />
          <HoverTooltip />
        </>
      )}
    </div>
  )
}
