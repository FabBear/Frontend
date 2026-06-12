import { ref } from 'vue';

import { createAgentTask, fetchAgentTask } from '@/services/agentTaskService';

import type { AgentTaskRequest, AgentTaskResponse } from '@/types/agentTask';

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 40;

export function useAgentTask() {
  const activeTask = ref<AgentTaskResponse | null>(null);
  const isAgentTaskRunning = ref(false);
  const agentTaskError = ref<string | null>(null);

  async function runAgentTask(request: AgentTaskRequest): Promise<AgentTaskResponse | null> {
    isAgentTaskRunning.value = true;
    agentTaskError.value = null;

    try {
      let task = await createAgentTask(request);
      activeTask.value = task;

      for (let i = 0; i < MAX_POLLS && (task.status === 'QUEUED' || task.status === 'RUNNING'); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        task = await fetchAgentTask(task.taskId);
        activeTask.value = task;
      }

      if (task.status === 'QUEUED' || task.status === 'RUNNING') {
        agentTaskError.value = 'AI Agent 작업 대기 시간이 초과되었습니다.';
      } else if (task.status === 'FAILED') {
        agentTaskError.value = task.errorMessage ?? 'AI Agent 작업을 완료하지 못했습니다.';
      }

      return task;
    } catch {
      agentTaskError.value = 'AI Agent 작업을 요청하지 못했습니다.';
      return null;
    } finally {
      isAgentTaskRunning.value = false;
    }
  }

  return {
    activeTask,
    isAgentTaskRunning,
    agentTaskError,
    runAgentTask,
  };
}
