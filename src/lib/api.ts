import type {
  WorkflowResponse,
  CreateWorkflowRequest,
  ExecuteWorkflowResponse,
  WorkflowExecutionData,
} from '@/lib/cubeark-engine/types';

const API_BASE = '';

async function handleResponse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `${label} failed`);
  }
  return res.json();
}

export async function fetchWorkflows(): Promise<WorkflowResponse[]> {
  const res = await fetch(`${API_BASE}/api/workflows`);
  const data = await handleResponse<{ workflows: WorkflowResponse[] }>(res, 'Fetch workflows');
  return data.workflows;
}

export async function createWorkflow(data: CreateWorkflowRequest): Promise<WorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<WorkflowResponse>(res, 'Create workflow');
}

export async function getWorkflow(id: string): Promise<WorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`);
  return handleResponse<WorkflowResponse>(res, 'Get workflow');
}

export async function updateWorkflow(
  id: string,
  data: { name?: string; description?: string; active?: boolean; nodes?: any[]; edges?: any[] }
): Promise<WorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<WorkflowResponse>(res, 'Update workflow');
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workflows/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete workflow');
}

export async function executeWorkflow(
  id: string,
  inputData?: unknown
): Promise<ExecuteWorkflowResponse> {
  const res = await fetch(`${API_BASE}/api/workflows/${id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputData } || {}),
  });
  return handleResponse<ExecuteWorkflowResponse>(res, 'Execute workflow');
}

export async function fetchExecutions(workflowId: string): Promise<{ executions: WorkflowExecutionData[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/workflows/${workflowId}/executions`);
  return handleResponse<{ executions: WorkflowExecutionData[]; total: number }>(res, 'Fetch executions');
}

export async function getExecution(
  workflowId: string,
  executionId: string
): Promise<WorkflowExecutionData> {
  const res = await fetch(`${API_BASE}/api/workflows/${workflowId}/executions/${executionId}`);
  return handleResponse<WorkflowExecutionData>(res, 'Get execution');
}
