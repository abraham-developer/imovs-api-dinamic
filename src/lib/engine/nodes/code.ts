import type { WorkflowNode, ExecutionContext, CodeParams } from '../types';

/**
 * Code Node Executor
 *
 * Executes JavaScript code safely using Function constructor.
 *
 * Available variables in user code:
 * - $input: the input data from the previous node
 * - $json: shorthand for $input
 * - $items: if input is an array, access items (same as $input)
 * - $env: environment variables (from process.env)
 * - $prevNode: output from previous node
 * - $workflow: workflow metadata { id, name }
 * - $execution: execution metadata { id }
 *
 * The code must return a value which becomes the node's output.
 * Execution is limited to 30 seconds.
 */

const CODE_EXECUTION_TIMEOUT_MS = 30_000;

/**
 * Creates a sandboxed execution function from user code.
 * Uses new Function() to avoid deprecated vm2.
 * Blocks access to dangerous globals like require, process, __dirname, etc.
 */
function createSandboxedFunction(code: string, context: ExecutionContext) {
  // Build a proxy-based scope to restrict access to dangerous globals
  const forbiddenGlobals = new Set([
    'require',
    'import',
    'eval',
    'Function',
    'process',
    '__dirname',
    '__filename',
    'global',
    'globalThis',
    'module',
    'exports',
    'Buffer',
  ]);

  const safeScope: Record<string, unknown> = {};

  // Inject safe context variables
  safeScope.$input = context.inputData;
  safeScope.$json = context.inputData;
  safeScope.$items = Array.isArray(context.inputData) ? context.inputData : context.inputData;
  safeScope.$env = { ...process.env };
  safeScope.$prevNode = getPrevNodeOutput(context);
  safeScope.$workflow = { id: context.workflowId };
  safeScope.$execution = { id: context.executionId };

  // Inject safe built-in utilities
  safeScope.console = {
    log: (...args: unknown[]) => console.log('[Code Node]', ...args),
    error: (...args: unknown[]) => console.error('[Code Node]', ...args),
    warn: (...args: unknown[]) => console.warn('[Code Node]', ...args),
    info: (...args: unknown[]) => console.info('[Code Node]', ...args),
  };

  safeScope.JSON = JSON;
  safeScope.Math = Math;
  safeScope.Date = Date;
  safeScope.Array = Array;
  safeScope.Object = Object;
  safeScope.String = String;
  safeScope.Number = Number;
  safeScope.Boolean = Boolean;
  safeScope.Map = Map;
  safeScope.Set = Set;
  safeScope.RegExp = RegExp;
  safeScope.Error = Error;
  safeScope.TypeError = TypeError;
  safeScope.RangeError = RangeError;
  safeScope.parseInt = parseInt;
  safeScope.parseFloat = parseFloat;
  safeScope.isNaN = isNaN;
  safeScope.isFinite = isFinite;
  safeScope.encodeURIComponent = encodeURIComponent;
  safeScope.decodeURIComponent = decodeURIComponent;
  safeScope.encodeURI = encodeURI;
  safeScope.decodeURI = decodeURI;
  safeScope.atob = typeof atob !== 'undefined' ? atob : undefined;
  safeScope.btoa = typeof btoa !== 'undefined' ? btoa : undefined;
  safeScope.setTimeout = setTimeout;
  safeScope.clearTimeout = clearTimeout;
  safeScope.Promise = Promise;

  // Shadow dangerous globals by destructuring them from an empty object
  // Note: 'import' and 'eval' are reserved keywords and can't be destructured
  // but they can't be accessed as regular identifiers anyway
  const shadowableNames = Array.from(forbiddenGlobals)
    .filter(name => name !== 'import' && name !== 'eval')
    .join(', ');
  
  // Wrap the user code in an async function to support async/await
  const wrappedCode = `
    "use strict";
    return (async function() {
      const { ${shadowableNames} } = {};
      ${code}
    })();
  `;

  const paramNames = Object.keys(safeScope);
  const paramValues = Object.values(safeScope);

  return new Function(...paramNames, wrappedCode)(...paramValues);
}

/**
 * Gets the output from the most recently executed node.
 */
function getPrevNodeOutput(context: ExecutionContext): unknown {
  const outputs = Array.from(context.nodeOutputs.entries());
  if (outputs.length === 0) return context.inputData;
  return outputs[outputs.length - 1][1];
}

/**
 * Executes a Code node.
 */
export async function execute(
  node: WorkflowNode,
  context: ExecutionContext,
): Promise<unknown> {
  const params = node.data.parameters as CodeParams;
  const code = params.code;

  if (!code || typeof code !== 'string') {
    throw new Error('Code node requires a valid code string in parameters');
  }

  // Validate language is JavaScript
  if (params.language !== 'javascript') {
    throw new Error(`Unsupported code language: ${params.language}. Only JavaScript is supported.`);
  }

  // Wrap execution in a timeout promise
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(
      () => reject(new Error(`Code execution timed out after ${CODE_EXECUTION_TIMEOUT_MS}ms`)),
      CODE_EXECUTION_TIMEOUT_MS,
    );
  });

  try {
    const result = await Promise.race([
      createSandboxedFunction(code, context),
      timeoutPromise,
    ]);

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Provide more descriptive error messages
      if (error.message.includes('is not defined')) {
        throw new Error(
          `Code execution error: ${error.message}. ` +
            `Available variables: $input, $json, $items, $env, $prevNode, $workflow, $execution`,
        );
      }
      throw new Error(`Code execution error: ${error.message}`);
    }
    throw new Error(`Code execution failed with unknown error: ${String(error)}`);
  }
}
