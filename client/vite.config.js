import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/api/sessions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/api/submissions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/api/rubrics': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/api/, '') 
},
'/api/auth': {
  target: 'http://localhost:3001',
  changeOrigin: true,
  rewrite: path => path.replace(/^\/api/, '')
},
      '/sessions':    { target: 'http://localhost:3001', changeOrigin: true },
      '/submissions': { target: 'http://localhost:3001', changeOrigin: true },
      '/auth':        { target: 'http://localhost:3001', changeOrigin: true },
    }
  }
})