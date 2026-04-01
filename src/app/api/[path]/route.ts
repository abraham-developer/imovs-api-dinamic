import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeWorkflow } from '@/lib/engine/executor';

// --- Route Handlers ---

/**
 * Universal handler for all HTTP methods on /api/[path]
 * Catches GET, POST, PUT, DELETE, PATCH, etc.
 *
 * Response Modes (like n8n):
 * - 'onReceived': Respond immediately with the incoming request data, then execute workflow in background
 * - 'lastNode': Execute the full workflow, respond with the last node's output
 * - 'responseNode': Execute the full workflow, respond with the "Respond to Webhook" node's output
 */
async function handleWebhook(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path } = await params;

    // Find the active webhook by path
    const webhook = await db.webhook.findFirst({
      where: { path, active: true },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found', message: `No active webhook found at path: /api/${path}` },
        { status: 404 }
      );
    }

    // Get the associated workflow
    const workflow = await db.workflow.findUnique({
      where: { id: webhook.workflowId },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Associated workflow not found' },
        { status: 404 }
      );
    }

    if (!workflow.active) {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 404 }
      );
    }

    // Parse request body
    let requestBody: unknown = null;
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        requestBody = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const urlParams = new URLSearchParams(text);
        requestBody = Object.fromEntries(urlParams.entries());
      } else if (contentType.includes('text/')) {
        requestBody = await request.text();
      } else {
        // Try JSON first, then text
        const text = await request.text();
        try {
          requestBody = JSON.parse(text);
        } catch {
          requestBody = text;
        }
      }
    } catch {
      requestBody = null;
    }

    // Build input data from the request
    const inputData = {
      body: requestBody,
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      params: { path },
      url: request.url,
    };

    // Parse webhook trigger node to get response mode
    let parsedNodes: any[] = [];
    try {
      parsedNodes = JSON.parse(workflow.nodes || '[]');
    } catch {
      parsedNodes = [];
    }

    const webhookNode = parsedNodes.find((n: any) => n.type === 'webhookTrigger');
    const respondMode = webhookNode?.data?.parameters?.respondMode || 'lastNode';
    const fallbackCode = webhookNode?.data?.parameters?.responseCode || 200;

    // ---- MODE 1: Respond Immediately ----
    if (respondMode === 'onReceived') {
      // Execute workflow in background (fire and forget)
      executeWorkflow(workflow.id, inputData).catch((err) => {
        console.error('[Webhook] Background execution failed:', err);
      });

      // Respond immediately with the request data
      return NextResponse.json({
        success: true,
        message: 'Webhook received. Workflow is executing.',
        received: {
          method: request.method,
          path,
          body: requestBody,
          query: Object.fromEntries(new URL(request.url).searchParams.entries()),
        },
      }, {
        status: fallbackCode,
      });
    }

    // ---- MODE 2 & 3: Execute workflow first, then respond ----
    const result = await executeWorkflow(workflow.id, inputData);

    // If execution failed, return error
    if (result.status === 'error') {
      return NextResponse.json(
        {
          error: 'Workflow execution failed',
          message: result.error,
          executionId: result.id,
        },
        { status: 500 }
      );
    }

    // ---- MODE 3: Use "Respond to Webhook" node output ----
    if (respondMode === 'responseNode') {
      // Search execution logs for the response node
      const responseLog = result.nodeLogs?.find(
        (log) => log.nodeType === 'response' && log.status === 'success'
      );

      if (responseLog && responseLog.output) {
        const output = responseLog.output as Record<string, unknown>;

        // Check if output has the webhook response envelope
        if (output.__imovs_webhook_response) {
          const statusCode = (output.statusCode as number) || 200;
          const headers = (output.headers as Record<string, string>) || {};
          const body = output.body;

          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(headers)) {
            responseHeaders.set(key, value);
          }

          // Determine content type and serialize accordingly
          const ct = headers['Content-Type'] || headers['content-type'] || 'application/json';
          if (typeof body === 'string') {
            return new NextResponse(body, { status: statusCode, headers: responseHeaders });
          }
          return new NextResponse(JSON.stringify(body), { status: statusCode, headers: responseHeaders });
        }

        // Fallback: use the response node's output directly
        return NextResponse.json(output, { status: fallbackCode });
      }

      // No response node found in workflow — fall back to last node output
      return NextResponse.json(
        {
          warning: 'No "Respond to Webhook" node found in workflow. Using last node output.',
          data: result.outputData,
        },
        { status: 200 }
      );
    }

    // ---- MODE 2 (default): Return last node's output ----
    return NextResponse.json(
      {
        success: true,
        executionId: result.id,
        data: result.outputData,
      },
      { status: fallbackCode }
    );
  } catch (error) {
    console.error('[Webhook Handler] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleWebhook;
export const POST = handleWebhook;
export const PUT = handleWebhook;
export const DELETE = handleWebhook;
export const PATCH = handleWebhook;
export const OPTIONS = handleWebhook;
export const HEAD = handleWebhook;
