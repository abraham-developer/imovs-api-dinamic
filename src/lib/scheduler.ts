// ============================================
// Cubeark API Dynamic - Schedule Manager
// ============================================
//
// Manages scheduled workflow executions using cron jobs.
// Active workflows with scheduleTrigger nodes are
// automatically scheduled when the server starts.

import cron from 'node-cron';
import { db } from '@/lib/db';
import { executeWorkflow } from '@/lib/cubeark-engine/executor';

type ScheduledJob = {
  id: string;
  cronTask: cron.ScheduledTask;
};

/**
 * Stores all currently scheduled cron jobs.
 * Key: workflow ID, Value: { id, cronTask }
 */
const scheduledJobs = new Map<string, ScheduledJob>();

/**
 * Parses a workflow's nodes to find a scheduleTrigger node
 * and extracts its cron expression.
 */
function extractScheduleConfig(nodes: string): { cronExpression: string; timezone: string } | null {
  try {
    const parsed = JSON.parse(nodes) as Array<{ type: string; data?: { parameters?: { cronExpression?: string; timezone?: string } } }>;
    const scheduleNode = parsed.find((n) => n.type === 'scheduleTrigger');
    if (!scheduleNode?.data?.parameters?.cronExpression) return null;
    return {
      cronExpression: scheduleNode.data.parameters.cronExpression,
      timezone: scheduleNode.data.parameters.timezone || 'America/Mexico_City',
    };
  } catch {
    return null;
  }
}

/**
 * Converts a human-friendly cron (5 fields: min hour dom month dow)
 * to the node-cron format (6 fields: sec min hour dom month dow).
 */
function toNodeCronFormat(cronExpression: string): string {
  const parts = cronExpression.trim().split(' ');
  if (parts.length === 5) {
    return `0 ${parts.join(' ')}`;
  }
  return cronExpression;
}

/**
 * Validates a cron expression.
 */
function isValidCron(cronExpression: string): boolean {
  return cron.isValidSchedule(toNodeCronFormat(cronExpression));
}

/**
 * Schedules a single workflow for execution.
 */
export function scheduleWorkflow(workflowId: string, cronExpression: string): boolean {
  // Don't re-schedule if already running
  if (scheduledJobs.has(workflowId)) {
    return false;
  }

  const nodeCronExpr = toNodeCronFormat(cronExpression);

  if (!isValidCron(nodeCronExpr)) {
    console.error(`[Scheduler] Invalid cron expression for workflow ${workflowId}: "${cronExpression}" (${nodeCronExpr})`);
    return false;
  }

  try {
    const task = cron.schedule(nodeCronExpr, async () => {
      try {
        console.log(`[Scheduler] Executing scheduled workflow ${workflowId}`);
        const result = await executeWorkflow(workflowId, {
          triggeredAt: new Date().toISOString(),
          triggerType: 'schedule',
        });
        console.log(`[Scheduler] Workflow ${workflowId} completed: ${result.status} (${result.duration}ms)`);
      } catch (error) {
        console.error(`[Scheduler] Error executing workflow ${workflowId}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City',
    });

    scheduledJobs.set(workflowId, { id: workflowId, cronTask: task });
    console.log(`[Scheduler] Scheduled workflow ${workflowId}: "${cronExpression}" (${nodeCronExpr})`);
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to schedule workflow ${workflowId}:`, error);
    return false;
  }
}

/**
 * Unschedules a workflow.
 */
export function unscheduleWorkflow(workflowId: string): void {
  const job = scheduledJobs.get(workflowId);
  if (job) {
    job.cronTask.stop();
    scheduledJobs.delete(workflowId);
    console.log(`[Scheduler] Unscheduled workflow ${workflowId}`);
  }
}

/**
 * Loads all active workflows from the database and schedules
 * those that have a scheduleTrigger node.
 */
export async function startScheduler(): Promise<void> {
  console.log('[Scheduler] Starting schedule manager...');

  try {
    const activeWorkflows = await db.workflow.findMany({
      where: { active: true },
    });

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const workflow of activeWorkflows) {
      const config = extractScheduleConfig(workflow.nodes);

      if (!config) {
        skippedCount++;
        continue;
      }

      const success = scheduleWorkflow(workflow.id, config.cronExpression);
      if (success) {
        scheduledCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`[Scheduler] Ready. ${scheduledCount} workflows scheduled, ${skippedCount} skipped.`);
  } catch (error) {
    console.error('[Scheduler] Failed to start:', error);
  }
}

/**
 * Stops all scheduled jobs.
 */
export function stopScheduler(): void {
  for (const [id, job] of scheduledJobs) {
    job.cronTask.stop();
  }
  scheduledJobs.clear();
  console.log('[Scheduler] Stopped all scheduled jobs.');
}

/**
 * Gets the count of currently scheduled jobs.
 */
export function getScheduledCount(): number {
  return scheduledJobs.size;
}

/**
 * Re-schedules a workflow (used when a workflow is updated).
 */
export async function rescheduleWorkflow(workflowId: string): Promise<void> {
  unscheduleWorkflow(workflowId);

  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow || !workflow.active) return;

  const config = extractScheduleConfig(workflow.nodes);
  if (config) {
    scheduleWorkflow(workflowId, config.cronExpression);
  }
}

/**
 * Returns all currently scheduled workflow IDs.
 */
export function getScheduledWorkflowIds(): string[] {
  return Array.from(scheduledJobs.keys());
}
