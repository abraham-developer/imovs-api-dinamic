import type { WorkflowNode, ExecutionContext, ScheduleTriggerParams } from '../types';

/**
 * Schedule Trigger Node Executor
 *
 * Trigger node that returns the current timestamp and schedule info.
 * Used when a workflow is triggered by a cron schedule.
 */
export async function execute(
  node: WorkflowNode,
  _context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as ScheduleTriggerParams;

  return {
    triggeredAt: new Date().toISOString(),
    schedule: params.cronExpression,
    timezone: params.timezone || 'UTC',
  };
}
