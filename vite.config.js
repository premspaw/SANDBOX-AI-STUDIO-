import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react') || id.includes('@phosphor-icons')) {
              return 'vendor-icons';
            }
            if (id.includes('@ffmpeg') || id.includes('pdfjs-dist')) {
              return 'vendor-heavy-media';
            }
            if (id.includes('reactflow') || id.includes('@dnd-kit')) {
              return 'vendor-canvas';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor-others';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        secure: false,
      },
    },
  }
})
