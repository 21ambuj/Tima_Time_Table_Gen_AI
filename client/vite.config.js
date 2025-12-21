import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Tima - AI Timetable Scheduler',
        short_name: 'Tima',
        description: 'AI-powered academic timetable generator for schools and universities.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // This removes the browser URL bar when installed
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png', // You need to add this image
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // You need to add this image
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})