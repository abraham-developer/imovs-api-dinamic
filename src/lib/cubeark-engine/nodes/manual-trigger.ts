import type { WorkflowNode, ExecutionContext } from '../types';

/**
 * Manual Trigger Node Executor
 *
 * Simply passes through the execution input data.
 * This node is used when a workflow is started manually.
 */
export async function execute(
  _node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  return context.inputData;
}
