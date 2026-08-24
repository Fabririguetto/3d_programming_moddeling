import { useStore } from '../../store/useStore'
import styles from './Panel.module.css'

export function ProjectsPanel({
  onClose,
  onNew,
}: {
  onClose: () => void
  onNew: () => void
}) {
  const projects = useStore((s) => s.listProjects())
  const loadProject = useStore((s) => s.loadProject)
  const currentId = useStore((s) => s.project.id)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Proyectos</span>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>
      <button className={styles.newBtn} onClick={onNew}>+ Nuevo proyecto</button>
      {projects.length === 0 ? (
        <p className={styles.empty}>No hay proyectos guardados.</p>
      ) : (
        <ul className={styles.list}>
          {projects.map((p) => (
            <li key={p.id} className={styles.item + (p.id === currentId ? ' ' + styles.active : '')}>
              <span>{p.name}</span>
              <button
                className={styles.loadBtn}
                onClick={() => { loadProject(p.id); onClose() }}
              >
                Abrir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
