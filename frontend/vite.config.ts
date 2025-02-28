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
        target: 'https://api.islainstruments.com',
        changeOrigin: true,
        secure: false
      },
    },
    allowedHosts: ['sf2lv2.islainstruments.com'],  // Add this line to allow the host
  },
  optimizeDeps: {
    include: ['lodash']
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
