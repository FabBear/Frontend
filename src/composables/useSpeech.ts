import { computed, ref } from 'vue';

// TTS: 브라우저 speechSynthesis(로컬 OS 음성) — 즉시 재생·무료·무유지보수, 오디오가 외부로 안 나감.
// (온프렘 MeloTTS는 torch/mecab 의존성이 무거워 현장 이득 대비 비용이 커서 제거함.)
const VOICE_STORAGE_KEY = 'fabbear.tts.voice';
let speechRequestId = 0;
const PREFERRED_KO_VOICE_KEYWORDS = [
  'Yuna',
  'Google 한국',
  'Google Korean',
  'Microsoft SunHi',
  'Microsoft Heami',
  'Narae',
  'Sora',
  'Korean',
  '한국',
];
const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const autoRead = ref(false);
const ttsPreparing = ref(false);
const speaking = ref(false);
const speechBusy = computed(() => ttsPreparing.value || speaking.value);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoiceName = ref(loadSavedVoiceName());
// 현재 어떤 메시지를 읽고 있는지(메시지별 읽기 버튼 상태 표시용).
const speakingId = ref<string | null>(null);

if (ttsSupported) {
  refreshVoices();
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

function loadSavedVoiceName() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function refreshVoices() {
  if (!ttsSupported) return;
  availableVoices.value = window.speechSynthesis.getVoices();
  if (!selectedVoiceName.value) {
    selectedVoiceName.value = pickPreferredKoreanVoice()?.name ?? null;
  }
}

function pickPreferredKoreanVoice() {
  const voices = availableVoices.value;
  const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ko'));
  return (
    PREFERRED_KO_VOICE_KEYWORDS.map((keyword) =>
      koreanVoices.find((voice) => voice.name.toLowerCase().includes(keyword.toLowerCase()))
    ).find(Boolean) ??
    koreanVoices[0] ??
    voices.find((voice) => voice.lang.toLowerCase().includes('ko')) ??
    null
  );
}

function getSelectedVoice() {
  refreshVoices();
  if (selectedVoiceName.value) {
    const savedVoice = availableVoices.value.find((voice) => voice.name === selectedVoiceName.value);
    if (savedVoice) return savedVoice;
  }
  return pickPreferredKoreanVoice();
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|]/g, ' ')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakBrowser(clean: string, id: string | null, requestId: number) {
  if (!ttsSupported || requestId !== speechRequestId) {
    ttsPreparing.value = false;
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'ko-KR';
  utterance.rate = 0.94;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  utterance.onstart = () => {
    if (requestId !== speechRequestId) return;
    ttsPreparing.value = false;
    speaking.value = true;
    speakingId.value = id;
  };
  const cleanup = () => {
    if (requestId !== speechRequestId) return;
    ttsPreparing.value = false;
    speaking.value = false;
    speakingId.value = null;
  };
  utterance.onend = cleanup;
  utterance.onerror = cleanup;
  window.speechSynthesis.speak(utterance);
}

function speak(text: string, id: string | null = null) {
  if (!text || !text.trim()) return;
  const clean = stripMarkdown(text);
  if (!clean) return;
  stop();
  const requestId = ++speechRequestId;
  ttsPreparing.value = true;
  speakBrowser(clean, id, requestId);
}

function stop() {
  speechRequestId += 1;
  if (ttsSupported) window.speechSynthesis.cancel();
  ttsPreparing.value = false;
  speaking.value = false;
  speakingId.value = null;
}

// 메시지별 읽기 토글: 이미 그 메시지를 읽고 있으면 멈춤, 아니면 읽기 시작.
function toggleSpeak(text: string, id: string) {
  if (speakingId.value === id) {
    stop();
  } else {
    speak(text, id);
  }
}

function toggleAutoRead() {
  autoRead.value = !autoRead.value;
  if (!autoRead.value) stop();
}

function setAutoRead(value: boolean) {
  autoRead.value = value;
  if (!value) stop();
}

function setVoiceByName(name: string | null) {
  selectedVoiceName.value = name;
  try {
    if (name) window.localStorage.setItem(VOICE_STORAGE_KEY, name);
    else window.localStorage.removeItem(VOICE_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function useSpeech() {
  return {
    ttsSupported,
    autoRead,
    ttsPreparing,
    speaking,
    speechBusy,
    speakingId,
    availableVoices,
    selectedVoiceName,
    speak,
    stop,
    toggleSpeak,
    toggleAutoRead,
    setAutoRead,
    setVoiceByName,
    refreshVoices,
  };
}
