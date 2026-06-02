import vue from '@vitejs/plugin-vue';
import { URL, fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/echarts') ||
              id.includes('node_modules/vue-echarts') ||
              id.includes('node_modules/zrender')
            ) {
              return 'echarts-vendor';
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
