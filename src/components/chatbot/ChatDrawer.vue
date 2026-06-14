<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { Bot, GripVertical, Headphones, Keyboard, MessageSquarePlus, Volume2, VolumeX, X } from '@lucide/vue';

import { useChat } from '@/composables/useChat';
import { useChatDrawer } from '@/composables/useChatDrawer';
import { useSpeech } from '@/composables/useSpeech';

import BaseButton from '@/components/base/BaseButton.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import ChatInput from '@/components/chatbot/ChatInput.vue';
import ChatMessageList from '@/components/chatbot/ChatMessageList.vue';
import ChatSessionList from '@/components/chatbot/ChatSessionList.vue';
import ChatVoiceMode from '@/components/chatbot/ChatVoiceMode.vue';

const props = defineProps<{
  open: boolean;
  contextTitle?: string;
}>();

defineEmits<{
  close: [];
}>();

const { consumePendingReport, consumePendingReportContext, consumePendingAgentTask } = useChatDrawer();
const {
  sessions,
  activeSessionId,
  messages,
  quickPrompts,
  quickPromptTitle,
  isResponding,
  reportContext,
  agentContext,
  loadInitialChatData,
  selectSession,
  createSession,
  deleteSession,
  sendMessage,
  initWithReport,
  initWithReportContext,
  initWithAgentTask,
  initWithCasePrompt,
  clearReportContext,
  clearAgentContext,
} = useChat();

const pendingDeleteId = ref<string | null>(null);
const pendingDeleteTitle = computed(
  () => sessions.value.find((s) => s.sessionId === pendingDeleteId.value)?.sessionTitle ?? ''
);
const chatMode = ref<'text' | 'voice'>('text');

function handleDeleteSession(sessionId: string) {
  pendingDeleteId.value = sessionId;
}

function confirmDeleteSession() {
  if (pendingDeleteId.value) void deleteSession(pendingDeleteId.value);
  pendingDeleteId.value = null;
}

// 답변 자동 음성출력(토글 ON일 때만, 새 ASSISTANT 메시지를 읽음). 세션 전환/최초 로드 시엔 안 읽음.
const { ttsSupported, autoRead, speak, toggleAutoRead } = useSpeech();
let lastSpokenId: string | null = null;
let speechPrimed = false;
watch(activeSessionId, () => {
  speechPrimed = false;
});
watch(
  messages,
  (list) => {
    const last = list[list.length - 1];
    if (!last) return;
    if (!speechPrimed) {
      speechPrimed = true;
      lastSpokenId = last.messageId;
      return;
    }
    if (last.role !== 'ASSISTANT' || last.messageId === lastSpokenId) return;
    if (last.pending) return; // SSE 스트리밍 중 — 완성된 뒤에 읽음
    lastSpokenId = last.messageId;
    // 음성 자동읽기는 현장 친화 구어체 요약(spokenSummary) 우선, 없으면 본문.
    if (autoRead.value) speak(last.spokenSummary || last.content, last.messageId);
  },
  { deep: true }
);

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface DrawerSize {
  width: number;
  height: number;
}

interface DrawerGeometry extends DrawerSize {
  left: number;
  top: number;
}

const DRAWER_POSITION_KEY = 'fabbear.chatDrawer.position';
const DRAWER_SIZE_KEY = 'fabbear.chatDrawer.size';
const MIN_DRAWER_WIDTH = 380;
const MIN_DRAWER_HEIGHT = 560;
const MIN_VOICE_DRAWER_HEIGHT = 640;
const size = ref(loadSavedSize());
const position = ref(loadSavedPosition(size.value));
const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const resizeState = ref<{
  direction: ResizeDirection;
  startX: number;
  startY: number;
  start: DrawerGeometry;
} | null>(null);

const drawerStyle = computed(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
  width: `${size.value.width}px`,
  height: `${size.value.height}px`,
}));

