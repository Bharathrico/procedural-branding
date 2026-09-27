import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  // mkcert creates a locally-trusted certificate so the dev server runs on https.
  plugins: [react(), mkcert()],
})
