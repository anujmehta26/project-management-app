'use client'

import React, { useState, useEffect } from 'react';
import {  Dialog, DialogContent, DialogHeader, DialogTitle  } from '@/components/ui/dialog';
import {  Input  } from '@/components/ui/input';
import {  Button  } from '@/components/ui/button';
import { AlertCircle, Briefcase, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WorkspaceDialog = ({ open, onOpenChange, onCreateWorkspace, workspaces }) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (workspaces.some(w => w.name.toLowerCase() === workspaceName.trim().toLowerCase())) {
      setError('A workspace with this name already exists');
      return;
    }
    onCreateWorkspace(workspaceName);
    setWorkspaceName('');
    setError('');
    onOpenChange(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && workspaceName.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-2"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">Create Workspace</DialogTitle>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Enter workspace name"
              value={workspaceName}
              onChange={(e) => {
                setWorkspaceName(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!workspaceName.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create Workspace
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

const EditWorkspaceDialog = ({ workspace, onClose, onSave }) => {
  const [name, setName] = useState('');
  
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    }
  }, [workspace]);

  if (!workspace) return null;

  return (
    <Dialog open={!!workspace} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-2"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">Edit Workspace</DialogTitle>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Enter workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onSave(name)}
              disabled={!name.trim() || name === workspace.name}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export { WorkspaceDialog as default, EditWorkspaceDialog }; 