import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Scene } from './Scene'
import { useStore } from '../../store/useStore'
import styles from './Viewport3D.module.css'

export function Viewport3D() {
  const renderError = useStore((s) => s.renderError)
  const isCompiling = useStore((s) => s.isCompiling)
  const pieces = useStore((s) => s.pieces)
  const [showDims, setShowDims] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleHoverPiece = useCallback((index: number | null) => {
    setHoveredIndex(index)
  }, [])

  const hovered = hoveredIndex !== null ? pieces[hoveredIndex] : null

  return (
    <div className={styles.wrapper} onMouseMove={handleMouseMove}>
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
        <Scene showDims={showDims} hoveredIndex={hoveredIndex} onHoverPiece={handleHoverPiece} />
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

      {hovered && (
        <div
          className={styles.tooltip}
          style={{ left: mousePos.x + 16, top: mousePos.y - 48 }}
        >
          <div className={styles.tooltipName}>{hovered.name}</div>
          <div className={styles.tooltipDims}>
            <span className={styles.dimW}>{hovered.w}</span>
            <span className={styles.tooltipSep}> × </span>
            <span className={styles.dimH}>{hovered.h}</span>
            <span className={styles.tooltipSep}> × </span>
            <span className={styles.dimD}>{hovered.d}</span>
            <span style={{ color: '#585b70', marginLeft: 3 }}>mm</span>
          </div>
        </div>
      )}
    </div>
  )
}
