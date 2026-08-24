import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useJscadWorker } from '../../lib/useJscadWorker'
import { HistoryPanel } from './HistoryPanel'
import { ProjectsPanel } from './ProjectsPanel'
import styles from './Toolbar.module.css'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Toolbar() {
  const { project, setProjectName, saveProject, saveVersion, newProject } = useStore()
  const { exportSTL, exportOBJ } = useJscadWorker()
  const [showHistory, setShowHistory] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(project.name)

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

  function commitName() {
    setEditingName(false)
    if (nameInput.trim()) setProjectName(nameInput.trim())
  }

  return (
    <header className={styles.toolbar}>
      <div className={styles.left}>
        <span className={styles.logo}>Forma3D</span>

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
          <button className={styles.projectName} onClick={() => { setNameInput(project.name); setEditingName(true) }}>
            {project.name}
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => { saveProject(); saveVersion() }}>
          Guardar
        </button>

        <div className={styles.dropdown}>
          <button className={styles.btn} onClick={() => setShowHistory(!showHistory)}>
            Historial ▾
          </button>
          {showHistory && (
            <HistoryPanel onClose={() => setShowHistory(false)} />
          )}
        </div>

        <div className={styles.dropdown}>
          <button className={styles.btn} onClick={() => setShowProjects(!showProjects)}>
            Proyectos ▾
          </button>
          {showProjects && (
            <ProjectsPanel
              onClose={() => setShowProjects(false)}
              onNew={() => { newProject(); setShowProjects(false) }}
            />
          )}
        </div>

        <div className={styles.exportGroup}>
          <button className={styles.btnAccent} onClick={handleExportSTL}>
            STL
          </button>
          <button className={styles.btnAccent} onClick={handleExportOBJ}>
            OBJ
          </button>
        </div>
      </div>
    </header>
  )
}
