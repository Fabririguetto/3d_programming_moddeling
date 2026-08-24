import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Scene } from './Scene'
import { useStore } from '../../store/useStore'
import styles from './Viewport3D.module.css'

export function Viewport3D() {
  const renderError = useStore((s) => s.renderError)
  const isCompiling = useStore((s) => s.isCompiling)
  const [showDims, setShowDims] = useState(true)

  return (
    <div className={styles.wrapper}>
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[1400, 900, 1400]} fov={45} near={1} far={500000} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.2}
          panSpeed={0.8}
          maxDistance={200000}
        />
        <Scene showDims={showDims} />
      </Canvas>

      <div className={styles.controls}>
        <button
          className={styles.toggleBtn + (showDims ? ' ' + styles.toggleActive : '')}
          onClick={() => setShowDims((v) => !v)}
          title="Mostrar/ocultar medidas"
        >
          📐 Medidas
        </button>
      </div>

      {isCompiling && (
        <div className={styles.badge + ' ' + styles.compiling}>Compilando…</div>
      )}

      {renderError && (
        <div className={styles.errorPanel}>
          <strong>Error</strong>
          <pre>{renderError}</pre>
        </div>
      )}
    </div>
  )
}
