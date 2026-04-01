import type { WorkflowNode, ExecutionContext, ResponseParams } from '../types';

/**
 * Respond to Webhook Node Executor
 *
 * This node defines what the webhook returns to the caller.
 * It marks its output with special metadata so the webhook API route
 * can extract the response data.
 *
 * Respond With modes (like n8n):
 * - 'incomingData': Return the data coming from the previous node
 * - 'json': Return a custom JSON body (supports {{ expressions }})
 * - 'text': Return a custom text body (supports {{ expressions }})
 *
 * The node ALSO passes data through to any downstream nodes
 * (it has 1 output) so the workflow can continue after responding.
 */
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as ResponseParams;
  const respondWith = params.respondWith || 'incomingData';

  // Build the response envelope that the webhook API route will detect
  const responseEnvelope: {
    __cubeark_webhook_response: true;
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  } = {
    __cubeark_webhook_response: true,
    statusCode: params.responseCode || 200,
    headers: { 'Content-Type': 'application/json' },
    body: undefined,
  };

  // Parse response headers from array format to object
  if (params.responseHeaders && Array.isArray(params.responseHeaders)) {
    for (const header of params.responseHeaders) {
      if (header.key && header.value) {
        responseEnvelope.headers[header.key] = header.value;
      }
    }
  }

  // Determine the response body based on mode
  switch (respondWith) {
    case 'incomingData': {
      // Return whatever came from the previous node
      responseEnvelope.body = context.inputData;
      // Auto-detect content type
      if (typeof context.inputData === 'string') {
        responseEnvelope.headers['Content-Type'] = 'text/plain';
      }
      break;
    }

    case 'json': {
      // Custom JSON body — supports {{ expression }} resolution
      const rawJson = params.responseData || '{}';
      try {
        responseEnvelope.body = JSON.parse(rawJson);
      } catch {
        // If not valid JSON, try to return as-is (might be a template that needs resolution)
        responseEnvelope.body = rawJson;
      }
      responseEnvelope.headers['Content-Type'] = 'application/json';
      break;
    }

    case 'text': {
      // Custom text body
      responseEnvelope.body = params.responseData || '';
      responseEnvelope.headers['Content-Type'] = 'text/plain';
      break;
    }

    default:
      responseEnvelope.body = context.inputData;
  }

  // The node output is the response envelope
  // The webhook API route will look for __cubeark_webhook_response in the execution logs
  return responseEnvelope;
}
