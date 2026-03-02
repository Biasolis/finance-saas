import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Finance SaaS Enterprise',
        short_name: 'FinanceSaaS',
        description: 'Gestão financeira e operacional completa para sua empresa.',
        theme_color: '#2563eb', // Cor primária (azul)
        background_color: '#f3f4f6',
        display: 'standalone', // Remove a barra do navegador (aparência de app nativo)
        orientation: 'portrait',
        start_url: '/dashboard',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true // Permite acesso via IP na rede local (para testar no celular)
  }
});