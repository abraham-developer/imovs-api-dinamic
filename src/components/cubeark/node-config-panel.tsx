'use client';

import React, { useState, useCallback } from 'react';
import { useCubearkStore } from '@/store/cubeark-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpressionField } from './expression-field';
import {
  Plus,
  Trash2,
  Info,
  X,
  Reply,
  Copy,
  Check,
} from 'lucide-react';
import type { NodeType, NodeData, WorkflowNode } from '@/lib/cubeark-engine/types';
import { getNodeTypeDefinition } from '@/lib/cubeark-engine/types';
import { cn } from '@/lib/utils';

export function NodeConfigPanel({ onClose }: { onClose?: () => void }) {
  const {
    editorNodes,
    selectedNodeId,
    setSelectedNodeId,
    updateNodeData,
  } = useCubearkStore();

  const selectedNode = editorNodes.find((n) => n.id === selectedNodeId);

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    onClose?.();
  }, [setSelectedNodeId, onClose]);

  if (!selectedNode || !selectedNodeId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-4 text-muted-foreground">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No node selected</p>
          <p className="text-xs mt-1">Click a node on the canvas to configure it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Node Configuration
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleClose}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
        <div className="p-4 space-y-4">
          {/* Node label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Label</Label>
            <Input
              value={selectedNode.data.label}
              onChange={(e) =>
                updateNodeData(selectedNodeId, { label: e.target.value })
              }
              className="h-8 text-sm"
              placeholder="Node label"
            />
          </div>

          <Separator />

          {/* Node type specific config */}
          {selectedNode.data.type === 'manualTrigger' && (
            <ManualTriggerConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'webhookTrigger' && (
            <WebhookConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'scheduleTrigger' && (
            <ScheduleConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'httpRequest' && (
            <HttpRequestConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'code' && (
            <CodeConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'if' && (
            <IfConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'set' && (
            <SetConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'merge' && (
            <MergeConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'response' && (
            <ResponseConfig node={selectedNode} />
          )}
          {selectedNode.data.type === 'noOp' && (
            <NoOpConfig />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// --- Config components for each node type ---

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function ManualTriggerConfig({ node }: { node: WorkflowNode }) {
  return (
    <div className="space-y-3">
      <ConfigSection title="Trigger Settings">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This node starts the workflow manually. Click &quot;Execute&quot; in the toolbar or
            trigger via API to start an execution.
          </p>
        </div>
      </ConfigSection>
    </div>
  );
}

function WebhookConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;
  const respondMode = params.respondMode || 'lastNode';
  const [copied, setCopied] = useState(false);
  const webhookPath = params.path || '';
  const webhookUrl = webhookPath ? `/api/${webhookPath}` : '';

  const copyUrl = useCallback(() => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for environments where clipboard API isn't available
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [webhookUrl]);

  return (
    <div className="space-y-3">
      {/* Webhook URL - Prominent display */}
      <ConfigSection title="Webhook URL">
        <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2.5">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">
              Production URL
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 rounded-md border border-purple-200 dark:border-zinc-700 px-3 py-2">
              <code className="text-xs font-mono text-purple-700 dark:text-purple-300 flex-1 truncate block">
                {webhookUrl || 'Configure path below...'}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 w-7 p-0 flex-shrink-0',
                  copied ? 'text-emerald-600' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={copyUrl}
                disabled={!webhookUrl}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-[10px] text-emerald-600 font-medium">
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Send {params.method || 'POST'} requests to this URL. The path below is auto-generated and unique.
          </p>
        </div>
      </ConfigSection>

      <ConfigSection title="Path Settings">
        <div className="space-y-1.5">
          <Label className="text-xs">Webhook Path</Label>
          <div className="flex items-center gap-1.5">
            <code className="flex-shrink-0 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded-md">
              /api/
            </code>
            <Input
              value={params.path || ''}
              onChange={(e) =>
                updateNodeData(node.id, {
                  parameters: { ...params, path: e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '') },
                })
              }
              className="h-8 text-sm font-mono flex-1"
              placeholder="my-unique-path"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Only letters, numbers, hyphens and underscores. No spaces or special characters.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">HTTP Method</Label>
          <Select
            value={params.method || 'POST'}
            onValueChange={(val) =>
              updateNodeData(node.id, {
                parameters: { ...params, method: val },
              })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Authentication</Label>
          <Select
            value={params.authentication || 'none'}
            onValueChange={(val) =>
              updateNodeData(node.id, {
                parameters: { ...params, authentication: val },
              })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="header">Header Auth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ConfigSection>

      <ConfigSection title="Response Settings">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border mb-2">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Controls when and how this webhook responds to the caller.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Response Mode</Label>
          <Select
            value={respondMode}
            onValueChange={(val) =>
              updateNodeData(node.id, {
                parameters: { ...params, respondMode: val },
              })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onReceived">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Respond Immediately</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Return request data right away, execute in background
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="lastNode">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Using Last Node</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Wait for workflow to finish, return last node output
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="responseNode">
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    Using &apos;Respond to Webhook&apos; Node
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Use the dedicated response node to customize the reply
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {respondMode === 'responseNode' && (
          <div className="flex items-start gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-md">
            <Reply className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
            <div className="text-[10px] text-cyan-700 dark:text-cyan-300">
              <p className="font-medium">Add a &quot;Respond to Webhook&quot; node</p>
              <p className="text-muted-foreground mt-0.5">
                Drag it from the Utility section in the node palette. You can set custom status code, headers, and body there.
              </p>
            </div>
          </div>
        )}

        {respondMode === 'lastNode' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Response Code (fallback)</Label>
            <Input
              type="number"
              value={params.responseCode || 200}
              onChange={(e) =>
                updateNodeData(node.id, {
                  parameters: { ...params, responseCode: parseInt(e.target.value) || 200 },
                })
              }
              className="h-8 text-sm w-24"
            />
          </div>
        )}
      </ConfigSection>
    </div>
  );
}

function ScheduleConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  return (
    <div className="space-y-3">
      <ConfigSection title="Schedule Settings">
        <div className="space-y-1.5">
          <Label className="text-xs">Cron Expression</Label>
          <Input
            value={params.cronExpression || ''}
            onChange={(e) =>
              updateNodeData(node.id, {
                parameters: { ...params, cronExpression: e.target.value },
              })
            }
            className="h-8 text-sm font-mono"
            placeholder="0 * * * *"
          />
          <p className="text-[10px] text-muted-foreground">
            Use standard cron syntax. &quot;0 * * * *&quot; = every hour
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Timezone</Label>
          <Input
            value={params.timezone || 'UTC'}
            onChange={(e) =>
              updateNodeData(node.id, {
                parameters: { ...params, timezone: e.target.value },
              })
            }
            className="h-8 text-sm"
            placeholder="UTC"
          />
        </div>
      </ConfigSection>
    </div>
  );
}

function HttpRequestConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  const updateHeaders = (index: number, key: string, value: string) => {
    const headers = [...(params.headers || [])];
    if (index >= headers.length) return;
    headers[index] = { key, value };
    updateNodeData(node.id, { parameters: { ...params, headers } });
  };

  const addHeader = () => {
    const headers = [...(params.headers || []), { key: '', value: '' }];
    updateNodeData(node.id, { parameters: { ...params, headers } });
  };

  const removeHeader = (index: number) => {
    const headers = (params.headers || []).filter((_: any, i: number) => i !== index);
    updateNodeData(node.id, { parameters: { ...params, headers } });
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-violet-100 text-violet-700 border-violet-200',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
    HEAD: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    OPTIONS: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };

  return (
    <div className="space-y-3">
      <ConfigSection title="Request Settings">
        <div className="space-y-1.5">
          <Label className="text-xs">Method</Label>
          <Select
            value={params.method || 'GET'}
            onValueChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, method: val } })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
                <SelectItem key={m} value={m}>
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono', methodColors[m])}>
                    {m}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* URL - Expression field */}
        <ExpressionField
          nodeId={node.id}
          label="URL"
          value={params.url || ''}
          onChange={(val) =>
            updateNodeData(node.id, { parameters: { ...params, url: val } })
          }
          placeholder="https://api.example.com/data"
        />

        <div className="space-y-1.5">
          <Label className="text-xs">Body Type</Label>
          <Select
            value={params.bodyType || 'none'}
            onValueChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, bodyType: val } })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="form-data">Form Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {params.bodyType && params.bodyType !== 'none' && (
          <ExpressionField
            nodeId={node.id}
            label="Body"
            value={params.body || ''}
            onChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, body: val } })
            }
            placeholder={params.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Body content'}
            multiline
          />
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Timeout (ms)</Label>
          <Input
            type="number"
            value={params.timeout || 30000}
            onChange={(e) =>
              updateNodeData(node.id, {
                parameters: { ...params, timeout: parseInt(e.target.value) || 30000 },
              })
            }
            className="h-8 text-sm w-28"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Authentication</Label>
          <Select
            value={params.authentication || 'none'}
            onValueChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, authentication: val } })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="api_key">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ConfigSection>

      <ConfigSection title="Headers">
        {(params.headers || []).map((header: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={header.key}
              onChange={(e) => updateHeaders(index, e.target.value, header.value)}
              className="h-7 text-xs flex-1"
              placeholder="Key"
            />
            <Input
              value={header.value}
              onChange={(e) => updateHeaders(index, header.key, e.target.value)}
              className="h-7 text-xs flex-1"
              placeholder="Value"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeHeader(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addHeader}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Header
        </Button>
      </ConfigSection>
    </div>
  );
}

function CodeConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  return (
    <div className="space-y-3">
      <ConfigSection title="Code Settings">
        <div className="space-y-1.5">
          <Label className="text-xs">Language</Label>
          <div className="px-3 py-1.5 bg-muted rounded-md border text-xs font-medium">
            JavaScript
          </div>
        </div>

        <ExpressionField
          nodeId={node.id}
          label="Code"
          value={params.code || ''}
          onChange={(val) =>
            updateNodeData(node.id, { parameters: { ...params, code: val } })
          }
          placeholder="// Write your code here"
          multiline
        />
      </ConfigSection>

      <ConfigSection title="Available Variables">
        <div className="space-y-1.5 p-3 bg-muted/50 rounded-md border">
          <div className="space-y-1">
            <code className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
              $input
            </code>
            <span className="text-[10px] text-muted-foreground ml-1.5">
              — Input data from the previous node
            </span>
          </div>
          <div className="space-y-1">
            <code className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
              $json
            </code>
            <span className="text-[10px] text-muted-foreground ml-1.5">
              — Helper to parse JSON strings
            </span>
          </div>
          <div className="space-y-1">
            <code className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
              $env
            </code>
            <span className="text-[10px] text-muted-foreground ml-1.5">
              — Environment variables
            </span>
          </div>
          <div className="space-y-1">
            <code className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
              $workflow
            </code>
            <span className="text-[10px] text-muted-foreground ml-1.5">
              — Workflow metadata (id, name)
            </span>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

function IfConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  return (
    <div className="space-y-3">
      <ConfigSection title="Condition">
        {/* Condition - Expression field */}
        <ExpressionField
          nodeId={node.id}
          label="Condition Expression"
          value={params.condition || ''}
          onChange={(val) =>
            updateNodeData(node.id, { parameters: { ...params, condition: val } })
          }
          placeholder="$input.value > 10"
          multiline
        />

        <div className="p-3 bg-muted/50 rounded-md border space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Examples
          </p>
          <div className="space-y-1">
            <code className="text-[10px] font-mono block text-zinc-600">
              $input.value &gt; 10
            </code>
            <code className="text-[10px] font-mono block text-zinc-600">
              $input.status === &apos;active&apos;
            </code>
            <code className="text-[10px] font-mono block text-zinc-600">
              $input.items.length &gt; 0
            </code>
            <code className="text-[10px] font-mono block text-zinc-600">
              $input.name.includes(&apos;test&apos;)
            </code>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

function SetConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  const updateAssignment = (index: number, key: string, value: string) => {
    const assignments = [...(params.assignments || [])];
    assignments[index] = { key, value };
    updateNodeData(node.id, { parameters: { ...params, assignments } });
  };

  const addAssignment = () => {
    const assignments = [...(params.assignments || []), { key: '', value: '' }];
    updateNodeData(node.id, { parameters: { ...params, assignments } });
  };

  const removeAssignment = (index: number) => {
    const assignments = (params.assignments || []).filter((_: any, i: number) => i !== index);
    updateNodeData(node.id, { parameters: { ...params, assignments } });
  };

  return (
    <div className="space-y-3">
      <ConfigSection title="Assignments">
        {(params.assignments || []).map((assignment: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={assignment.key}
              onChange={(e) => updateAssignment(index, e.target.value, assignment.value)}
              className="h-7 text-xs flex-1 font-mono"
              placeholder="Key"
            />
            <span className="text-xs text-muted-foreground">=</span>
            <ExpressionField
              nodeId={node.id}
              value={assignment.value}
              onChange={(val) => updateAssignment(index, assignment.key, val)}
              placeholder="Value"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => removeAssignment(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addAssignment}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Assignment
        </Button>
      </ConfigSection>

      <ConfigSection title="Options">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Keep Existing Data</Label>
            <p className="text-[10px] text-muted-foreground">
              Merge with existing data instead of replacing
            </p>
          </div>
          <Switch
            checked={params.keepExisting ?? true}
            onCheckedChange={(checked) =>
              updateNodeData(node.id, { parameters: { ...params, keepExisting: checked } })
            }
          />
        </div>
      </ConfigSection>
    </div>
  );
}

function MergeConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  return (
    <div className="space-y-3">
      <ConfigSection title="Merge Settings">
        <div className="space-y-1.5">
          <Label className="text-xs">Mode</Label>
          <Select
            value={params.mode || 'append'}
            onValueChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, mode: val } })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="append">Append</SelectItem>
              <SelectItem value="combine">Combine</SelectItem>
              <SelectItem value="chooseBranch">Choose Branch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-[10px] text-muted-foreground">
          <strong>Append:</strong> Add all items from all inputs to one list.
          <br />
          <strong>Combine:</strong> Merge fields from each input.
          <br />
          <strong>Choose Branch:</strong> Use data from a specific branch.
        </p>

        {params.mode === 'chooseBranch' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Branch Index</Label>
            <Input
              type="number"
              value={params.branchIndex ?? 0}
              onChange={(e) =>
                updateNodeData(node.id, {
                  parameters: { ...params, branchIndex: parseInt(e.target.value) || 0 },
                })
              }
              className="h-8 text-sm w-24"
              min={0}
            />
          </div>
        )}
      </ConfigSection>
    </div>
  );
}

