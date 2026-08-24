import { create } from 'zustand'

export interface Version {
  id: string
  label: string
  code: string
  timestamp: number
}

export interface CodeTab {
  id: string
  name: string
  code: string
}

export interface Project {
  id: string
  name: string
  code: string
  tabs?: CodeTab[]
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

export interface PieceMeta {
  name: string
  w: number  // JSCAD X = Ancho
  d: number  // JSCAD Y = Profundidad
  h: number  // JSCAD Z = Alto
}

export const PROMPT_TAB_ID = '__prompt__'

interface Store {
  // Project
  project: Project
  setProjectName: (name: string) => void

  // Tabs
  tabs: CodeTab[]
  activeTabId: string
  addTab: () => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  renameTab: (id: string, name: string) => void

  // Editor (mirrors active tab's code)
  code: string
  setCode: (code: string) => void

  // Render — JSCAD compiled
  geometry: GeometryData | null
  boundingBox: BoundingBox | null
  renderError: string | null
  isCompiling: boolean
  pieces: PieceMeta[]
  setGeometry: (g: GeometryData | null) => void
  setRenderError: (e: string | null) => void
  setIsCompiling: (v: boolean) => void
  setPieces: (p: PieceMeta[]) => void

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
// Retorná un array de { name, geo } para el plano PDF con medidas por pieza

const { cuboid } = jscad.primitives
const { colorize } = jscad.colors

function main() {
  const tabletop = colorize([0.6, 0.4, 0.2],
    cuboid({ size: [1200, 600, 30], center: [0, 0, 750] })
  )

  const leg = (x, y) => colorize([0.5, 0.35, 0.15],
    cuboid({ size: [50, 50, 720], center: [x, y, 360] })
  )

  return [
    { name: 'Tablero',  geo: tabletop },
    { name: 'Pata 1',   geo: leg(-550, -250) },
    { name: 'Pata 2',   geo: leg( 550, -250) },
    { name: 'Pata 3',   geo: leg(-550,  250) },
    { name: 'Pata 4',   geo: leg( 550,  250) },
  ]
}
`

function makeDefaultTab(code = DEFAULT_CODE): CodeTab {
  return { id: crypto.randomUUID(), name: 'Tab 1', code }
}

function makeProject(name = 'Nuevo Proyecto'): Project {
  const tab = makeDefaultTab()
  return {
    id: crypto.randomUUID(),
    name,
    code: DEFAULT_CODE,
    tabs: [tab],
    versions: [],
    updatedAt: Date.now(),
  }
}

function getTabsFromProject(p: Project): CodeTab[] {
  if (p.tabs && p.tabs.length > 0) return p.tabs
  return [makeDefaultTab(p.code)]
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

const _initProject = makeProject()
const _initTabs = getTabsFromProject(_initProject)
const _initActiveTabId = _initTabs[0].id

export const useStore = create<Store>((set, get) => ({
  project: _initProject,
  tabs: _initTabs,
  activeTabId: _initActiveTabId,
  code: _initTabs[0].code,
  geometry: null,
  boundingBox: null,
  renderError: null,
  isCompiling: false,
  pieces: [],
  importedGeometry: null,
  importedName: null,
  projectsMeta: toMeta(loadAllFromStorage()),

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  // ── Tabs ────────────────────────────────────────────────────────
  addTab: () => {
    const tab = makeDefaultTab('// Nuevo tab\n\nconst { cuboid } = jscad.primitives\n\nfunction main() {\n  return cuboid({ size: [100, 100, 100] })\n}\n')
    tab.name = `Tab ${get().tabs.length + 1}`
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id, code: tab.code }))
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get()
    if (tabs.length <= 1) return  // always keep at least one tab
    const idx = tabs.findIndex((t) => t.id === id)
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActiveId = activeTabId
    if (activeTabId === id) {
      const next = newTabs[Math.min(idx, newTabs.length - 1)]
      newActiveId = next.id
    }
    const newCode = newTabs.find((t) => t.id === newActiveId)?.code ?? ''
    set({ tabs: newTabs, activeTabId: newActiveId, code: newCode })
  },

  setActiveTab: (id) => {
    if (id === PROMPT_TAB_ID) {
      set({ activeTabId: id })
      return
    }
    const tab = get().tabs.find((t) => t.id === id)
    if (tab) set({ activeTabId: id, code: tab.code })
  },

  renameTab: (id, name) =>
    set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, name } : t) })),

  setCode: (code) => set((s) => ({
    code,
    tabs: s.tabs.map((t) => t.id === s.activeTabId ? { ...t, code } : t),
  })),

  setGeometry: (geometry) => set({
    geometry,
    boundingBox: geometry ? computeBBox(geometry.vertices) : null,
    renderError: null,
  }),
  setRenderError: (renderError) => set({ renderError, isCompiling: false }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),
  setPieces: (pieces) => set({ pieces }),

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
    const { project, activeTabId, tabs } = get()
    const v = project.versions.find((v) => v.id === id)
    if (!v) return
    if (activeTabId === PROMPT_TAB_ID) {
      // Switch to first tab and apply version
      const firstTab = tabs[0]
      set({
        code: v.code,
        activeTabId: firstTab.id,
        tabs: tabs.map((t) => t.id === firstTab.id ? { ...t, code: v.code } : t),
      })
    } else {
      set({
        code: v.code,
        tabs: tabs.map((t) => t.id === activeTabId ? { ...t, code: v.code } : t),
      })
    }
  },

  saveProject: () => {
    const { project, code, tabs, activeTabId } = get()
    // Sync active tab before saving
    const syncedTabs = tabs.map((t) => t.id === activeTabId ? { ...t, code } : t)
    const updated = { ...project, code, tabs: syncedTabs, updatedAt: Date.now() }
    const all = loadAllFromStorage()
    all[updated.id] = updated
    saveAllToStorage(all)
    set({ project: updated, tabs: syncedTabs, projectsMeta: toMeta(all) })
  },

  loadProject: (id) => {
    const all = loadAllFromStorage()
    if (!all[id]) return false
    const p: Project = all[id]
    const tabs = getTabsFromProject(p)
    const firstTab = tabs[0]
    set({ project: p, code: firstTab.code, tabs, activeTabId: firstTab.id })
    return true
  },

  deleteProject: (id) => {
    const all = loadAllFromStorage()
    delete all[id]
    saveAllToStorage(all)
    const meta = toMeta(all)
    if (get().project.id === id) {
      const p = makeProject()
      const tabs = getTabsFromProject(p)
      set({ project: p, code: tabs[0].code, tabs, activeTabId: tabs[0].id, geometry: null, renderError: null, projectsMeta: meta })
    } else {
      set({ projectsMeta: meta })
    }
  },

  newProject: () => {
    const p = makeProject()
    const tabs = getTabsFromProject(p)
    set({ project: p, code: tabs[0].code, tabs, activeTabId: tabs[0].id, geometry: null, renderError: null })
  },
}))
