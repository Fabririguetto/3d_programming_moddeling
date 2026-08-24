import { useRef, useState, useCallback, useEffect } from 'react'
import { SignIn, useUser } from '@clerk/react'
import { CodeEditor } from './components/Editor/CodeEditor'
import { Viewport3D } from './components/Viewport/Viewport3D'
import { Toolbar } from './components/Toolbar/Toolbar'
import { BlueprintPanel } from './components/BlueprintPanel/BlueprintPanel'
import { useStore } from './store/useStore'
import styles from './App.module.css'

export default function App() {
  const { isSignedIn } = useUser()
  const loadProjectsMeta = useStore((s) => s.loadProjectsMeta)

  useEffect(() => {
    if (isSignedIn) loadProjectsMeta()
  }, [isSignedIn, loadProjectsMeta])

  const [splitPct,  setSplitPct]  = useState(45)
  const [bottomPct, setBottomPct] = useState(20)

  const draggingH = useRef(false)
  const draggingV = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onHMouseDown = useCallback(() => {
    draggingH.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

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
      const pct = ((rect.bottom - e.clientY) / rect.height) * 100
      setBottomPct(Math.min(Math.max(pct, 20), 80))
    }
  }, [])

  const onMouseUp = useCallback(() => {
    draggingH.current = false
    draggingV.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <>
      {!isSignedIn ? (
        <div className={styles.authScreen}>
          <SignIn routing="hash" />
        </div>
      ) : (
        <div
          className={styles.root}
          ref={containerRef}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <Toolbar />

          <div className={styles.workspace} style={{ height: `${100 - bottomPct}%` }}>
            <div className={styles.editorPane} style={{ width: `${splitPct}%` }}>
              <CodeEditor />
            </div>

            <div className={styles.divider} onMouseDown={onHMouseDown} />

            <div className={styles.viewportPane} style={{ width: `${100 - splitPct}%` }}>
              <Viewport3D />
            </div>
          </div>

          <div className={styles.dividerH} onMouseDown={onVMouseDown} />

          <BlueprintPanel height={`${bottomPct}%`} />
        </div>
      )}
    </>
  )
}
