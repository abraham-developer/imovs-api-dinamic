import type { WorkflowNode, ExecutionContext } from '../types';

/**
 * Webhook Trigger Node Executor
 *
 * Returns the webhook input data from the execution context.
 * The webhook data (body, headers, query params, etc.) is injected
 * via context.inputData by the API route that receives the webhook.
 */
export async function execute(
  _node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  return context.inputData;
}
