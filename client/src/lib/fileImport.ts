import type { GeometryData } from '../store/useStore'

// Remap Z-up (OBJ/JSCAD convention) → Y-up (Three.js)
function remap(x: number, y: number, z: number) {
  return [x, z, -y] as const
}

export async function importFile(file: File): Promise<GeometryData> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'stl') {
    const buf = await file.arrayBuffer()
    return isAsciiSTL(buf) ? parseAsciiSTL(buf) : parseBinarySTL(buf)
  }
  if (ext === 'obj') {
    const text = await file.text()
    return parseOBJ(text)
  }
  throw new Error(`Formato no soportado: .${ext}. Usa STL u OBJ.`)
}

// ─── STL ────────────────────────────────────────────────────────────────────

function isAsciiSTL(buf: ArrayBuffer): boolean {
  const header = new TextDecoder().decode(new Uint8Array(buf, 0, 80)).trimStart()
  // Binary STL may accidentally start with "solid" but has triCount != fileSize check
  const triCount = new DataView(buf).getUint32(80, true)
  const expectedSize = 84 + triCount * 50
  return header.startsWith('solid') && expectedSize !== buf.byteLength ? true
    : header.startsWith('solid') && expectedSize === buf.byteLength ? false
    : false
}

function parseBinarySTL(buf: ArrayBuffer): GeometryData {
  const view = new DataView(buf)
  const triCount = view.getUint32(80, true)
  const positions: number[] = []
  const normals: number[] = []
  let off = 84
  for (let i = 0; i < triCount; i++) {
    const nx = view.getFloat32(off, true); off += 4
    const ny = view.getFloat32(off, true); off += 4
    const nz = view.getFloat32(off, true); off += 4
    const [rnx, rny, rnz] = remap(nx, ny, nz)
    for (let j = 0; j < 3; j++) {
      const x = view.getFloat32(off, true); off += 4
      const y = view.getFloat32(off, true); off += 4
      const z = view.getFloat32(off, true); off += 4
      const [rx, ry, rz] = remap(x, y, z)
      positions.push(rx, ry, rz)
      normals.push(rnx, rny, rnz)
    }
    off += 2
  }
  return makeGeometry(positions, normals)
}

function parseAsciiSTL(buf: ArrayBuffer): GeometryData {
  const text = new TextDecoder().decode(buf)
  const positions: number[] = []
  const normals: number[] = []
  let rnx = 0, rny = 0, rnz = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('facet normal')) {
      const p = line.split(/\s+/)
      ;[rnx, rny, rnz] = remap(+p[2], +p[3], +p[4])
    } else if (line.startsWith('vertex')) {
      const p = line.split(/\s+/)
      const [rx, ry, rz] = remap(+p[1], +p[2], +p[3])
      positions.push(rx, ry, rz)
      normals.push(rnx, rny, rnz)
    }
  }
  return makeGeometry(positions, normals)
}

// ─── OBJ ────────────────────────────────────────────────────────────────────

function parseOBJ(text: string): GeometryData {
  const vs: [number, number, number][] = []   // vertex positions
  const vns: [number, number, number][] = []  // vertex normals
  const positions: number[] = []
  const normals: number[] = []

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line[0] === '#') continue

    const parts = line.split(/\s+/)
    const type = parts[0]

    if (type === 'v') {
      vs.push([+parts[1], +parts[2], +parts[3]])
    } else if (type === 'vn') {
      vns.push([+parts[1], +parts[2], +parts[3]])
    } else if (type === 'f') {
      const tokens = parts.slice(1)
      // Parse each token into { vertex index, normal index | null }
      const fv = tokens.map((tok) => {
        const segs = tok.split('/')
        const vi = parseInt(segs[0], 10)
        const ni = segs.length >= 3 && segs[2] !== '' ? parseInt(segs[2], 10) : null
        return { vi, ni }
      })

      // Fan triangulate (handles tris, quads, ngons)
      for (let i = 1; i < fv.length - 1; i++) {
        const tri = [fv[0], fv[i], fv[i + 1]]

        // Resolve vertices (negative = relative to end)
        const triVerts = tri.map(({ vi }) => {
          const idx = vi < 0 ? vs.length + vi : vi - 1
          return vs[idx] ?? ([0, 0, 0] as [number, number, number])
        })

        // Compute face normal when vertex normals are absent
        const hasVN = tri[0].ni !== null && vns.length > 0
        let fn: readonly [number, number, number] = [0, 1, 0]
        if (!hasVN) {
          const [v0, v1, v2] = triVerts
          const ax = v1[0]-v0[0], ay = v1[1]-v0[1], az = v1[2]-v0[2]
          const bx = v2[0]-v0[0], by = v2[1]-v0[1], bz = v2[2]-v0[2]
          const nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx
          const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1
          fn = remap(nx/len, ny/len, nz/len)
        }

        for (let j = 0; j < 3; j++) {
          const [rx, ry, rz] = remap(triVerts[j][0], triVerts[j][1], triVerts[j][2])
          positions.push(rx, ry, rz)

          if (hasVN && tri[j].ni !== null) {
            const niIdx = tri[j].ni! < 0 ? vns.length + tri[j].ni! : tri[j].ni! - 1
            const n = vns[niIdx] ?? [0, 1, 0]
            const [rnx, rny, rnz] = remap(n[0], n[1], n[2])
            normals.push(rnx, rny, rnz)
          } else {
            normals.push(fn[0], fn[1], fn[2])
          }
        }
      }
    }
  }

  if (positions.length === 0) throw new Error('El archivo OBJ no contiene geometría visible.')
  return makeGeometry(positions, normals)
}

// ─── shared ──────────────────────────────────────────────────────────────────

function makeGeometry(positions: number[], normals: number[]): GeometryData {
  const count = positions.length / 3
  const indices = new Uint32Array(count)
  for (let i = 0; i < count; i++) indices[i] = i
  return {
    vertices: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices,
  }
}
