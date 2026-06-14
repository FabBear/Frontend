import { ref } from 'vue';

import type { AgentTaskResponse } from '@/types/agentTask';
import type { ChatReportContextInput } from '@/types/chatbot';
import type { FinalBottleneckReport } from '@/types/report';

const isOpen = ref(false);
const pendingReport = ref<FinalBottleneckReport | null>(null);
const pendingReportContext = ref<ChatReportContextInput | null>(null);
const pendingAgentTask = ref<AgentTaskResponse | null>(null);

export function useChatDrawer() {
  function openWithReport(report: FinalBottleneckReport) {
    pendingReport.value = report;
    pendingReportContext.value = null;
    pendingAgentTask.value = null;
    isOpen.value = true;
  }

  function openWithReportContext(context: ChatReportContextInput) {
    pendingReport.value = null;
    pendingReportContext.value = context;
    pendingAgentTask.value = null;
    isOpen.value = true;
  }

  function openWithAgentTask(task: AgentTaskResponse) {
    pendingAgentTask.value = task;
    pendingReport.value = null;
    pendingReportContext.value = null;
    isOpen.value = true;
  }

  function open() {
    pendingReport.value = null;
    pendingReportContext.value = null;
    pendingAgentTask.value = null;
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

  return {
    isOpen,
    pendingReport,
    pendingReportContext,
    pendingAgentTask,
    open,
    openWithReport,
    openWithReportContext,
    openWithAgentTask,
    close,
    consumePendingReport,
    consumePendingReportContext,
    consumePendingAgentTask,
  };
}