watch(
  () => props.open,
  async (val) => {
    if (val) {
      await loadInitialChatData();
      await nextTick();
      ensureDrawerInViewport();
      ensureModeControlsVisible(chatMode.value);
      const report = consumePendingReport();
      const reportContext = consumePendingReportContext();
      const agentTask = consumePendingAgentTask();
      const casePrompt = consumePendingCasePrompt();
      if (report) initWithReport(report);
      if (reportContext) initWithReportContext(reportContext);
      if (agentTask) initWithAgentTask(agentTask);
      if (casePrompt) void initWithCasePrompt(casePrompt);
    }
  }
);

let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleWindowResize() {
  ensureDrawerInViewport(false);
  if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(persistGeometry, 200);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleWindowResize);
}
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer);
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup', stopResize);
  resetBodyCursor();
});

function formatDetectedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function handleCreateSession() {
  createSession();
  clearReportContext();
  clearAgentContext();
}

async function setChatMode(mode: 'text' | 'voice') {
  chatMode.value = mode;
  await nextTick();
  ensureModeControlsVisible(mode);
}

function loadSavedSize(): DrawerSize {
  if (typeof window === 'undefined') return { width: 520, height: 720 };
  try {
    const saved = window.localStorage.getItem(DRAWER_SIZE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DrawerSize>;
      if (Number.isFinite(parsed.width) && Number.isFinite(parsed.height)) {
        return clampSize({ width: Number(parsed.width), height: Number(parsed.height) });
      }
    }
  } catch {
    // ignore invalid persisted size
  }
  return defaultSize();
}

function loadSavedPosition(currentSize: DrawerSize) {
  if (typeof window === 'undefined') return { left: 0, top: 76 };
  try {
    const saved = window.localStorage.getItem(DRAWER_POSITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { left?: number; top?: number };
      if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
        return clampPosition({ left: Number(parsed.left), top: Number(parsed.top) }, currentSize);
      }
    }
  } catch {
    // ignore invalid persisted coordinates
  }
  return defaultPosition(currentSize);
}

function defaultSize(): DrawerSize {
  if (typeof window === 'undefined') return { width: 520, height: 720 };
  return clampSize({
    width: 520,
    height: Math.max(560, window.innerHeight - 104),
  });
}

function defaultPosition(currentSize: DrawerSize) {
  if (typeof window === 'undefined') return { left: 0, top: 76 };
  return clampPosition(
    {
      left: window.innerWidth - currentSize.width - 16,
      top: 82,
    },
    currentSize
  );
}

function clampSize(next: DrawerSize): DrawerSize {
  if (typeof window === 'undefined') return next;
  const maxWidth = Math.max(MIN_DRAWER_WIDTH, window.innerWidth - 24);
  const maxHeight = Math.max(360, window.innerHeight - 24);
  const minHeight = Math.min(MIN_DRAWER_HEIGHT, maxHeight);
  return {
    width: Math.min(maxWidth, Math.max(MIN_DRAWER_WIDTH, next.width)),
    height: Math.min(maxHeight, Math.max(minHeight, next.height)),
  };
}

function clampPosition(next: { left: number; top: number }, currentSize = size.value) {
  if (typeof window === 'undefined') return next;
  const boundedSize = clampSize(currentSize);
  const maxLeft = Math.max(12, window.innerWidth - boundedSize.width - 12);
  const maxTop = Math.max(12, window.innerHeight - boundedSize.height - 12);
  return {
    left: Math.min(maxLeft, Math.max(12, next.left)),
    top: Math.min(maxTop, Math.max(12, next.top)),
  };
}

function clampGeometry(next: DrawerGeometry): DrawerGeometry {
  const boundedSize = clampSize(next);
  const boundedPosition = clampPosition({ left: next.left, top: next.top }, boundedSize);
  return { ...boundedPosition, ...boundedSize };
}

function ensureDrawerInViewport(persist = true) {
  const bounded = clampGeometry({
    left: position.value.left,
    top: position.value.top,
    width: size.value.width,
    height: size.value.height,
  });
  position.value = { left: bounded.left, top: bounded.top };
  size.value = { width: bounded.width, height: bounded.height };
  if (persist) persistGeometry();
}

