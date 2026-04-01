'use client';

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
  type NodeChange,
  type EdgeChange,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useImovsStore } from '@/store/imovs-store';
import { nodeTypes } from './custom-nodes';
import { NodeConfigPanel } from './node-config-panel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Save,
  Play,
  Search,
  GripVertical,
  Zap,
  Globe,
  Code,
  GitBranch,
  GitMerge,
  Pencil,
  Reply,
  Clock,
  Minus,
  Webhook,
  X,
  Loader2,
  Settings2,
  Layers,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  NODE_TYPE_DEFINITIONS,
  getNodeTypeDefinition,
  type NodeType,
  type NodeTypeDefinition,
} from '@/lib/engine/types';
import { updateWorkflow, executeWorkflow } from '@/lib/api';
import { cn } from '@/lib/utils';
import { UserMenu } from './user-menu';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  Play: Zap,
  Webhook: Webhook,
  Clock: Clock,
  Globe: Globe,
  Code: Code,
  GitBranch: GitBranch,
  GitMerge: GitMerge,
  Pencil: Pencil,
  Reply: Reply,
  Minus: Minus,
};

const categoryColors: Record<string, string> = {
  trigger: 'bg-purple-100 text-purple-700 border-purple-200',
  action: 'bg-violet-100 text-violet-700 border-violet-200',
  logic: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  utility: 'bg-slate-100 text-slate-700 border-slate-200',
};

const categories = [
  { key: 'trigger', label: 'Triggers' },
  { key: 'action', label: 'Actions' },
  { key: 'logic', label: 'Logic' },
  { key: 'utility', label: 'Utility' },
];

function NodePaletteItem({ def, onClick }: { def: NodeTypeDefinition; onClick: () => void }) {
  const Icon = iconMap[def.icon] || Minus;

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, def.type)}
          onClick={onClick}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing',
            'hover:bg-accent/50 transition-colors select-none group',
            'border-transparent hover:border-border',
            'hover:shadow-sm'
          )}
        >
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', def.color, 'bg-opacity-10')}>
            <Icon className={cn('w-4 h-4', def.color.replace('bg-', 'text-'))} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground truncate">{def.label}</div>
            <div className="text-[10px] text-muted-foreground truncate">{def.description}</div>
          </div>
          <GripVertical className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>Drag to canvas or click to add</p>
      </TooltipContent>
    </Tooltip>
  );
}

