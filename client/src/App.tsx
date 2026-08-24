import { useRef, useState, useCallback } from 'react'
import { CodeEditor } from './components/Editor/CodeEditor'
import { Viewport3D } from './components/Viewport/Viewport3D'
import { Toolbar } from './components/Toolbar/Toolbar'
import { BlueprintPanel } from './components/BlueprintPanel/BlueprintPanel'
import styles from './App.module.css'

const BOTTOM_MIN = 32   // just the status bar
const BOTTOM_MAX = 480

export default function App() {
  const [splitPct, setSplitPct]   = useState(45)
  const [bottomH,  setBottomH]    = useState(180)

  const draggingH  = useRef(false)
  const draggingV  = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Horizontal (editor ↔ viewport) ──────────────────────────
  const onHMouseDown = useCallback(() => {
    draggingH.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // ── Vertical (workspace ↔ bottom panel) ─────────────────────
  const onVMouseDown = useCallback(() => {
    draggingV.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return

    if (draggingH.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.min(Math.max(pct, 20), 80))
    }

    if (draggingV.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const newH = rect.bottom - e.clientY
      setBottomH(Math.min(Math.max(newH, BOTTOM_MIN), BOTTOM_MAX))
    }
  }, [])

  const onMouseUp = useCallback(() => {
    draggingH.current = false
    draggingV.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <div
      className={styles.root}
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <Toolbar />

      <div className={styles.workspace}>
        <div className={styles.editorPane} style={{ width: `${splitPct}%` }}>
          <CodeEditor />
        </div>

        <div className={styles.divider} onMouseDown={onHMouseDown} />

        <div className={styles.viewportPane} style={{ width: `${100 - splitPct}%` }}>
          <Viewport3D />
        </div>
      </div>

      <div className={styles.dividerH} onMouseDown={onVMouseDown} />

      <BlueprintPanel height={bottomH} />
    </div>
  )
}