function ensureModeControlsVisible(mode: 'text' | 'voice' = chatMode.value) {
  if (typeof window === 'undefined') return;
  const maxHeight = Math.max(360, window.innerHeight - 24);
  const desiredHeight = Math.min(maxHeight, mode === 'voice' ? MIN_VOICE_DRAWER_HEIGHT : MIN_DRAWER_HEIGHT);
  if (size.value.height >= desiredHeight) {
    ensureDrawerInViewport();
    return;
  }
  const bounded = clampGeometry({
    left: position.value.left,
    top: position.value.top,
    width: size.value.width,
    height: desiredHeight,
  });
  position.value = { left: bounded.left, top: bounded.top };
  size.value = { width: bounded.width, height: bounded.height };
  persistGeometry();
}

function persistGeometry() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRAWER_POSITION_KEY, JSON.stringify(position.value));
  window.localStorage.setItem(DRAWER_SIZE_KEY, JSON.stringify(size.value));
}

function startDrag(event: PointerEvent) {
  if (typeof window === 'undefined' || window.innerWidth <= 760 || isResizing.value) return;
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX - position.value.left,
    y: event.clientY - position.value.top,
  };
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopDrag, { once: true });
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return;
  position.value = clampPosition({
    left: event.clientX - dragOffset.value.x,
    top: event.clientY - dragOffset.value.y,
  });
}

function stopDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  persistGeometry();
  if (typeof window === 'undefined') return;
  window.removeEventListener('pointermove', handlePointerMove);
}

