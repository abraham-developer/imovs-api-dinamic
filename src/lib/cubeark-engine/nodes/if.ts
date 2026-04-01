import type { WorkflowNode, ExecutionContext, IfParams } from '../types';

/**
 * IF Node Executor
 *
 * Evaluates a JavaScript condition expression and returns { result: true/false }.
 * The expression can use: $input, $json, $prevNode.
 * The engine uses this to determine which branch (true=handle 0, false=handle 1) to follow.
 */
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as IfParams;
  const condition = params.condition;

  if (!condition || typeof condition !== 'string') {
    throw new Error('IF node requires a valid condition expression');
  }

  try {
    // Build scope for evaluation
    const prevOutput = getPrevNodeOutput(context);

    const scope: Record<string, unknown> = {
      $input: context.inputData,
      $json: context.inputData,
      $prevNode: prevOutput,
    };

    // Evaluate the condition expression
    const paramNames = Object.keys(scope);
    const paramValues = Object.values(scope);

    const fn = new Function(...paramNames, `"use strict"; return (${condition});`);
    const result = fn(...paramValues);

    // Ensure the result is a boolean
    return {
      result: Boolean(result),
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`IF condition evaluation failed: ${error.message}`);
    }
    throw new Error(`IF condition evaluation failed: ${String(error)}`);
  }
}

function getPrevNodeOutput(context: ExecutionContext): unknown {
  const outputs = Array.from(context.nodeOutputs.entries());
  if (outputs.length === 0) return context.inputData;
  return outputs[outputs.length - 1][1];
}
