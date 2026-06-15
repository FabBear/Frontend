import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
  {
    // public/은 vite가 그대로 복사하는 정적 자산(온프렘 Silero VAD 벤더 번들 포함) — 린트 대상 아님
    ignores: ['dist', 'coverage', 'node_modules', 'public'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  skipFormatting
);
