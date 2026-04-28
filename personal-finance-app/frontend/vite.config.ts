import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        id: '/',
        name: 'PanamKasu – Personal Finance',
        short_name: 'PanamKasu',
        description: 'PanamKasu helps you track your finances, investments, and insurance in one place. Manage transactions, investments, insurance policies, and subscriptions — all synced to your Google Sheets.',
        theme_color: '#0a0f0d',
        background_color: '#0a0f0d',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['finance', 'productivity'],
        prefer_related_applications: false,
        icons: [
          { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Transactions',
            short_name: 'Transactions',
            description: 'View and manage income & expenses',
            url: '/transactions',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Investments',
            short_name: 'Investments',
            description: 'View your investment portfolio',
            url: '/investments',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Insurance',
            short_name: 'Insurance',
            description: 'View and manage insurance policies',
            url: '/insurance',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Finance overview and charts',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        screenshots: [
          {
            src: 'screenshots/phone-dashboard.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Dashboard',
          },
          {
            src: 'screenshots/phone-transactions.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Transactions',
          },
          {
            src: 'screenshots/phone-investments.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Investments',
          },
          {
            src: 'screenshots/phone-insurance.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Insurance',
          },
          {
            src: 'screenshots/phone-vault.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Vault',
          },
          {
            src: 'screenshots/phone-subscriptions.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'PanamKasu – Subscriptions',
          },
          {
            src: 'screenshots/tablet-7-dashboard.png',
            sizes: '1200x1920',
            type: 'image/png',
            form_factor: 'wide',
            label: 'PanamKasu – Tablet View',
          },
          {
            src: 'screenshots/tablet-10-dashboard.png',
            sizes: '1600x2560',
            type: 'image/png',
            form_factor: 'wide',
            label: 'PanamKasu – Large Tablet View',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
