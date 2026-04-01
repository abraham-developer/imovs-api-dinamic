'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCubearkStore } from '@/store/cubeark-store';
import { fetchExecutions } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type {
  WorkflowExecutionData,
  NodeExecutionLog,
  ExecutionStatus,
} from '@/lib/cubeark-engine/types';

const statusConfig: Record<ExecutionStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: Clock },
  running: { label: 'Running', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Loader2 },
  success: { label: 'Success', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Check },
  error: { label: 'Error', color: 'bg-red-100 text-red-700 border-red-200', icon: X },
  cancelled: { label: 'Cancelled', color: 'bg-zinc-100 text-zinc-500 border-zinc-200', icon: X },
};

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function NodeLogItem({ log }: { log: NodeExecutionLog }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[log.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', config.color)}>
          <Icon className={cn('w-3 h-3', log.status === 'running' && 'animate-spin')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{log.nodeName}</p>
          <p className="text-[10px] text-muted-foreground">{log.nodeType}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatDuration(log.duration)}
          </span>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 space-y-2">
              <Separator />

              {log.error && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-md">
                  <p className="text-[10px] font-semibold text-red-600 mb-1">Error</p>
                  <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap break-all">
                    {log.error}
                  </pre>
                </div>
              )}

              {log.output !== undefined && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Output</p>
                  <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded-md whitespace-pre-wrap break-all max-h-48 overflow-auto custom-scrollbar">
                    {typeof log.output === 'string'
                      ? log.output
                      : JSON.stringify(log.output, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Started: {format(new Date(log.startedAt), 'HH:mm:ss.SSS')}</span>
                {log.finishedAt && (
                  <span>Finished: {format(new Date(log.finishedAt), 'HH:mm:ss.SSS')}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecutionCard({ execution }: { execution: WorkflowExecutionData }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[execution.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-zinc-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.color)}>
              <Icon className={cn('w-4 h-4', execution.status === 'running' && 'animate-spin')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground">
                  Execution {execution.id.substring(0, 8)}
                </p>
                <Badge variant="outline" className={cn('text-[10px] font-semibold', config.color)}>
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {format(new Date(execution.startedAt), 'MMM d, yyyy HH:mm:ss')}
                </span>
                <span>{formatDuration(execution.duration)}</span>
                <span>{execution.nodeLogs?.length || 0} nodes</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">
              <Separator className="mb-3" />

              {execution.error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-md">
                  <p className="text-[10px] font-semibold text-red-600 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Execution Error
                  </p>
                  <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap break-all">
                    {execution.error}
                  </pre>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Node Execution Log
                </p>
                <div className="space-y-1.5">
                  {execution.nodeLogs?.map((log, index) => (
                    <NodeLogItem key={log.nodeId || index} log={log} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function ExecutionViewer() {
  const {
    selectedWorkflowId,
    workflows,
    executions,
    setExecutions,
    setView,
  } = useCubearkStore();

  const [loading, setLoading] = useState(true);

  const workflow = workflows.find((w) => w.id === selectedWorkflowId);

  const loadExecutions = useCallback(async () => {
    if (!selectedWorkflowId) return;
    setLoading(true);
    try {
      const data = await fetchExecutions(selectedWorkflowId);
      setExecutions(data.executions || []);
    } catch (err) {
      console.error('Failed to load executions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowId, setExecutions]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b bg-white">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setView('dashboard')}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[300px]">
            {workflow?.name || 'Workflow'}
          </h1>
          <Badge variant="outline" className="text-[10px]">
            Executions
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && executions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-1">
                No executions yet
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Execute the workflow to see execution history and detailed node logs here.
              </p>
            </div>
          )}

          {/* Execution list */}
          {!loading && executions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {executions.length} execution{executions.length !== 1 ? 's' : ''}
                </p>
              </div>
              {executions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
