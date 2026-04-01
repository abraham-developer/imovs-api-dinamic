import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { executeWorkflow } from '@/lib/engine/executor';
import type { ExecuteWorkflowResponse } from '@/lib/engine/types';

// --- Validation Schemas ---

const executeWorkflowSchema = z.object({
  inputData: z.any().optional(),
});

// --- Route Handlers ---

export async function POST(
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

    // Parse optional request body
    let inputData: unknown = undefined;
    try {
      const body = await request.json();
      const parsed = executeWorkflowSchema.safeParse(body);
      if (parsed.success) {
        inputData = parsed.data.inputData;
      }
    } catch {
      // No body provided - that's fine, inputData stays undefined
    }

    // Execute the workflow
    const result = await executeWorkflow(id, inputData);

    const response: ExecuteWorkflowResponse = {
      executionId: result.id,
      status: result.status,
      outputData: result.outputData,
      error: result.error,
      duration: result.duration,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[POST /api/workflows/:id/execute] Error:`, error);
    const message = error instanceof Error ? error.message : 'Execution failed';

    return NextResponse.json(
      { error: 'Workflow execution failed', details: message },
      { status: 500 }
    );
  }
}
