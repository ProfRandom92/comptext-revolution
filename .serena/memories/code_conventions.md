## CompText Revolution - Code Style & Conventions

**TypeScript Settings** (from tsconfig.base.json):
- Target: ES2022
- Module: ES2022 (ESM, not CommonJS)
- Strict mode: enabled (strict null checks, etc.)
- Declaration files: generated automatically
- Source maps: enabled for debugging
- Output: dist/ folder

**Naming Conventions**:
- Classes: PascalCase (CompressionEngine, MemoryPalace)
- Functions/methods: camelCase (compressText, decompressLevel5)
- Constants: UPPER_SNAKE_CASE (DICTIONARY_SIZE, MAX_LEVEL)
- Files: kebab-case (compression-engine.ts, memory-palace.ts)

**Code Style**:
- Prettier: auto-format on save (3.0+)
- ESLint: enforce consistent patterns
- Type hints: always use explicit types
- No implicit any

**Directory Structure Conventions**:
- Source: src/ folder in each package
- Tests: *.test.ts or *.spec.ts colocated with source
- Build output: dist/ folder (auto-generated, don't commit)
- Entry point: package.json main field points to dist/index.js

**Module System**:
- "type": "module" in package.json (ESM only)
- Import syntax: `import { x } from './file.js'` (include .js extension)
- No require() or CommonJS
