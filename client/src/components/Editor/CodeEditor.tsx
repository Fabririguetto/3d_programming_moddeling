import { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useStore } from '../../store/useStore'
import { useJscadWorker } from '../../lib/useJscadWorker'

const DEBOUNCE_MS = 600

export function CodeEditor() {
  const code = useStore((s) => s.code)
  const setCode = useStore((s) => s.setCode)
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
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => compileRef.current(v), DEBOUNCE_MS)
  }

  function handleMount(ed: editor.IStandaloneCodeEditor) {
    // Add JSCAD type hints as extra lib
    ed.addCommand(0x200 | 88, () => {}) // noop ctrl+w to prevent close
  }

  return (
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
  )
}
