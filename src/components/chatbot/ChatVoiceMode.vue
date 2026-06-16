<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Check, Headphones, Loader2, Mic, Radio, RotateCcw, Square, X } from '@lucide/vue';
import { MicVAD, utils } from '@ricky0123/vad-web';

import { transcribeAudio } from '@/services/chatbotService';

import { useSpeech } from '@/composables/useSpeech';

const props = withDefaults(
  defineProps<{
    active?: boolean;
    disabled?: boolean;
  }>(),
  {
    active: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  send: [message: string];
}>();

const recordSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// Silero VAD(@ricky0123/vad-web) — ONNX 모델로 '사람 발화'만 감지. 진폭 임계값보다
// 소음(FFU/장비음)에 강하다. 모델/WASM은 온프렘 자산(/vad/)에서 로드(CDN 미사용).
const VAD_ASSET_PATH = '/vad/';
const redemptionFrames = 24; // 발화 종료 판정까지 침묵 프레임(≈0.77s)
const responseCooldownMs = 1200;
const speechEndCooldownMs = 900;

const { autoRead, speaking, speechBusy, ttsPreparing, setAutoRead, stop } = useSpeech();
const statusMessage = ref('');
const isVoiceArmed = ref(false);
const isListening = ref(false);
const isRecording = ref(false);
const isTranscribing = ref(false);
const pendingTranscript = ref('');
const capturePausedUntil = ref(0);
const needsQuietBeforeCapture = ref(false);

let vad: MicVAD | null = null;
let starting = false;
let gateTimer: number | null = null;
// 음성모드가 autoRead를 강제로 켠 경우 기억 → 종료 시 원복(텍스트 모드 자동읽기는 헤더 토글로만).
let autoReadForced = false;

function canCapture() {
  // speechBusy = TTS 합성 준비 중 OR 읽는 중 → 그동안 마이크 캡처 금지(자기 TTS 차단).
  // 주의: pendingTranscript(확인 대기) 중에는 캡처를 허용해야 음성 명령("전송"/"취소")이 들린다.
  return (
    !props.disabled &&
    !isTranscribing.value &&
    !speechBusy.value &&
    Date.now() >= capturePausedUntil.value &&
    !needsQuietBeforeCapture.value
  );
}

const statusTitle = computed(() => {
  if (!recordSupported) return '음성 미지원';
  if (!isVoiceArmed.value && !isTranscribing.value && !pendingTranscript.value) return '시작 전';
  if (pendingTranscript.value) return '확인 필요';
  if (isTranscribing.value) return '전사 중';
  if (props.disabled) return 'AI 응답 중';
  if (ttsPreparing.value) return '읽기 준비';
  if (speaking.value) return '읽는 중';
  if (isRecording.value) return '말 감지';
  if (Date.now() < capturePausedUntil.value) return '대기 중';
  if (isListening.value) return '듣는 중';
  return '음성 대기';
});

const modeHint = computed(() =>
  isVoiceArmed.value
    ? '말하면 자동으로 질문하고 답변을 읽어줍니다.'
    : '음성 시작을 누르기 전까지 마이크는 켜지지 않습니다.'
);
const commandChips = ['중지', '취소', '다시 말할게', '전송'];

watch(
  () => props.active,
  (active) => {
    if (active) updateStatus();
    else stopVoiceMode();
  },
  { immediate: true }
);

// AI 응답 중·읽는 중·전사 중에는 VAD를 멈춰 TTS/잡음을 캡처하지 않는다.
// 단, pendingTranscript(확인 대기)는 멈추지 않음 — 음성 명령("전송"/"취소"/"다시")을 들어야 함.
watch(
  [speechBusy, () => props.disabled, isTranscribing, pendingTranscript],
  ([busy, disabled, transcribing], oldValues) => {
    const [wasBusy = false, wasDisabled = false] = oldValues ?? [];
    if (!props.active) return;
    if (busy || wasBusy) {
      pauseCapture(speechEndCooldownMs);
    } else if (disabled || wasDisabled) {
      pauseCapture(responseCooldownMs);
    } else if (transcribing) {
      pauseCapture(300);
    }
    syncGate();
    updateStatus();
  }
);

onBeforeUnmount(stopVoiceMode);

// canCapture 상태에 맞춰 VAD를 재개/일시정지.
function syncGate() {
  if (!vad || !isVoiceArmed.value) return;
  if (Date.now() < capturePausedUntil.value) {
    void vad.pause();
    isListening.value = false;
    isRecording.value = false;
    scheduleGateSync();
    return;
  }
  if (needsQuietBeforeCapture.value) {
    needsQuietBeforeCapture.value = false;
  }
  if (canCapture()) {
    void vad.start();
    isListening.value = true;
  } else {
    void vad.pause();
    isRecording.value = false;
  }
}

function pauseCapture(ms: number) {
  capturePausedUntil.value = Math.max(capturePausedUntil.value, Date.now() + ms);
  needsQuietBeforeCapture.value = true;
  isRecording.value = false;
  scheduleGateSync();
}

function scheduleGateSync() {
  if (typeof window === 'undefined') return;
  if (gateTimer !== null) window.clearTimeout(gateTimer);
  const delay = capturePausedUntil.value - Date.now();
  if (delay <= 0) {
    gateTimer = null;
    return;
  }
  gateTimer = window.setTimeout(() => {
    gateTimer = null;
    syncGate();
    updateStatus();
  }, delay);
}

function clearGateTimer() {
  if (typeof window === 'undefined' || gateTimer === null) return;
  window.clearTimeout(gateTimer);
  gateTimer = null;
}

async function startVoiceMode() {
  if (!recordSupported || isVoiceArmed.value || starting) {
    updateStatus();
    return;
  }
  if (props.disabled) {
    statusMessage.value = 'AI 응답이 끝난 뒤 시작할 수 있습니다';
    return;
  }
  if (!autoRead.value) {
    setAutoRead(true);
    autoReadForced = true;
  }
  starting = true;
  statusMessage.value = '음성 엔진 준비 중';
  try {
    vad = await MicVAD.new({
      model: 'v5',
      baseAssetPath: VAD_ASSET_PATH,
      onnxWASMBasePath: VAD_ASSET_PATH,
      // 단일 스레드 고정 → SharedArrayBuffer(COOP/COEP 헤더) 없이도 온프렘에서 동작.
      ortConfig: (ort) => {
        ort.env.wasm.numThreads = 1;
      },
      // 잡음 강건성: 발화 판정을 깐깐하게(0.6), 300ms 미만 짧은 블립은 폐기(잡음/클릭 제거).
      redemptionMs: redemptionFrames * 32,
      minSpeechMs: 300,
      preSpeechPadMs: 200,
      positiveSpeechThreshold: 0.6,
      negativeSpeechThreshold: 0.42,
      onSpeechStart: () => {
        if (!canCapture()) return;
        isRecording.value = true;
        updateStatus();
      },
      onVADMisfire: () => {
        isRecording.value = false;
        updateStatus();
      },
      onSpeechEnd: (audio: Float32Array) => {
        isRecording.value = false;
        if (!canCapture()) return;
        void handleSpeechSegment(audio);
      },
    });
  } catch {
    vad = null;
    starting = false;
    isVoiceArmed.value = false;
    statusMessage.value = '음성 엔진 로드 실패(마이크 권한 또는 자산 확인)';
    return;
  }
  starting = false;
  isVoiceArmed.value = true;
  await vad.start();
  isListening.value = true;
  updateStatus();
}

function stopVoiceMode() {
  if (autoReadForced) {
    setAutoRead(false);
    autoReadForced = false;
  }
  isVoiceArmed.value = false;
  isListening.value = false;
  isRecording.value = false;
  pendingTranscript.value = '';
  capturePausedUntil.value = 0;
  needsQuietBeforeCapture.value = false;
  clearGateTimer();
  if (vad) {
    void vad.destroy();
    vad = null;
  }
  if (!isTranscribing.value) statusMessage.value = '';
}

function handleStopVoiceMode() {
  stopVoiceMode();
  updateStatus();
}

// Silero가 잘라낸 발화 구간(Float32 16kHz)을 WAV로 인코딩해 온프렘 STT로 전송.
async function handleSpeechSegment(audio: Float32Array) {
  const wav = utils.encodeWAV(audio, 1, 16000, 1, 16);
  const blob = new Blob([wav], { type: 'audio/wav' });
  if (!blob.size) {
    updateStatus();
    return;
  }
  isTranscribing.value = true;
  syncGate();
  statusMessage.value = '전사 중';
  try {
    const result = await transcribeAudio(blob);
    const text = result.text.trim();
    const conf = result.confidence;
    if (!text) {
      // 서버가 환각/반복으로 폐기(text=""). 조용히 무시.
      statusMessage.value = '노이즈 무시';
    } else if (conf !== null && conf < 0.3) {
      // 신뢰도 너무 낮음 → 잡음으로 보고 전송/확인 없이 폐기.
      statusMessage.value = '잡음으로 무시';
    } else if (handleVoiceCommand(text)) {
      statusMessage.value = '명령을 처리했습니다';
    } else if (pendingTranscript.value) {
      // 확인 대기 중 명령 외 발화는 무시(잡음이 대기 문장을 덮어쓰지 않게).
      statusMessage.value = '"전송", "다시 말할게", "취소"로 답해주세요';
    } else if (shouldConfirmTranscript(text, conf)) {
      pendingTranscript.value = text;
      statusMessage.value = '전송 전 확인해주세요';
    } else {
      pauseCapture(responseCooldownMs);
      emit('send', text);
    }
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : '전사 실패';
  } finally {
    isTranscribing.value = false;
    syncGate();
    updateStatus();
  }
}

function updateStatus() {
  if (!recordSupported) {
    statusMessage.value = '현재 브라우저에서 사용할 수 없습니다';
  } else if (!isVoiceArmed.value && !isTranscribing.value && !pendingTranscript.value) {
    statusMessage.value = '음성 시작을 누르면 마이크가 켜집니다';
  } else if (pendingTranscript.value) {
    statusMessage.value = '전송 전 확인해주세요';
  } else if (isTranscribing.value) {
    statusMessage.value = '전사 중';
  } else if (props.disabled) {
    statusMessage.value = 'AI 응답 생성 중';
  } else if (ttsPreparing.value) {
    statusMessage.value = 'AI 답변 읽기 준비 중';
  } else if (speaking.value) {
    statusMessage.value = 'AI 답변 읽는 중';
  } else if (Date.now() < capturePausedUntil.value || needsQuietBeforeCapture.value) {
    statusMessage.value = '다음 질문을 듣기 전 잠시 대기 중';
  } else if (isRecording.value) {
    statusMessage.value = '말 끝나면 자동 전사';
  } else if (isListening.value) {
    statusMessage.value = '말하면 자동으로 질문합니다';
  } else {
    statusMessage.value = '대기';
  }
}

function handleVoiceCommand(text: string) {
  const command = resolveVoiceCommand(text);
  if (!command) return false;

  if (command === 'confirm') {
    if (pendingTranscript.value) confirmPendingTranscript();
    else statusMessage.value = '확인할 문장이 없습니다';
    return true;
  }
  if (command === 'retry') {
    retryPendingTranscript();
    return true;
  }
  if (command === 'cancel') {
    cancelPendingTranscript();
    return true;
  }
  if (command === 'stop') {
    stop();
    pendingTranscript.value = '';
    statusMessage.value = '읽기를 멈췄습니다';
    return true;
  }
  return false;
}

function resolveVoiceCommand(text: string): 'confirm' | 'retry' | 'cancel' | 'stop' | null {
  const normalized = text.replace(/[.?!,，。！？\s]/g, '').toLowerCase();
  if (!normalized) return null;
  if (['전송', '보내', '보내줘', '맞아', '응맞아', '확인', '그래'].includes(normalized)) return 'confirm';
  if (['다시', '다시말할게', '다시할게', '재녹음', '다시녹음'].includes(normalized)) return 'retry';
  if (['취소', '아니야', '보내지마', '삭제', '지워'].includes(normalized)) return 'cancel';
  if (['중지', '멈춰', '그만', '스톱', '읽기중지', '정지'].includes(normalized)) return 'stop';
  return null;
}

// 잡음/환각 방어 + 빠른 핸즈프리 균형:
// <0.3 폐기(상위에서 처리) · 0.3~0.55 확인 · ≥0.55 바로 전송(단 한두 글자는 확인).
function shouldConfirmTranscript(text: string, confidence: number | null) {
  const normalized = text.replace(/\s/g, '');
  if (confidence !== null && confidence >= 0.55) {
    return normalized.length <= 2; // 신뢰도 높아도 한두 글자 오인식은 확인
  }
  return true; // 중간 신뢰도(0.3~0.55) → 확인 후 전송(잡음 오발송 방지)
}

function confirmPendingTranscript() {
  const text = pendingTranscript.value.trim();
  pendingTranscript.value = '';
  if (text) {
    pauseCapture(responseCooldownMs);
    syncGate();
    emit('send', text);
  }
}

function retryPendingTranscript() {
  pendingTranscript.value = '';
  statusMessage.value = '다시 듣는 중';
}

function cancelPendingTranscript() {
  pendingTranscript.value = '';
  statusMessage.value = '취소했습니다';
}
</script>

<template>
  <div
    class="chat-voice-mode"
    :class="{
      'chat-voice-mode--recording': isRecording,
      'chat-voice-mode--listening': isListening && !isRecording && !isTranscribing,
    }"
  >
    <div class="chat-voice-mode__main">
      <div class="chat-voice-mode__icon" aria-hidden="true">
        <Loader2 v-if="isTranscribing" :size="21" class="chat-voice-mode__spin" />
        <Mic v-else-if="isRecording" :size="21" />
        <Headphones v-else-if="isListening" :size="21" />
        <Radio v-else :size="21" />
      </div>
      <div class="chat-voice-mode__copy">
        <div class="chat-voice-mode__headline">
          <strong>{{ statusMessage }}</strong>
          <span class="chat-voice-mode__status">{{ statusTitle }}</span>
        </div>
        <span>{{ modeHint }}</span>
      </div>
      <div class="chat-voice-mode__actions">
        <button
          v-if="recordSupported && !isVoiceArmed"
          type="button"
          class="chat-voice-mode__primary"
          :disabled="disabled"
          @click="startVoiceMode"
        >
          <Mic :size="14" aria-hidden="true" />
          음성 시작
        </button>
        <button
          v-else-if="recordSupported"
          type="button"
          class="chat-voice-mode__secondary"
          @click="handleStopVoiceMode"
        >
          <Square :size="14" aria-hidden="true" />
          {{ isRecording ? '녹음 취소' : '음성 끄기' }}
        </button>
        <button
          v-if="speaking"
          type="button"
          class="chat-voice-mode__stop"
          aria-label="읽기 중지"
          title="읽기 중지"
          @click="stop"
        >
          <Square :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="chat-voice-mode__commands" aria-label="사용 가능한 음성 명령">
      <span class="chat-voice-mode__commands-label">음성 명령</span>
      <span v-for="command in commandChips" :key="command" class="chat-voice-mode__command-chip">
        {{ command }}
      </span>
    </div>

    <div v-if="pendingTranscript" class="chat-voice-mode__preview">
      <span>이 말이 맞나요?</span>
      <strong>{{ pendingTranscript }}</strong>
      <div class="chat-voice-mode__preview-actions">
        <button type="button" @click="confirmPendingTranscript">
          <Check :size="14" aria-hidden="true" />
          전송
        </button>
        <button type="button" @click="retryPendingTranscript">
          <RotateCcw :size="14" aria-hidden="true" />
          다시
        </button>
        <button type="button" @click="cancelPendingTranscript">
          <X :size="14" aria-hidden="true" />
          취소
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-voice-mode {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: color-mix(in srgb, var(--color-action-primary-soft) 34%, var(--color-bg-surface));
}

