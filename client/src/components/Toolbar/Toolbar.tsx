import { useRef, useState } from 'react'
import { UserButton } from '@clerk/react'
import { useStore } from '../../store/useStore'
import { useJscadWorker } from '../../lib/WorkerContext'
import { importFile } from '../../lib/fileImport'
import { HistoryPanel } from './HistoryPanel'
import { ProjectsPanel } from './ProjectsPanel'
import styles from './Toolbar.module.css'

type Panel = 'history' | 'projects' | null

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Toolbar() {
  const { project, code, setProjectName, saveProject, saveVersion, newProject, setImportedGeometry, setRenderError, clearImport } = useStore()
  const { compile, exportSTL, exportOBJ, triggerPDF } = useJscadWorker()
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(project.name)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function togglePanel(panel: Panel) {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  async function handleExportSTL() {
    try {
      const buf = await exportSTL()
      downloadBlob(new Blob([buf], { type: 'model/stl' }), `${project.name}.stl`)
    } catch (e) {
      alert('Error al exportar STL: ' + e)
    }
  }

  async function handleExportOBJ() {
    try {
      const text = await exportOBJ()
      downloadBlob(new Blob([text], { type: 'text/plain' }), `${project.name}.obj`)
    } catch (e) {
      alert('Error al exportar OBJ: ' + e)
    }
  }

  function handleExportCode() {
    const blob = new Blob([code], { type: 'text/javascript' })
    downloadBlob(blob, `${project.name}.js`)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const geo = await importFile(file)
      setImportedGeometry(geo, file.name)
    } catch (err) {
      setRenderError(String(err))
    }
  }

  function commitName() {
    setEditingName(false)
    if (nameInput.trim()) setProjectName(nameInput.trim())
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.left}>
        <img src="/favicon.svg" alt="" className={styles.logoImg} />
        <span className={styles.logo}>GeoStudio3D</span>

        {editingName ? (
          <input
            className={styles.nameInput}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            autoFocus
          />
        ) : (
          <button
            className={styles.projectName}
            onClick={() => { setNameInput(project.name); setEditingName(true) }}
          >
            {project.name}
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => { saveProject(); saveVersion() }}>
          Guardar
        </button>

        <button className={styles.btnRun} onClick={() => { clearImport(); compile(code) }} title="Compilar código JSCAD (Ctrl+Enter)">
          ▶ Compilar
        </button>

        <div className={styles.dropdown}>
          <button
            className={styles.btn + (activePanel === 'history' ? ' ' + styles.active : '')}
            onClick={() => togglePanel('history')}
          >
            Historial ▾
          </button>
          {activePanel === 'history' && (
            <HistoryPanel onClose={() => setActivePanel(null)} />
          )}
        </div>

        <div className={styles.dropdown}>
          <button
            className={styles.btn + (activePanel === 'projects' ? ' ' + styles.active : '')}
            onClick={() => togglePanel('projects')}
          >
            Proyectos ▾
          </button>
          {activePanel === 'projects' && (
            <ProjectsPanel
              onClose={() => setActivePanel(null)}
              onNew={() => { newProject(); setActivePanel(null) }}
            />
          )}
        </div>

        <div className={styles.exportGroup}>
          <button className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.obj"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button className={styles.btnAccent} onClick={handleExportSTL}>STL</button>
          <button className={styles.btnAccent} onClick={handleExportOBJ}>OBJ</button>
          <button className={styles.btnPDF} onClick={triggerPDF} title="Exportar plano PDF con medidas por pieza">PDF</button>
          <button className={styles.btnCode} onClick={handleExportCode} title="Descargar código JSCAD (.js)">JS</button>
        </div>

        <UserButton />
      </div>
    </header>
  )
}
