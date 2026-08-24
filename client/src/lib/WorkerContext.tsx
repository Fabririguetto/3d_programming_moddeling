import { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { exportPDF } from './pdfExport'
import type { WorkerResponse } from '../workers/jscad.worker'

interface WorkerContextValue {
  compile: (code: string) => void
  exportSTL: () => Promise<ArrayBuffer>
  exportOBJ: () => Promise<string>
  triggerPDF: () => void
}

const WorkerContext = createContext<WorkerContextValue | null>(null)

export function WorkerProvider({ children }: { children: ReactNode }) {
  const workerRef = useRef<Worker | null>(null)
  const { setGeometry, setRenderError, setIsCompiling, setPieces } = useStore()

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/jscad.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data
      if (res.type === 'geometry') {
        setGeometry({
          vertices: new Float32Array(res.vertices),
          indices: new Uint32Array(res.indices),
          normals: new Float32Array(res.normals),
        })
        setPieces(res.pieces)
        setIsCompiling(false)
      } else if (res.type === 'error') {
        setRenderError(res.message)
        setIsCompiling(false)
      }
    }

    worker.onerror = (e) => {
      setRenderError(`Worker error: ${e.message}`)
      setIsCompiling(false)
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [setGeometry, setRenderError, setIsCompiling, setPieces])

  const compile = useCallback((code: string) => {
    setIsCompiling(true)
    workerRef.current?.postMessage({ type: 'compile', code })
  }, [setIsCompiling])

  const exportSTL = useCallback((): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject('No worker')
      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'stl-data') {
          workerRef.current?.removeEventListener('message', handler)
          resolve(e.data.data)
        } else if (e.data.type === 'error') {
          workerRef.current?.removeEventListener('message', handler)
          reject(e.data.message)
        }
      }
      workerRef.current.addEventListener('message', handler)
      workerRef.current.postMessage({ type: 'export-stl' })
    })
  }, [])

  const exportOBJ = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject('No worker')
      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'obj-data') {
          workerRef.current?.removeEventListener('message', handler)
          resolve(e.data.data)
        } else if (e.data.type === 'error') {
          workerRef.current?.removeEventListener('message', handler)
          reject(e.data.message)
        }
      }
      workerRef.current.addEventListener('message', handler)
      workerRef.current.postMessage({ type: 'export-obj' })
    })
  }, [])

  const triggerPDF = useCallback(() => {
    const { project, pieces } = useStore.getState()
    exportPDF(project.name, pieces)
  }, [])

  return (
    <WorkerContext.Provider value={{ compile, exportSTL, exportOBJ, triggerPDF }}>
      {children}
    </WorkerContext.Provider>
  )
}

export function useJscadWorker() {
  const ctx = useContext(WorkerContext)
  if (!ctx) throw new Error('useJscadWorker must be used inside WorkerProvider')
  return ctx
}
