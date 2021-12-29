import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compileTime from "vite-plugin-compile-time"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), compileTime()]
})
