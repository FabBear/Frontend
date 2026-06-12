// 온프렘 Silero VAD 자산을 public/vad/로 복사한다(CDN 미사용).
// @ricky0123/vad-web(worklet+model) + onnxruntime-web(wasm)에서 가져온다.
// npm install 후(postinstall) 자동 실행 → 자산은 git에 안 올리고 재생성한다.
import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'vad');
mkdirSync(dest, { recursive: true });

const vadDist = join(root, 'node_modules', '@ricky0123', 'vad-web', 'dist');
const ortDist = join(root, 'node_modules', 'onnxruntime-web', 'dist');

if (!existsSync(vadDist) || !existsSync(ortDist)) {
  console.warn('[copy-vad-assets] vad-web/onnxruntime-web 미설치 — 건너뜀');
  process.exit(0);
}

const vadFiles = ['vad.worklet.bundle.min.js', 'silero_vad_v5.onnx', 'silero_vad_legacy.onnx'];
for (const f of vadFiles) copyFileSync(join(vadDist, f), join(dest, f));
// ort는 각 .wasm마다 동명의 .mjs 글루 로더를 함께 fetch한다 → 둘 다 복사해야 로드됨.
const ortAssets = readdirSync(ortDist).filter((n) => /^ort-wasm-.*\.(wasm|mjs)$/.test(n));
for (const f of ortAssets) copyFileSync(join(ortDist, f), join(dest, f));
console.log(`[copy-vad-assets] public/vad/ 동기화 완료 (${vadFiles.length} + ort ${ortAssets.length})`);
