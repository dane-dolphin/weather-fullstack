/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), legacy({ targets: ['chrome >= 79'] })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  oxc: {
    target: 'chrome79',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://v6eerlaif9.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: ['chrome79'],
    cssTarget: ['chrome79'],
  },
  test: {
    environment: 'node',
    globals: false,
  },
})
