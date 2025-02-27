import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
    }
  },
  optimizeDeps: {
    include: ['sfumato', 'lodash']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true
  },
  define: {
    'process.env.API_BASE': JSON.stringify(process.env.API_BASE || '/api')
  }
})
