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
  workflowActive: boolean;

  // Editor state
  editorNodes: WorkflowNode[];
  editorEdges: WorkflowEdge[];
  selectedNodeId: string | null;

  // Execution
  executions: WorkflowExecutionData[];
  executionLoading: boolean;
  lastExecutionResult: any | null;

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
  setWorkflowActive: (active: boolean) => void;
  setLastExecutionResult: (result: any | null) => void;
  resetEditor: () => void;
}

let nodeIdCounter = 1;

export const useImovsStore = create<ImovsStore>((set, get) => ({
  // Initial state
  currentView: 'dashboard',
  workflows: [],
  selectedWorkflowId: null,
  workflowActive: false,
  editorNodes: [],
  editorEdges: [],
  selectedNodeId: null,
  executions: [],
  executionLoading: false,
  lastExecutionResult: null,
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
    if (!workflow) return;

    // Fix duplicate node IDs from legacy data
    const seenIds = new Map<string, number>();
    const fixedNodes = workflow.nodes.map((node) => {
      const count = seenIds.get(node.id) ?? 0;
      seenIds.set(node.id, count + 1);
      if (count > 0) {
        // Duplicate found — assign a new unique ID and update edges
        return { ...node, id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
      }
      return node;
    });

    // Rebuild edge references for renamed nodes
    const oldToNew = new Map<string, string>();
    workflow.nodes.forEach((original, i) => {
      if (original.id !== fixedNodes[i].id) {
        oldToNew.set(original.id, fixedNodes[i].id);
      }
    });
    const fixedEdges = workflow.edges.map((edge) => ({
      ...edge,
      source: oldToNew.get(edge.source) ?? edge.source,
      target: oldToNew.get(edge.target) ?? edge.target,
    }));

    set({
      selectedWorkflowId: id,
      workflowActive: workflow.active ?? false,
      editorNodes: fixedNodes,
      editorEdges: fixedEdges,
      selectedNodeId: null,
      workflowName: workflow.name || '',
      executions: [],
      lastExecutionResult: null,
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

    // Generate a truly unique ID
    let id: string;
    const existingIds = new Set(get().editorNodes.map(n => n.id));
    do {
      id = `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    } while (existingIds.has(id));

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
  setWorkflowActive: (active) => set({ workflowActive: active }),
  setLastExecutionResult: (result) => set({ lastExecutionResult: result }),

  resetEditor: () => set({
    editorNodes: [],
    editorEdges: [],
    selectedNodeId: null,
    workflowName: '',
    workflowActive: false,
    executions: [],
    lastExecutionResult: null,
  }),
}));
