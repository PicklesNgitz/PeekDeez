import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/peekdeez/' : '/',
  server: { host: true, port: 5173 },
  build: { target: 'esnext' },
}))
