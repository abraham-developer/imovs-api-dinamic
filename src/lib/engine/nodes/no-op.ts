import type { WorkflowNode, ExecutionContext } from '../types';

/**
 * No-Op Node Executor
 *
 * Passes through input data unchanged.
 * Useful for workflow debugging or as a placeholder.
 */
export async function execute(
  _node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  return context.inputData;
}
