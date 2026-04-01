import type { WorkflowNode, ExecutionContext, HttpRequestParams } from '../types';

/**
 * HTTP Request Node Executor
 *
 * Makes HTTP requests using native fetch with full support for:
 * - All standard HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
 * - Query parameters appended to URL
 * - Custom headers (merged with auth headers)
 * - Request body with types: json, text, form-data, none
 * - Timeout via AbortController
 * - Authentication modes: none, bearer, basic, api_key
 * - Expression resolution in URL ({{ expression }} patterns)
 */

/**
 * Resolves expressions in a string by replacing {{ expr }} patterns
 * with values from the context (nodeOutputs, inputData, etc.)
 */
function resolveExpression(str: string, context: ExecutionContext): string {
  return str.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_match, expr: string) => {
    try {
      const sanitized = expr.trim();

      // Support direct property access like $input.data
      if (sanitized.startsWith('$input')) {
        const path = sanitized.replace('$input', '').trim();
        const input = context.inputData as Record<string, unknown> | undefined;
        if (!path) return JSON.stringify(input);
        return String(getNestedValue(input, path) ?? '');
      }

      // Support referencing previous node outputs like $prevNode.output
      if (sanitized.startsWith('$prevNode')) {
        const path = sanitized.replace('$prevNode', '').trim();
        const prevData = getPrevNodeData(context);
        if (!path) return JSON.stringify(prevData);
        return String(getNestedValue(prevData, path) ?? '');
      }

      // Try to evaluate against a safe scope with $input and $json
      const scope = buildEvalScope(context);
      const fn = new Function(...Object.keys(scope), `return (${sanitized});`);
      const result = fn(...Object.values(scope));
      return result !== undefined ? JSON.stringify(result) : '';
    } catch {
      return '';
    }
  });
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj) return undefined;
  const parts = path.replace(/^\./, '').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (isNaN(index)) return undefined;
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function getPrevNodeData(context: ExecutionContext): unknown {
  // Get the most recently set node output
  const outputs = Array.from(context.nodeOutputs.entries());
  if (outputs.length === 0) return context.inputData;
  return outputs[outputs.length - 1][1];
}

function buildEvalScope(context: ExecutionContext): Record<string, unknown> {
  const prevData = getPrevNodeData(context);
  return {
    $input: context.inputData,
    $json: context.inputData,
    $prevNode: prevData,
  };
}

/**
 * Builds authentication headers based on the configured auth mode.
 */
function buildAuthHeaders(
  params: HttpRequestParams,
  context: ExecutionContext,
): Record<string, string> {
  const headers: Record<string, string> = {};

  const authMode = params.authentication || 'none';

  if (authMode === 'none') {
    return headers;
  }

  // Try to get credential data from context.credentials
  const credentialData = params.credentialId
    ? context.credentials?.[params.credentialId]
    : undefined;

  switch (authMode) {
    case 'bearer': {
      const token =
        (credentialData as Record<string, unknown>)?.token ||
        (credentialData as string) ||
        params.authenticationToken;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      break;
    }
    case 'basic': {
      const creds = credentialData as Record<string, unknown> | undefined;
      const username = creds?.username || '';
      const password = creds?.password || '';
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      break;
    }
    case 'api_key': {
      const creds = credentialData as Record<string, unknown> | undefined;
      const apiKey =
        creds?.apiKey ||
        creds?.api_key ||
        (credentialData as string) ||
        params.authenticationToken;
      if (apiKey) {
        headers['X-API-Key'] = String(apiKey);
      }
      break;
    }
  }

  return headers;
}

/**
 * Parses the response body based on content type.
 */
async function parseResponseBody(
  response: Response,
): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (!response.body) {
    return null;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text/')) {
    return response.text();
  }

  // For other content types, try JSON first, then text
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Executes an HTTP request node.
 */
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as HttpRequestParams;

  // Resolve expressions in the URL
  let url = resolveExpression(params.url || '', context);

  // Append query parameters
  if (params.queryParams && Object.keys(params.queryParams).length > 0) {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(params.queryParams)) {
      urlObj.searchParams.append(key, resolveExpression(value, context));
    }
    url = urlObj.toString();
  }

  // Build headers: custom headers merged with auth headers (auth takes precedence)
  const authHeaders = buildAuthHeaders(params, context);
  const customHeaders: Record<string, string> = {};
  if (params.headers) {
    for (const [key, value] of Object.entries(params.headers)) {
      customHeaders[key] = resolveExpression(value, context);
    }
  }
  const mergedHeaders: Record<string, string> = { ...customHeaders, ...authHeaders };

  // Build request body
  let body: string | FormData | undefined;
  const bodyType = params.bodyType || 'none';

  if (bodyType !== 'none' && params.body) {
    if (bodyType === 'json') {
      body = params.body;
      if (!mergedHeaders['Content-Type'] && !mergedHeaders['content-type']) {
        mergedHeaders['Content-Type'] = 'application/json';
      }
    } else if (bodyType === 'text') {
      body = params.body;
      if (!mergedHeaders['Content-Type'] && !mergedHeaders['content-type']) {
        mergedHeaders['Content-Type'] = 'text/plain';
      }
    } else if (bodyType === 'form-data') {
      try {
        const formDataObj = JSON.parse(params.body) as Record<string, string>;
        const formData = new FormData();
        for (const [key, value] of Object.entries(formDataObj)) {
          formData.append(key, value);
        }
        body = formData;
        // Let the browser set the Content-Type with boundary for FormData
        delete mergedHeaders['Content-Type'];
        delete mergedHeaders['content-type'];
      } catch {
        body = params.body;
      }
    }
  }

  // Setup timeout via AbortController
  const timeout = params.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const method = params.method || 'GET';

    const response = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: body,
      signal: controller.signal,
    });

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    const data = await parseResponseBody(response);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`HTTP request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
