import * as jscadModeling from '@jscad/modeling'
import { serialize as serializeStl } from '@jscad/stl-serializer'
import { serialize as serializeObj } from '@jscad/obj-serializer'

// Expose jscad globally so user code can access it via `jscad.primitives` etc.
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

let lastGeometries: ReturnType<typeof jscadModeling.primitives.cuboid>[] | null = null

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data

  if (req.type === 'compile') {
    try {
      // Build user function with jscad in scope
      // eslint-disable-next-line no-new-func
      const fn = new Function('jscad', `${req.code}\n return main()`)
      const result = fn(jscad)
      const geoms = Array.isArray(result) ? result : [result]
      lastGeometries = geoms

      // Convert to Three.js-compatible buffers
      const mesh = toBuffers(geoms)
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
      const rawStl = serializeStl({ binary: true }, ...lastGeometries)
      const buf = rawStl instanceof Uint8Array ? rawStl.buffer : rawStl[0]
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
      const lines = serializeObj({}, ...lastGeometries)
      const text = Array.isArray(lines) ? lines.join('\n') : lines
      self.postMessage({ type: 'obj-data', data: text })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }
}

function toBuffers(geoms: ReturnType<typeof jscadModeling.primitives.cuboid>[]) {
  const { geometries } = jscadModeling
  const allVerts: number[] = []
  const allNormals: number[] = []
  const allIndices: number[] = []
  let offset = 0

  for (const geom of geoms) {
    // Convert to triangles
    const poly = geometries.geom3.toPolygons(geom as jscadModeling.geometries.geom3.Geom3)

    for (const polygon of poly) {
      const verts = polygon.vertices
      // fan triangulation
      for (let i = 1; i < verts.length - 1; i++) {
        const v0 = verts[0]
        const v1 = verts[i]
        const v2 = verts[i + 1]

        allVerts.push(v0[0], v0[1], v0[2])
        allVerts.push(v1[0], v1[1], v1[2])
        allVerts.push(v2[0], v2[1], v2[2])

        // Compute face normal
        const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2]
        const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2]
        const nx = ay * bz - az * by
        const ny = az * bx - ax * bz
        const nz = ax * by - ay * bx
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
        allNormals.push(nx / len, ny / len, nz / len)
        allNormals.push(nx / len, ny / len, nz / len)
        allNormals.push(nx / len, ny / len, nz / len)

        allIndices.push(offset, offset + 1, offset + 2)
        offset += 3
      }
    }
  }

  const vertices = new Float32Array(allVerts).buffer
  const normals = new Float32Array(allNormals).buffer
  const indices = new Uint32Array(allIndices).buffer
  return { vertices, indices, normals }
}
