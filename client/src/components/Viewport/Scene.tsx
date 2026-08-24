import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import type { GeometryData } from '../../store/useStore'
import { DimensionBox } from './DimensionBox'

function useMeshGeo(geo: GeometryData) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (!meshRef.current) return
    geoRef.current?.dispose()
    const bg = new THREE.BufferGeometry()
    bg.setAttribute('position', new THREE.BufferAttribute(geo.vertices, 3))
    bg.setAttribute('normal', new THREE.BufferAttribute(geo.normals, 3))
    bg.setIndex(new THREE.BufferAttribute(geo.indices, 1))
    geoRef.current = bg
    meshRef.current.geometry = bg
  }, [geo])

  useEffect(() => () => { geoRef.current?.dispose() }, [])

  return meshRef
}

function PieceMesh({
  geo,
  isHovered,
  onHoverChange,
}: {
  geo: GeometryData
  isHovered: boolean
  onHoverChange: (hovered: boolean) => void
}) {
  const meshRef = useMeshGeo(geo)
  return (
    <mesh
      ref={meshRef}
      receiveShadow
      castShadow
      onPointerEnter={(e) => { e.stopPropagation(); onHoverChange(true) }}
      onPointerLeave={() => onHoverChange(false)}
    >
      <bufferGeometry />
      <meshStandardMaterial
        color={isHovered ? '#e8d8b0' : '#c8a46e'}
        emissive={isHovered ? '#5a3c10' : '#000000'}
        emissiveIntensity={isHovered ? 0.45 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function SingleMesh({ geo }: { geo: GeometryData }) {
  const meshRef = useMeshGeo(geo)
  return (
    <mesh ref={meshRef} receiveShadow castShadow>
      <bufferGeometry />
      <meshStandardMaterial color="#c8a46e" side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Scene({
  showDims,
  hoveredIndex,
  onHoverPiece,
}: {
  showDims: boolean
  hoveredIndex: number | null
  onHoverPiece: (index: number | null) => void
}) {
  const importedGeometry = useStore((s) => s.importedGeometry)
  const pieceGeometries = useStore((s) => s.pieceGeometries)
  const boundingBox = useStore((s) => s.boundingBox)

  useFrame(() => {})

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[800, 1200, 600]} intensity={1.2} castShadow />
      <directionalLight position={[-600, -400, -300]} intensity={0.3} />

      {importedGeometry ? (
        <SingleMesh geo={importedGeometry} />
      ) : (
        pieceGeometries.map((geo, i) => (
          <PieceMesh
            key={i}
            geo={geo}
            isHovered={hoveredIndex === i}
            onHoverChange={(hovered) => onHoverPiece(hovered ? i : null)}
          />
        ))
      )}

      <gridHelper args={[4000, 40, '#444', '#333']} />
      <axesHelper args={[200]} />
      {showDims && boundingBox && <DimensionBox bbox={boundingBox} />}
    </>
  )
}
