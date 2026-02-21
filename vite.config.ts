import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo
  // Agora o TypeScript reconhece 'process' nativamente graças à correção no tsconfig.json
  // Casting process to any to avoid TS error about cwd() missing on type Process
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    base: './',
    plugins: [react()],
    publicDir: 'public',
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      }
    },
    define: {
      // Prioriza VITE_API_KEY, depois tenta GOOGLE_API_KEY ou API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.GOOGLE_API_KEY || env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 2000, // Aumentado para acomodar engines 3D
    },
    optimizeDeps: {
      exclude: ['@mkkellogg/gaussian-splats-3d']
    }
  };
});