import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { BoundingBox } from '../../store/useStore'

function mm(v: number) {
  return `${Math.round(v)} mm`
}

export function DimensionBox({ bbox }: { bbox: BoundingBox }) {
  const { w, h, d, cx, cy, cz, maxX, minY, maxZ } = bbox

  const edges = useMemo(() => {
    const geo = new THREE.BoxGeometry(w, h, d)
    return new THREE.EdgesGeometry(geo)
  }, [w, h, d])

  return (
    <group position={[cx, cy, cz]}>
      {/* Bounding box wireframe */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#89b4fa" transparent opacity={0.6} />
      </lineSegments>

      {/* Width label — bottom front edge, X axis */}
      <Html
        position={[0, minY - cy - 28, maxZ - cz + 20]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <DimLabel text={mm(w)} axis="X" />
      </Html>

      {/* Height label — right front edge, Y axis */}
      <Html
        position={[maxX - cx + 28, 0, maxZ - cz + 20]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <DimLabel text={mm(h)} axis="Y" />
      </Html>

      {/* Depth label — bottom right edge, Z axis */}
      <Html
        position={[maxX - cx + 28, minY - cy - 28, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <DimLabel text={mm(d)} axis="Z" />
      </Html>
    </group>
  )
}

function DimLabel({ text, axis }: { text: string; axis: 'X' | 'Y' | 'Z' }) {
  const colors = { X: '#f38ba8', Y: '#a6e3a1', Z: '#89b4fa' }
  return (
    <div style={{
      background: 'rgba(17,17,27,0.85)',
      border: `1px solid ${colors[axis]}55`,
      borderLeft: `3px solid ${colors[axis]}`,
      borderRadius: '4px',
      padding: '2px 7px',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: colors[axis],
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      {axis}: {text}
    </div>
  )
}
