import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/about.html'),
        contact: resolve(__dirname, 'contact/contact.html'),
        admin: resolve(__dirname, 'admin/admin.html'),
      },
    },
  },
})
