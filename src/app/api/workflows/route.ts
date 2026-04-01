import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import type { WorkflowResponse, WorkflowNode, WorkflowEdge } from '@/lib/engine/types';

// --- Validation Schemas ---

const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
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

function createDefaultNode(): WorkflowNode {
  return {
    id: 'trigger_1',
    type: 'manualTrigger',
    position: { x: 250, y: 50 },
    data: {
      label: 'Manual Trigger',
      type: 'manualTrigger',
      parameters: {},
    },
  };
}

// --- Route Handlers ---

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active');

    const where: { active?: boolean } = {};
    if (activeFilter !== null) {
      where.active = activeFilter === 'true';
    }

    const workflows = await db.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      workflows: workflows.map(formatWorkflow),
    });
  } catch (error) {
    console.error('[GET /api/workflows] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, nodes, edges } = parsed.data;

    // Generate default nodes/edges if not provided
    const defaultNode = createDefaultNode();
    const finalNodes = nodes && nodes.length > 0 ? nodes : [defaultNode];
    const finalEdges = edges || [];

    const workflow = await db.workflow.create({
      data: {
        name,
        description: description || null,
        nodes: JSON.stringify(finalNodes),
        edges: JSON.stringify(finalEdges),
      },
    });

    return NextResponse.json(formatWorkflow(workflow), { status: 201 });
  } catch (error) {
    console.error('[POST /api/workflows] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
