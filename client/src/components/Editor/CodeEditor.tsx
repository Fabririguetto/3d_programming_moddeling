import { useEffect, useRef, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useStore, PROMPT_TAB_ID } from '../../store/useStore'
import { useJscadWorker } from '../../lib/WorkerContext'
import { PromptTab } from './PromptTab'
import styles from './CodeEditor.module.css'

const DEBOUNCE_MS = 600

export function CodeEditor() {
  const code = useStore((s) => s.code)
  const setCode = useStore((s) => s.setCode)
  const importedName = useStore((s) => s.importedName)
  const clearImport = useStore((s) => s.clearImport)
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const { addTab, removeTab, setActiveTab, renameTab } = useStore()
  const { compile } = useJscadWorker()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compileRef = useRef(compile)
  compileRef.current = compile

  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const isPromptTab = activeTabId === PROMPT_TAB_ID

  // Initial compile on mount
  useEffect(() => {
    compileRef.current(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compile when switching to a code tab
  function handleSwitchTab(id: string) {
    if (id === PROMPT_TAB_ID) {
      setActiveTab(id)
      return
    }
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    setActiveTab(id)
    // Cancel pending debounce and compile new tab's code
    if (timerRef.current) clearTimeout(timerRef.current)
    compileRef.current(tab.code)
  }

  function handleChange(value: string | undefined) {
    const v = value ?? ''
    setCode(v)
    if (importedName) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => compileRef.current(v), DEBOUNCE_MS)
  }

  function handleMount(ed: editor.IStandaloneCodeEditor) {
    ed.addCommand(0x200 | 88, () => {}) // noop ctrl+w
    ed.addCommand(
      2048 | 3, // CtrlCmd + Enter
      () => { clearImport(); compileRef.current(ed.getValue()) }
    )
  }

  function handleAddTab() {
    addTab()
    // The new tab gets a default empty code; compile it
    setTimeout(() => {
      const { code: newCode } = useStore.getState()
      compileRef.current(newCode)
    }, 0)
  }

  function startRename(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingTabId(id)
    setEditingName(name)
  }

  function commitRename() {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim())
    }
    setEditingTabId(null)
  }

  function handleRemoveTab(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const tab = tabs.find((t) => t.id === id)
    // If removing active tab, we'll switch — compile the new active tab
    const wasActive = activeTabId === id
    removeTab(id)
    if (wasActive) {
      setTimeout(() => {
        const { code: newCode } = useStore.getState()
        compileRef.current(newCode)
      }, 0)
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Tab bar ── */}
      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={styles.tab + (activeTabId === tab.id ? ' ' + styles.tabActive : '')}
              onClick={() => handleSwitchTab(tab.id)}
            >
              {editingTabId === tab.id ? (
                <input
                  className={styles.tabInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingTabId(null) }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={styles.tabName}
                  onDoubleClick={(e) => startRename(tab.id, tab.name, e)}
                  title="Doble clic para renombrar"
                >
                  {tab.name}
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  className={styles.tabClose}
                  onClick={(e) => handleRemoveTab(tab.id, e)}
                  title="Cerrar tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button className={styles.tabAdd} onClick={handleAddTab} title="Nueva pestaña">
            +
          </button>
        </div>

        {/* Prompt IA tab — always on the right */}
        <button
          className={styles.tabPrompt + (isPromptTab ? ' ' + styles.tabPromptActive : '')}
          onClick={() => setActiveTab(PROMPT_TAB_ID)}
          title="Prompt para copiar y pegar en una IA"
        >
          ✦ Prompt IA
        </button>
      </div>

      {/* ── Content ── */}
      {isPromptTab ? (
        <PromptTab />
      ) : (
        <>
          {importedName && (
            <div className={styles.importBanner}>
              <span>Mostrando: <strong>{importedName}</strong> — el código JSCAD sigue intacto</span>
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
        </>
      )}
    </div>
  )
}