function NodePalette({ onClose }: { onClose?: () => void }) {
  const [search, setSearch] = useState('');
  const addNode = useImovsStore((s) => s.addNode);
  const reactFlowInstance = useReactFlow();

  const filteredByCategory = useMemo(() => {
    const searchLower = search.toLowerCase();
    return categories.map((cat) => {
      const nodes = NODE_TYPE_DEFINITIONS.filter(
        (d) =>
          d.category === cat.key &&
          (d.label.toLowerCase().includes(searchLower) ||
            d.description.toLowerCase().includes(searchLower))
      );
      return { ...cat, nodes };
    }).filter((cat) => cat.nodes.length > 0);
  }, [search]);

  const handleAddNode = useCallback((def: NodeTypeDefinition) => {
    const position = reactFlowInstance
      ? reactFlowInstance.screenToFlowPosition({ x: 500, y: 300 })
      : { x: 400, y: 300 };
    addNode(def.type, position);
  }, [addNode, reactFlowInstance]);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Nodes
          </p>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 lg:hidden" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
        <div className="p-2 space-y-1">
          {filteredByCategory.map((cat) => (
            <div key={cat.key} className="mb-3">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-semibold px-1.5 py-0 border', categoryColors[cat.key])}
                >
                  {cat.label}
                </Badge>
              </div>
              <div className="space-y-0.5">
                {cat.nodes.map((def) => (
                  <NodePaletteItem key={def.type} def={def} onClick={() => handleAddNode(def)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  // Detect desktop on mount
  useEffect(() => {
    const checkDesktop = () => {
      if (window.innerWidth < 1024) {
        setPaletteOpen(false);
      } else {
        setPaletteOpen(true);
      }
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const {
    editorNodes,
    editorEdges,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    onConnect,
    setView,
    selectedWorkflowId,
    workflowName,
    setWorkflowName,
    isSaving,
    isExecuting,
    setIsSaving,
    setIsExecuting,
    setEditorNodes,
    setEditorEdges,
    workflowActive,
    setWorkflowActive,
    setLastExecutionResult,
  } = useImovsStore();

  // Open config panel when a node is selected
  const prevSelectedId = useRef(selectedNodeId);
  if (selectedNodeId && selectedNodeId !== prevSelectedId.current) {
    prevSelectedId.current = selectedNodeId;
    setConfigOpen(true);
  }

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setEditorNodes(applyNodeChanges(changes, editorNodes));
    },
    [editorNodes, setEditorNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEditorEdges(applyEdgeChanges(changes, editorEdges));
    },
    [editorEdges, setEditorEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
    },
    [onConnect]
  );

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNode(type as NodeType, position);
    },
    [reactFlowInstance, addNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setConfigOpen(false);
  }, [setSelectedNodeId]);

  const handleSave = useCallback(async () => {
    if (!selectedWorkflowId) return;
    setIsSaving(true);
    try {
      await updateWorkflow(selectedWorkflowId, {
        name: workflowName,
        nodes: editorNodes,
        edges: editorEdges,
      });
      toast.success('Workflow saved', {
        description: `"${workflowName}" has been saved successfully.`,
      });
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Save failed', {
        description: err instanceof Error ? err.message : 'An error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedWorkflowId, workflowName, editorNodes, editorEdges, setIsSaving]);

  const handleExecute = useCallback(async () => {
    if (!selectedWorkflowId) return;
    setIsExecuting(true);
    try {
      // Auto-save before executing
      let saveError = false;
      try {
        await updateWorkflow(selectedWorkflowId, {
          name: workflowName,
          nodes: editorNodes,
          edges: editorEdges,
        });
      } catch (err) {
        console.error('Auto-save before execute failed:', err);
        saveError = true;
        toast.warning('Auto-save failed', {
          description: 'Attempting to execute with last saved version...',
        });
      }

      // Execute the workflow
      const result = await executeWorkflow(selectedWorkflowId);
      setLastExecutionResult(result);

      toast.success('Workflow executed', {
        description: result?.executionId
          ? `Execution ID: ${result.executionId} — Duration: ${result.duration ?? 'N/A'}ms`
          : 'Workflow executed successfully.',
      });
    } catch (err) {
      console.error('Execution failed:', err);
      toast.error('Execution failed', {
        description: err instanceof Error ? err.message : 'An error occurred during execution.',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [selectedWorkflowId, workflowName, editorNodes, editorEdges, setIsExecuting, setLastExecutionResult]);

  const handleToggleActive = useCallback(async () => {
    if (!selectedWorkflowId) return;
    const newActive = !workflowActive;
    setWorkflowActive(newActive);
    try {
      await updateWorkflow(selectedWorkflowId, { active: newActive });
      toast.success(newActive ? 'Workflow activated' : 'Workflow deactivated', {
        description: newActive
          ? `"${workflowName}" is now active and will respond to triggers.`
          : `"${workflowName}" is now inactive.`,
      });
      // Also update the workflows list
      const { workflows, setWorkflows } = useImovsStore.getState();
      setWorkflows(
        workflows.map((w) => (w.id === selectedWorkflowId ? { ...w, active: newActive } : w))
      );
    } catch (err) {
      console.error('Toggle active failed:', err);
      setWorkflowActive(!newActive); // Revert
      toast.error('Failed to toggle', {
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    }
  }, [selectedWorkflowId, workflowActive, workflowName, setWorkflowActive]);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep' as const,
    style: { strokeWidth: 2, stroke: '#d4d4d8' },
    animated: false,
  }), []);

  const miniMapNodeColor = (node: Node) => {
    const def = getNodeTypeDefinition(node.data?.type);
    if (!def) return '#a1a1aa';
    const colorMap: Record<string, string> = {
      'bg-green-500': '#22c55e',
      'bg-purple-500': '#a855f7',
      'bg-teal-500': '#14b8a6',
      'bg-violet-500': '#8b5cf6',
      'bg-sky-500': '#0ea5e9',
      'bg-amber-400': '#fbbf24',
      'bg-purple-500': '#a855f7',
      'bg-slate-500': '#64748b',
      'bg-slate-400': '#94a3b8',
      'bg-cyan-500': '#06b6d4',
    };
    return colorMap[def.color] || '#a1a1aa';
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar - responsive with flex-wrap */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border-b bg-white flex-wrap min-h-[44px]">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setView('dashboard')}
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 hidden sm:block" />

        {/* Palette toggle - desktop */}
        <div className="hidden lg:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={paletteOpen ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 text-xs',
                  paletteOpen && 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500'
                )}
                onClick={() => setPaletteOpen(!paletteOpen)}
              >
                <Layers className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Nodes</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {paletteOpen ? 'Hide node palette' : 'Show node palette'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Palette toggle - mobile */}
        <div className="lg:hidden">
          <Sheet open={mobilePaletteOpen} onOpenChange={setMobilePaletteOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Layers className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Nodes</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Node Palette</SheetTitle>
              <NodePalette onClose={() => setMobilePaletteOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 text-sm font-semibold border-transparent hover:border-input focus:border-input max-w-[300px]"
            placeholder="Workflow name"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Active/Inactive toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5',
                  workflowActive && 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                )}
                onClick={handleToggleActive}
              >
                {workflowActive ? (
                  <Power className="w-3.5 h-3.5" />
                ) : (
                  <PowerOff className="w-3.5 h-3.5" />
                )}
                <Badge
                  variant={workflowActive ? 'default' : 'secondary'}
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0',
                    workflowActive
                      ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                      : 'bg-zinc-100 text-zinc-500'
                  )}
                >
                  {workflowActive ? 'Active' : 'Inactive'}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {workflowActive ? 'Deactivate workflow' : 'Activate workflow'}
            </TooltipContent>
          </Tooltip>

          {/* Toggle config button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={configOpen ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 text-xs',
                  configOpen && 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500'
                )}
                onClick={() => setConfigOpen(!configOpen)}
              >
                <Settings2 className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Config</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedNodeId ? 'Close settings panel' : 'Open settings panel'}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleExecute}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">Execute</span>
          </Button>

          <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 hidden sm:block" />

          <UserMenu />
        </div>
      </div>

      {/* Main area - Three-panel layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Node Palette (desktop only) */}
        <div className={cn(
          'w-64 flex-shrink-0 border-r bg-white transition-all duration-200 overflow-hidden',
          'hidden lg:flex flex-col',
          !paletteOpen && 'lg:hidden'
        )}>
          <NodePalette />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={editorNodes}
            edges={editorEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onInit={handleInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaneClick={onPaneClick}
            onNodeClick={(_event, node) => {
              setSelectedNodeId(node.id);
              setConfigOpen(true);
            }}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={['Backspace', 'Delete']}
            className="bg-zinc-50"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#d4d4d8"
            />
            <Controls
              className="!bg-white !border !border-zinc-200 !shadow-sm !rounded-lg overflow-hidden"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-white !border !border-zinc-200 !shadow-sm !rounded-lg"
              nodeColor={miniMapNodeColor}
              maskColor="rgba(0, 0, 0, 0.08)"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {/* Right Panel - Config Panel (desktop) */}
        <div className={cn(
          'w-80 flex-shrink-0 border-l bg-white transition-all duration-200 overflow-hidden',
          'hidden lg:flex flex-col',
          !configOpen && 'lg:hidden'
        )}>
          <NodeConfigPanel onClose={() => setConfigOpen(false)} />
        </div>

        {/* Config Panel - Mobile/Tablet: Sheet overlay */}
        {configOpen && (
          <Sheet open={configOpen} onOpenChange={setConfigOpen}>
            <SheetContent side="right" className="w-80 sm:w-96 p-0">
              <SheetTitle className="sr-only">Node Configuration</SheetTitle>
              <NodeConfigPanel onClose={() => setConfigOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-background">
        <FlowCanvas />
      </div>
    </ReactFlowProvider>
  );
}
