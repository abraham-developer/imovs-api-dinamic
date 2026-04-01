'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  FunctionSquare,
  ChevronRight,
  Braces,
  Hash,
  ToggleLeft,
  List,
  Variable,
} from 'lucide-react';
import { useCubearkStore } from '@/store/cubeark-store';
import { getNodeTypeDefinition, type OutputField, type NodeType } from '@/lib/cubeark-engine/types';
import { cn } from '@/lib/utils';

const typeIconMap: Record<string, any> = {
  string: Braces,
  number: Hash,
  boolean: ToggleLeft,
  object: Variable,
  array: List,
  any: Variable,
};

const typeColorMap: Record<string, string> = {
  string: 'text-emerald-600 bg-emerald-50',
  number: 'text-amber-600 bg-amber-50',
  boolean: 'text-purple-600 bg-purple-50',
  object: 'text-zinc-600 bg-zinc-100',
  array: 'text-cyan-600 bg-cyan-50',
  any: 'text-orange-600 bg-orange-50',
};

interface UpstreamNode {
  id: string;
  label: string;
  type: NodeType;
  outputFields: OutputField[];
}

function getUpstreamNodes(nodeId: string): UpstreamNode[] {
  const { editorNodes, editorEdges } = useCubearkStore.getState();

  // BFS backwards from the current node
  const visited = new Set<string>();
  const queue: string[] = [nodeId];
  const upstream: UpstreamNode[] = [];

  // Build adjacency list (reverse: which nodes point TO a node)
  const incomingEdges = new Map<string, string[]>();
  for (const edge of editorEdges) {
    const targets = incomingEdges.get(edge.target) || [];
    targets.push(edge.source);
    incomingEdges.set(edge.target, targets);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const sources = incomingEdges.get(current) || [];
    for (const sourceId of sources) {
      if (visited.has(sourceId)) continue;
      const sourceNode = editorNodes.find((n) => n.id === sourceId);
      if (!sourceNode) continue;

      const def = getNodeTypeDefinition(sourceNode.data.type as NodeType);
      if (def && def.outputFields && def.outputFields.length > 0) {
        upstream.push({
          id: sourceId,
          label: sourceNode.data.label || def.label,
          type: sourceNode.data.type as NodeType,
          outputFields: def.outputFields,
        });
      }

      queue.push(sourceId);
    }
  }

  return upstream;
}

interface ExpressionFieldProps {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  label?: string;
  className?: string;
}

export function ExpressionField({
  nodeId,
  value,
  onChange,
  placeholder,
  multiline = false,
  label,
  className,
}: ExpressionFieldProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const isExpression = /\{\{.*\}\}/.test(value);

  const upstreamNodes = useMemo(() => getUpstreamNodes(nodeId), [nodeId, value]);

  const insertExpression = useCallback(
    (nodeLabel: string, fieldName: string) => {
      const expression = `{{ ${nodeLabel}.${fieldName} }}`;
      const el = inputRef.current;
      if (el) {
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const newValue = value.slice(0, start) + expression + value.slice(end);
        onChange(newValue);
        // Set cursor after insertion
        requestAnimationFrame(() => {
          el.focus();
          const newPos = start + expression.length;
          el.setSelectionRange(newPos, newPos);
        });
      } else {
        onChange(value + expression);
      }
      setPopoverOpen(false);
    },
    [value, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const sharedInputProps = {
    value,
    onChange: handleInputChange,
    placeholder,
    className: cn(
      'text-xs font-mono',
      isExpression && 'border-l-2 border-l-orange-400 pl-2',
      className
    ),
    ref: inputRef as any,
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          {isExpression && (
            <Badge
              variant="outline"
              className="text-[9px] font-mono px-1.5 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200"
            >
              fx
            </Badge>
          )}
        </div>
      )}
      <div className="relative">
        {multiline ? (
          <Textarea {...sharedInputProps} rows={4} />
        ) : (
          <Input {...sharedInputProps} />
        )}

        {/* fx trigger button */}
        <Popover open={popoverOpen && upstreamNodes.length > 0} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0',
                isExpression
                  ? 'text-orange-500 bg-orange-50 hover:bg-orange-100 hover:text-orange-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              tabIndex={-1}
            >
              <FunctionSquare className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          {upstreamNodes.length > 0 && (
            <PopoverContent className="w-64 p-0" align="end" side="bottom" sideOffset={4}>
              <div className="p-2 border-b bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Insert Variable Reference
                </p>
              </div>
              <ScrollArea className="max-h-48">
                <div className="p-1">
                  {upstreamNodes.map((node) => (
                    <div key={node.id} className="mb-1">
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-foreground truncate">
                          {node.label}
                        </span>
                        <Badge variant="outline" className="text-[8px] font-mono px-1 py-0 h-3 ml-auto text-muted-foreground">
                          {node.type}
                        </Badge>
                      </div>
                      <div className="ml-4 flex flex-wrap gap-0.5">
                        {node.outputFields.map((field) => {
                          const TypeIcon = typeIconMap[field.type] || Variable;
                          return (
                            <button
                              key={field.name}
                              type="button"
                              onClick={() => insertExpression(node.label, field.name)}
                              className={cn(
                                'inline-flex items-center gap-1 h-6 px-1.5 rounded text-[10px] font-mono',
                                'hover:bg-accent transition-colors cursor-pointer',
                                typeColorMap[field.type] || 'text-zinc-600 bg-zinc-100'
                              )}
                            >
                              <TypeIcon className="w-2.5 h-2.5" />
                              {field.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {upstreamNodes.length === 0 && (
                    <div className="p-3 text-center text-[10px] text-muted-foreground">
                      No upstream nodes with output fields
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          )}
        </Popover>
      </div>
      {isExpression && !multiline && (
        <p className="text-[10px] text-orange-500 font-mono">
          Expression mode — value will be resolved at runtime
        </p>
      )}
    </div>
  );
}
