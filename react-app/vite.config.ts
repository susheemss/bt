import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base + output into a sibling folder next to the existing app, so
// the build can be served by the same server.py that already serves
// index.html and the two live Excel routes -- no server changes needed,
// and no fixed subpath assumption (works whatever folder it ends up in).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../enterprise-dist',
    emptyOutDir: true,
  },
})
