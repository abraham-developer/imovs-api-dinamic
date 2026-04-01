// ============================================
// Cubeark API Dynamic - Workflow Execution Engine
// ============================================
//
// This is the core engine that orchestrates workflow execution.
// It loads workflows from the database, builds the execution graph,
// and executes nodes in the correct order respecting branches and merges.

import { db } from '@/lib/db';
import {
  nodeExecutorMap,
} from './nodes';
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  ExecutionContext,
  WorkflowExecutionData,
  NodeExecutionLog,
  ExecutionStatus,
} from './types';

// ============================================
// Graph Types & Helpers
// ============================================

interface Graph {
  /** Map from node ID to the node object */
  nodes: Map<string, WorkflowNode>;
  /** Map from target node ID to its incoming edges */
  incomingEdges: Map<string, WorkflowEdge[]>;
  /** Map from source node ID to its outgoing edges */
  outgoingEdges: Map<string, WorkflowEdge[]>;
}

/**
 * Builds adjacency lists from arrays of nodes and edges.
 */
export function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): Graph {
  const nodeMap = new Map<string, WorkflowNode>();
  const incoming = new Map<string, WorkflowEdge[]>();
  const outgoing = new Map<string, WorkflowEdge[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    // Add to outgoing of source
    const outList = outgoing.get(edge.source);
    if (outList) {
      outList.push(edge);
    }

    // Add to incoming of target
    const inList = incoming.get(edge.target);
    if (inList) {
      inList.push(edge);
    }
  }

  return { nodes: nodeMap, incomingEdges: incoming, outgoingEdges: outgoing };
}

/**
 * Finds trigger nodes — nodes that have no incoming edges.
 * These are the entry points of the workflow.
 */
export function findTriggerNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodesWithIncoming = new Set(edges.map(e => e.target));
  return nodes.filter(n => !nodesWithIncoming.has(n.id));
}

/**
 * Finds terminal nodes — nodes that have no outgoing edges.
 * Their output is the workflow's final output.
 */
function findTerminalNodes(graph: Graph): WorkflowNode[] {
  const terminal: WorkflowNode[] = [];
  for (const [nodeId, edges] of graph.outgoingEdges) {
    if (edges.length === 0) {
      const node = graph.nodes.get(nodeId);
      if (node) terminal.push(node);
    }
  }
  return terminal;
}

/**
 * Resolves expression patterns in a string.
 * Replaces {{ expression }} with values evaluated against the context.
 */
export function resolveExpression(expression: string, context: ExecutionContext): string {
  if (!expression || typeof expression !== 'string') return expression;

  return expression.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_match, expr: string) => {
    try {
      const sanitized = expr.trim();
      const scope: Record<string, unknown> = {
        $input: context.inputData,
        $json: context.inputData,
      };
      const fn = new Function(...Object.keys(scope), `return (${sanitized});`);
      const result = fn(...Object.values(scope));
      return result !== undefined && result !== null ? String(result) : '';
    } catch {
      return '';
    }
  });
}

/**
 * Gets the input data for a node by collecting outputs from its source nodes.
 * For a node with a single input, returns the output directly.
 * For merge nodes with multiple inputs, returns an array of outputs.
 */
export function getInputForNode(
  nodeId: string,
  graph: Graph,
  nodeOutputs: Map<string, unknown>,
): unknown {
  const incoming = graph.incomingEdges.get(nodeId) || [];

  if (incoming.length === 0) {
    // No inputs (trigger node) — no input data
    return undefined;
  }

  if (incoming.length === 1) {
    // Single input — return the source node's output directly
    return nodeOutputs.get(incoming[0].source);
  }

  // Multiple inputs (merge node) — collect all outputs
  const inputs: unknown[] = [];
  for (const edge of incoming) {
    const output = nodeOutputs.get(edge.source);
    if (output !== undefined) {
      inputs.push(output);
    }
  }
  return inputs;
}

// ============================================
// Main Execution Engine
// ============================================

/**
 * Generates a unique execution ID.
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detects cycles in the workflow graph using DFS.
 * Returns true if a cycle is detected.
 */
