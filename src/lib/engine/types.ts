// ============================================
// iMOVS API Dinamic - Core Type Definitions
// ============================================

// --- Workflow Definition Types ---

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeType =
  | 'manualTrigger'
  | 'webhookTrigger'
  | 'scheduleTrigger'
  | 'httpRequest'
  | 'code'
  | 'if'
  | 'set'
  | 'merge'
  | 'response'
  | 'noOp';

export interface NodeData {
  label: string;
  type: NodeType;
  parameters: Record<string, unknown>;
  // Execution metadata (not persisted)
  _executionStatus?: 'pending' | 'running' | 'success' | 'error';
  _output?: unknown;
  _error?: string;
  _duration?: number;
}

// --- Node Parameter Types ---

export interface HttpRequestParams {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'text' | 'form-data' | 'none';
  timeout?: number;
  authentication?: 'none' | 'bearer' | 'basic' | 'api_key';
  credentialId?: string;
}

export interface CodeParams {
  language: 'javascript';
  code: string;
}

export interface IfParams {
  condition: string;
}

export interface SetParams {
  assignments: Array<{
    key: string;
    value: string;
  }>;
  keepExisting?: boolean;
}

export interface MergeParams {
  mode: 'append' | 'combine' | 'chooseBranch';
  branchIndex?: number;
}

export interface WebhookTriggerParams {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  authentication?: 'none' | 'basic' | 'header';
  // Response mode — controls when and how the webhook responds to the caller (same as n8n)
  respondMode?: 'onReceived' | 'lastNode' | 'responseNode';
  // Options for 'onReceived' mode: respond immediately with the raw incoming request
  // Options for 'lastNode' mode: respond after workflow finishes with the last node output
  // Options for 'responseNode' mode: use the "Respond to Webhook" node's output
  // Fallback response code for when no explicit response is set
  responseCode?: number;
}

export interface ScheduleTriggerParams {
  cronExpression: string;
  timezone?: string;
}

export interface ResponseParams {
  // What to respond with
  respondWith?: 'incomingData' | 'json' | 'text';
  // Custom body content (used when respondWith is 'json' or 'text')
  // Supports {{ expression }} patterns for dynamic values
  responseData?: string;
  // HTTP status code
  responseCode?: number;
  // Custom response headers (key-value pairs)
  responseHeaders?: Array<{ key: string; value: string }>;
  // Include the Respond to Webhook node icon label in the response
  options?: {
    includeHeaders?: boolean;
  };
}

// --- Execution Types ---

export interface WorkflowExecutionData {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  inputData?: unknown;
  outputData?: unknown;
  nodeLogs: NodeExecutionLog[];
  error?: string;
  duration?: number;
  startedAt: string;
  finishedAt?: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';

export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  duration: number;
  startedAt: string;
  finishedAt?: string;
}

// --- Engine Types ---

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  inputData: unknown;
  variables: Record<string, unknown>;
  nodeOutputs: Map<string, unknown>;
  nodeLogs: NodeExecutionLog[];
  credentials?: Record<string, unknown>;
}

export interface NodeExecutor {
  execute(node: WorkflowNode, context: ExecutionContext): Promise<unknown>;
}

// --- API Types ---

export interface WorkflowResponse {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface ExecuteWorkflowRequest {
  inputData?: unknown;
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
  outputData?: unknown;
  error?: string;
  duration?: number;
}

// --- Node Type Definitions (for the palette) ---

export interface OutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
}

export interface NodeTypeDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  category: 'trigger' | 'action' | 'logic' | 'utility';
  color: string;
  inputs: number;
  outputs: number;
  defaultParameters: Record<string, unknown>;
  outputFields: OutputField[];
}

