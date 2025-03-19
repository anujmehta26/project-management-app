'use client'

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {  Input  } from '@/components/ui/input';
import WorkspaceCard from './WorkspaceCard';

const WorkspaceList = ({ workspaces, onWorkspaceClick, onDeleteWorkspace, onEditWorkspace }) => {
  // Remove the search functionality from here since it's handled by the parent
  return (
    <div className="grid auto-rows-max grid-flow-row-dense gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map(workspace => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onClick={() => onWorkspaceClick(workspace)}
          onDelete={onDeleteWorkspace}
          onEdit={onEditWorkspace}
        />
      ))}
    </div>
  );
};

export default WorkspaceList; 