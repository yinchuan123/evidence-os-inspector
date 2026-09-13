/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The app is deployed to GitHub Pages under /<repo>/ ; override with VITE_BASE.
const base = process.env.VITE_BASE ?? '/'

// Production builds get a strict Content-Security-Policy: no remote scripts,
// styles, fonts, images, or connections of any kind. The dev server is
// excluded because HMR needs a websocket.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'eosi-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), cspPlugin()],
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
