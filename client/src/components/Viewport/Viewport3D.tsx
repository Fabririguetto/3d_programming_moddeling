import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Scene } from './Scene'
import { useStore } from '../../store/useStore'
import styles from './Viewport3D.module.css'

export function Viewport3D() {
  const renderError = useStore((s) => s.renderError)
  const isCompiling = useStore((s) => s.isCompiling)

  return (
    <div className={styles.wrapper}>
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[800, 900, 1200]} fov={45} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.2}
          panSpeed={0.8}
        />
        <Scene />
      </Canvas>

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
