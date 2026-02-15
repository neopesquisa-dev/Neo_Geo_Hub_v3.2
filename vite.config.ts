import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development/production)
  // O terceiro argumento '' garante que carregue todas as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    base: './', 
    plugins: [react()],
    publicDir: 'public',
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
    },
    define: {
      // Garante que o SDK do Google GenAI encontre a chave API corretamente
      // Prioriza VITE_API_KEY, depois tenta GOOGLE_API_KEY ou API_KEY
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.GOOGLE_API_KEY || env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Desativa sourcemaps em produção para economizar memória
      chunkSizeWarningLimit: 1600, // Aumenta limite de aviso para arquivos 3D grandes
    },
    optimizeDeps: {
      exclude: ['@mkkellogg/gaussian-splats-3d'] // Evita otimização excessiva na lib de Splats
    }
  };
});