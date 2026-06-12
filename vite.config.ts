import vue from '@vitejs/plugin-vue';
import { URL, fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080';
  const aiTarget = env.VITE_DEV_AI_TARGET || 'http://localhost:8000';
  // AI 직접 스트리밍용 내부 헤더 — dev 프록시에서 주입(브라우저 번들에 노출되지 않음).
  const aiInternalHeaders = {
    'X-Internal-Token': env.VITE_DEV_AI_INTERNAL_TOKEN || 'fabbear-internal-token-2024',
    'X-User-Id': '00000000-0000-0000-0000-000000000001',
    'X-User-Role': 'USER',
    'X-Factory-Id': env.VITE_DEV_FAB_ID || '9db3c0e4-612a-4d84-b6bf-fafed1f44d03',
    'X-Request-Id': '00000000-0000-0000-0000-000000000002',
  };

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
        // 챗 SSE 스트리밍: 프론트 → FastAPI 직접(/ai/api/chat/stream).
        // /ai/chatbot은 Vue route라 프록시가 가로채면 안 된다.
        '/ai/api': {
          target: aiTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/ai/, ''),
          headers: aiInternalHeaders,
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
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
