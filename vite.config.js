import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  server: {
    fs: { allow: [__dirname] },
  },
  resolve: {
    alias: [
      {
        find: 'three/addons',
        replacement: path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      },
      {
        find: 'three',
        replacement: path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
      },
    ],
  },
  optimizeDeps: {
    include: ['three', 'gsap', 'gsap/ScrollTrigger', 'lenis'],
  },
})