function startResize(event: PointerEvent, direction: ResizeDirection) {
  if (typeof window === 'undefined' || window.innerWidth <= 760) return;
  event.preventDefault();
  event.stopPropagation();
  isResizing.value = true;
  resizeState.value = {
    direction,
    startX: event.clientX,
    startY: event.clientY,
    start: {
      left: position.value.left,
      top: position.value.top,
      width: size.value.width,
      height: size.value.height,
    },
  };
  document.body.style.cursor = resizeCursor(direction);
  window.addEventListener('pointermove', handleResizeMove);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function handleResizeMove(event: PointerEvent) {
  if (!isResizing.value || !resizeState.value) return;
  const { direction, start, startX, startY } = resizeState.value;
  const next = resizeGeometry(direction, start, event.clientX - startX, event.clientY - startY);
  position.value = { left: next.left, top: next.top };
  size.value = { width: next.width, height: next.height };
}

function stopResize() {
  if (!isResizing.value) return;
  isResizing.value = false;
  resizeState.value = null;
  persistGeometry();
  resetBodyCursor();
  if (typeof window === 'undefined') return;
  window.removeEventListener('pointermove', handleResizeMove);
}

function resizeGeometry(direction: ResizeDirection, start: DrawerGeometry, dx: number, dy: number): DrawerGeometry {
  let left = start.left;
  let top = start.top;
  let width = start.width;
  let height = start.height;
  const right = start.left + start.width;
  const bottom = start.top + start.height;

  if (direction.includes('e')) {
    width = start.width + dx;
  }
  if (direction.includes('s')) {
    height = start.height + dy;
  }
  if (direction.includes('w')) {
    width = start.width - dx;
  }
  if (direction.includes('n')) {
    height = start.height - dy;
  }

  const boundedSize = clampSize({ width, height });

  if (direction.includes('w')) {
    left = right - boundedSize.width;
  }
  if (direction.includes('n')) {
    top = bottom - boundedSize.height;
  }

  return clampGeometry({
    left,
    top,
    width: boundedSize.width,
    height: boundedSize.height,
  });
}

function resizeCursor(direction: ResizeDirection) {
  if (direction === 'n' || direction === 's') return 'ns-resize';
  if (direction === 'e' || direction === 'w') return 'ew-resize';
  if (direction === 'ne' || direction === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}

function resetBodyCursor() {
  if (typeof document === 'undefined') return;
  document.body.style.cursor = '';
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="chat-drawer" :style="drawerStyle" role="presentation">
      <aside
        class="chat-drawer__panel"
        :class="{
          'chat-drawer__panel--dragging': isDragging,
          'chat-drawer__panel--resizing': isResizing,
          'chat-drawer__panel--voice': chatMode === 'voice',
        }"
        aria-label="AI 챗봇"
      >
        <span
          class="chat-drawer__resize chat-drawer__resize--n"
          aria-hidden="true"
          @pointerdown="startResize($event, 'n')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--s"
          aria-hidden="true"
          @pointerdown="startResize($event, 's')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--e"
          aria-hidden="true"
          @pointerdown="startResize($event, 'e')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--w"
          aria-hidden="true"
          @pointerdown="startResize($event, 'w')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--ne"
          aria-hidden="true"
          @pointerdown="startResize($event, 'ne')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--nw"
          aria-hidden="true"
          @pointerdown="startResize($event, 'nw')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--se"
          aria-hidden="true"
          @pointerdown="startResize($event, 'se')"
        />
        <span
          class="chat-drawer__resize chat-drawer__resize--sw"
          aria-hidden="true"
          @pointerdown="startResize($event, 'sw')"
        />
        <header class="chat-drawer__header">
          <div class="chat-drawer__brand" title="드래그해서 위치 이동" @pointerdown="startDrag">
            <GripVertical :size="17" class="chat-drawer__drag-icon" aria-hidden="true" />
            <span class="chat-drawer__brand-icon">
              <Bot :size="18" aria-hidden="true" />
            </span>
            <div class="chat-drawer__header-text">
              <p>{{ contextTitle ?? '현재 화면' }}</p>
              <h2>FabBEAR AI Agent</h2>
            </div>
          </div>
          <div class="chat-drawer__header-actions">
            <button
              v-if="ttsSupported"
              class="chat-drawer__icon-button"
              :class="{ 'chat-drawer__icon-button--on': autoRead }"
              type="button"
              :title="autoRead ? '답변 자동 읽기 켜짐 (핸즈프리)' : '답변 자동 읽기'"
              :aria-pressed="autoRead"
              aria-label="답변 자동 읽기 토글"
              @click="toggleAutoRead"
            >
              <Volume2 v-if="autoRead" :size="17" aria-hidden="true" />
              <VolumeX v-else :size="17" aria-hidden="true" />
            </button>
            <button
              class="chat-drawer__icon-button"
              type="button"
              title="새 채팅"
              aria-label="새 채팅"
              @click="handleCreateSession"
            >
              <MessageSquarePlus :size="17" aria-hidden="true" />
            </button>
            <button
              class="chat-drawer__icon-button"
              type="button"
              title="닫기"
              aria-label="닫기"
              @click="$emit('close')"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </div>
          <div class="chat-drawer__mode-switch" role="group" aria-label="대화 모드">
            <button
              type="button"
              class="chat-drawer__mode-button"
              :class="{ 'chat-drawer__mode-button--active': chatMode === 'text' }"
              :aria-pressed="chatMode === 'text'"
              @click="setChatMode('text')"
            >
              <Keyboard :size="14" aria-hidden="true" />
              텍스트
            </button>
            <button
              type="button"
              class="chat-drawer__mode-button"
              :class="{ 'chat-drawer__mode-button--active': chatMode === 'voice' }"
              :aria-pressed="chatMode === 'voice'"
              @click="setChatMode('voice')"
            >
              <Headphones :size="14" aria-hidden="true" />
              음성
            </button>
          </div>
        </header>

        <div v-if="reportContext" class="chat-drawer__report-ctx">
          <div class="chat-drawer__report-ctx-left">
            <span class="chat-drawer__report-ctx-tag">리포트 Q&A 맥락</span>
            <strong class="chat-drawer__report-ctx-name">{{ reportContext.processName }}</strong>
            <span class="chat-drawer__report-ctx-meta">
              Risk {{ reportContext.riskScore }}
              <span class="chat-drawer__report-ctx-sep">·</span>
              {{ reportContext.severity }}
              <span class="chat-drawer__report-ctx-sep">·</span>
              {{ formatDetectedAt(reportContext.detectedAt) }}
            </span>
          </div>
          <button
            class="chat-drawer__report-ctx-clear"
            type="button"
            title="맥락 해제"
            aria-label="맥락 해제"
            @click="clearReportContext"
          >
            <X :size="13" />
          </button>
        </div>

        <div v-if="agentContext" class="chat-drawer__report-ctx chat-drawer__report-ctx--agent">
          <div class="chat-drawer__report-ctx-left">
            <span class="chat-drawer__report-ctx-tag">후속 맥락</span>
            <strong class="chat-drawer__report-ctx-name">{{ agentContext.title }}</strong>
            <span class="chat-drawer__report-ctx-meta">
              {{ agentContext.sourcePage }}
              <span v-if="agentContext.relatedTgId" class="chat-drawer__report-ctx-sep">·</span>
              <span v-if="agentContext.relatedTgId">TG 연결</span>
              <span v-if="agentContext.relatedCaseId" class="chat-drawer__report-ctx-sep">·</span>
              <span v-if="agentContext.relatedCaseId">Case 연결</span>
              <span class="chat-drawer__report-ctx-sep">·</span>
              <span>현황 질문은 새 조회</span>
            </span>
          </div>
          <button
            class="chat-drawer__report-ctx-clear"
            type="button"
            title="맥락 해제"
            aria-label="맥락 해제"
            @click="clearAgentContext"
          >
            <X :size="13" />
          </button>
        </div>

        <div class="chat-drawer__sessions">
          <ChatSessionList
            :sessions="sessions"
            :active-session-id="activeSessionId"
            @select="selectSession"
            @delete="handleDeleteSession"
          />
        </div>

        <section class="chat-drawer__chat">
          <div v-if="quickPrompts.length" class="chat-drawer__prompts">
            <span class="chat-drawer__prompts-title">{{ quickPromptTitle }}</span>
            <div class="chat-drawer__prompts-list">
              <button
                v-for="prompt in quickPrompts"
                :key="prompt.id"
                type="button"
                :disabled="isResponding"
                @click="sendMessage(prompt.message)"
              >
                {{ prompt.label }}
              </button>
            </div>
          </div>
          <div class="chat-drawer__messages">
            <ChatMessageList :messages="messages" :responding="isResponding" />
          </div>
        </section>
        <div class="chat-drawer__footer">
          <ChatInput v-show="chatMode === 'text'" :disabled="isResponding" @send="sendMessage" />
          <ChatVoiceMode
            v-show="chatMode === 'voice'"
            :active="open && chatMode === 'voice'"
            :disabled="isResponding"
            @send="sendMessage"
          />
        </div>
      </aside>
    </div>
  </Teleport>

  <BaseModal
    :model-value="pendingDeleteId !== null"
    title="대화 삭제"
    width="380px"
    @update:model-value="pendingDeleteId = null"
  >
    <div class="chat-drawer__delete-modal">
      <p>
        <strong>{{ pendingDeleteTitle || '이 대화' }}</strong> 대화를 삭제합니다.
      </p>
      <p class="chat-drawer__delete-modal-sub">삭제하면 이 대화의 메시지가 모두 사라집니다. 되돌릴 수 없습니다.</p>
      <footer>
        <BaseButton size="sm" variant="ghost" class="chat-drawer__delete-confirm" @click="confirmDeleteSession">
          삭제
        </BaseButton>
        <BaseButton size="sm" variant="ghost" @click="pendingDeleteId = null">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped>
.chat-drawer {
  position: fixed;
  z-index: var(--z-index-modal);
  pointer-events: none;
}

.chat-drawer__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-panel);
  pointer-events: auto;
}

