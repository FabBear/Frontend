import api from '@/services/api';

import type { AgentTaskRequest, AgentTaskResponse } from '@/types/agentTask';

export async function createAgentTask(request: AgentTaskRequest): Promise<AgentTaskResponse> {
  const { data } = await api.post<AgentTaskResponse>('/v1/agent-tasks', request);
  return data;
}

export async function fetchAgentTask(taskId: string): Promise<AgentTaskResponse> {
  const { data } = await api.get<AgentTaskResponse>(`/v1/agent-tasks/${taskId}`);
  return data;
}
