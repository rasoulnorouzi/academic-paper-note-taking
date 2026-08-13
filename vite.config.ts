import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages project path.
export default defineConfig({
  base: '/academic-paper-note-taking/',
  plugins: [react()],
  server: {
    port: 3000,
  },
});
