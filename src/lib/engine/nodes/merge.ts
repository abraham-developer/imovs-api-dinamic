import type { WorkflowNode, ExecutionContext, MergeParams, WorkflowEdge } from '../types';

/**
 * Merge Node Executor
 *
 * Merges data from multiple input branches.
 *
 * Modes:
 * - append: combines arrays from all inputs into one flat array
 * - combine: merges all input objects into one object (later values override earlier)
 * - chooseBranch: takes output from a specific branch (params.branchIndex)
 *
 * Input data comes from context.nodeOutputs - finds outputs from nodes
 * that connect to this merge node via edges.
 */

/**
 * Gets the input data for a merge node by looking at incoming edges.
 * We need access to edges to know which source nodes feed into this merge node.
 */
function getMergeInputs(
  node: WorkflowNode,
  context: ExecutionContext,
  edges?: WorkflowEdge[],
): unknown[] {
  // If edges are provided, collect inputs from all source nodes
  if (edges && edges.length > 0) {
    const incomingEdges = edges.filter(e => e.target === node.id);
    const inputs: unknown[] = [];

    for (const edge of incomingEdges) {
      const sourceOutput = context.nodeOutputs.get(edge.source);
      if (sourceOutput !== undefined) {
        inputs.push(sourceOutput);
      }
    }

    // If we found inputs from edges, return them
    if (inputs.length > 0) {
      return inputs;
    }
  }

  // Fallback: use the regular inputData
  if (context.inputData !== undefined && context.inputData !== null) {
    if (Array.isArray(context.inputData)) {
      return context.inputData;
    }
    return [context.inputData];
  }

  return [];
}

export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as MergeParams;
  const mode = params.mode || 'append';

  // We store edges in context.variables under a special key if the executor passes them
  // Otherwise, we fall back to inputData
  const edges = (context.variables._edges as WorkflowEdge[]) || undefined;
  const inputs = getMergeInputs(node, context, edges);

  switch (mode) {
    case 'append': {
      // Combine arrays from all inputs into one flat array
      const result: unknown[] = [];
      for (const input of inputs) {
        if (Array.isArray(input)) {
          result.push(...input);
        } else if (input !== undefined && input !== null) {
          result.push(input);
        }
      }
      return result;
    }

    case 'combine': {
      // Merge all input objects into one
      const result: Record<string, unknown> = {};
      for (const input of inputs) {
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          Object.assign(result, input);
        }
      }
      return result;
    }

    case 'chooseBranch': {
      // Take output from a specific branch
      const branchIndex = params.branchIndex ?? 0;
      if (branchIndex >= 0 && branchIndex < inputs.length) {
        return inputs[branchIndex];
      }
      throw new Error(
        `Merge node (chooseBranch): branch index ${branchIndex} is out of range. Available branches: ${inputs.length}`,
      );
    }

    default:
      throw new Error(`Unknown merge mode: ${mode}`);
  }
}
