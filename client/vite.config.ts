import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@jscad/modeling', '@jscad/stl-serializer', '@jscad/obj-serializer'],
  },
})
