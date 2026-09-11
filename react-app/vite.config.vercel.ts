import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Vercel-only build config -- entirely separate from vite.config.ts, which
   stays untouched and keeps building into ../enterprise-dist for the
   server.py-served deployment. This one builds into the default ./dist
   (Vercel needs the output inside the project root it's building) and
   serves the snapshot Excel files in public-vercel/ at the same
   /source-data*.xlsx paths the app already fetches -- no app code change,
   since Vite copies publicDir contents to the build root verbatim. */
export default defineConfig({
  plugins: [react()],
  base: '/',
  publicDir: 'public-vercel',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
