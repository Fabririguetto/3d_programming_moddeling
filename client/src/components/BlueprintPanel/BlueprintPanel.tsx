import { useStore } from '../../store/useStore'
import styles from './BlueprintPanel.module.css'

function mm(v: number) {
  return `${Math.round(v)}`
}

export function BlueprintPanel() {
  const renderError  = useStore((s) => s.renderError)
  const isCompiling  = useStore((s) => s.isCompiling)
  const geometry     = useStore((s) => s.geometry)
  const bbox         = useStore((s) => s.boundingBox)
  const pieces       = useStore((s) => s.pieces)
  const materials    = useStore((s) => s.materials)
  const setMaterial  = useStore((s) => s.setMaterial)

  const triCount = geometry ? geometry.indices.length / 3 : 0

  return (
    <div className={styles.panel}>
      {/* ── Status bar ── */}
      <div className={styles.statusBar}>
        <div className={styles.statusRow}>
          <span className={styles.label}>Estado</span>
          <span className={renderError ? styles.error : styles.ok}>
            {isCompiling ? '⟳ Compilando' : renderError ? '✕ Error' : '✓ OK'}
          </span>
        </div>

        {bbox && (
          <>
            <div className={styles.sep} />
            <div className={styles.statusRow}>
              <span className={styles.dimLabel} style={{ color: '#f38ba8' }}>X</span>
              <span className={styles.value}>{mm(bbox.w)} mm</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.dimLabel} style={{ color: '#a6e3a1' }}>Y</span>
              <span className={styles.value}>{mm(bbox.h)} mm</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.dimLabel} style={{ color: '#89b4fa' }}>Z</span>
              <span className={styles.value}>{mm(bbox.d)} mm</span>
            </div>
          </>
        )}

        <div className={styles.sep} />
        <div className={styles.statusRow}>
          <span className={styles.label}>Triángulos</span>
          <span className={styles.value}>{triCount.toLocaleString()}</span>
        </div>

        {pieces.length > 0 && (
          <>
            <div className={styles.sep} />
            <div className={styles.statusRow}>
              <span className={styles.label}>Piezas</span>
              <span className={styles.value}>{pieces.length}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Cut list ── */}
      <div className={styles.cutList}>
        {pieces.length === 0 ? (
          <div className={styles.cutListEmpty}>
            Sin piezas — retorná <code>[&#123; name, geo &#125;]</code> en <code>main()</code>
          </div>
        ) : (
          <table className={styles.cutTable}>
            <thead>
              <tr>
                <th>Pieza</th>
                <th style={{ color: '#f38ba8' }}>X mm</th>
                <th style={{ color: '#a6e3a1' }}>Z mm</th>
                <th style={{ color: '#89b4fa' }}>Y mm</th>
                <th>Material</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p) => (
                <tr key={p.name}>
                  <td className={styles.nameCell} title={p.name}>{p.name}</td>
                  <td className={styles.dimW}>{p.w}</td>
                  <td className={styles.dimH}>{p.h}</td>
                  <td className={styles.dimD}>{p.d}</td>
                  <td>
                    <input
                      className={styles.matInput}
                      value={materials[p.name] ?? ''}
                      onChange={(e) => setMaterial(p.name, e.target.value)}
                      placeholder="ej: MDF 18mm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
