import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {BOOTSTRAP_SOURCE} from './server/bootstrap.js';

export default defineConfig({
  base: process.env.FRONTEND_BASE || '/',
  plugins: [react(),tailwindcss(),{
    name:'miniapp-bootstrap',
    transformIndexHtml:{order:'pre',handler:html=>html.replace('<!--APP_BOOTSTRAP-->','').replace('<meta charset="UTF-8"/>','<meta charset="UTF-8"/><script>'+BOOTSTRAP_SOURCE+'</script>')},
    // This small stylesheet belongs to the initial screen: avoid a blocking
    // request on mobile networks. Keep emitted assets for Vite's lazy imports.
    generateBundle:{order:'post',handler(options,bundle){
      for(const item of Object.values(bundle)){
        if(item.type!=='asset'||!item.fileName.endsWith('.html'))continue;
        item.source=String(item.source).replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(tag,href)=>{
          const css=Object.values(bundle).find(asset=>asset.type==='asset'&&asset.fileName.endsWith('.css')&&href.endsWith('/'+asset.fileName));
          return css?'<style>'+String(css.source).replace(/<\/style/gi,'<\\/style')+'</style>':tag;
        });
      }
    }}
  }],
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
    rollupOptions:{output:{manualChunks(id){if(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))return 'react-vendor';}}},
  }
});
