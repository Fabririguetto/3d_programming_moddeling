import { useStore } from '../../store/useStore'
import styles from './BlueprintPanel.module.css'

function mm(v: number) {
  return `${Math.round(v)} mm`
}

export function BlueprintPanel() {
  const renderError = useStore((s) => s.renderError)
  const isCompiling = useStore((s) => s.isCompiling)
  const geometry = useStore((s) => s.geometry)
  const bbox = useStore((s) => s.boundingBox)

  const triCount = geometry ? geometry.indices.length / 3 : 0

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>Estado</span>
        <span className={renderError ? styles.error : styles.ok}>
          {isCompiling ? '⟳ Compilando' : renderError ? '✕ Error' : '✓ OK'}
        </span>
      </div>

      {bbox && (
        <>
          <div className={styles.sep} />
          <div className={styles.row}>
            <span className={styles.dimLabel} style={{ color: '#f38ba8' }}>X</span>
            <span className={styles.value}>{mm(bbox.w)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.dimLabel} style={{ color: '#a6e3a1' }}>Y</span>
            <span className={styles.value}>{mm(bbox.h)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.dimLabel} style={{ color: '#89b4fa' }}>Z</span>
            <span className={styles.value}>{mm(bbox.d)}</span>
          </div>
        </>
      )}

      <div className={styles.sep} />
      <div className={styles.row}>
        <span className={styles.label}>Triángulos</span>
        <span className={styles.value}>{triCount.toLocaleString()}</span>
      </div>
    </div>
  )
}
