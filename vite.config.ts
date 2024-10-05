import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

export default { // https://vitejs.dev/config
  plugins: [
    react(),
    glsl(),
  ],
} satisfies UserConfig;