function ResponseConfig({ node }: { node: WorkflowNode }) {
  const { updateNodeData } = useCubearkStore();
  const params = node.data.parameters as any;

  const respondWith = params.respondWith || 'incomingData';

  const updateHeader = (index: number, key: string, value: string) => {
    const headers = [...(params.responseHeaders || [])];
    if (index >= headers.length) {
      headers.push({ key, value });
    } else {
      headers[index] = { key, value };
    }
    updateNodeData(node.id, { parameters: { ...params, responseHeaders: headers } });
  };

  const addHeader = () => {
    const headers = [...(params.responseHeaders || []), { key: '', value: '' }];
    updateNodeData(node.id, { parameters: { ...params, responseHeaders: headers } });
  };

  const removeHeader = (index: number) => {
    const headers = (params.responseHeaders || []).filter((_: any, i: number) => i !== index);
    updateNodeData(node.id, { parameters: { ...params, responseHeaders: headers } });
  };

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-md">
        <Reply className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
        <p className="text-[10px] text-cyan-700 dark:text-cyan-300">
          This node defines what the webhook returns to the caller.
          Make sure the Webhook node&apos;s Response Mode is set to &quot;Using Respond to Webhook Node&quot;.
        </p>
      </div>

      <ConfigSection title="Response Body">
        <div className="space-y-1.5">
          <Label className="text-xs">Respond With</Label>
          <Select
            value={respondWith}
            onValueChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, respondWith: val } })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incomingData">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Incoming Data</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Return the data from the previous node
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Custom JSON</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Return a custom JSON object
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="text">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Custom Text</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Return plain text
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(respondWith === 'json' || respondWith === 'text') && (
          <ExpressionField
            nodeId={node.id}
            label={`Response Body ${respondWith === 'json' ? '(JSON)' : '(Text)'}`}
            value={params.responseData || ''}
            onChange={(val) =>
              updateNodeData(node.id, { parameters: { ...params, responseData: val } })
            }
            placeholder={
              respondWith === 'json'
                ? '{\n  "success": true,\n  "data": {{ $input.value }}\n}'
                : 'Hello from Cubeark API Dynamic!'
            }
            multiline
          />
        )}
      </ConfigSection>

      <ConfigSection title="Response Options">
        <div className="space-y-1.5">
          <Label className="text-xs">Status Code</Label>
          <Select
            value={String(params.responseCode || 200)}
            onValueChange={(val) =>
              updateNodeData(node.id, {
                parameters: { ...params, responseCode: parseInt(val) || 200 },
              })
            }
          >
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: '200', label: '200 OK' },
                { value: '201', label: '201 Created' },
                { value: '204', label: '204 No Content' },
                { value: '400', label: '400 Bad Request' },
                { value: '401', label: '401 Unauthorized' },
                { value: '403', label: '403 Forbidden' },
                { value: '404', label: '404 Not Found' },
                { value: '500', label: '500 Server Error' },
              ].map((code) => (
                <SelectItem key={code.value} value={code.value}>
                  {code.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ConfigSection>

      <ConfigSection title="Response Headers">
        <p className="text-[10px] text-muted-foreground mb-2">
          Add custom headers to the webhook response.
        </p>
        {(params.responseHeaders || []).map((header: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={header.key}
              onChange={(e) => updateHeader(index, e.target.value, header.value)}
              className="h-7 text-xs flex-1 font-mono"
              placeholder="Header name"
            />
            <Input
              value={header.value}
              onChange={(e) => updateHeader(index, header.key, e.target.value)}
              className="h-7 text-xs flex-1 font-mono"
              placeholder="Value"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeHeader(index)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addHeader}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Header
        </Button>
      </ConfigSection>
    </div>
  );
}

function NoOpConfig() {
  return (
    <div className="space-y-3">
      <ConfigSection title="No Operation">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This node does nothing and simply passes data through. It&apos;s useful for
            organizing workflows or as a placeholder.
          </p>
        </div>
      </ConfigSection>
    </div>
  );
}
