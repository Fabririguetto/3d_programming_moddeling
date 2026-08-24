import { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useStore } from '../../store/useStore'
import { useJscadWorker } from '../../lib/WorkerContext'
import styles from './CodeEditor.module.css'

const DEBOUNCE_MS = 600

export function CodeEditor() {
  const code = useStore((s) => s.code)
  const setCode = useStore((s) => s.setCode)
  const importedName = useStore((s) => s.importedName)
  const clearImport = useStore((s) => s.clearImport)
  const { compile } = useJscadWorker()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compileRef = useRef(compile)
  compileRef.current = compile

  // Initial compile on mount
  useEffect(() => {
    compileRef.current(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(value: string | undefined) {
    const v = value ?? ''
    setCode(v)
    // Don't auto-compile while an imported file is displayed
    if (importedName) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => compileRef.current(v), DEBOUNCE_MS)
  }

  function handleMount(ed: editor.IStandaloneCodeEditor) {
    ed.addCommand(0x200 | 88, () => {}) // noop ctrl+w
    ed.addCommand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).monaco?.KeyMod?.CtrlCmd | (window as any).monaco?.KeyCode?.Enter ?? 2048 | 3,
      () => { clearImport(); compileRef.current(ed.getValue()) }
    )
  }

  return (
    <div className={styles.wrapper}>
      {importedName && (
        <div className={styles.importBanner}>
          <span>📂 Mostrando: <strong>{importedName}</strong> — el código JSCAD sigue intacto</span>
          <button
            className={styles.backBtn}
            onClick={() => { clearImport(); compile(code) }}
          >
            ▶ Volver al código
          </button>
        </div>
      )}
      <MonacoEditor
        height="100%"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          automaticLayout: true,
          padding: { top: 12 },
        }}
      />
    </div>
  )
}
