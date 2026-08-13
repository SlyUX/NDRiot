import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createRequire } from 'node:module'

/**
 * Copy the pdf.js worker into public/ so react-pdf loads it as a plain static
 * file (`/pdf.worker.min.mjs`) — bundler-agnostic, with no reliance on
 * Turbopack resolving `new URL(..., import.meta.url)`. Runs on predev/prebuild
 * so it always matches the installed pdfjs-dist; the file itself is gitignored.
 */
const require = createRequire(import.meta.url)
const src = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
const dest = 'public/pdf.worker.min.mjs'
mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`[pdf-worker] copied -> ${dest}`)
