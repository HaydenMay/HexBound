import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/HexBound/',
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'e2e/**', 'dist/**']
  }
})
