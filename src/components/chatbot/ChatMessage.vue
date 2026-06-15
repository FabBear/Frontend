<script setup lang="ts">
import { computed, ref } from 'vue';

import { Check, Copy, FileText, ShieldCheck, Square, TriangleAlert, Volume2, Wrench } from '@lucide/vue';

import { useSpeech } from '@/composables/useSpeech';

import type { ChatMessage } from '@/types/chatbot';

import ChatCard from '@/components/chatbot/cards/ChatCard.vue';

import { cardToMarkdown } from '@/utils/chatCard';
import { formatKoMonthDayTime } from '@/utils/format';
import { renderMarkdown } from '@/utils/markdown';

const props = defineProps<{
  message: ChatMessage;
}>();

// AI 답변별 액션: 복사 + 소리내어 읽기(메시지별 TTS).
const { ttsSupported, speakingId, toggleSpeak } = useSpeech();
const isSpeaking = computed(() => speakingId.value === props.message.messageId);
const copied = ref(false);

async function copyContent() {
  try {
    // 본문 + 카드(표) 내용까지 함께 복사 — UI 카드로만 보이던 수치도 텍스트로 가져갈 수 있게.
    const cardMd = cardToMarkdown(props.message.ui);
    const text = cardMd ? `${props.message.content}\n\n${cardMd}` : props.message.content;
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // 클립보드 권한 없을 때는 조용히 무시
  }
}

function readAloud() {
  // 읽기는 구어체 요약(spokenSummary) 우선 — 수치 나열 전체를 읽지 않음(현장 친화).
  toggleSpeak(props.message.spokenSummary || props.message.content, props.message.messageId);
}

// 사용자 메시지는 평문 그대로, AI 답변만 마크다운 렌더(굵게/목록/코드 등).
const isUser = computed(() => props.message.role === 'USER');
const renderedContent = computed(() => (isUser.value ? '' : renderMarkdown(props.message.content)));

// FAB 현황 브리핑(artifact type 'BRIEF')은 병목 진단이 아니므로 섹션 라벨을 현황용으로 분기.
const isBriefing = computed(() => props.message.agentResult?.artifacts?.some((a) => a.type === 'BRIEF') ?? false);
const evidenceLabel = computed(() => (isBriefing.value ? '현황 지표' : '판단 근거'));
const propagationLabel = computed(() => (isBriefing.value ? '구역별 현황' : '확산 가능성'));
const directionsLabel = computed(() => (isBriefing.value ? '현장 확인 포인트' : '대응 방향'));

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: '지식 검색',
  get_fab_status: '실시간 현황',
  get_kpi_trend: 'KPI 추세',
  get_top_toolgroups: 'TG 순위',
  get_tool_status: '설비 현황',
  get_lot_status: 'WIP/대기',
  search_bottleneck_cases: '병목 케이스',
  get_case_detail: '케이스 상세',
  get_tool_activity: '설비 추이',
  compare_periods: '기간 비교',
};

const confidenceLabel = computed(() => {
  if (props.message.confidence === 'HIGH') return '높은 신뢰';
  if (props.message.confidence === 'MEDIUM') return '일반 신뢰';
  if (props.message.confidence === 'LOW') return '확인 필요';
  return '';
});
const toolLabels = computed(() => (props.message.toolsUsed ?? []).map((tool) => TOOL_LABELS[tool] ?? tool));
const showObservability = computed(
  () =>
    !isUser.value &&
    !props.message.pending &&
    Boolean(confidenceLabel.value || toolLabels.value.length || props.message.warnings?.length)
);
</script>

