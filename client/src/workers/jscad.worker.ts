import * as jscadModeling from '@jscad/modeling'

const jscad = jscadModeling

export type WorkerRequest =
  | { type: 'compile'; code: string }
  | { type: 'export-stl' }
  | { type: 'export-obj' }

export interface WorkerPiece {
  name: string
  w: number  // JSCAD X range → Ancho
  d: number  // JSCAD Y range → Profundidad
  h: number  // JSCAD Z range → Alto
}

export interface PieceMeshBuffers {
  v: ArrayBuffer  // vertices (Float32)
  i: ArrayBuffer  // indices (Uint32)
  n: ArrayBuffer  // normals (Float32)
}

export type WorkerResponse =
  | { type: 'geometry'; vertices: ArrayBuffer; indices: ArrayBuffer; normals: ArrayBuffer; pieces: WorkerPiece[]; pieceMeshes: PieceMeshBuffers[] }
  | { type: 'error'; message: string }
  | { type: 'stl-data'; data: ArrayBuffer }
  | { type: 'obj-data'; data: string }

type Geom3 = jscadModeling.geometries.geom3.Geom3

let lastPieces: { name: string; geom: Geom3 }[] | null = null

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data

  if (req.type === 'compile') {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('jscad', `${req.code}\n return main()`)
      const result = fn(jscad)

      // Normalize result to named pieces
      let named: { name: string; geom: Geom3 }[]
      if (Array.isArray(result)) {
        if (result.length > 0 && result[0] != null && typeof result[0] === 'object' && 'geo' in result[0]) {
          // Named: [{ name, geo }]
          named = result.map((item, i) => ({
            name: typeof item.name === 'string' ? item.name : `Pieza ${i + 1}`,
            geom: item.geo as Geom3,
          }))
        } else {
          // Plain geometry array
          named = (result as Geom3[]).map((geom, i) => ({ name: `Pieza ${i + 1}`, geom }))
        }
      } else {
        named = [{ name: 'Modelo', geom: result as Geom3 }]
      }

      lastPieces = named

      const allGeoms = named.map((p) => p.geom)
      const mesh = toBuffers(allGeoms)

      // Per-piece geometry for hover interaction
      const pieceMeshes: PieceMeshBuffers[] = named.map(({ geom }) => {
        const pm = toBuffers([geom])
        return { v: pm.vertices, i: pm.indices, n: pm.normals }
      })

      // Per-piece bounding boxes in JSCAD space (Z-up: x=width, y=depth, z=height)
      const pieces: WorkerPiece[] = named.map(({ name, geom }) => {
        const polys = jscadModeling.geometries.geom3.toPolygons(geom)
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity
        for (const poly of polys) {
          for (const v of poly.vertices) {
            const [vx, vy, vz] = v as [number, number, number]
            if (vx < minX) minX = vx; if (vx > maxX) maxX = vx
            if (vy < minY) minY = vy; if (vy > maxY) maxY = vy
            if (vz < minZ) minZ = vz; if (vz > maxZ) maxZ = vz
          }
        }
        return {
          name,
          w: Math.round(maxX - minX),
          d: Math.round(maxY - minY),
          h: Math.round(maxZ - minZ),
        }
      })

      const transferables: ArrayBuffer[] = [mesh.vertices, mesh.indices, mesh.normals]
      for (const pm of pieceMeshes) transferables.push(pm.v, pm.i, pm.n)

      self.postMessage(
        { type: 'geometry', ...mesh, pieces, pieceMeshes },
        transferables
      )
    } catch (err: unknown) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (req.type === 'export-stl') {
    if (!lastPieces) {
      self.postMessage({ type: 'error', message: 'No hay geometría compilada' })
      return
    }
    try {
      const buf = buildSTL(lastPieces.map((p) => p.geom))
      self.postMessage({ type: 'stl-data', data: buf }, [buf])
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (req.type === 'export-obj') {
    if (!lastPieces) {
      self.postMessage({ type: 'error', message: 'No hay geometría compilada' })
      return
    }
    try {
      const text = buildOBJ(lastPieces.map((p) => p.geom))
      self.postMessage({ type: 'obj-data', data: text })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getTriangles(geoms: Geom3[]) {
  const { geometries } = jscadModeling
  type Triangle = { n: [number, number, number]; v: [[number,number,number],[number,number,number],[number,number,number]] }
  const tris: Triangle[] = []

  for (const geom of geoms) {
    const polys = geometries.geom3.toPolygons(geom)
    for (const polygon of polys) {
      const verts = polygon.vertices
      for (let i = 1; i < verts.length - 1; i++) {
        const v0 = verts[0] as [number,number,number]
        const v1 = verts[i] as [number,number,number]
        const v2 = verts[i + 1] as [number,number,number]

        const ax = v1[0]-v0[0], ay = v1[1]-v0[1], az = v1[2]-v0[2]
        const bx = v2[0]-v0[0], by = v2[1]-v0[1], bz = v2[2]-v0[2]
        const nx = ay*bz - az*by
        const ny = az*bx - ax*bz
        const nz = ax*by - ay*bx
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1

        tris.push({ n: [nx/len, ny/len, nz/len], v: [v0, v1, v2] })
      }
    }
  }
  return tris
}

function buildSTL(geoms: Geom3[]): ArrayBuffer {
  const tris = getTriangles(geoms)
  const buf = new ArrayBuffer(84 + tris.length * 50)
  const view = new DataView(buf)
  view.setUint32(80, tris.length, true)
  let off = 84
  for (const { n, v } of tris) {
    view.setFloat32(off, n[0], true); off += 4
    view.setFloat32(off, n[1], true); off += 4
    view.setFloat32(off, n[2], true); off += 4
    for (const pt of v) {
      view.setFloat32(off, pt[0], true); off += 4
      view.setFloat32(off, pt[1], true); off += 4
      view.setFloat32(off, pt[2], true); off += 4
    }
    view.setUint16(off, 0, true); off += 2
  }
  return buf
}

function buildOBJ(geoms: Geom3[]): string {
  const tris = getTriangles(geoms)
  const lines: string[] = ['# GeoStudio3D export', '']
  let vi = 1
  for (const { n, v } of tris) {
    for (const pt of v) lines.push(`v ${pt[0].toFixed(4)} ${pt[1].toFixed(4)} ${pt[2].toFixed(4)}`)
    lines.push(`vn ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}`)
    const ni = Math.floor(vi / 3) + 1
    lines.push(`f ${vi}//${ni} ${vi+1}//${ni} ${vi+2}//${ni}`)
    vi += 3
  }
  return lines.join('\n')
}

function toBuffers(geoms: Geom3[]) {
  const tris = getTriangles(geoms)
  const allVerts: number[] = []
  const allNormals: number[] = []
  const allIndices: number[] = []
  let offset = 0

  for (const { n, v } of tris) {
    for (const pt of v) {
      // JSCAD Z-up → Three.js Y-up: [x, y, z] → [x, z, -y]
      allVerts.push(pt[0], pt[2], -pt[1])
      allNormals.push(n[0], n[2], -n[1])
    }
    allIndices.push(offset, offset + 1, offset + 2)
    offset += 3
  }

  return {
    vertices: new Float32Array(allVerts).buffer,
    normals: new Float32Array(allNormals).buffer,
    indices: new Uint32Array(allIndices).buffer,
  }
}
