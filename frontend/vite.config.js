import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Register both the Tailwind CSS and React plugins
export default defineConfig({
  plugins: [tailwindcss(), react()],
})