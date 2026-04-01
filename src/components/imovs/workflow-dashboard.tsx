'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useImovsStore } from '@/store/imovs-store';
import { CreateWorkflowDialog } from './create-workflow-dialog';
import { fetchWorkflows, deleteWorkflow, executeWorkflow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserMenu } from './user-menu';
import {
  Plus,
  Play,
  Trash2,
  Zap,
  Clock,
  Workflow,
  FileText,
  MoreVertical,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const nodeCountLabel = (count: number) => {
  if (count === 0) return 'No nodes';
  if (count === 1) return '1 node';
  return `${count} nodes`;
};

export function WorkflowDashboard() {
  const {
    workflows,
    setWorkflows,
    selectWorkflow,
    setView,
    showCreateDialog,
    setShowCreateDialog,
  } = useImovsStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to load workflows:', err);
      setError('Failed to load workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setWorkflows]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleOpenWorkflow = (id: string) => {
    selectWorkflow(id);
    setView('editor');
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWorkflow(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      await executeWorkflow(id);
    } catch (err) {
      console.error('Execution failed:', err);
    } finally {
      setExecutingId(false as any);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">iMOVS API Dinamic</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Workflow Automation Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Workflow
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Stats bar */}
          {!loading && !error && workflows.length > 0 && (
            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
              <span className="font-medium">
                {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
              </span>
              <span className="text-border">|</span>
              <span>
                {workflows.filter((w) => w.active).length} active
              </span>
            </div>
          )}

          {/* Error state with retry */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                {error}
              </p>
              <Button
                onClick={loadWorkflows}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-24 mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && workflows.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Workflow className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No workflows yet
              </h2>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Create your first workflow to start automating tasks. Drag and drop nodes to build
                powerful integrations.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Workflow
              </Button>
            </motion.div>
          )}

          {/* Workflow grid */}
          {!loading && !error && workflows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {workflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onOpen={() => handleOpenWorkflow(workflow.id)}
                    onDelete={() => handleDelete(workflow.id)}
                    onExecute={() => handleExecute(workflow.id)}
                    isDeleting={deletingId === workflow.id}
                    isExecuting={executingId === workflow.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Create workflow dialog */}
      <CreateWorkflowDialog />
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WorkflowCard({
  workflow,
  onOpen,
  onDelete,
  onExecute,
  isDeleting,
  isExecuting,
}: {
  workflow: any;
  onOpen: () => void;
  onDelete: () => void;
  onExecute: () => void;
  isDeleting: boolean;
  isExecuting: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden border-zinc-200 hover:border-zinc-300"
        onClick={onOpen}
      >
        <CardContent className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground truncate max-w-[70%]">
              {workflow.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={workflow.active ? 'default' : 'secondary'}
                className={cn(
                  'text-[10px] font-semibold',
                  workflow.active
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                )}
              >
                {workflow.active ? 'Active' : 'Inactive'}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExecute(); }}>
                    <Play className="w-3.5 h-3.5 mr-2" />
                    Execute
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2rem]">
            {workflow.description || 'No description'}
          </p>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {nodeCountLabel(workflow.nodes?.length || 0)}
              </span>
              {workflow.updatedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(workflow.updatedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecute();
                    }}
                    disabled={isExecuting}
                  >
                    {isExecuting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Execute workflow</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground group-hover:text-foreground"
                onClick={onOpen}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
