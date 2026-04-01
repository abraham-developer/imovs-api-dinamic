import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import type { WorkflowResponse, WorkflowNode, WorkflowEdge } from '@/lib/engine/types';

// --- Validation Schemas ---

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  active: z.boolean().optional(),
});

// --- Helpers ---

function formatWorkflow(w: {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  nodes: string;
  edges: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowResponse {
  return {
    id: w.id,
    name: w.name,
    description: w.description || undefined,
    active: w.active,
    nodes: JSON.parse(w.nodes) as WorkflowNode[],
    edges: JSON.parse(w.edges) as WorkflowEdge[],
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

// --- Route Handlers ---

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workflow = await db.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(formatWorkflow(workflow));
  } catch (error) {
    console.error(`[GET /api/workflows/:id] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = updateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check workflow exists
    const existing = await db.workflow.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const { name, description, nodes, edges, active } = parsed.data;

    // Build update data
    const updateData: {
      name?: string;
      description?: string | null;
      nodes?: string;
      edges?: string;
      active?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;
    if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
    if (edges !== undefined) updateData.edges = JSON.stringify(edges);

    // If nodes are being updated, sync webhook triggers
    if (nodes !== undefined) {
      const parsedNodes = nodes as WorkflowNode[];
      const webhookNodes = parsedNodes.filter(
        (n) => n.type === 'webhookTrigger'
      );

      // Delete all existing webhooks for this workflow
      await db.webhook.deleteMany({
        where: { workflowId: id },
      });

      // Recreate webhook records from current webhook nodes
      for (const node of webhookNodes) {
        const webhookParams = node.data.parameters;
        const path = (webhookParams.path as string) || node.id;
        const method = (webhookParams.method as string) || 'POST';

        try {
          await db.webhook.create({
            data: {
              workflowId: id,
              nodeId: node.id,
              path,
              method,
              active: true,
            },
          });
        } catch (error) {
          // Handle unique constraint violation on path
          console.warn(
            `[Webhook Sync] Failed to create webhook for path "${path}":`,
            error
          );
        }
      }
    }

    // Update the workflow
    const updated = await db.workflow.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(formatWorkflow(updated));
  } catch (error) {
    console.error(`[PUT /api/workflows/:id] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check workflow exists
    const existing = await db.workflow.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Delete the workflow (executions and webhooks will be cascaded)
    await db.workflow.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/workflows/:id] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