<template>
  <article
    class="chat-message"
    :class="{
      'chat-message--user': message.role === 'USER',
      'chat-message--agent-result': Boolean(message.agentResult),
    }"
  >
    <img
      v-if="message.role === 'ASSISTANT'"
      class="chat-message__avatar"
      src="@/assets/fabbear-symbol.svg"
      alt=""
      aria-hidden="true"
    />
    <div class="chat-message__content">
      <div class="chat-message__meta">
        <strong>{{ message.role === 'USER' ? '나' : 'FabBEAR AI' }}</strong>
        <time>{{ formatKoMonthDayTime(message.createdAt) }}</time>
      </div>
      <div class="chat-message__bubble">
        <p v-if="isUser">{{ message.content }}</p>
        <!-- renderedContent는 renderMarkdown()에서 DOMPurify로 sanitize 완료된 HTML (XSS 안전) -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else-if="message.content" class="chat-message__markdown" v-html="renderedContent" />
        <ChatCard v-if="!isUser && message.ui" :card="message.ui" />
        <div v-if="message.agentResult" class="chat-message__agent-result">
          <section v-if="message.agentResult.evidence?.length" class="chat-message__agent-section">
            <h3>{{ evidenceLabel }}</h3>
            <dl class="chat-message__evidence">
              <div
                v-for="item in message.agentResult.evidence"
                :key="`${item.label}-${item.value}`"
                :class="`chat-message__evidence-item--${item.severity ?? 'info'}`"
              >
                <dt>{{ item.label }}</dt>
                <dd>
                  <strong>{{ item.value }}</strong>
                  <span>{{ item.description }}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="message.agentResult.watchToolGroups?.length" class="chat-message__agent-section">
            <h3>살펴볼 TG</h3>
            <div class="chat-message__watch-list">
              <div
                v-for="w in message.agentResult.watchToolGroups"
                :key="w.tgName"
                class="chat-message__watch"
                :class="`chat-message__watch--${w.severity ?? 'info'}`"
              >
                <strong
                  >{{ w.tgName }}<small v-if="w.areaName"> · {{ w.areaName }}</small></strong
                >
                <span>{{ w.reason }}</span>
              </div>
            </div>
          </section>

          <section v-if="message.agentResult.propagation" class="chat-message__agent-section">
            <h3>{{ propagationLabel }}</h3>
            <p class="chat-message__agent-copy">{{ message.agentResult.propagation.summary }}</p>
            <div class="chat-message__chips">
              <span v-for="tg in message.agentResult.propagation.affectedToolGroups" :key="tg">{{ tg }}</span>
              <span v-for="process in message.agentResult.propagation.affectedProcesses" :key="process">{{
                process
              }}</span>
            </div>
          </section>

          <section v-if="message.agentResult.responseDirections?.length" class="chat-message__agent-section">
            <h3>{{ directionsLabel }}</h3>
            <ol class="chat-message__directions">
              <li v-for="direction in message.agentResult.responseDirections" :key="direction.title">
                <strong>{{ direction.title }}</strong>
                <span>{{ direction.description }}</span>
                <em v-if="direction.caution">{{ direction.caution }}</em>
              </li>
            </ol>
          </section>

          <section v-if="message.agentResult.artifacts?.length" class="chat-message__agent-section">
            <h3>산출물</h3>
            <div class="chat-message__artifacts">
              <span v-for="artifact in message.agentResult.artifacts" :key="`${artifact.type}-${artifact.title}`">
                <strong>{{ artifact.title }}</strong>
                {{ artifact.description }}
              </span>
            </div>
          </section>
        </div>
        <div
          v-if="showObservability"
          class="chat-message__observability"
          :class="{ 'chat-message__observability--warning': message.confidence === 'LOW' }"
          :title="message.warnings?.join('\n') || undefined"
        >
          <span v-if="confidenceLabel" class="chat-message__confidence">
            <TriangleAlert v-if="message.confidence === 'LOW'" :size="11" aria-hidden="true" />
            <ShieldCheck v-else :size="11" aria-hidden="true" />
            {{ confidenceLabel }}
          </span>
          <span v-if="toolLabels.length" class="chat-message__tools">
            <Wrench :size="11" aria-hidden="true" />
            {{ toolLabels.join(' · ') }}
          </span>
        </div>
        <div v-if="message.sources?.length" class="chat-message__sources">
          <span class="chat-message__sources-label">참고 지식</span>
          <div class="chat-message__sources-list">
            <span
              v-for="src in message.sources"
              :key="`${src.title}-${src.sourcePath ?? ''}`"
              class="chat-message__source"
              :title="src.sourcePath ?? src.title"
            >
              <FileText :size="11" aria-hidden="true" />
              {{ src.title }}<small v-if="src.category"> · {{ src.category }}</small>
            </span>
          </div>
        </div>
        <div v-if="message.attachments?.length" class="chat-message__attachments">
          <span v-for="file in message.attachments" :key="file.id">{{ file.name }}</span>
        </div>
      </div>
      <div v-if="message.role === 'ASSISTANT' && message.content" class="chat-message__actions">
        <button type="button" class="chat-message__action" :title="copied ? '복사됨' : '복사'" @click="copyContent">
          <Check v-if="copied" :size="14" aria-hidden="true" />
          <Copy v-else :size="14" aria-hidden="true" />
        </button>
        <button
          v-if="ttsSupported"
          type="button"
          class="chat-message__action"
          :class="{ 'chat-message__action--on': isSpeaking }"
          :title="isSpeaking ? '읽기 멈춤' : '소리내어 읽기'"
          @click="readAloud"
        >
          <Square v-if="isSpeaking" :size="12" aria-hidden="true" />
          <Volume2 v-else :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.chat-message {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  justify-content: flex-start;
}

