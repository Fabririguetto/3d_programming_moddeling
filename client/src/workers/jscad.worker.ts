import * as jscadModeling from '@jscad/modeling'

const jscad = jscadModeling

export type WorkerRequest =
  | { type: 'compile'; code: string }
  | { type: 'export-stl' }
  | { type: 'export-obj' }

export type WorkerResponse =
  | { type: 'geometry'; vertices: ArrayBuffer; indices: ArrayBuffer; normals: ArrayBuffer }
  | { type: 'error'; message: string }
  | { type: 'stl-data'; data: ArrayBuffer }
  | { type: 'obj-data'; data: string }

type Geom3 = jscadModeling.geometries.geom3.Geom3

let lastGeometries: Geom3[] | null = null

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data

  if (req.type === 'compile') {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('jscad', `${req.code}\n return main()`)
      const result = fn(jscad)
      lastGeometries = (Array.isArray(result) ? result : [result]) as Geom3[]

      const mesh = toBuffers(lastGeometries)
      self.postMessage(
        { type: 'geometry', ...mesh },
        [mesh.vertices, mesh.indices, mesh.normals]
      )
    } catch (err: unknown) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (req.type === 'export-stl') {
    if (!lastGeometries) {
      self.postMessage({ type: 'error', message: 'No hay geometría compilada' })
      return
    }
    try {
      const buf = buildSTL(lastGeometries)
      self.postMessage({ type: 'stl-data', data: buf }, [buf])
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (req.type === 'export-obj') {
    if (!lastGeometries) {
      self.postMessage({ type: 'error', message: 'No hay geometría compilada' })
      return
    }
    try {
      const text = buildOBJ(lastGeometries)
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
  // Binary STL: 80-byte header + 4-byte count + 50 bytes per triangle
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
  const lines: string[] = ['# Forma3D export', '']
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
      // same remap for normals
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