.chat-voice-mode__main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-3);
}

.chat-voice-mode__status {
  flex: 0 0 auto;
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  padding: 3px 8px;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.chat-voice-mode__icon {
  display: inline-grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  color: var(--color-action-primary);
}

.chat-voice-mode--recording .chat-voice-mode__icon {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
  animation: chat-voice-recording 1s ease-in-out infinite;
}

.chat-voice-mode--listening .chat-voice-mode__icon {
  animation: chat-voice-listening 1.4s ease-in-out infinite;
}

.chat-voice-mode__copy {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  gap: 3px;
}

.chat-voice-mode__headline {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-2);
}

.chat-voice-mode__copy strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-voice-mode__copy span {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-voice-mode__headline .chat-voice-mode__status {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
}

.chat-voice-mode__actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-2);
}

.chat-voice-mode__preview {
  display: grid;
  gap: var(--space-2);
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.chat-voice-mode__preview span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-voice-mode__preview strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}

.chat-voice-mode__preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chat-voice-mode__primary,
.chat-voice-mode__secondary,
.chat-voice-mode__preview-actions button,
.chat-voice-mode__stop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 30px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.chat-voice-mode__primary {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  padding: 0 12px;
}

.chat-voice-mode__secondary {
  border-color: var(--color-action-primary-border);
  background: var(--color-bg-card);
  color: var(--color-action-primary);
  padding: 0 10px;
}

.chat-voice-mode__primary:disabled,
.chat-voice-mode__secondary:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.chat-voice-mode__preview-actions button:first-child {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.chat-voice-mode__stop {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  padding: 0;
  color: var(--color-status-danger);
}

.chat-voice-mode__commands {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  gap: var(--space-1);
  padding-left: 58px;
}

.chat-voice-mode__commands-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
}

.chat-voice-mode__command-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 16%, var(--color-border-default));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-card));
  padding: 0 var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-voice-mode__spin {
  animation: chat-voice-spin 0.9s linear infinite;
}

@keyframes chat-voice-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes chat-voice-listening {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-action-primary) 26%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-action-primary) 0%, transparent);
  }
}

@keyframes chat-voice-recording {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-status-danger) 32%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-status-danger) 0%, transparent);
  }
}
</style>
