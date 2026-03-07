import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: "/DisasterBreadSystem/",
    plugins: [react(), tailwindcss()],
    define: { 'process.env': env },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      port: 3000,
      host: '0.0.0.0', // スマホからのWi-Fi経由アクセスを許可
    },
    build: {
      rollupOptions: { external: ['better-sqlite3', 'express'] }
    }
  };
});