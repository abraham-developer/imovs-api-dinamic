'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Play,
  Webhook,
  Clock,
  Globe,
  Code,
  GitBranch,
  GitMerge,
  Pencil,
  Reply,
  Minus,
  Check,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useCubearkStore } from '@/store/cubeark-store';
import { getNodeTypeDefinition } from '@/lib/cubeark-engine/types';
import type { NodeType } from '@/lib/cubeark-engine/types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  Play,
  Webhook,
  Clock,
  Globe,
  Code,
  GitBranch,
  GitMerge,
  Pencil,
  Reply,
  Minus,
};

// This component is declared outside of render to avoid the "component created during render" lint error.
const NodeIconDisplay = memo(function NodeIconDisplay({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = iconMap[iconName] || Minus;
  return <Icon className={className} />;
});

const categoryColors: Record<string, string> = {
  trigger: 'bg-purple-400',
  action: 'bg-violet-500',
  logic: 'bg-fuchsia-400',
  utility: 'bg-slate-400',
};

const categoryIconColors: Record<string, string> = {
  trigger: 'text-purple-500',
  action: 'text-violet-500',
  logic: 'text-fuchsia-500',
  utility: 'text-slate-500',
};

const typeColorMap: Record<string, string> = {
  object: 'bg-zinc-100 text-zinc-600',
  string: 'bg-emerald-50 text-emerald-600',
  number: 'bg-amber-50 text-amber-600',
  boolean: 'bg-purple-50 text-purple-600',
  array: 'bg-cyan-50 text-cyan-600',
  any: 'bg-orange-50 text-orange-600',
};

function ExecutionStatusIndicator({ status }: { status?: string }) {
  if (!status) return null;

  return (
    <div className="absolute -top-1 -right-1 z-10">
      {status === 'success' && (
        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {status === 'error' && (
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {status === 'running' && (
        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
          <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
        </div>
      )}
      {status === 'pending' && (
        <div className="w-4 h-4 rounded-full bg-zinc-400 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}

function OutputFieldPills({ nodeId }: { nodeId: string }) {
  const editorNodes = useCubearkStore((s) => s.editorNodes);
  const node = editorNodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const def = getNodeTypeDefinition(node.data.type as NodeType);
  if (!def || !def.outputFields || def.outputFields.length === 0) return null;

  const maxShow = 3;
  const fields = def.outputFields;
  const showFields = fields.slice(0, maxShow);
  const remaining = fields.length - maxShow;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1.5 border-t border-zinc-100">
      {showFields.map((field) => (
        <span
          key={field.name}
          className={cn(
            'inline-flex items-center h-[18px] px-1.5 rounded text-[9px] font-mono leading-none',
            typeColorMap[field.type] || 'bg-zinc-100 text-zinc-600'
          )}
        >
          {field.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center h-[18px] px-1 rounded text-[9px] text-zinc-400 font-mono leading-none">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function CubearkNodeComponent({ id, data, selected }: NodeProps) {
  const { selectedNodeId, setSelectedNodeId, deleteNode } = useCubearkStore();
  const nodeType = data.type as NodeType;
  const def = getNodeTypeDefinition(nodeType);
  const isSelected = selectedNodeId === id || selected;

  const category = def?.category || 'utility';
  const barColor = categoryColors[category] || 'bg-zinc-500';
  const iconColor = categoryIconColors[category] || 'text-zinc-500';

  const isTrigger = category === 'trigger';
  const isResponse = nodeType === 'response';
  const isIf = nodeType === 'if';
  const isMerge = nodeType === 'merge';

  return (
    <div
      className={cn(
        'relative min-w-[160px] max-w-[200px] bg-white rounded-lg shadow-sm border-2 transition-all duration-150 cursor-pointer',
        isSelected
          ? 'border-purple-400 shadow-md shadow-purple-100'
          : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
      )}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(id);
      }}
    >
      {/* Top color bar */}
      <div className={cn('h-1.5 rounded-t-lg', barColor)} />

      {/* Node body */}
      <div className="px-3 py-2">
        {/* Icon and Label */}
        <div className="flex items-center gap-2">
          <div className={cn('flex-shrink-0', iconColor)}>
            <NodeIconDisplay iconName={def?.icon || 'Minus'} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-800 truncate">
              {data.label || def?.label || nodeType}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              {def?.description || ''}
            </div>
          </div>
        </div>

        {/* Subtitle / type label */}
        <div className="mt-1 text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
          {nodeType}
        </div>

        {/* Output field pills */}
        <OutputFieldPills nodeId={id} />
      </div>

      {/* Execution Status */}
      <ExecutionStatusIndicator status={data._executionStatus} />

      {/* Handles */}
      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(
            '!w-3 !h-3 !border-2 !border-zinc-300 !bg-white',
            isSelected && '!border-purple-400'
          )}
        />
      )}

      {/* Merge: second input from top */}
      {isMerge && (
        <Handle
          type="target"
          position={Position.Top}
          id="input-2"
          className={cn(
            '!w-3 !h-3 !border-2 !border-zinc-300 !bg-white',
            isSelected && '!border-purple-400'
          )}
          style={{ left: 20 }}
        />
      )}

      {/* Output handle */}
      {!isIf && (
        <Handle
          type="source"
          position={Position.Right}
          className={cn(
            '!w-3 !h-3 !border-2 !border-zinc-300 !bg-white',
            isSelected && '!border-purple-400'
          )}
        />
      )}

      {/* IF node: true (top) and false (bottom) output handles */}
      {isIf && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className={cn(
              '!w-3 !h-3 !border-2 !border-emerald-400 !bg-white',
              isSelected && '!border-purple-400'
            )}
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className={cn(
              '!w-3 !h-3 !border-2 !border-red-400 !bg-white',
              isSelected && '!border-purple-400'
            )}
            style={{ top: '70%' }}
          />
          {/* Labels for true/false */}
          <div className="absolute right-[-32px] top-[26%] text-[9px] font-semibold text-emerald-600">
            true
          </div>
          <div className="absolute right-[-36px] top-[66%] text-[9px] font-semibold text-red-500">
            false
          </div>
        </>
      )}

      {/* Delete button on hover when selected */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center z-20 transition-colors shadow-sm"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export const CubearkNode = memo(CubearkNodeComponent);

export const nodeTypes = {
  manualTrigger: CubearkNode,
  webhookTrigger: CubearkNode,
  scheduleTrigger: CubearkNode,
  httpRequest: CubearkNode,
  code: CubearkNode,
  if: CubearkNode,
  set: CubearkNode,
  merge: CubearkNode,
  response: CubearkNode,
  noOp: CubearkNode,
};
