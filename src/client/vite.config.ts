import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  build: {
    outDir: '../../dist/client',
    sourcemap: true,
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash][extname]',
        sourcemapFileNames: '[name].[hash].js.map',
        manualChunks: (id) => {
          // Vendor chunk for React and core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            return 'vendor';
          }
          
          // UI components chunk
          if (id.includes('/components/ui/')) {
            return 'ui';
          }
          
          // Game engine chunk
          if (id.includes('/engines/') || 
              id.includes('GameManager') || 
              id.includes('AudioSystem') || 
              id.includes('ResultCalculator')) {
            return 'engine';
          }
          
          // Services chunk
          if (id.includes('/services/')) {
            return 'services';
          }
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
