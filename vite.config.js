import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {BOOTSTRAP_SOURCE} from './server/bootstrap.js';

export default defineConfig({
  base: process.env.FRONTEND_BASE || '/',
  plugins: [react(),tailwindcss(),{name:'miniapp-bootstrap',transformIndexHtml:{order:'pre',handler:html=>html.replace('<!--APP_BOOTSTRAP-->','<script>'+BOOTSTRAP_SOURCE+'</script>')}}],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
});
