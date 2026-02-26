import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/products': 'http://localhost:8000',
      '/sessions': 'http://localhost:8000',
      '/scores': 'http://localhost:8000',
      '/webhook': 'http://localhost:8000',
    },
  },
})