export const NODE_TYPE_DEFINITIONS: NodeTypeDefinition[] = [
  {
    type: 'manualTrigger',
    label: 'Manual Trigger',
    description: 'Starts workflow execution manually',
    icon: 'Play',
    category: 'trigger',
    color: 'bg-green-500',
    inputs: 0,
    outputs: 1,
    defaultParameters: {},
    outputFields: [{ name: 'data', type: 'object' }],
  },
  {
    type: 'webhookTrigger',
    label: 'Webhook',
    description: 'Triggers workflow from an HTTP webhook call',
    icon: 'Webhook',
    category: 'trigger',
    color: 'bg-purple-500',
    inputs: 0,
    outputs: 1,
    defaultParameters: {
      path: 'my-webhook-' + Math.random().toString(36).substring(7),
      method: 'POST',
      authentication: 'none',
      respondMode: 'lastNode',
      responseCode: 200,
    },
    outputFields: [{ name: 'body', type: 'object' }, { name: 'query', type: 'object' }, { name: 'headers', type: 'object' }, { name: 'method', type: 'string' }],
  },
  {
    type: 'scheduleTrigger',
    label: 'Schedule',
    description: 'Triggers workflow on a schedule (cron)',
    icon: 'Clock',
    category: 'trigger',
    color: 'bg-teal-500',
    inputs: 0,
    outputs: 1,
    defaultParameters: {
      cronExpression: '0 * * * *',
      timezone: 'UTC',
    },
    outputFields: [{ name: 'timestamp', type: 'string' }],
  },
  {
    type: 'httpRequest',
    label: 'HTTP Request',
    description: 'Make an HTTP API call',
    icon: 'Globe',
    category: 'action',
    color: 'bg-violet-500',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      method: 'GET',
      url: 'https://api.example.com/data',
      bodyType: 'none',
      timeout: 30000,
      authentication: 'none',
    },
    outputFields: [{ name: 'data', type: 'object' }, { name: 'status', type: 'number' }],
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Execute custom JavaScript code',
    icon: 'Code',
    category: 'action',
    color: 'bg-sky-500',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      language: 'javascript',
      code: '// Process input data\nconst items = $input.items || [];\n\nfor (const item of items) {\n  item.processed = true;\n}\n\nreturn { items };',
    },
    outputFields: [{ name: 'result', type: 'any' }],
  },
  {
    type: 'if',
    label: 'IF',
    description: 'Branch based on a condition',
    icon: 'GitBranch',
    category: 'logic',
    color: 'bg-amber-400',
    inputs: 1,
    outputs: 2,
    defaultParameters: {
      condition: '$input.value > 10',
    },
    outputFields: [{ name: 'data', type: 'object' }],
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Merge data from multiple branches',
    icon: 'GitMerge',
    category: 'logic',
    color: 'bg-purple-500',
    inputs: 2,
    outputs: 1,
    defaultParameters: {
      mode: 'append',
    },
    outputFields: [{ name: 'data', type: 'object' }],
  },
  {
    type: 'set',
    label: 'Set',
    description: 'Set or modify data fields',
    icon: 'Pencil',
    category: 'utility',
    color: 'bg-slate-500',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      assignments: [{ key: 'key', value: 'value' }],
      keepExisting: true,
    },
    outputFields: [{ name: 'data', type: 'object' }],
  },
  {
    type: 'response',
    label: 'Respond to Webhook',
    description: 'Define the HTTP response sent back to the webhook caller',
    icon: 'Reply',
    category: 'utility',
    color: 'bg-cyan-500',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      respondWith: 'incomingData',
      responseCode: 200,
      responseHeaders: [],
    },
    outputFields: [{ name: 'data', type: 'object' }],
  },
  {
    type: 'noOp',
    label: 'No Operation',
    description: 'Does nothing, passes data through',
    icon: 'Minus',
    category: 'utility',
    color: 'bg-slate-400',
    inputs: 1,
    outputs: 1,
    defaultParameters: {},
    outputFields: [{ name: 'data', type: 'object' }],
  },
];

export function getNodeTypeDefinition(type: NodeType): NodeTypeDefinition | undefined {
  return NODE_TYPE_DEFINITIONS.find(d => d.type === type);
}

export function getNodeDefinitionsByCategory(category: string): NodeTypeDefinition[] {
  return NODE_TYPE_DEFINITIONS.filter(d => d.category === category);
}
