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

interface Store {
  // Project
  project: Project
  setProjectName: (name: string) => void

  // Editor
  code: string
  setCode: (code: string) => void

  // Render
  geometry: GeometryData | null
  renderError: string | null
  isCompiling: boolean
  setGeometry: (g: GeometryData | null) => void
  setRenderError: (e: string | null) => void
  setIsCompiling: (v: boolean) => void

  // Versions
  saveVersion: (label?: string) => void
  loadVersion: (id: string) => void

  // Projects persistence
  saveProject: () => void
  loadProject: (id: string) => boolean
  listProjects: () => { id: string; name: string; updatedAt: number }[]
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

export const useStore = create<Store>((set, get) => ({
  project: makeProject(),
  code: DEFAULT_CODE,
  geometry: null,
  renderError: null,
  isCompiling: false,

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  setCode: (code) => set({ code }),

  setGeometry: (geometry) => set({ geometry, renderError: null }),
  setRenderError: (renderError) => set({ renderError, isCompiling: false }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),

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
    set({ project: updated })
    const all = JSON.parse(localStorage.getItem('forma3d_projects') ?? '{}')
    all[updated.id] = updated
    localStorage.setItem('forma3d_projects', JSON.stringify(all))
  },

  loadProject: (id) => {
    const all = JSON.parse(localStorage.getItem('forma3d_projects') ?? '{}')
    if (!all[id]) return false
    const p: Project = all[id]
    set({ project: p, code: p.code })
    return true
  },

  listProjects: () => {
    const all = JSON.parse(localStorage.getItem('forma3d_projects') ?? '{}')
    return Object.values(all as Record<string, Project>)
      .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  newProject: () => {
    const p = makeProject()
    set({ project: p, code: p.code, geometry: null, renderError: null })
  },
}))