.chat-drawer__panel--dragging {
  user-select: none;
}

.chat-drawer__panel--resizing {
  user-select: none;
}

.chat-drawer__resize {
  position: absolute;
  z-index: 5;
  background: transparent;
  touch-action: none;
}

.chat-drawer__resize::after {
  position: absolute;
  content: '';
  opacity: 0;
  transition: opacity 120ms ease;
}

.chat-drawer__resize:hover::after,
.chat-drawer__panel--resizing .chat-drawer__resize::after {
  opacity: 1;
}

.chat-drawer__resize--n,
.chat-drawer__resize--s {
  right: 14px;
  left: 14px;
  height: 8px;
  cursor: ns-resize;
}

.chat-drawer__resize--n {
  top: 0;
}

.chat-drawer__resize--s {
  bottom: 0;
}

.chat-drawer__resize--n::after,
.chat-drawer__resize--s::after {
  right: 12px;
  left: 12px;
  height: 2px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 45%, transparent);
}

.chat-drawer__resize--n::after {
  top: 2px;
}

.chat-drawer__resize--s::after {
  bottom: 2px;
}

.chat-drawer__resize--e,
.chat-drawer__resize--w {
  top: 14px;
  bottom: 14px;
  width: 8px;
  cursor: ew-resize;
}

