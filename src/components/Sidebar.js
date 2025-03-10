'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Briefcase, 
  Calendar, 
  Users, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Star,
  PlusCircle,
  MoreHorizontal,
  Folder,
  Search,
  ChevronLeft,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSession } from 'next-auth/react';
import { db } from '../lib/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';
import { getWorkspaceColor } from '../lib/utils';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ 
  onSelectWorkspace, 
  currentWorkspace, 
  projects = [], 
  onProjectCreated, 
  collapsed = false, 
  onToggleCollapse, 
  onNavigateToDashboard,
  onNavigateToWorkspaces
}) => {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState([]);
  const [favoriteWorkspaces, setFavoriteWorkspaces] = useState([]);
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [localProjects, setLocalProjects] = useState(projects);
  const maxVisibleWorkspaces = 5;
  const intervalRef = useRef(null);
  const router = useRouter();
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkspaces, setFilteredWorkspaces] = useState(workspaces);
  const [hoveredItem, setHoveredItem] = useState(null);
  const sidebarRef = useRef(null);

  // Update localProjects when projects prop changes
  useEffect(() => {
    if (Array.isArray(projects)) {
      setLocalProjects(projects);
      console.log('Sidebar received projects:', projects);
    }
  }, [projects]);

  // Load workspaces when session changes and set up polling
  useEffect(() => {
    if (session?.user?.id) {
      loadWorkspaces();
      
      // Set up polling every 2 seconds
      intervalRef.current = setInterval(() => {
        loadWorkspaces();
      }, 2000);
    }
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  // Remember sidebar state in localStorage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebarState');
      if (savedState) {
        const state = JSON.parse(savedState);
        setIsWorkspacesOpen(state.workspaces !== undefined ? state.workspaces : true);
        setIsSettingsOpen(state.settings !== undefined ? state.settings : false);
        setIsProjectsOpen(state.projects !== undefined ? state.projects : true);
      }
    } catch (error) {
      console.error('Error loading sidebar state:', error);
    }
  }, []);

  // Save sidebar state when it changes
  useEffect(() => {
    try {
      localStorage.setItem('sidebarState', JSON.stringify({
        workspaces: isWorkspacesOpen,
        settings: isSettingsOpen,
        projects: isProjectsOpen
      }));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isWorkspacesOpen, isSettingsOpen, isProjectsOpen]);

  const loadWorkspaces = async () => {
    try {
      const data = await db.getWorkspaces(session.user.id);
      setWorkspaces(data || []);
      
      // Set favorite workspaces
      const favorites = data.filter(w => w.is_favorite);
      setFavoriteWorkspaces(favorites);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      if (!newWorkspaceName.trim()) return;
      
      // Make sure we have the user ID from the session
      const userId = session?.user?.id;
      console.log("Sidebar - Creating workspace with user ID:", userId);
      
      if (!userId) {
        console.error("User session not available in sidebar");
        alert("Please sign in to create a workspace");
        return;
      }
      
      // Call createWorkspace with the correct parameters
      const result = await db.createWorkspace({
        name: newWorkspaceName.trim(),
        userId: userId // Make sure userId is passed correctly
      });
      
      console.log("Workspace created successfully from sidebar:", result);
      
      setNewWorkspaceName('');
      setDialogOpen(false);
      // Reload workspaces after creation
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to create workspace from sidebar:', error);
      alert(`Failed to create workspace: ${error.message}`);
    }
  };

  // Fix the workspace color function to ensure no consecutive colors are the same
  const getUniqueColor = (id, index) => {
    const colors = [
      'bg-red-100', 'bg-orange-100', 'bg-amber-100', 
      'bg-lime-100', 'bg-emerald-100', 'bg-cyan-100',
      'bg-sky-100', 'bg-violet-100', 'bg-fuchsia-100', 'bg-rose-100'
    ];
    
    // Use the workspace id to deterministically select a color
    let colorIndex = id ? id.toString().charCodeAt(0) % colors.length : 0;
    
    // If this is not the first item and the previous item has the same color, shift by 1
    if (index > 0 && workspaces[index - 1] && 
        (workspaces[index - 1].id.toString().charCodeAt(0) % colors.length) === colorIndex) {
      colorIndex = (colorIndex + 1) % colors.length;
    }
    
    return colors[colorIndex];
  };

  // Fix the workspace click handler
  const handleWorkspaceClick = (workspace) => {
    console.log('Workspace clicked:', workspace);
    try {
      if (typeof onSelectWorkspace === 'function') {
        onSelectWorkspace(workspace);
      } else {
        console.error('onSelectWorkspace is not a function, using fallback');
        window.location.href = `/workspace/${workspace.id}`;
      }
    } catch (error) {
      console.error('Error navigating to workspace:', error);
      window.location.href = `/`;
    }
  };

  const renderWorkspaceItem = (workspace) => {
    // Get the same color for both favorite and regular workspace listings
    const colors = getWorkspaceColor(workspace.id);
    
    return (
      <li 
        key={workspace.id}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer ${
          currentWorkspace?.id === workspace.id 
            ? 'bg-gray-700' 
            : 'hover:bg-gray-700'
        }`}
        onClick={() => onSelectWorkspace(workspace)}
      >
        {/* Use consistent size for color indicators */}
        <div className={`w-4 h-4 rounded-sm ${colors.folder}`}></div>
        <span className="text-sm truncate flex-1">{workspace.name}</span>
      </li>
    );
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !currentWorkspace?.id) return;
    
    try {
      // Ensure user ID exists
      if (!session || !session.user || !session.user.id) {
        console.error('User session is missing or incomplete');
        alert('Please log in to create a project');
        return;
      }
      
      const project = {
        name: newProjectName.trim(),
        description: '',
        workspace_id: currentWorkspace.id,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        status: 'active'
      };
      
      console.log('Creating project with:', project);
      
      const projectId = await db.createProject(project);
      console.log('Project created with ID:', projectId);
      
      setNewProjectName('');
      setProjectDialogOpen(false);
      
      // Reload projects through the callback
      if (typeof onProjectCreated === 'function') {
        onProjectCreated();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error.message || 'Failed to create project');
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`sidebar fixed left-0 top-0 bottom-0 ${collapsed ? 'w-16' : 'w-64'} bg-gray-800 text-gray-100 border-r border-gray-700 flex flex-col text-sm z-10 transition-width duration-300`}
    >
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-300">
            ProManage
          </h1>
        )}
        {onToggleCollapse && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleCollapse} 
            className={`${collapsed ? 'mx-auto' : 'ml-auto'} text-gray-300 hover:text-white hover:bg-gray-700`}
          >
            {collapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 pb-20">
        {/* Dashboard shortcut */}
        <div className="px-2 py-2">
          <div 
            className="flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700 mb-1"
            onClick={(e) => {
              // Only handle the click if we have a navigation function or router
              if (typeof onNavigateToDashboard === 'function') {
                // Use the provided function
                onNavigateToDashboard();
              } else if (router) {
                // Use the router as a fallback, but avoid reloading the page
                e.preventDefault();
                router.push('/');
              }
            }}
          >
            <Home className="h-6 w-6 mr-2 text-blue-400" />
            {!collapsed && <span className="font-medium text-gray-200">Dashboard</span>}
          </div>
        </div>
        
        {/* Separator */}
        <div className="mx-2 my-2 border-t border-gray-700"></div>
        
        <div className="px-2 py-2">
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700 mb-1"
            onClick={() => setIsWorkspacesOpen(!isWorkspacesOpen)}
          >
            <div className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-gray-300" />
              {!collapsed && <span className="font-medium text-gray-200">Workspaces</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center justify-center w-6 h-6">
                {isWorkspacesOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                )}
              </div>
            )}
          </div>
          
          {isWorkspacesOpen && !collapsed && (
            <div className="mt-1 ml-2 space-y-1">
              {/* Favorites Section */}
              {favoriteWorkspaces.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Favorites
                  </div>
                  {favoriteWorkspaces.map((workspace, index) => {
                    const colors = getWorkspaceColor(workspace.id);
                    return (
                      <div
                        key={`fav-${workspace.id}`}
                        className={cn(
                          "flex items-center px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-700",
                          currentWorkspace?.id === workspace.id ? "bg-gray-700" : ""
                        )}
                        onClick={() => onSelectWorkspace(workspace)}
                      >
                        <div className={`h-4 w-4 rounded-sm mr-2 ${colors.folder}`} />
                        <span className="truncate flex-1 text-gray-200">{workspace.name}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    );
                  })}
                  <div className="my-2 border-t border-gray-700"></div>
                </>
              )}
              
              {/* All Workspaces */}
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                All Workspaces
              </div>
              {showAllWorkspaces 
                ? workspaces.map((workspace, index) => renderWorkspaceItem(workspace))
                : workspaces.slice(0, maxVisibleWorkspaces).map((workspace, index) => renderWorkspaceItem(workspace))
              }
              
              {workspaces.length > maxVisibleWorkspaces && (
                <div
                  className="flex items-center px-3 py-1.5 text-blue-400 hover:text-blue-300 cursor-pointer"
                  onClick={() => setShowAllWorkspaces(!showAllWorkspaces)}
                >
                  <span className="text-xs">
                    {showAllWorkspaces ? "Show less workspaces" : "See all workspaces"}
                  </span>
                </div>
              )}
              
              <div
                className="flex items-center px-3 py-1.5 text-gray-300 hover:text-gray-100 cursor-pointer mt-1"
                onClick={() => setDialogOpen(true)}
              >
                <PlusCircle className="h-3 w-3 mr-2" />
                <span className="text-xs">New workspace</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Projects section - only show when a workspace is selected */}
        {currentWorkspace && (
          <div className="px-2 py-2">
            <div 
              className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700 mb-1"
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            >
              <div className="flex items-center">
                <Folder className="h-5 w-5 mr-2 text-gray-300" />
                {!collapsed && <span className="font-medium text-gray-200">Projects</span>}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-center w-6 h-6">
                  {isProjectsOpen ? (
                    <ChevronDown className="h-5 w-5 text-gray-300" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  )}
                </div>
              )}
            </div>
            
            {isProjectsOpen && !collapsed && (
              <div className="mt-1 ml-2 space-y-1">
                {localProjects && localProjects.length > 0 ? (
                  localProjects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-700"
                      onClick={() => {
                        // Handle project click
                        const projectElement = document.getElementById(`project-${project.id}`);
                        if (projectElement) {
                          projectElement.scrollIntoView({ behavior: 'smooth' });
                          projectElement.classList.add('highlight-project');
                          setTimeout(() => {
                            projectElement.classList.remove('highlight-project');
                          }, 2000);
                        }
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-blue-400 mr-2"></div>
                      <span className="truncate text-gray-200">{project.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-gray-400 text-xs">No projects yet</div>
                )}
                
                <div
                  className="flex items-center px-3 py-1.5 text-gray-300 hover:text-gray-100 cursor-pointer mt-1"
                  onClick={() => {
                    console.log('Add project clicked', { currentWorkspace, onProjectCreated });
                    if (currentWorkspace && typeof onProjectCreated === 'function') {
                      setProjectDialogOpen(true);
                    } else {
                      console.log('Cannot create project: no workspace selected or no handler');
                    }
                  }}
                >
                  <PlusCircle className="h-3 w-3 mr-2" />
                  <span className="text-xs">New project</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="px-2 py-2">
          <div 
            className="flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-700"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-2 text-gray-300" />
              {!collapsed && <span className="font-medium text-gray-200">Settings</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center justify-center w-6 h-6">
                {isSettingsOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-300" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                )}
              </div>
            )}
          </div>
          
          {isSettingsOpen && !collapsed && (
            <div className="mt-1 ml-2 space-y-1">
              <div
                className="flex items-center px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-700"
              >
                <span className="truncate text-gray-200">Account</span>
              </div>
              <div
                className="flex items-center px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-700"
              >
                <span className="truncate text-gray-200">Preferences</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User profile fixed at bottom */}
      {session?.user && !collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-medium mr-2">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 truncate">
              <div className="text-sm font-medium text-gray-200">{session.user.name || 'User'}</div>
              <div className="text-xs text-gray-400 truncate">{session.user.email}</div>
            </div>
          </div>
        </div>
      )}
      {session?.user && collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-800 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-medium">
            {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
          </div>
        </div>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-50 dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateWorkspace();
                }
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600"
            />
            <Button 
              onClick={handleCreateWorkspace} 
              className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createProject();
                }
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={createProject} 
              className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sidebar; 