.chat-message--user {
  justify-content: flex-end;
}

.chat-message__avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  object-fit: contain;
}

.chat-message__content {
  display: grid;
  max-width: min(86%, 540px);
  gap: var(--space-1);
}

.chat-message--agent-result .chat-message__content {
  max-width: min(100%, 620px);
}

.chat-message--user .chat-message__content {
  justify-items: end;
}

.chat-message__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.chat-message__meta strong {
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
}

.chat-message__bubble {
  display: grid;
  gap: var(--space-2);
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--color-login-panel-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: 0 4px 14px #5536150d;
}

.chat-message--agent-result .chat-message__bubble {
  width: 100%;
  border-color: color-mix(in srgb, var(--color-gold) 30%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-bg-card) 92%, var(--color-login-panel-bg));
}

.chat-message--user .chat-message__bubble {
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.chat-message p {
  margin: 0;
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* AI 답변 마크다운 렌더 (v-html → :deep로 자식 스타일) */
.chat-message__markdown {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  overflow-wrap: anywhere;
}
.chat-message__markdown :deep(> *:first-child) {
  margin-top: 0;
}
.chat-message__markdown :deep(> *:last-child) {
  margin-bottom: 0;
}
.chat-message__markdown :deep(p) {
  margin: 0 0 var(--space-2);
}
.chat-message__markdown :deep(ul),
.chat-message__markdown :deep(ol) {
  margin: var(--space-1) 0 var(--space-2);
  padding-left: 1.25em;
}
.chat-message__markdown :deep(li) {
  margin: 2px 0;
}
.chat-message__markdown :deep(li > p) {
  margin: 0;
}
.chat-message__markdown :deep(strong) {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}
.chat-message__markdown :deep(h1),
.chat-message__markdown :deep(h2),
.chat-message__markdown :deep(h3) {
  margin: var(--space-2) 0 var(--space-1);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-strong);
}
.chat-message__markdown :deep(code) {
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--color-login-panel-bg);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.92em;
}
.chat-message__markdown :deep(pre) {
  margin: var(--space-1) 0 var(--space-2);
  padding: var(--space-2) var(--space-3);
  overflow-x: auto;
  border-radius: var(--radius-md);
  background: var(--color-login-panel-bg);
}
.chat-message__markdown :deep(pre code) {
  padding: 0;
  background: none;
}
.chat-message__markdown :deep(a) {
  color: var(--color-action-primary);
  text-decoration: underline;
}
.chat-message__markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-1) 0 var(--space-2);
  font-size: var(--font-size-sm);
}
.chat-message__markdown :deep(th),
.chat-message__markdown :deep(td) {
  border: 1px solid var(--color-border-subtle);
  padding: 4px var(--space-2);
  text-align: left;
}
.chat-message__markdown :deep(blockquote) {
  margin: var(--space-1) 0;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-muted);
}

.chat-message__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chat-message__agent-result {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.chat-message__agent-section {
  display: grid;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3);
}

.chat-message__agent-section h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.chat-message__evidence {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.chat-message__evidence div {
  display: grid;
  grid-template-columns: minmax(82px, 0.35fr) minmax(0, 1fr);
  gap: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-2);
}

.chat-message__evidence-item--critical {
  border-color: color-mix(in srgb, var(--color-risk-critical) 36%, var(--color-border-subtle)) !important;
  background: color-mix(in srgb, var(--color-risk-critical) 6%, var(--color-bg-page)) !important;
}

