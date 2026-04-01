import { NextResponse } from 'next/server';
import { NODE_TYPE_DEFINITIONS } from '@/lib/engine/types';

// --- Route Handlers ---

export async function GET() {
  try {
    return NextResponse.json({
      nodeTypes: NODE_TYPE_DEFINITIONS,
    });
  } catch (error) {
    console.error('[GET /api/nodes] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node types' },
      { status: 500 }
    );
  }
}
