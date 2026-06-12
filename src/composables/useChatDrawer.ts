import { ref } from 'vue';

import type { AgentTaskResponse } from '@/types/agentTask';
import type { FinalBottleneckReport } from '@/types/report';

const isOpen = ref(false);
const pendingReport = ref<FinalBottleneckReport | null>(null);
const pendingAgentTask = ref<AgentTaskResponse | null>(null);

export function useChatDrawer() {
  function openWithReport(report: FinalBottleneckReport) {
    pendingReport.value = report;
    pendingAgentTask.value = null;
    isOpen.value = true;
  }

  function openWithAgentTask(task: AgentTaskResponse) {
    pendingAgentTask.value = task;
    pendingReport.value = null;
    isOpen.value = true;
  }

  function open() {
    pendingReport.value = null;
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

  function consumePendingAgentTask(): AgentTaskResponse | null {
    const task = pendingAgentTask.value;
    pendingAgentTask.value = null;
    return task;
  }

  return {
    isOpen,
    pendingReport,
    pendingAgentTask,
    open,
    openWithReport,
    openWithAgentTask,
    close,
    consumePendingReport,
    consumePendingAgentTask,
  };
}
