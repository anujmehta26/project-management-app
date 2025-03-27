'use client'

import React, { useState, useEffect } from 'react';
import {  Button  } from '@/components/ui/button';
import {  Card  } from '@/components/ui/card';
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose  } from '@/components/ui/dialog';
import {  Input  } from '@/components/ui/input';
import { PlusCircle, Search, Folder, Star, ChevronDown, MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight, Home, Briefcase, UserPlus } from 'lucide-react';
import UserMenu from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
 } from '@/components/ui/dropdown-menu';
import LayoutWrapper from './LayoutWrapper';
import { useSession } from 'next-auth/react';
import { db } from '../lib/database';
import { getWorkspaceColor } from '../lib/utils';
import { useRouter } from 'next/navigation';
import {  Label  } from '@/components/ui/label';

const WorkspacesPage = ({ onSelectWorkspace, onLogout }) => {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState([]);
  const [favoriteWorkspaces, setFavoriteWorkspaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState(null);
  const [editedWorkspaceName, setEditedWorkspaceName] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    all: true
  });
  const [projects, setProjects] = useState([]);
  const [projectCounts, setProjectCounts] = useState({});
  const router = useRouter();
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkspaces();
      loadProjects();
      loadProjectCounts();
    }
  }, [session]);

  const loadWorkspaces = async () => {
    try {
      const data = await db.getWorkspaces(session.user.id);
      setWorkspaces(data || []);
      setFavoriteWorkspaces(data.filter(w => w.is_favorite) || []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadProjects = async () => {
    try {
      if (!session?.user?.id) {
        console.error('User ID is required for loadProjects');
        return;
      }
      
      console.log('Loading projects for user:', session.user.id);
      const projectData = await db.getProjects(session.user.id);
      
      if (!projectData) {
        console.error('No project data returned from db.getProjects');
        setProjects([]);
        return;
      }
      
      console.log('Projects loaded successfully:', projectData);
      setProjects(projectData || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  };

  const loadProjectCounts = async () => {
    try {
      const counts = await db.getProjectCountsByWorkspace(session.user.id);
      setProjectCounts(counts);
    } catch (error) {
      console.error('Failed to load project counts:', error);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }
    
    setIsCreating(true);
    setError('');
    
    try {
      console.log('Creating workspace with session:', session);
      
      if (!session?.user?.id) {
        throw new Error('You must be logged in to create a workspace');
      }
      
      const result = await db.createWorkspace({
        name: newWorkspaceName.trim(),
        userId: session.user.id
      });
      
      console.log('Workspace created:', result);
      
      setWorkspaces(prev => [result, ...prev]);
      
      setNewWorkspaceName('');
      setDialogOpen(false);
      await loadWorkspaces();
      
      setSuccessMessage('Workspace created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error creating workspace:', error);
      setError(error.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWorkspace = async () => {
    try {
      if (!workspaceToDelete) return;
      
      await db.deleteWorkspace(workspaceToDelete.id);
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const updateWorkspace = async () => {
    try {
      if (!workspaceToEdit || !editedWorkspaceName.trim()) return;
      
      await db.updateWorkspace(workspaceToEdit.id, {
        name: editedWorkspaceName.trim()
      });
      
      setEditDialogOpen(false);
      setWorkspaceToEdit(null);
      setEditedWorkspaceName('');
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  };

  const toggleFavorite = async (workspace) => {
    try {
      await db.updateWorkspace(workspace.id, {
        is_favorite: !workspace.is_favorite
      });
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const toggleSectionExpanded = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const filteredWorkspaces = (workspaces) => {
    if (!searchQuery.trim()) return workspaces;
    
    return workspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleDeleteWorkspace = (workspace) => {
    setWorkspaceToDelete(workspace);
    setDeleteDialogOpen(true);
  };

  const handleEditWorkspace = (workspace) => {
    setWorkspaceToEdit(workspace);
    setEditedWorkspaceName(workspace.name);
    setEditDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="app-header flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li className="text-gray-500 text-sm">
                <button onClick={() => router.push('/')} className="hover:text-blue-600 flex items-center">
                  <Home className="h-4 w-4 mr-1" />
                  <span>Dashboard</span>
                </button>
              </li>
              <li className="text-gray-500 flex items-center text-sm">
                <ChevronRight className="h-4 w-4 mx-1" />
                <Briefcase className="h-4 w-4 mr-1" />
                <span className="text-blue-600">Workspaces</span>
              </li>
            </ol>
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <UserMenu user={session?.user} onLogout={onLogout} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Main content */}
          <div className="flex-1 p-4 overflow-auto">
            {/* Search and actions */}
            <div className="flex justify-between items-center mb-6">
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search workspaces..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={() => setDialogOpen(true)}
                className="button-primary"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            </div>

            {/* Workspace sections */}
            <div className="space-y-8">
              {/* Favorite Workspaces */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-4 cursor-pointer"
                  onClick={() => toggleSectionExpanded('favorites')}
                >
                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.favorites ? '' : '-rotate-90'}`} />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Favorite Workspaces</h2>
                </div>
                
                {expandedSections.favorites && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredWorkspaces(favoriteWorkspaces).map(workspace => {
                      const colors = getWorkspaceColor(workspace.id);
                      const projectCount = projects.filter(p => p.workspace_id === workspace.id).length || 0;
                      
                      return (
                        <div
                          key={workspace.id}
                          className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => onSelectWorkspace(workspace)}
                        >
                          <div className={`h-2 ${colors.folder}`}></div>
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className={`w-10 h-10 rounded-md ${colors.icon} flex items-center justify-center`}>
                                <Folder className="h-5 w-5" />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(workspace);
                                  }}
                                  className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400"
                                >
                                  <Star className={`h-5 w-5 ${workspace.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                    >
                                      <MoreHorizontal className="h-5 w-5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditWorkspace(workspace);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWorkspace(workspace);
                                    }}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{workspace.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {projectCounts[workspace.id] || 0} projects • Created {new Date(workspace.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {filteredWorkspaces(favoriteWorkspaces).length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        No favorite workspaces found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* All Workspaces */}
              <div>
                <div 
                  className="flex items-center gap-2 mb-4 cursor-pointer"
                  onClick={() => toggleSectionExpanded('all')}
                >
                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.all ? '' : '-rotate-90'}`} />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Workspaces</h2>
                </div>
                
                {expandedSections.all && (
                  <div className="space-y-2">
                    <div 
                      className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
                      onClick={() => setDialogOpen(true)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <PlusCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">New Workspace</span>
                    </div>
                    
                    {filteredWorkspaces(workspaces).map(workspace => {
                      const colors = getWorkspaceColor(workspace.id);
                      const projectCount = projects.filter(p => p.workspace_id === workspace.id).length || 0;
                      
                      return (
                        <div
                          key={workspace.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                          onClick={() => onSelectWorkspace(workspace)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-md ${colors.icon} flex items-center justify-center`}>
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{workspace.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {projectCounts[workspace.id] || 0} projects • Created {new Date(workspace.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(workspace);
                                }}
                                className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400"
                              >
                                <Star className={`h-5 w-5 ${workspace.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                  >
                                    <MoreHorizontal className="h-5 w-5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditWorkspace(workspace);
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkspace(workspace);
                                  }}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredWorkspaces(workspaces).length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No workspaces found. Create your first workspace to get started.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a workspace to organize your projects and collaborate with team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="Enter workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
              />
            </div>
            
            {/* Add information about collaboration */}
            <div className="flex bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="mr-3 flex-shrink-0 mt-1">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Team Collaboration</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  After creating your workspace, you can invite team members to collaborate. 
                  Each member can have different access levels.
                </p>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            {successMessage && (
              <div className="text-green-500 text-sm">{successMessage}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createWorkspace}
              disabled={!newWorkspaceName.trim() || isCreating}
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Workspace name"
              value={editedWorkspaceName}
              onChange={(e) => setEditedWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateWorkspace();
                }
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={updateWorkspace} 
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workspace? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteWorkspace}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspacesPage; 