.chat-message__evidence-item--warning {
  border-color: color-mix(in srgb, var(--color-risk-high) 34%, var(--color-border-subtle)) !important;
  background: color-mix(in srgb, var(--color-risk-high) 6%, var(--color-bg-page)) !important;
}

.chat-message__evidence-item--info {
  border-color: color-mix(in srgb, var(--color-action-primary) 28%, var(--color-border-subtle)) !important;
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-page)) !important;
}

.chat-message__evidence dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.chat-message__evidence dd {
  display: grid;
  gap: 2px;
  margin: 0;
}

.chat-message__evidence dd strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.chat-message__evidence dd span,
.chat-message__agent-copy,
.chat-message__directions span,
.chat-message__directions em,
.chat-message__artifacts span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* 긴 내용이 카드를 넘쳐 깨지지 않도록 — agent 결과 내 텍스트 줄바꿈 강제 + grid 셀 축소 허용 */
.chat-message__evidence div {
  min-width: 0;
}
.chat-message__agent-result strong,
.chat-message__agent-result span,
.chat-message__agent-result dd,
.chat-message__agent-result dt,
.chat-message__agent-result p,
.chat-message__agent-result li {
  min-width: 0;
  overflow-wrap: anywhere;
}

.chat-message__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chat-message__chips span {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-login-panel-bg);
  padding: 2px var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-xs);
}

.chat-message__watch-list {
  display: grid;
  gap: var(--space-1);
}

.chat-message__watch {
  display: grid;
  gap: 1px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-2);
}

.chat-message__watch--critical {
  border-color: color-mix(in srgb, var(--color-risk-critical) 36%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-risk-critical) 6%, var(--color-bg-page));
}

.chat-message__watch--warning {
  border-color: color-mix(in srgb, var(--color-risk-high) 34%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-risk-high) 6%, var(--color-bg-page));
}

.chat-message__watch strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.chat-message__watch small {
  color: var(--color-fg-muted);
  font-weight: 400;
}

.chat-message__watch span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.chat-message__directions {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: 18px;
}

.chat-message__directions li {
  display: grid;
  gap: 2px;
}

.chat-message__directions strong,
.chat-message__artifacts strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.chat-message__artifacts {
  display: grid;
  gap: var(--space-2);
}

.chat-message__artifacts span {
  display: grid;
  gap: 2px;
  border-radius: var(--radius-md);
  background: var(--color-login-panel-bg);
  padding: var(--space-2);
}

.chat-message__attachments span {
  padding: 2px var(--space-2);
  background: color-mix(in srgb, var(--color-bg-surface) 82%, transparent);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.chat-message__sources {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
}

.chat-message__sources-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-message__sources-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chat-message__source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px var(--space-2);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 30%, var(--color-border-subtle));
  border-radius: var(--radius-pill);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
}

.chat-message__observability {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.chat-message__confidence,
.chat-message__tools {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  min-width: 0;
  padding: 1px 7px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-bg-surface) 86%, transparent);
}

.chat-message__observability--warning .chat-message__confidence {
  border-color: color-mix(in srgb, var(--color-severity-warning, #b45309) 35%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-severity-warning, #b45309) 9%, transparent);
  color: var(--color-severity-warning, #b45309);
}

.chat-message__source small {
  color: var(--color-fg-muted);
}

/* AI 답변 하단 액션(복사 / 읽기) — Claude 웹처럼. 평소 옅게, hover 시 진하게. */
.chat-message__actions {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  opacity: 0.55;
  transition: opacity 0.12s;
}

.chat-message:hover .chat-message__actions {
  opacity: 1;
}

.chat-message__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.chat-message__action:hover {
  background: var(--color-login-panel-bg);
  color: var(--color-fg-strong);
}

.chat-message__action--on {
  color: var(--color-action-primary);
}

.chat-message time {
  color: var(--color-fg-muted);
}

.chat-message--user .chat-message__meta {
  color: var(--color-fg-muted);
}

.chat-message--user .chat-message__meta strong,
.chat-message--user .chat-message__meta time {
  color: var(--color-fg-muted);
}

@media (max-width: 760px) {
  .chat-message__content,
  .chat-message--agent-result .chat-message__content {
    max-width: 100%;
  }

  .chat-message__evidence {
    grid-template-columns: 1fr;
  }
}
</style>
