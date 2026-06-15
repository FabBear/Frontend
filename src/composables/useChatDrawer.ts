import { ref } from 'vue';

import type { AgentTaskResponse, AgentTaskSourcePage } from '@/types/agentTask';
import type { ChatReportContextInput } from '@/types/chatbot';
import type { FinalBottleneckReport } from '@/types/report';

export interface CasePromptPayload {
  caseId: string | null;
  caseLabel: string;
  sourcePage: AgentTaskSourcePage;
  title: string;
  prompt: string;
}

const isOpen = ref(false);
const pendingReport = ref<FinalBottleneckReport | null>(null);
const pendingReportContext = ref<ChatReportContextInput | null>(null);
const pendingAgentTask = ref<AgentTaskResponse | null>(null);
const pendingCasePrompt = ref<CasePromptPayload | null>(null);

export function useChatDrawer() {
  function openWithReport(report: FinalBottleneckReport) {
    pendingReport.value = report;
    pendingReportContext.value = null;
    pendingAgentTask.value = null;
    pendingCasePrompt.value = null;
    isOpen.value = true;
  }

  function openWithReportContext(context: ChatReportContextInput) {
    pendingReport.value = null;
    pendingReportContext.value = context;
    pendingAgentTask.value = null;
    pendingCasePrompt.value = null;
    isOpen.value = true;
  }

  function openWithAgentTask(task: AgentTaskResponse) {
    pendingAgentTask.value = task;
    pendingReport.value = null;
    pendingReportContext.value = null;
    pendingCasePrompt.value = null;
    isOpen.value = true;
  }

  function openWithCasePrompt(payload: CasePromptPayload) {
    pendingCasePrompt.value = payload;
    pendingReport.value = null;
    pendingReportContext.value = null;
    pendingAgentTask.value = null;
    isOpen.value = true;
  }

  function open() {
    pendingReport.value = null;
    pendingReportContext.value = null;
    pendingAgentTask.value = null;
    pendingCasePrompt.value = null;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  function consumePendingReport(): FinalBottleneckReport | null {
    const r = pendingReport.value;
    pendingReport.value = null;
    return r;
  }

  function consumePendingReportContext(): ChatReportContextInput | null {
    const context = pendingReportContext.value;
    pendingReportContext.value = null;
    return context;
  }

  function consumePendingAgentTask(): AgentTaskResponse | null {
    const task = pendingAgentTask.value;
    pendingAgentTask.value = null;
    return task;
  }

  function consumePendingCasePrompt(): CasePromptPayload | null {
    const payload = pendingCasePrompt.value;
    pendingCasePrompt.value = null;
    return payload;
  }

  return {
    isOpen,
    pendingReport,
    pendingReportContext,
    pendingAgentTask,
    pendingCasePrompt,
    open,
    openWithReport,
    openWithReportContext,
    openWithAgentTask,
    openWithCasePrompt,
    close,
    consumePendingReport,
    consumePendingReportContext,
    consumePendingAgentTask,
    consumePendingCasePrompt,
  };
}
