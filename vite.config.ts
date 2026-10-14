/// <reference types="vitest/config" />
import type { IncomingMessage } from 'node:http'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { mtgtop8Mock } from './vite.mtgtop8-mock.ts'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Path prefix the SPA is served under behind a reverse proxy. It is a build
  // input, not a runtime one: Vite bakes it into every asset URL it emits, so
  // the browser asks for /<prefix>/assets/... and the proxy routes it.
  //
  // The default for production builds is committed in .env.production, and the
  // image overrides it per environment through its BASE_PATH build arg. Empty
  // in dev.
  //
  // `||`, not `??`: an empty VITE_BASE_PATH falls through to the file rather
  // than winning, so an env var set to "" cannot silently build for the root.
  // The Dockerfile relies on this and only exports the variable when it has a
  // value -- see the comment on its BASE_PATH arg.
  //
  // Whatever it ends up being MUST match the path the reverse proxy routes here:
  // if it does not rewrite the path, nginx is asked for the assets under that
  // exact prefix.
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  const basePath = (process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '').replace(
    /\/$/,
    '',
  )

  // mtgtop8.com sends no CORS headers, so the browser reaches it through this
  // origin, and nginx does the same in production (see
  // nginx/default.conf.template). The prefix is dropped on the way:
  // /mtgtop8/format?f=MO goes upstream as /format?f=MO.
  const mtgtop8Proxy = {
    target: 'https://mtgtop8.com',
    changeOrigin: true,
    // Anchored on the exact prefix: the default one, /mtgtop8-shiny, itself
    // starts with "/mtgtop8", so a looser match would cut it in the middle.
    rewrite: (path: string) =>
      path.startsWith(`${basePath}/mtgtop8`)
        ? path.slice(`${basePath}/mtgtop8`.length)
        : path.replace(/^\/mtgtop8/, ''),
    // The site sends its images without any caching header, so the browser
    // keeps asking for them again. As nginx does in production: a week, for
    // pictures that never change once published.
    configure: (proxy: { on: (event: 'proxyRes', listener: (res: IncomingMessage, req: IncomingMessage) => void) => void }) => {
      proxy.on('proxyRes', (res, req) => {
        if (/\/(?:metas_thumbs|deckpics|pics)\//.test(req.url ?? '') && res.statusCode === 200) {
          res.headers['cache-control'] = 'public, max-age=604800'
        }
      })
    },
  }

  // The dev and preview servers proxy /mtgtop8 to the live site. With
  // MTGTOP8_MOCK=true they answer from the saved pages the parsers are tested
  // on instead, offline. Server side only, so not a VITE_ variable.
  const serverEnv = loadEnv(mode, import.meta.dirname, '')
  const mock = (process.env.MTGTOP8_MOCK ?? serverEnv.MTGTOP8_MOCK) === 'true'
  // How slow the mock answers, in ms, like the site does; 0 for instant.
  const mockDelay = Number(process.env.MTGTOP8_MOCK_DELAY ?? serverEnv.MTGTOP8_MOCK_DELAY ?? 800)

  return {
    base: `${basePath}/`,
    // Identifies the build, for the browser's data cache (see src/main.tsx).
    // Fixed in dev, so a reload of the dev server keeps the cache, but apart
    // for the mock: going from its saved pages to the live site, or back,
    // drops what the other one left.
    define: {
      __BUILD_ID__: JSON.stringify(command === 'build' ? String(Date.now()) : mock ? 'dev-mock' : 'dev-live'),
    },
    plugins: [react(), tailwindcss(), ...(mock ? [mtgtop8Mock(`${basePath}/mtgtop8`, mockDelay)] : [])],
    build: {
      // Where the Dockerfile expects the SPA to land, to copy it into nginx.
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: { '/mtgtop8': mtgtop8Proxy },
    },
    // `vite preview` serves the production build, under the production prefix.
    preview: {
      proxy: { [`${basePath}/mtgtop8`]: mtgtop8Proxy },
    },
    test: {
      // The parsers run on DOMParser, which jsdom provides outside a browser.
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
    },
  }
})
