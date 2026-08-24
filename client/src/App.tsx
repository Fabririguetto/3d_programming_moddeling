import { useRef, useState, useCallback } from 'react'
import { CodeEditor } from './components/Editor/CodeEditor'
import { Viewport3D } from './components/Viewport/Viewport3D'
import { Toolbar } from './components/Toolbar/Toolbar'
import { BlueprintPanel } from './components/BlueprintPanel/BlueprintPanel'
import styles from './App.module.css'

export default function App() {
  const [splitPct, setSplitPct] = useState(45)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPct(Math.min(Math.max(pct, 20), 80))
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <div className={styles.root}>
      <Toolbar />

      <div
        className={styles.workspace}
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className={styles.editorPane} style={{ width: `${splitPct}%` }}>
          <CodeEditor />
        </div>

        <div className={styles.divider} onMouseDown={onMouseDown} />

        <div className={styles.viewportPane} style={{ width: `${100 - splitPct}%` }}>
          <Viewport3D />
        </div>
      </div>

      <BlueprintPanel />
    </div>
  )
}