.chat-drawer__resize--e {
  right: 0;
}

.chat-drawer__resize--w {
  left: 0;
}

.chat-drawer__resize--e::after,
.chat-drawer__resize--w::after {
  top: 12px;
  bottom: 12px;
  width: 2px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 45%, transparent);
}

.chat-drawer__resize--e::after {
  right: 2px;
}

.chat-drawer__resize--w::after {
  left: 2px;
}

.chat-drawer__resize--ne,
.chat-drawer__resize--nw,
.chat-drawer__resize--se,
.chat-drawer__resize--sw {
  width: 16px;
  height: 16px;
}

.chat-drawer__resize--ne,
.chat-drawer__resize--sw {
  cursor: nesw-resize;
}

.chat-drawer__resize--nw,
.chat-drawer__resize--se {
  cursor: nwse-resize;
}

.chat-drawer__resize--ne {
  top: 0;
  right: 0;
}

.chat-drawer__resize--nw {
  top: 0;
  left: 0;
}

.chat-drawer__resize--se {
  right: 0;
  bottom: 0;
}

.chat-drawer__resize--sw {
  bottom: 0;
  left: 0;
}

.chat-drawer__resize--ne::after,
.chat-drawer__resize--nw::after,
.chat-drawer__resize--se::after,
.chat-drawer__resize--sw::after {
  inset: 4px;
  border: 2px solid color-mix(in srgb, var(--color-action-primary) 45%, transparent);
  border-radius: var(--radius-xs);
}

.chat-drawer__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'brand actions'
    'mode mode';
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-default);
}

.chat-drawer__brand {
  grid-area: brand;
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-2);
  cursor: grab;
  touch-action: none;
}

.chat-drawer__panel--dragging .chat-drawer__brand {
  cursor: grabbing;
}

.chat-drawer__drag-icon {
  flex: 0 0 auto;
  color: var(--color-fg-muted);
  opacity: 0.75;
}

.chat-drawer__brand-icon {
  display: inline-grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-lg);
  background: var(--color-login-panel-bg);
  color: var(--color-action-primary);
}

.chat-drawer__header-text p,
.chat-drawer__header-text h2 {
  margin: 0;
}

.chat-drawer__header-text p {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-drawer__header-text h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-tight);
}

.chat-drawer__header-actions {
  grid-area: actions;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.chat-drawer__mode-switch {
  display: grid;
  grid-area: mode;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  min-width: 0;
  padding: 3px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.chat-drawer__mode-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-width: 0;
  min-height: 30px;
  border: 0;
  border-radius: calc(var(--radius-md) - 2px);
  background: transparent;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.chat-drawer__mode-button--active {
  background: var(--color-bg-card);
  color: var(--color-action-primary);
  box-shadow: var(--shadow-xs);
}

.chat-drawer__report-ctx {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px var(--space-4);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-surface));
  border-bottom: 1px solid color-mix(in srgb, var(--color-action-primary) 20%, transparent);
}

