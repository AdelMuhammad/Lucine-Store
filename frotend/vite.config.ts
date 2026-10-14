import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from the organisation root page (https://lucinestore.github.io/),
  // so assets are always referenced from the domain root.
  base: '/',
  plugins: [react()],
})
