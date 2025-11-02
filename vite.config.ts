import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // We need this to set up the '@' alias

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  base: '/', 
  
  // I'm also adding the resolver for your '@/' alias,
  // which will fix the pathing issues we saw earlier.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
