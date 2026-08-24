import { create } from 'zustand'

export interface Version {
  id: string
  label: string
  code: string
  timestamp: number
}

export interface Project {
  id: string
  name: string
  code: string
  versions: Version[]
  updatedAt: number
}

export interface GeometryData {
  vertices: Float32Array
  indices: Uint32Array
  normals: Float32Array
}

export interface BoundingBox {
  w: number; h: number; d: number
  cx: number; cy: number; cz: number
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
}

function computeBBox(vertices: Float32Array): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
  }
  return {
    w: maxX - minX, h: maxY - minY, d: maxZ - minZ,
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, cz: (minZ + maxZ) / 2,
    minX, maxX, minY, maxY, minZ, maxZ,
  }
}

export interface ProjectMeta {
  id: string
  name: string
  updatedAt: number
}

interface Store {
  // Project
  project: Project
  setProjectName: (name: string) => void

  // Editor
  code: string
  setCode: (code: string) => void

  // Render — JSCAD compiled
  geometry: GeometryData | null
  boundingBox: BoundingBox | null
  renderError: string | null
  isCompiling: boolean
  setGeometry: (g: GeometryData | null) => void
  setRenderError: (e: string | null) => void
  setIsCompiling: (v: boolean) => void

  // Import mode — imported file displayed instead of JSCAD output
  importedGeometry: GeometryData | null
  importedName: string | null
  setImportedGeometry: (g: GeometryData | null, name: string | null) => void
  clearImport: () => void

  // Versions
  saveVersion: (label?: string) => void
  loadVersion: (id: string) => void

  // Projects persistence
  projectsMeta: ProjectMeta[]
  saveProject: () => void
  loadProject: (id: string) => boolean
  deleteProject: (id: string) => void
  newProject: () => void
}

const DEFAULT_CODE = `// Forma3D — Editor paramétrico
// Usa las funciones de @jscad/modeling
// La función main() devuelve la geometría a renderizar

const { union, subtract, intersect } = jscad.booleans
const { cuboid, cylinder, sphere, torus } = jscad.primitives
const { translate, rotate, scale } = jscad.transforms
const { colorize } = jscad.colors

function main() {
  // Escritorio simple
  const tabletop = colorize(
    [0.6, 0.4, 0.2],
    cuboid({ size: [1200, 600, 30], center: [0, 0, 750] })
  )

  const legShape = (x, y) =>
    colorize(
      [0.5, 0.35, 0.15],
      cuboid({ size: [50, 50, 720], center: [x, y, 360] })
    )

  return union(
    tabletop,
    legShape(-550, -250),
    legShape( 550, -250),
    legShape(-550,  250),
    legShape( 550,  250)
  )
}
`

function makeProject(name = 'Nuevo Proyecto'): Project {
  return {
    id: crypto.randomUUID(),
    name,
    code: DEFAULT_CODE,
    versions: [],
    updatedAt: Date.now(),
  }
}

function loadAllFromStorage(): Record<string, Project> {
  try {
    return JSON.parse(localStorage.getItem('forma3d_projects') ?? '{}')
  } catch {
    return {}
  }
}

function saveAllToStorage(all: Record<string, Project>) {
  localStorage.setItem('forma3d_projects', JSON.stringify(all))
}

function toMeta(all: Record<string, Project>): ProjectMeta[] {
  return Object.values(all)
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export const useStore = create<Store>((set, get) => ({
  project: makeProject(),
  code: DEFAULT_CODE,
  geometry: null,
  boundingBox: null,
  renderError: null,
  isCompiling: false,
  importedGeometry: null,
  importedName: null,
  projectsMeta: toMeta(loadAllFromStorage()),

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  setCode: (code) => set({ code }),

  setGeometry: (geometry) => set({
    geometry,
    boundingBox: geometry ? computeBBox(geometry.vertices) : null,
    renderError: null,
  }),
  setRenderError: (renderError) => set({ renderError, isCompiling: false }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),

  setImportedGeometry: (importedGeometry, importedName) =>
    set({
      importedGeometry,
      importedName,
      // Override displayed bounding box while import is active
      boundingBox: importedGeometry ? computeBBox(importedGeometry.vertices) : get().boundingBox,
    }),

  clearImport: () => {
    // Restore JSCAD bounding box
    const g = get().geometry
    set({
      importedGeometry: null,
      importedName: null,
      boundingBox: g ? computeBBox(g.vertices) : null,
    })
  },

  saveVersion: (label) => {
    const { project, code } = get()
    const version: Version = {
      id: crypto.randomUUID(),
      label: label ?? new Date().toLocaleString('es-AR'),
      code,
      timestamp: Date.now(),
    }
    const versions = [version, ...project.versions].slice(0, 50)
    set({ project: { ...project, versions } })
    get().saveProject()
  },

  loadVersion: (id) => {
    const { project } = get()
    const v = project.versions.find((v) => v.id === id)
    if (v) set({ code: v.code })
  },

  saveProject: () => {
    const { project, code } = get()
    const updated = { ...project, code, updatedAt: Date.now() }
    const all = loadAllFromStorage()
    all[updated.id] = updated
    saveAllToStorage(all)
    set({ project: updated, projectsMeta: toMeta(all) })
  },

  loadProject: (id) => {
    const all = loadAllFromStorage()
    if (!all[id]) return false
    const p: Project = all[id]
    set({ project: p, code: p.code })
    return true
  },

  deleteProject: (id) => {
    const all = loadAllFromStorage()
    delete all[id]
    saveAllToStorage(all)
    const meta = toMeta(all)
    if (get().project.id === id) {
      const p = makeProject()
      set({ project: p, code: p.code, geometry: null, renderError: null, projectsMeta: meta })
    } else {
      set({ projectsMeta: meta })
    }
  },

  newProject: () => {
    const p = makeProject()
    set({ project: p, code: p.code, geometry: null, renderError: null })
  },
}))
