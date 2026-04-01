import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { WorkflowExecutionData } from '@/lib/cubeark-engine/types';

// --- Route Handlers ---

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check workflow exists
    const workflow = await db.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const statusFilter = searchParams.get('status');

    // Build where clause
    const where: { workflowId: string; status?: string } = { workflowId: id };
    if (statusFilter) {
      where.status = statusFilter;
    }

    // Fetch executions and total count in parallel
    const [executions, total] = await Promise.all([
      db.workflowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.workflowExecution.count({ where }),
    ]);

    // Format executions - parse JSON fields
    const formattedExecutions: WorkflowExecutionData[] = executions.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status as WorkflowExecutionData['status'],
      inputData: e.inputData ? JSON.parse(e.inputData) : undefined,
      outputData: e.outputData ? JSON.parse(e.outputData) : undefined,
      nodeLogs: e.nodeLogs ? JSON.parse(e.nodeLogs) : [],
      error: e.error || undefined,
      duration: e.duration || undefined,
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt ? e.finishedAt.toISOString() : undefined,
    }));

    return NextResponse.json({
      executions: formattedExecutions,
      total,
    });
  } catch (error) {
    console.error(`[GET /api/workflows/:id/executions] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
