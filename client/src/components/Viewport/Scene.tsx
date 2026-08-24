import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { DimensionBox } from './DimensionBox'

export function Scene({ showDims }: { showDims: boolean }) {
  const geometry = useStore((s) => s.importedGeometry ?? s.geometry)
  const boundingBox = useStore((s) => s.boundingBox)
  const meshRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (!meshRef.current) return
    if (geoRef.current) geoRef.current.dispose()

    if (!geometry) {
      meshRef.current.geometry = new THREE.BufferGeometry()
      return
    }

    const bg = new THREE.BufferGeometry()
    bg.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3))
    bg.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3))
    bg.setIndex(new THREE.BufferAttribute(geometry.indices, 1))
    bg.computeBoundingBox()
    geoRef.current = bg
    meshRef.current.geometry = bg
  }, [geometry])

  useFrame(() => {})

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[800, 1200, 600]} intensity={1.2} castShadow />
      <directionalLight position={[-600, -400, -300]} intensity={0.3} />
      <mesh ref={meshRef} receiveShadow castShadow>
        <bufferGeometry />
        <meshStandardMaterial color="#c8a46e" side={THREE.DoubleSide} />
      </mesh>
      <gridHelper args={[4000, 40, '#444', '#333']} />
      <axesHelper args={[200]} />
      {showDims && boundingBox && <DimensionBox bbox={boundingBox} />}
    </>
  )
}
