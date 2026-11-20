import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true, // honor tsconfig "paths" natively
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    // Keep the CRA dev port: scripts/start_dev.bat and api/client.ts rely on 3000.
    port: 3000,
    host: true, // listen on 0.0.0.0 so LAN access keeps working
  },
  build: {
    // The FastAPI backend, hr_mini.spec and start scripts serve frontend/build.
    outDir: 'build',
    emptyOutDir: true,
    // Large vendor libraries get their own chunks so the app chunk stays small and cacheable.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-mui-x', test: /node_modules[\\/]@mui[\\/]x-/ },
            { name: 'vendor-pdf', test: /node_modules[\\/](jspdf|jspdf-autotable|fflate|fast-png)[\\/]/ },
            { name: 'vendor-mui', test: /node_modules[\\/](@mui|@emotion)[\\/]/ },
            { name: 'vendor-radix', test: /node_modules[\\/](@radix-ui|radix-ui|lucide-react)[\\/]/ },
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
    // exceljs alone is ~930 kB (lazy-loaded already); everything else stays well below this.
    chunkSizeWarningLimit: 1000,
  },
});
