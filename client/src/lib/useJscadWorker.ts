import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import type { WorkerResponse } from '../workers/jscad.worker'

export function useJscadWorker() {
  const workerRef = useRef<Worker | null>(null)
  const { setGeometry, setRenderError, setIsCompiling } = useStore()

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
        setIsCompiling(false)
      } else if (res.type === 'error') {
        setRenderError(res.message)
        setIsCompiling(false)
      }
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [setGeometry, setRenderError, setIsCompiling])

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

  return { compile, exportSTL, exportOBJ }
}
