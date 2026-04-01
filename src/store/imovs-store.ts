import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import {
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowResponse,
  type WorkflowExecutionData,
  type NodeTypeDefinition,
  type NodeType,
  type NodeData,
  NODE_TYPE_DEFINITIONS,
} from '@/lib/engine/types';

interface ImovsStore {
  // Current view
  currentView: 'dashboard' | 'editor' | 'execution';

  // Workflows list
  workflows: WorkflowResponse[];
  selectedWorkflowId: string | null;

  // Editor state
  editorNodes: WorkflowNode[];
  editorEdges: WorkflowEdge[];
  selectedNodeId: string | null;

  // Execution
  executions: WorkflowExecutionData[];
  executionLoading: boolean;

  // Node types
  nodeTypes: NodeTypeDefinition[];

  // UI state
  showCreateDialog: boolean;
  workflowName: string;
  isSaving: boolean;
  isExecuting: boolean;

  // Actions
  setView: (view: 'dashboard' | 'editor' | 'execution') => void;
  setWorkflows: (workflows: WorkflowResponse[]) => void;
  selectWorkflow: (id: string | null) => void;
  setEditorNodes: (nodes: WorkflowNode[]) => void;
  setEditorEdges: (edges: WorkflowEdge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  setExecutions: (executions: WorkflowExecutionData[]) => void;
  setNodeTypes: (types: NodeTypeDefinition[]) => void;
  setShowCreateDialog: (show: boolean) => void;
  setWorkflowName: (name: string) => void;
  setIsSaving: (saving: boolean) => void;
  setIsExecuting: (executing: boolean) => void;
  resetEditor: () => void;
}

let nodeIdCounter = 1;

export const useImovsStore = create<ImovsStore>((set, get) => ({
  // Initial state
  currentView: 'dashboard',
  workflows: [],
  selectedWorkflowId: null,
  editorNodes: [],
  editorEdges: [],
  selectedNodeId: null,
  executions: [],
  executionLoading: false,
  nodeTypes: NODE_TYPE_DEFINITIONS,
  showCreateDialog: false,
  workflowName: '',
  isSaving: false,
  isExecuting: false,

  // View actions
  setView: (view) => set({ currentView: view }),

  // Workflow actions
  setWorkflows: (workflows) => set({ workflows }),
  selectWorkflow: (id) => {
    const workflow = get().workflows.find(w => w.id === id);
    set({
      selectedWorkflowId: id,
      editorNodes: workflow ? [...workflow.nodes] : [],
      editorEdges: workflow ? [...workflow.edges] : [],
      selectedNodeId: null,
      workflowName: workflow?.name || '',
      executions: [],
    });
  },

  // Editor actions
  setEditorNodes: (nodes) => set({ editorNodes: nodes }),
  setEditorEdges: (edges) => set({ editorEdges: edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  onNodesChange: (changes) => {
    set({
      editorNodes: applyNodeChanges(changes, get().editorNodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      editorEdges: applyEdgeChanges(changes, get().editorEdges),
    });
  },

  onConnect: (connection) => {
    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || undefined,
      targetHandle: connection.targetHandle || undefined,
    };
    set({
      editorEdges: [...get().editorEdges, newEdge],
    });
  },

  addNode: (type, position) => {
    const def = NODE_TYPE_DEFINITIONS.find(d => d.type === type);
    if (!def) return;

    const id = `node-${nodeIdCounter++}`;
    const newNode: WorkflowNode = {
      id,
      type,
      position: { x: position.x - 100, y: position.y - 25 },
      data: {
        label: def.label,
        type,
        parameters: { ...def.defaultParameters },
      },
    };

    set({
      editorNodes: [...get().editorNodes, newNode],
      selectedNodeId: id,
    });
  },

  deleteNode: (id) => {
    set({
      editorNodes: get().editorNodes.filter(n => n.id !== id),
      editorEdges: get().editorEdges.filter(
        e => e.source !== id && e.target !== id
      ),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  updateNodeData: (id, data) => {
    set({
      editorNodes: get().editorNodes.map(node =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  // Execution actions
  setExecutions: (executions) => set({ executions }),
  setExecutionLoading: (loading: boolean) => set({ executionLoading: loading }),

  // Node types
  setNodeTypes: (types) => set({ nodeTypes: types }),

  // UI state
  setShowCreateDialog: (show) => set({ showCreateDialog: show }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsExecuting: (executing) => set({ isExecuting: executing }),

  resetEditor: () => set({
    editorNodes: [],
    editorEdges: [],
    selectedNodeId: null,
    workflowName: '',
    executions: [],
  }),
}));
