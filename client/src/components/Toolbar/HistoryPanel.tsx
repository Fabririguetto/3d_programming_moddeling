import { useStore } from '../../store/useStore'
import styles from './Panel.module.css'

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const versions = useStore((s) => s.project.versions)
  const loadVersion = useStore((s) => s.loadVersion)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Historial de versiones</span>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>
      {versions.length === 0 ? (
        <p className={styles.empty}>Sin versiones guardadas aún.<br />Usa "Guardar" para crear snapshots.</p>
      ) : (
        <ul className={styles.list}>
          {versions.map((v) => (
            <li key={v.id} className={styles.item}>
              <span>{v.label}</span>
              <button
                className={styles.loadBtn}
                onClick={() => { loadVersion(v.id); onClose() }}
              >
                Cargar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
