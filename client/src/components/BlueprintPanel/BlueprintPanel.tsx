import { useStore } from '../../store/useStore'
import styles from './BlueprintPanel.module.css'

export function BlueprintPanel() {
  const { renderError, isCompiling, geometry } = useStore()

  const vertCount = geometry ? geometry.vertices.length / 3 : 0
  const triCount = geometry ? geometry.indices.length / 3 : 0

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>Estado</span>
        <span className={renderError ? styles.error : styles.ok}>
          {isCompiling ? '⟳ Compilando' : renderError ? '✕ Error' : '✓ OK'}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Vértices</span>
        <span className={styles.value}>{vertCount.toLocaleString()}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Triángulos</span>
        <span className={styles.value}>{triCount.toLocaleString()}</span>
      </div>
    </div>
  )
}
