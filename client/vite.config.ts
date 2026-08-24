import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/3d_programming_moddeling/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
})
