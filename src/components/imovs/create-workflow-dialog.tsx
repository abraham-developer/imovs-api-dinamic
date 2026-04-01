'use client';

import React, { useState } from 'react';
import { useImovsStore } from '@/store/imovs-store';
import { createWorkflow } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Zap } from 'lucide-react';

export function CreateWorkflowDialog() {
  const {
    showCreateDialog,
    setShowCreateDialog,
    workflows,
    setWorkflows,
    selectWorkflow,
    setView,
  } = useImovsStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const workflow = await createWorkflow({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setWorkflows([...workflows, workflow]);
      selectWorkflow(workflow.id);
      setView('editor');

      // Reset form
      setName('');
      setDescription('');
      setShowCreateDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setName('');
      setDescription('');
      setError('');
    }
    setShowCreateDialog(open);
  };

  return (
    <Dialog open={showCreateDialog} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            New Workflow
          </DialogTitle>
          <DialogDescription>
            Create a new workflow to start building automation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workflow-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="My Workflow"
              className="h-9"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workflow-desc">Description</Label>
            <Textarea
              id="workflow-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="min-h-[80px] text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
