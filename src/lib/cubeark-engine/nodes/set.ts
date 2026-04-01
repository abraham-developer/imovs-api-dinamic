import type { WorkflowNode, ExecutionContext, SetParams } from '../types';

/**
 * Set Node Executor
 *
 * Modifies/sets data fields on the input data.
 *
 * Modes:
 * - keepExisting: merge new assignments into existing input data
 * - !keepExisting: replace input data entirely with the assignments
 *
 * Supports expression resolution in values: {{ $input.foo }}
 */
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as SetParams;
  const assignments = params.assignments || [];
  const keepExisting = params.keepExisting !== false; // Default to true

  // Start with existing input data if keepExisting, otherwise start fresh
  let result: Record<string, unknown>;
  if (keepExisting && context.inputData && typeof context.inputData === 'object' && !Array.isArray(context.inputData)) {
    result = { ...(context.inputData as Record<string, unknown>) };
  } else {
    result = {};
  }

  // Apply each assignment
  for (const assignment of assignments) {
    const { key, value } = assignment;
    if (!key) continue;

    // Resolve expressions in the value
    const resolvedValue = resolveValueExpression(value, context);
    result[key] = resolvedValue;
  }

  return result;
}

/**
 * Resolves expression patterns in a value string.
 * If the entire value is an expression {{ ... }}, evaluates it as code.
 * If it contains expressions mixed with text, replaces them inline.
 */
function resolveValueExpression(value: string, context: ExecutionContext): unknown {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Check if the entire value is a single expression
  const singleMatch = value.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
  if (singleMatch) {
    return evaluateExpression(singleMatch[1].trim(), context);
  }

  // Otherwise, replace all {{ expr }} patterns with string values
  return value.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_match, expr: string) => {
    const result = evaluateExpression(expr.trim(), context);
    return result !== undefined && result !== null ? String(result) : '';
  });
}

/**
 * Evaluates a single expression against the execution context.
 */
function evaluateExpression(expression: string, context: ExecutionContext): unknown {
  try {
    const prevOutput = getPrevNodeOutput(context);

    const scope: Record<string, unknown> = {
      $input: context.inputData,
      $json: context.inputData,
      $prevNode: prevOutput,
    };

    const paramNames = Object.keys(scope);
    const paramValues = Object.values(scope);

    const fn = new Function(...paramNames, `"use strict"; return (${expression});`);
    return fn(...paramValues);
  } catch {
    return undefined;
  }
}

function getPrevNodeOutput(context: ExecutionContext): unknown {
  const outputs = Array.from(context.nodeOutputs.entries());
  if (outputs.length === 0) return context.inputData;
  return outputs[outputs.length - 1][1];
}
