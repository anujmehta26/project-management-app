import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { db } from '@/lib/database';
import { useSession } from 'next-auth/react';

const WorkspaceDialog = ({ open, onOpenChange, workspace, onWorkspaceCreated, onWorkspaceUpdated }) => {
  const { data: session } = useSession();
  const [name, setName] = useState(workspace ? workspace.name : '');
  const [description, setDescription] = useState(workspace ? workspace.description : '');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!name.trim()) {
      setError('Workspace name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      if (workspace) {
        // Update existing workspace
        const updatedWorkspace = await db.updateWorkspace({
          id: workspace.id,
          name,
          description: description || '',
        });
        
        if (onWorkspaceUpdated) {
          onWorkspaceUpdated(updatedWorkspace);
        }
      } else {
        // Create new workspace
        if (!session?.user?.id) {
          throw new Error('You must be logged in to create a workspace');
        }
        
        const newWorkspace = await db.createWorkspace({
          name,
          description: description || '',
          user_id: session.user.id,
        });
        
        if (onWorkspaceCreated) {
          onWorkspaceCreated(newWorkspace);
        }
      }
      
      // Close the dialog and reset form
      onOpenChange(false);
      if (!workspace) {
        setName('');
        setDescription('');
      }
    } catch (err) {
      console.error('Error saving workspace:', err);
      setError(err.message || 'Failed to save workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workspace ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace Name
            </label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="workspace-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter workspace description"
            />
          </div>
          
          {!workspace && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <UserPlus className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Collaborate with your team</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    After creating your workspace, you'll be able to invite team members to collaborate.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setName('');
                setDescription('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? workspace
                  ? 'Saving...'
                  : 'Creating...'
                : workspace
                ? 'Save Changes'
                : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceDialog; 