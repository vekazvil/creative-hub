import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript source, so bundle them; npm deps stay external.
  noExternal: [/^@creative-hub\//],
});
