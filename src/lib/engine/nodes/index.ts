import type { NodeExecutor, NodeType } from '../types';

import { execute as manualTrigger } from './manual-trigger';
import { execute as webhookTrigger } from './webhook-trigger';
import { execute as scheduleTrigger } from './schedule-trigger';
import { execute as httpRequest } from './http-request';
import { execute as code } from './code';
import { execute as ifNode } from './if';
import { execute as setNode } from './set';
import { execute as mergeNode } from './merge';
import { execute as responseNode } from './response';
import { execute as noOpNode } from './no-op';

// Re-export all individual executors
export { execute as manualTriggerExecutor } from './manual-trigger';
export { execute as webhookTriggerExecutor } from './webhook-trigger';
export { execute as scheduleTriggerExecutor } from './schedule-trigger';
export { execute as httpRequestExecutor } from './http-request';
export { execute as codeExecutor } from './code';
export { execute as ifExecutor } from './if';
export { execute as setExecutor } from './set';
export { execute as mergeExecutor } from './merge';
export { execute as responseExecutor } from './response';
export { execute as noOpExecutor } from './no-op';

/**
 * Registry mapping node types to their executor functions.
 */
export const nodeExecutorMap: Record<NodeType, NodeExecutor> = {
  manualTrigger: { execute: manualTrigger },
  webhookTrigger: { execute: webhookTrigger },
  scheduleTrigger: { execute: scheduleTrigger },
  httpRequest: { execute: httpRequest },
  code: { execute: code },
  if: { execute: ifNode },
  set: { execute: setNode },
  merge: { execute: mergeNode },
  response: { execute: responseNode },
  noOp: { execute: noOpNode },
};
