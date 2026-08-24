import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { PieceMeta } from '../../store/useStore'
import styles from './BlueprintPanel.module.css'

function groupKey(p: PieceMeta) {
  return `${p.w}|${p.h}|${p.d}`
}

function groupByDims(pieces: PieceMeta[]) {
  const map = new Map<string, PieceMeta[]>()
  for (const p of pieces) {
    const k = groupKey(p)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(p)
  }
  return map
}

export function BlueprintPanel() {
  const renderError = useStore((s) => s.renderError)
  const isCompiling = useStore((s) => s.isCompiling)
  const geometry    = useStore((s) => s.geometry)
  const bbox        = useStore((s) => s.boundingBox)
  const pieces      = useStore((s) => s.pieces)
  const materials   = useStore((s) => s.materials)
  const setMaterial = useStore((s) => s.setMaterial)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const triCount = geometry ? geometry.indices.length / 3 : 0
  const groups = groupByDims(pieces)

  function toggleGroup(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Set material for every piece in the group
  function handleMat(groupPieces: PieceMeta[], value: string) {
    for (const p of groupPieces) setMaterial(p.name, value)
  }

  // Read material from the first piece in the group (all share the same)
  function groupMat(groupPieces: PieceMeta[]) {
    return materials[groupPieces[0].name] ?? ''
  }

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
              <span className={styles.value}>{Math.round(bbox.w)} mm</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.dimLabel} style={{ color: '#a6e3a1' }}>Y</span>
              <span className={styles.value}>{Math.round(bbox.h)} mm</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.dimLabel} style={{ color: '#89b4fa' }}>Z</span>
              <span className={styles.value}>{Math.round(bbox.d)} mm</span>
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
                <th style={{ width: 20 }} />
                <th>Medidas (X × Z × Y)</th>
                <th>Cant.</th>
                <th>Material</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.entries()).map(([key, gPieces]) => {
                const { w, h, d } = gPieces[0]
                const isOpen = !!expanded[key]
                const mat = groupMat(gPieces)

                return (
                  <>
                    {/* ── Group row ── */}
                    <tr
                      key={key}
                      className={styles.groupRow}
                      onClick={() => toggleGroup(key)}
                    >
                      <td className={styles.chevron}>{isOpen ? '▼' : '▶'}</td>
                      <td className={styles.dimsCell}>
                        <span className={styles.dimW}>{w}</span>
                        <span className={styles.dimSep}> × </span>
                        <span className={styles.dimH}>{h}</span>
                        <span className={styles.dimSep}> × </span>
                        <span className={styles.dimD}>{d}</span>
                        <span className={styles.dimUnit}> mm</span>
                      </td>
                      <td className={styles.qtyCell}>{gPieces.length}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          className={styles.matInput}
                          value={mat}
                          onChange={(e) => handleMat(gPieces, e.target.value)}
                          placeholder="ej: MDF 18mm"
                        />
                      </td>
                    </tr>

                    {/* ── Expanded piece rows ── */}
                    {isOpen && gPieces.map((p) => (
                      <tr key={p.name} className={styles.pieceRow}>
                        <td />
                        <td colSpan={3} className={styles.pieceName}>
                          {p.name}
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
