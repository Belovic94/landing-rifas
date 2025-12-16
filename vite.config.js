import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import path from 'node:path';

function hostPagesPlugin() {
  return {
    name: 'host-pages',
    apply: 'build',
    async closeBundle() {
      const moves = [
        { from: 'dist/pages/success.html', to: 'dist/success/index.html' },
        { from: 'dist/pages/pending.html', to: 'dist/pending/index.html' },
        { from: 'dist/pages/error.html', to: 'dist/error/index.html' },
      ];

      for (const m of moves) {
        await fs.mkdir(path.dirname(m.to), { recursive: true });
        await fs.rename(m.from, m.to);
      }

      await fs.rm('dist/pages', { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [
    preact(), 
    tailwindcss(), 
    hostPagesPlugin()
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        success: 'pages/success.html',
        pending: 'pages/pending.html',
        error: 'pages/error.html',
      },
    },
  },
  server: {
    watch: { ignored: ['**/server/**'] },
    open: '/',
    proxy: {
      '/create-preference': 'http://localhost:3000',
      '/webhook': 'http://localhost:3000',
    },
  },
});