.chat-drawer__report-ctx--agent {
  background: color-mix(in srgb, var(--color-gold) 7%, var(--color-bg-surface));
  border-bottom-color: color-mix(in srgb, var(--color-gold) 26%, transparent);
}

.chat-drawer__report-ctx-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.chat-drawer__report-ctx-tag {
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 40%, transparent);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 12%, transparent);
  padding: 1px 8px;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-drawer__report-ctx-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-drawer__report-ctx-meta {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.chat-drawer__report-ctx-sep {
  margin: 0 2px;
  opacity: 0.5;
}

.chat-drawer__report-ctx-clear {
  display: inline-grid;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
}

.chat-drawer__report-ctx-clear:hover {
  background: var(--color-state-hover);
}

.chat-drawer__icon-button,
.chat-drawer__prompts button {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  cursor: pointer;
}

.chat-drawer__icon-button {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
}

.chat-drawer__icon-button:hover,
.chat-drawer__prompts button:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.chat-drawer__icon-button--on {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.chat-drawer__sessions {
  /* 세션 스트립은 하단 입력/음성 패널을 밀어내지 않도록 높이를 제한한다. */
  flex: 0 0 auto;
  min-width: 0;
  max-height: 82px;
  overflow-x: hidden;
  overflow-y: hidden;
  padding: 8px var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  background: color-mix(in srgb, var(--color-bg-page) 70%, var(--color-bg-surface));
}

.chat-drawer__chat {
  display: grid;
  flex: 1 1 0;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.chat-drawer__messages {
  display: grid;
  min-height: 0;
  overflow: hidden;
}

.chat-drawer__messages :deep(.chat-message-list) {
  height: 100%;
  min-height: 0;
}

.chat-drawer__footer {
  position: relative;
  z-index: 2;
  min-height: 0;
  flex: 0 0 auto;
  margin-top: auto;
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-surface);
  box-shadow: 0 -8px 18px color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
}

.chat-drawer__footer :deep(.chat-input),
.chat-drawer__footer :deep(.chat-voice-mode) {
  border-top: 0;
}

.chat-drawer__panel--voice .chat-drawer__footer {
  background: color-mix(in srgb, var(--color-action-primary-soft) 28%, var(--color-bg-surface));
}

.chat-drawer__prompts {
  display: grid;
  gap: var(--space-2);
  padding: 10px var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  background: color-mix(in srgb, var(--color-bg-page) 42%, var(--color-bg-surface));
}

.chat-drawer__prompts-title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-drawer__prompts-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.chat-drawer__prompts button {
  min-width: 0;
  min-height: 42px;
  padding: 8px 10px;
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.35;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.chat-drawer__prompts button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

@media (max-width: 760px) {
  .chat-drawer {
    top: var(--layout-header-height) !important;
    left: 0 !important;
    right: 0;
    bottom: 0;
    width: 100vw !important;
    height: auto !important;
  }

  .chat-drawer__panel {
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .chat-drawer__resize {
    display: none;
  }

  .chat-drawer__prompts-list {
    grid-template-columns: 1fr;
  }
}

.chat-drawer__delete-modal {
  display: grid;
  gap: var(--space-3);
}

.chat-drawer__delete-modal p {
  margin: 0;
  color: var(--color-fg-muted);
}

.chat-drawer__delete-modal strong {
  color: var(--color-fg-strong);
}

.chat-drawer__delete-modal-sub {
  border: var(--border-width-default) solid
    color-mix(in srgb, var(--color-risk-critical) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-risk-critical) 6%, var(--color-bg-card));
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.chat-drawer__delete-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.chat-drawer__delete-confirm {
  color: var(--color-risk-critical) !important;
}
</style>
