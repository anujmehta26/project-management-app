'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { useRouter } from 'next/navigation'

const LayoutWrapper = ({ 
  children, 
  onNavigateToDashboard,
  selectedWorkspace,
  onWorkspaceSelect,
  showSidebar = true,
  onSelectWorkspace,
  currentWorkspace,
  projects = [],
  onNavigateToWorkspaces
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [localProjects, setLocalProjects] = useState(projects);
  const router = useRouter();

  // Listen for sidebarProjectsUpdated event
  useEffect(() => {
    const handleProjectsUpdated = (event) => {
      console.log('Received updated projects:', event.detail.projects);
      setLocalProjects(event.detail.projects);
    };
    
    window.addEventListener('sidebarProjectsUpdated', handleProjectsUpdated);
    
    return () => {
      window.removeEventListener('sidebarProjectsUpdated', handleProjectsUpdated);
    };
  }, []);

  // Update localProjects when projects prop changes
  useEffect(() => {
    if (Array.isArray(projects) && projects.length > 0) {
      setLocalProjects(projects);
    }
  }, [projects]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Use the provided function or fallback to the other one
  const effectiveSelectWorkspace = onSelectWorkspace || onWorkspaceSelect;
  const effectiveCurrentWorkspace = currentWorkspace || selectedWorkspace;

  const handleSelectWorkspace = (workspace) => {
    if (typeof effectiveSelectWorkspace === 'function') {
      effectiveSelectWorkspace(workspace);
    } else {
      console.error('No workspace selection function available');
      router.push('/');
    }
  };

  const handleNavigateToDashboard = () => {
    if (typeof onNavigateToDashboard === 'function') {
      onNavigateToDashboard();
    } else {
      console.error('onNavigateToDashboard is not a function');
      router.push('/');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {showSidebar && (
        <div className="fixed left-0 top-0 h-full z-10">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggleCollapse={toggleSidebar}
            onNavigateToDashboard={onNavigateToDashboard}
            currentWorkspace={effectiveCurrentWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
            projects={localProjects}
            onNavigateToWorkspaces={onNavigateToWorkspaces}
            onProjectCreated={() => console.log('Project creation requested')}
          />
        </div>
      )}
      
      <div 
        className={`flex-1 ${showSidebar ? (sidebarCollapsed ? 'ml-16' : 'ml-64') : ''}`}
      >
        {children}
      </div>
    </div>
  );
};

export default LayoutWrapper; 