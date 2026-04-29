import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  external: ['js-tiktoken'],
  esbuildOptions(options) {
    options.footer = {
      js: '// @comptext/core — MIT License — https://github.com/ProfRandom92/comptext-revolution',
    }
  },
})
