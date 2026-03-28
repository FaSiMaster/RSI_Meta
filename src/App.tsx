import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { Scene } from './components/Scene'
import { VRButton } from './components/VRButton'
import { OnboardingScreen } from './components/OnboardingScreen'
import type { UserSession } from './types'

// XR Store wird ausserhalb der Komponente erstellt (Singleton)
const xrStore = createXRStore()

export default function App() {
  const [sessionReady, setSessionReady] = useState(false)
  const [_session, setSession] = useState<UserSession | null>(null)

  const handleStart = (session: UserSession) => {
    setSession(session)
    setSessionReady(true)
  }

  // Onboarding anzeigen bis Benutzer Name, Thema und Szene gewählt hat
  if (!sessionReady) {
    return <OnboardingScreen onStart={handleStart} />
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#0f0f1a',
      }}
    >
      {/* VR-Einstieg UI */}
      <VRButton store={xrStore} />

      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [0, 1.6, 4],
          fov: 75,
          near: 0.01,
          far: 500,
        }}
        gl={{ antialias: true }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
      >
        <XR store={xrStore}>
          <Scene />
        </XR>
      </Canvas>
    </div>
  )
}
