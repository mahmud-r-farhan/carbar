import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['/assets/images/logo.png', '/assets/images/logo.png', '/assets/images/logo.png'],
      manifest: {
        name: 'CarBar',
        short_name: 'CarBar',
        description: 'Affordable and reliable ride-sharing services.',
        theme_color: '#2A944',
        background_color: '#F4A261',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/images/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/assets/images/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/assets/images/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        gcm_sender_id: '103953800507',
      },
      workbox: {
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios', 'framer-motion'],
          ui: ['lucide-react', 'sonner'],
        },
      },
    },
  },
});