function detectCycle(graph: Graph): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outEdges = graph.outgoingEdges.get(nodeId) || [];
    for (const edge of outEdges) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) return true;
      } else if (recursionStack.has(edge.target)) {
        return true; // Back edge found — cycle
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check from all nodes (in case of disconnected components)
  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * Determines which outgoing edges to follow based on the node type and its output.
 *
 * - IF nodes: only follow the edge matching the condition result (sourceHandle 'true' or 'false')
 * - All other nodes: follow all outgoing edges
 */
function getFollowableEdges(
  node: WorkflowNode,
  nodeOutput: unknown,
  outgoingEdges: WorkflowEdge[],
): WorkflowEdge[] {
  if (node.type === 'if') {
    const result = (nodeOutput as { result?: boolean })?.result;
    if (result === true) {
      return outgoingEdges.filter(e => e.sourceHandle === 'true');
    } else {
      return outgoingEdges.filter(e => e.sourceHandle === 'false');
    }
  }

  // For all other node types, follow all outgoing edges
  return outgoingEdges;
}

/**
 * Counts how many incoming edges a node has.
 * Used to determine if a node is a merge node (multiple inputs).
 */
function countIncomingEdges(nodeId: string, graph: Graph): number {
  return (graph.incomingEdges.get(nodeId) || []).length;
}

/**
 * Gets the expected number of inputs for a node type.
 * Merge nodes may need multiple inputs before they can execute.
 */
function getExpectedInputCount(nodeType: NodeType): number {
  if (nodeType === 'merge') return 2; // Merge nodes typically need 2+ inputs
  return 1; // Most nodes need just 1 input
}

/**
 * Executes a workflow by its ID.
 *
 * Algorithm:
 * 1. Load workflow from database
 * 2. Parse the graph (nodes, edges)
 * 3. Validate for cycles
 * 4. Find trigger/start nodes
 * 5. Execute nodes using a queue-based BFS approach
 * 6. Handle IF branching by filtering edges based on condition results
 * 7. Handle merge nodes by waiting for all inputs to arrive
 * 8. Collect final output from terminal nodes
 * 9. Record execution results in database
 */
export async function executeWorkflow(
  workflowId: string,
  inputData?: unknown,
): Promise<WorkflowExecutionData> {
  const executionId = generateExecutionId();
  const startedAt = new Date().toISOString();

  // ---- 1. Load workflow from database ----
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Parse nodes and edges from JSON
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];

  try {
    nodes = JSON.parse(workflow.nodes) as WorkflowNode[];
    edges = JSON.parse(workflow.edges) as WorkflowEdge[];
  } catch (error) {
    throw new Error(`Failed to parse workflow graph: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!nodes || nodes.length === 0) {
    throw new Error('Workflow has no nodes');
  }

  // ---- 2. Build the execution graph ----
  const graph = buildGraph(nodes, edges);

  // ---- 3. Validate: detect cycles ----
  if (detectCycle(graph)) {
    throw new Error('Workflow contains a cycle. Execution aborted to prevent infinite loop.');
  }

  // ---- 4. Find trigger nodes ----
  const triggerNodes = findTriggerNodes(nodes, edges);
  if (triggerNodes.length === 0) {
    throw new Error('Workflow has no trigger node (no node without incoming edges)');
  }

  // ---- 5. Create execution context ----
  const context: ExecutionContext = {
    executionId,
    workflowId,
    inputData: inputData ?? null,
    variables: {
      _edges: edges, // Pass edges so merge nodes can resolve their inputs
    },
    nodeOutputs: new Map(),
    nodeLogs: [],
    credentials: {},
  };

  // ---- 6. Create execution record in DB ----
  await db.workflowExecution.create({
    data: {
      id: executionId,
      workflowId,
      status: 'running',
      inputData: inputData ? JSON.stringify(inputData) : null,
      startedAt: new Date(),
    },
  });

  let status: ExecutionStatus = 'success';
  let errorMessage: string | undefined;
  let outputData: unknown = undefined;

  try {
    // ---- 7. Execute nodes using BFS queue ----
    // Track which nodes have been executed to prevent re-execution
    const executedNodes = new Set<string>();
    // Track which nodes have had their inputs "delivered" — used for merge nodes
    const deliveredInputs = new Map<string, Set<string>>(); // nodeId -> Set of source node IDs
    // Queue of nodes ready to execute
    const executionQueue: WorkflowNode[] = [];

    // Seed the queue with trigger nodes
    // For trigger nodes, set input data from the workflow trigger input
    for (const triggerNode of triggerNodes) {
      context.inputData = inputData ?? null;
      executionQueue.push(triggerNode);
    }

    // Track how many inputs each node expects
    const expectedInputs = new Map<string, number>();
    for (const [nodeId, inEdges] of graph.incomingEdges) {
      expectedInputs.set(nodeId, inEdges.length);
    }

    // BFS execution loop
    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift()!;

      // Skip if already executed (can happen if multiple paths lead to same node)
      if (executedNodes.has(currentNode.id)) {
        continue;
      }

      // For non-trigger nodes, check if all inputs are available
      const incomingCount = countIncomingEdges(currentNode.id, graph);
      if (incomingCount > 0) {
        const delivered = deliveredInputs.get(currentNode.id) || new Set<string>();
        const needed = expectedInputs.get(currentNode.id) || 1;

        // For merge nodes: require ALL inputs
        // For other nodes: require at least 1 input
        const isMerge = currentNode.type === 'merge';
        const requiredInputs = isMerge ? needed : 1;

        if (delivered.size < requiredInputs) {
          // Not all inputs available yet — skip and wait
          continue;
        }
      }

      // ---- Execute the node ----
      const nodeStartTime = Date.now();
      const nodeStartedAt = new Date().toISOString();

      try {
        // Get the appropriate executor
        const executor = nodeExecutorMap[currentNode.type];
        if (!executor) {
          throw new Error(`No executor registered for node type: ${currentNode.type}`);
        }

        // Set input data for this node
        if (incomingCount > 0) {
          context.inputData = getInputForNode(currentNode.id, graph, context.nodeOutputs);
        }

        // Execute the node
        const output = await executor.execute(currentNode, context);

        // Store the output
        context.nodeOutputs.set(currentNode.id, output);
        executedNodes.add(currentNode.id);

        // Record execution log
        const nodeDuration = Date.now() - nodeStartTime;
        const logEntry: NodeExecutionLog = {
          nodeId: currentNode.id,
          nodeName: currentNode.data.label || currentNode.type,
          nodeType: currentNode.type,
          status: 'success',
          output,
          duration: nodeDuration,
          startedAt: nodeStartedAt,
          finishedAt: new Date().toISOString(),
        };
        context.nodeLogs.push(logEntry);

        // ---- Queue downstream nodes ----
        const outEdges = graph.outgoingEdges.get(currentNode.id) || [];
        const followableEdges = getFollowableEdges(currentNode, output, outEdges);

        for (const edge of followableEdges) {
          const targetNode = graph.nodes.get(edge.target);
          if (!targetNode || executedNodes.has(targetNode.id)) {
            continue;
          }

          // Mark that this target has received an input from this source
          if (!deliveredInputs.has(targetNode.id)) {
            deliveredInputs.set(targetNode.id, new Set<string>());
          }
          deliveredInputs.get(targetNode.id)!.add(currentNode.id);

          // Queue the target node (it will check if all inputs are ready)
          executionQueue.push(targetNode);
        }

        // Safety: prevent infinite loops in case of unexpected graph shapes
        if (executedNodes.size > nodes.length * 2) {
          throw new Error('Workflow execution exceeded maximum node execution limit. Possible infinite loop detected.');
        }
      } catch (nodeError: unknown) {
        // ---- Node execution failed ----
        const nodeDuration = Date.now() - nodeStartTime;
        const error_message = nodeError instanceof Error ? nodeError.message : String(nodeError);

        const logEntry: NodeExecutionLog = {
          nodeId: currentNode.id,
          nodeName: currentNode.data.label || currentNode.type,
          nodeType: currentNode.type,
          status: 'error',
          error: error_message,
          duration: nodeDuration,
          startedAt: nodeStartedAt,
          finishedAt: new Date().toISOString(),
        };
        context.nodeLogs.push(logEntry);

        // Stop the workflow execution on node error
        status = 'error';
        errorMessage = `Node "${currentNode.data.label || currentNode.id}" (${currentNode.type}) failed: ${error_message}`;
        break;
      }
    }

    // ---- 8. Collect final output from terminal nodes ----
    if (status === 'success') {
      const terminalNodes = findTerminalNodes(graph);
      if (terminalNodes.length > 0) {
        // Return output from the last terminal node that has output
        for (let i = terminalNodes.length - 1; i >= 0; i--) {
          const terminal = terminalNodes[i];
          const terminalOutput = context.nodeOutputs.get(terminal.id);
          if (terminalOutput !== undefined) {
            outputData = terminalOutput;
            break;
          }
        }
        // If no terminal node has output, use the last node's output
        if (outputData === undefined && context.nodeOutputs.size > 0) {
          const lastEntry = Array.from(context.nodeOutputs.entries()).pop()!;
          outputData = lastEntry[1];
        }
      } else if (context.nodeOutputs.size > 0) {
        // No terminal nodes found (graph might be malformed), use last output
        const lastEntry = Array.from(context.nodeOutputs.entries()).pop()!;
        outputData = lastEntry[1];
      }
    }
  } catch (error: unknown) {
    status = 'error';
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  // ---- 9. Update execution record in DB ----
  const finishedAt = new Date();
  const duration = finishedAt.getTime() - new Date(startedAt).getTime();

  await db.workflowExecution.update({
    where: { id: executionId },
    data: {
      status,
      outputData: outputData !== undefined ? JSON.stringify(outputData) : null,
      nodeLogs: JSON.stringify(context.nodeLogs),
      error: errorMessage || null,
      duration,
      finishedAt,
    },
  });

  // ---- 10. Return execution result ----
  return {
    id: executionId,
    workflowId,
    status,
    inputData,
    outputData,
    nodeLogs: context.nodeLogs,
    error: errorMessage,
    duration,
    startedAt,
    finishedAt: finishedAt.toISOString(),
  };
}

/**
 * Retrieves a workflow execution by its ID.
 */
export async function getExecution(executionId: string): Promise<WorkflowExecutionData | null> {
  const execution = await db.workflowExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) return null;

  let inputData: unknown = undefined;
  let outputData: unknown = undefined;
  let nodeLogs: NodeExecutionLog[] = [];

  try {
    if (execution.inputData) inputData = JSON.parse(execution.inputData);
  } catch { /* ignore parse errors */ }

  try {
    if (execution.outputData) outputData = JSON.parse(execution.outputData);
  } catch { /* ignore parse errors */ }

  try {
    if (execution.nodeLogs) nodeLogs = JSON.parse(execution.nodeLogs);
  } catch { /* ignore parse errors */ }

  return {
    id: execution.id,
    workflowId: execution.workflowId,
    status: execution.status as ExecutionStatus,
    inputData,
    outputData,
    nodeLogs,
    error: execution.error || undefined,
    duration: execution.duration || undefined,
    startedAt: execution.startedAt.toISOString(),
    finishedAt: execution.finishedAt?.toISOString(),
  };
}

/**
 * Lists recent executions for a workflow.
 */
export async function listExecutions(
  workflowId: string,
  limit: number = 20,
): Promise<WorkflowExecutionData[]> {
  const executions = await db.workflowExecution.findMany({
    where: { workflowId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return executions.map(exec => {
    let inputData: unknown = undefined;
    let outputData: unknown = undefined;
    let nodeLogs: NodeExecutionLog[] = [];

    try {
      if (exec.inputData) inputData = JSON.parse(exec.inputData);
    } catch { /* ignore */ }

    try {
      if (exec.outputData) outputData = JSON.parse(exec.outputData);
    } catch { /* ignore */ }

    try {
      if (exec.nodeLogs) nodeLogs = JSON.parse(exec.nodeLogs);
    } catch { /* ignore */ }

    return {
      id: exec.id,
      workflowId: exec.workflowId,
      status: exec.status as ExecutionStatus,
      inputData,
      outputData,
      nodeLogs,
      error: exec.error || undefined,
      duration: exec.duration || undefined,
      startedAt: exec.startedAt.toISOString(),
      finishedAt: exec.finishedAt?.toISOString(),
    };
  });
}
