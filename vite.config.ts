import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config
export default {
  plugins: [
    react(),
    glsl(),
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 9000,
  },
} satisfies UserConfig;
