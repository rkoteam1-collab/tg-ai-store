import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {BOOTSTRAP_SOURCE} from './server/bootstrap.js';
import {APP_RELEASE} from './server/launch.js';

const backupUrl=new URL(process.env.VITE_BACKUP_URL||'https://tg-ai-store.onrender.com/');
if(backupUrl.protocol!=='https:')throw new Error('VITE_BACKUP_URL must use HTTPS');
backupUrl.searchParams.set('v',APP_RELEASE);

export default defineConfig({
  base: process.env.FRONTEND_BASE || '/',
  define:{__AI_BACKUP_URL__:JSON.stringify(backupUrl.href)},
  plugins: [react(),tailwindcss(),{
    name:'miniapp-bootstrap',
    transformIndexHtml:{order:'pre',handler:html=>html.replaceAll('__AI_BACKUP_URL__',backupUrl.href).replaceAll('__AI_API_ORIGIN__',backupUrl.origin).replace('<!--APP_BOOTSTRAP-->','').replace('<meta charset="UTF-8"/>','<meta charset="UTF-8"/><script>'+BOOTSTRAP_SOURCE+'</script>')},
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
