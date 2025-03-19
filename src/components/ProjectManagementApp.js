'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlusCircle, ChevronDown, ChevronRight, ChevronLeft, Trash2, GripVertical, Pencil as PencilIcon, Search, Briefcase, Users, User, MessageCircle, Home, Folder } from 'lucide-react';
import {  Card, CardContent  } from '@/components/ui/card';
import {  Button  } from '@/components/ui/button';
import {  Input  } from '@/components/ui/input';
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter  } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getUserColor  } from '../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle  } from '@/components/ui/alert-dialog';
import UserMenu from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import LayoutWrapper from './LayoutWrapper';
import { useSession } from 'next-auth/react';
import { db } from '../lib/database';
import { ProjectForm } from './ProjectForm';
import Sidebar from './Sidebar';
import {  
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
 } from '@/components/ui/dropdown-menu';
import {  Checkbox  } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

// SortableProject component
const SortableProject = ({ children, project }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ dragHandleProps: listeners })}
    </div>
  );
};

// SortableTask component
const SortableTask = ({ children, task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ dragHandleProps: listeners })}
    </div>
  );
};

// Fix the CommentPopover component to position strictly on the left
const CommentPopover = ({ children, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  
  // Update the position of the popover when the trigger position changes
  const updatePosition = useCallback(() => {
    if (triggerRef.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left - 300 // Adjusted for wider popover
      });
    }
  }, [isOpen]);
  
  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update position when opening the popover and on scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);
  
  return (
    <div className="relative">
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div 
          ref={popoverRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
          style={{
            width: '400px', // Increased by 25% from 320px
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const ProjectManagementApp = ({ 
  workspace, 
  onLogout, 
  onBackToWorkspaces,
  createProject,
  projectDialogOpen,
  setProjectDialogOpen,
  newProjectName,
  setNewProjectName
}) => {
  const { data: session } = useSession();
  const [projects, setProjects] = useState([]);
  const [sidebarProjects, setSidebarProjects] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [newTaskInputs, setNewTaskInputs] = useState({});
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState({});
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [localProjectDialogOpen, setLocalProjectDialogOpen] = useState(false);
  const [localNewProjectName, setLocalNewProjectName] = useState('');
  const [newProject, setNewProject] = useState({ name: '', workspace_id: workspace?.id || '' });
  const [taskComments, setTaskComments] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const updateTaskTitleTimeout = useRef(null);

  const effectiveProjectDialogOpen = projectDialogOpen !== undefined ? projectDialogOpen : localProjectDialogOpen;
  const effectiveSetProjectDialogOpen = setProjectDialogOpen || setLocalProjectDialogOpen;
  const effectiveNewProjectName = newProjectName !== undefined ? newProjectName : localNewProjectName;
  const effectiveSetNewProjectName = setNewProjectName || setLocalNewProjectName;

  // Add a ref to prevent double-loading
  const loadingProjectsRef = useRef(false);

  useEffect(() => {
    if (session?.user) {
      setWorkspaceUsers([
        {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        }
      ]);
      
      // Initialize allUsers with the current user (moved into same useEffect)
      setAllUsers([{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image
      }]);
    }
  }, [session]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // This will load projects only when workspace or allUsers changes
    if (workspace?.id && allUsers.length > 0 && !loadingProjectsRef.current) {
      loadingProjectsRef.current = true;
      
      const loadProjectsOnce = async () => {
        await loadProjects();
        loadingProjectsRef.current = false;
      };
      
      loadProjectsOnce();
    }
  }, [workspace?.id, allUsers.length]); // Use allUsers.length instead of allUsers object reference

  useEffect(() => {
    if (workspace?.id) {
      setNewProject(prev => ({ ...prev, workspace_id: workspace.id }));
    }
  }, [workspace]);

  useEffect(() => {
    // Load projects when projectDialogOpen changes from true to false
    // This will reload projects after a new project is created
    if (effectiveProjectDialogOpen === false && !loadingProjectsRef.current) {
      // Prevent duplicate loading with the ref
      loadingProjectsRef.current = true;
      
      const reloadProjects = async () => {
        await loadProjects();
        loadingProjectsRef.current = false;
      };
      
      reloadProjects();
    }
  }, [effectiveProjectDialogOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadProjects = async () => {
    try {
      if (!workspace || !workspace.id) {
        console.warn('Cannot load projects: workspace or workspace.id is missing');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      console.log("Loading projects for workspace:", workspace.id);
      
      // Get cached users from localStorage
      let cachedUsers = [];
      try {
        const storedUsers = localStorage.getItem('appUsers');
        if (storedUsers) {
          cachedUsers = JSON.parse(storedUsers);
        }
      } catch (e) {
        console.warn('Could not load cached users:', e);
      }
      
      // Combine cached users with state users for most complete set
      const availableUsers = [...allUsers];
      cachedUsers.forEach(cachedUser => {
        if (!availableUsers.some(u => u.id === cachedUser.id)) {
          availableUsers.push(cachedUser);
        }
      });
      
      // Use getProjectsWithTasks instead of getProjectsByWorkspace
      const projectData = await db.getProjectsWithTasks(workspace.id);
      console.log("Projects loaded:", projectData);
      
      if (!projectData || projectData.length === 0) {
        console.log("No projects found for workspace", workspace.id);
        setProjects([]);
        setSidebarProjects([]);
        setIsLoading(false);
        return;
      }
      
      // Process the assigned_to field for each task
      const processedProjects = projectData.map(project => {
        if (project.tasks) {
          return {
            ...project,
            tasks: project.tasks.map(task => {
              let processedAssignedTo = [];
              
              if (task.assigned_to) {
                // Handle string format (JSON)
                if (typeof task.assigned_to === 'string') {
                  try {
                    const parsed = JSON.parse(task.assigned_to);
                    if (Array.isArray(parsed)) {
                      // Convert user IDs to user objects using all available user sources
                      processedAssignedTo = parsed.map(userId => {
                        // Try to find user in allUsers state
                        let user = availableUsers.find(u => String(u.id) === String(userId));
                        
                        // If not found, create a placeholder with consistent initials
                        if (!user) {
                          const initials = userId.substring(0, 1).toUpperCase(); // Use first char of ID
                          user = { 
                            id: userId, 
                            name: `${initials} User`,  // Create name that will generate proper initials
                            isPlaceholder: true 
                          };
                        }
                        return user;
                      });
                    }
                  } catch (e) {
                    console.error("Error parsing assigned_to:", e);
                  }
                } else if (Array.isArray(task.assigned_to)) {
                  // If it's already an array, ensure each item is a user object
                  processedAssignedTo = task.assigned_to.map(item => {
                    if (typeof item === 'object' && item !== null && item.id) {
                      return item; // Already a user object
                    } else {
                      // Try to find user in allUsers state or cached users
                      let user = availableUsers.find(u => String(u.id) === String(item));
                      
                      // If not found, create a placeholder with consistent initials
                      if (!user) {
                        const idString = String(item);
                        const initials = idString.substring(0, 1).toUpperCase(); // Use first char of ID
                        user = { 
                          id: item, 
                          name: `${initials} User`, // Create name that will generate proper initials
                          isPlaceholder: true 
                        };
                      }
                      return user;
                    }
                  });
                }
              }
              
              // Load comments for this task if they exist
              if (task.comments && Array.isArray(task.comments)) {
                // Format comments for the UI
                const formattedComments = task.comments.map(comment => {
                  // Find the user info for this comment if available
                  const commentUser = availableUsers.find(u => String(u.id) === String(comment.user_id));
                  
                  return {
                    id: comment.id,
                    text: comment.content,
                    author: comment.user?.name || commentUser?.name || (comment.user_id ? `User ${comment.user_id.substring(0, 4)}` : 'Anonymous'),
                    timestamp: comment.created_at,
                    user_id: comment.user_id
                  };
                });
                
                // Update the task comments state
                setTaskComments(prev => ({
                  ...prev,
                  [task.id]: formattedComments
                }));
              }
              
              return {
                ...task,
                assigned_to: processedAssignedTo
              };
            })
          };
        }
        return project;
      });
      
      setProjects(processedProjects);
      
      // Also update sidebarProjects with a simplified version for the sidebar
      const simplifiedProjects = processedProjects.map(project => ({
        id: project.id,
        name: project.name,
        workspace_id: project.workspace_id
      }));
      setSidebarProjects(simplifiedProjects);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error loading projects:", error);
      setError("Failed to load projects. Please try again.");
      setIsLoading(false);
      setProjects([]);
      setSidebarProjects([]);
      handleSupabaseError(error, 'loading projects');
    }
  };

  const handleProjectCreated = async (project) => {
    await loadProjects();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    try {
      if (!itemToDelete) return;
      
      if (itemToDelete.type === 'project') {
        await db.deleteProject(itemToDelete.projectId);
        // Create a new array for projects without the deleted project
        const updatedProjects = projects.filter(p => p.id !== itemToDelete.projectId);
        setProjects(updatedProjects);
        
        // Create a simple array for sidebar
        const newSidebarProjects = updatedProjects.map(p => ({
          id: p.id,
          name: p.name,
          workspace_id: p.workspace_id
        }));
        
        // Update sidebar projects
        setSidebarProjects(newSidebarProjects);
      } else if (itemToDelete.type === 'task') {
        console.log('Deleting task:', itemToDelete);
        
        // First, attempt the deletion
        const { success, error } = await db.deleteTask(itemToDelete.taskId);
        
        if (success) {
          // Create a new array instead of mapping
          const updatedProjects = [...projects];
          const projectIndex = updatedProjects.findIndex(p => p.id === itemToDelete.projectId);
          
          if (projectIndex !== -1) {
            // Create a new project object with the task filtered out
            updatedProjects[projectIndex] = {
              ...updatedProjects[projectIndex],
              tasks: updatedProjects[projectIndex].tasks.filter(t => t.id !== itemToDelete.taskId)
            };
            
            // Update the projects state
            setProjects(updatedProjects);
            
            // Create a simple array for sidebar
            const newSidebarProjects = updatedProjects.map(p => ({
              id: p.id,
              name: p.name,
              workspace_id: p.workspace_id
            }));
            
            // Update sidebar projects
            setSidebarProjects(newSidebarProjects);
            
            console.log('Task deleted successfully and state updated');
          }
        } else {
          console.error('Failed to delete task:', error);
          // Show error message to user
          alert('Failed to delete task. Please try again.');
        }
      }
      
      // Close the dialog
      setItemToDelete(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error in handleDelete:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle project expansion
  const toggleProject = (projectId) => {
    setExpandedProjects({
      ...expandedProjects,
      [projectId]: !expandedProjects[projectId]
    });
  };

  // Handle drag end for project reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Update the handleDeleteTask function to handle task deletion
  const handleDeleteTask = async (projectId, taskId) => {
    try {
      const { success, error } = await db.deleteTask(taskId);
      
      if (success) {
        // Create a new array instead of mapping to avoid potential circular references
        const updatedProjects = [...projects];
        const projectIndex = updatedProjects.findIndex(p => p.id === projectId);
        
        if (projectIndex !== -1) {
          // Create a new project object with the task filtered out
          updatedProjects[projectIndex] = {
            ...updatedProjects[projectIndex],
            tasks: updatedProjects[projectIndex].tasks.filter(t => t.id !== taskId)
          };
          
          // Set projects once with the updated array
          setProjects(updatedProjects);
          
          // Create a simple array for sidebar without any references to the main projects
          const newSidebarProjects = updatedProjects.map(p => ({
            id: p.id,
            name: p.name,
            workspace_id: p.workspace_id
          }));
          
          // Set sidebar projects directly without triggering another useEffect
          setSidebarProjects(newSidebarProjects);
        }
      } else {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Update project name
  const updateProjectName = async (projectId, newName) => {
    try {
      if (!newName.trim()) return;
      
      await db.updateProject(projectId, { name: newName.trim() });
      await loadProjects();
    } catch (error) {
      console.error('Failed to update project name:', error);
      alert(error.message || 'Failed to update project name');
    }
  };

  // Fix the updateTaskOrder function
  const updateTaskOrder = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const taskIds = project.tasks.map(task => task.id);
      
      // Since db.updateTaskOrder doesn't exist, we'll use a different approach
      // Update each task with its new position
      for (let i = 0; i < taskIds.length; i++) {
        await db.updateTask(taskIds[i], { position: i });
      }
      
      console.log('Task order updated successfully');
    } catch (error) {
      console.error('Failed to update task order:', error);
    }
  };

  // Fix the Add Task button functionality to include user ID
  const handleAddTask = async (projectId) => {
    try {
      if (!session?.user?.id) {
        console.error('User ID is required to add a task');
        return;
      }
      
      const newTask = {
        title: '', // Empty title instead of 'New Task'
        description: '',
        status: 'not_started',
        priority: 'medium',
        position: projects.find(p => p.id === projectId)?.tasks.length || 0,
        userId: session.user.id, // Add the user ID
        assigned_to: [] // Leave unassigned by default
      };
      
      console.log('Creating new task with data:', { projectId, newTask });
      
      // Create the task in the database
      const taskData = await db.createTask(projectId, newTask);
      console.log('Task created successfully:', taskData);
      
      if (!taskData || !taskData.id) {
        console.error('Failed to create task: No task ID returned');
        return;
      }
      
      const taskId = taskData.id;
      
      // Update local state with the new task including the correct ID
      setProjects(prevProjects => prevProjects.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            tasks: [
              ...project.tasks,
              { 
                ...newTask,
                id: taskId,
                project_id: projectId,
                created_at: new Date().toISOString(),
                comments: []
              }
            ]
          };
        }
        return project;
      }));
      
      // Focus the new task for immediate editing
      setTimeout(() => {
        const taskElement = document.getElementById(`task-title-${taskId}`);
        if (taskElement) {
          taskElement.focus();
          // Select all text in the input field
          taskElement.select();
        } else {
          console.warn(`Could not find task input element with ID: task-title-${taskId}`);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Error creating task: ' + (error.message || 'Unknown error'));
    }
  };

  // Add a function to create tasks
  const handleTaskCreated = async (taskData) => {
    try {
      if (!currentProjectId) return;
      
      await db.createTask(currentProjectId, {
        ...taskData,
        userId: session.user.id,
        created_by: session.user.id,
        assigned_to: []
      });
      
      await loadProjects();
      setTaskDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Error: ' + (error.message || 'Failed to create task'));
    }
  };

  // Add function to handle new task input change
  const handleNewTaskInputChange = (projectId, value) => {
    setNewTaskInputs({
      ...newTaskInputs,
      [projectId]: value
    });
  };

  // Add function to create a task inline
  const createTaskInline = async (projectId) => {
    const taskTitle = newTaskInputs[projectId]?.trim();
    if (!taskTitle) return;
    
    try {
      await db.createTask(projectId, {
        title: taskTitle,
        description: '',
        status: 'not_started',
        priority: 'medium',
        due_date: null,
        userId: session.user.id,
        created_by: session.user.id,
        assigned_to: []
      });
      
      // Clear the input
      setNewTaskInputs({
        ...newTaskInputs,
        [projectId]: ''
      });
      
      await loadProjects();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Fix the task title update functionality
  const updateTaskTitle = async (taskId, newTitle) => {
    try {
      // Find the task in the projects
      let taskFound = false;
      let projectId = null;
      let updatedProjects = [...projects];
      
      for (let i = 0; i < updatedProjects.length; i++) {
        const project = updatedProjects[i];
        const taskIndex = project.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
          // Update the task title locally
          updatedProjects[i] = {
            ...project,
            tasks: [
              ...project.tasks.slice(0, taskIndex),
              {
                ...project.tasks[taskIndex],
                title: newTitle
              },
              ...project.tasks.slice(taskIndex + 1)
            ]
          };
          taskFound = true;
          projectId = project.id;
          break;
        }
      }
      
      if (taskFound) {
        // Update local state immediately
        setProjects(updatedProjects);
        
        // Save to database
        await db.updateTask(taskId, { title: newTitle });
      } else {
        console.error('Task not found for title update:', taskId);
      }
    } catch (error) {
      console.error('Failed to update task title:', error);
      // Reload projects to ensure UI is in sync with database
      loadProjects();
    }
  };

  // Add these helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'blocked':
        return 'bg-red-500';
      case 'in_review':
        return 'bg-yellow-500';
      case 'not_started':
      default:
        return 'bg-gray-400';
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { ...t, status };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const assignTaskToCurrentUser = async (taskId) => {
    if (!session?.user) return;
    
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { 
                ...t, 
                assigned_to: [{ 
                  id: session.user.id,
                  name: session.user.name,
                  email: session.user.email,
                  image: session.user.image
                }] 
              };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { 
        assigned_to: [session.user.id]
      });
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  // Fix the loadUsers function to avoid errors and persist users across sessions
  const loadUsers = async () => {
    try {
      let cachedUsers = [];
      
      // Try to load users from localStorage first
      try {
        const storedUsers = localStorage.getItem('appUsers');
        if (storedUsers) {
          cachedUsers = JSON.parse(storedUsers);
          
          // Use cached users immediately to populate state
          if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
            setAllUsers(cachedUsers);
          }
        }
      } catch (e) {
        console.warn('Could not load cached users:', e);
      }
      
      // Use session user and add to cache
      if (session?.user) {
        const currentUser = {
          id: session.user.id,
          name: session.user.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          image: session.user.image
        };
        
        // Add current user to the allUsers list if not already present
        setAllUsers(prevUsers => {
          const exists = prevUsers.some(u => u.id === currentUser.id);
          if (!exists) {
            // Add to localStorage cache too
            const updatedUsers = [...prevUsers, currentUser];
            try {
              localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
            } catch (e) {
              console.warn('Could not cache users:', e);
            }
            return updatedUsers;
          }
          return prevUsers;
        });
      }
      
      // Try to get workspace members if that function exists
      if (workspace?.id) {
        try {
          if (typeof db.getWorkspaceMembers === 'function') {
            const workspaceUsers = await db.getWorkspaceMembers(workspace.id);
            if (Array.isArray(workspaceUsers) && workspaceUsers.length > 0) {
              // Merge with any existing users to maintain complete data
              setAllUsers(prevUsers => {
                const mergedUsers = [...prevUsers];
                
                // Add any new users from workspace
                workspaceUsers.forEach(newUser => {
                  const existingIndex = mergedUsers.findIndex(u => u.id === newUser.id);
                  if (existingIndex === -1) {
                    mergedUsers.push(newUser);
                  } else {
                    // Update existing user with any new data
                    mergedUsers[existingIndex] = {
                      ...mergedUsers[existingIndex],
                      ...newUser
                    };
                  }
                });
                
                // Cache the merged users list
                try {
                  localStorage.setItem('appUsers', JSON.stringify(mergedUsers));
                } catch (e) {
                  console.warn('Could not cache users:', e);
                }
                
                return mergedUsers;
              });
            }
          }
        } catch (userError) {
          console.error('Could not load workspace members:', userError);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Fix the renderTaskOwners function to properly show "Unassigned" text and prevent duplicate avatars
  const renderTaskOwners = (task) => {
    // Check if task.assigned_to exists, is an array, and has items
    if (!task.assigned_to || !Array.isArray(task.assigned_to) || task.assigned_to.length === 0) {
      return <span className="text-sm text-gray-500">Unassigned</span>;
    }
    
    // Remove any duplicate users by ID
    const uniqueOwners = [];
    const seenIds = new Set();
    
    for (const owner of task.assigned_to) {
      if (owner && owner.id && !seenIds.has(owner.id)) {
        seenIds.add(owner.id);
        uniqueOwners.push(owner);
      }
    }
    
    // If after removing duplicates we have no owners, show unassigned
    if (uniqueOwners.length === 0) {
      return <span className="text-sm text-gray-500">Unassigned</span>;
    }
    
    // Show up to 3 unique owners
    const displayedOwners = uniqueOwners.slice(0, 3);

    return (
      <div className="flex -space-x-2">
        {displayedOwners.map((owner, index) => (
          <div 
            key={owner.id || index} 
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-gray-800 ${getUserColor(owner.id)}`}
            style={{ zIndex: 10 - index }}
          >
            {getUserInitials(owner.name)}
          </div>
        ))}
        {uniqueOwners.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-gray-800" style={{ zIndex: 7 }}>
            +{uniqueOwners.length - 3}
          </div>
        )}
      </div>
    );
  };

  // Update the task owner dropdown to use the app's UI design
  const assignTaskToUser = async (taskId, user) => {
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { 
                ...t, 
                assigned_to: [user]
              };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { 
        assigned_to: [user.id]
      });
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const unassignTask = async (taskId) => {
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { 
                ...t, 
                assigned_to: []
              };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { 
        assigned_to: []
      });
    } catch (error) {
      console.error('Failed to unassign task:', error);
    }
  };

  const updateTaskDueDate = async (taskId, dueDate) => {
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { ...t, due_date: dueDate };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { due_date: dueDate });
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  const updateTaskHours = async (taskId, field, hours) => {
    try {
      // Update locally for immediate feedback
      const updatedProjects = projects.map(p => {
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id === taskId) {
              return { ...t, [field]: hours };
            }
            return t;
          })
        };
      });
      setProjects(updatedProjects);
      
      // Update in database
      await db.updateTask(taskId, { [field]: hours });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    }
  };

  // Fix the getUserInitials function to properly display initials
  const getUserInitials = (name) => {
    if (!name) return 'U';
    
    // Split the name and get the first letter of each part
    const parts = name.split(' ').filter(part => part.length > 0);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    // Get first letter of first and last name
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Update the toggleUserAssignment function to save task owners
  const toggleUserAssignment = async (taskId, userId, isCurrentlyAssigned) => {
    try {
      // Find the task
      let taskData = null;
      let projectId = null;
      
      for (const project of projects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
          taskData = task;
          projectId = project.id;
          break;
        }
      }
      
      if (!taskData) {
        console.error('Task not found');
        return;
      }
      
      // Ensure assigned_to is an array
      let newAssigned = Array.isArray(taskData.assigned_to) ? [...taskData.assigned_to] : [];
      
      // Filter out any undefined or null values
      newAssigned = newAssigned.filter(u => u && u.id);
      
      if (isCurrentlyAssigned) {
        // Remove user
        newAssigned = newAssigned.filter(u => String(u.id) !== String(userId));
      } else {
        // Add user (limit to 3 max)
        const userToAdd = allUsers.find(u => String(u.id) === String(userId));
        
        if (userToAdd && !newAssigned.some(u => String(u.id) === String(userId))) {
          if (newAssigned.length >= 3) {
            // Remove the oldest assignment to make room
            newAssigned.shift();
          }
          
          // Ensure we store the complete user object with name and email
          const completeUserObject = {
            id: userToAdd.id,
            name: userToAdd.name || userToAdd.email?.split('@')[0] || 'User',
            email: userToAdd.email,
            image: userToAdd.image
          };
          
          newAssigned.push(completeUserObject);
        }
      }
      
      // Update local state
      const updatedProjects = projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id === taskId) {
                return { ...t, assigned_to: newAssigned };
              }
              return t;
            })
          };
        }
        return p;
      });
      setProjects(updatedProjects);
      
      // Update in database - store just the user IDs, filtering out any undefined
      const assignedIds = newAssigned
        .filter(u => u && u.id) // Filter out undefined/null
        .map(u => String(u.id));
        
      await db.updateTask(taskId, { 
        assigned_to: assignedIds,
        userId: session?.user?.id // Ensure user ID is included
      });
      
      // Also update localStorage cache with the complete user objects
      try {
        const storedUsers = localStorage.getItem('appUsers');
        let cachedUsers = storedUsers ? JSON.parse(storedUsers) : [];
        
        // Add any new users to the cache
        newAssigned.forEach(user => {
          if (!cachedUsers.some(u => u.id === user.id)) {
            cachedUsers.push(user);
          }
        });
        
        localStorage.setItem('appUsers', JSON.stringify(cachedUsers));
      } catch (e) {
        console.warn('Could not update user cache:', e);
      }
    } catch (error) {
      console.error('Error assigning user to task:', error);
    }
  };

  const toggleStatusDropdown = (taskId) => {
    setOpenStatusDropdowns(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleOwnerDropdown = (taskId) => {
    setOpenOwnerDropdowns(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Filter users based on search query
  const getFilteredUsers = (users, query) => {
    if (!query) return users.slice(0, 4); // Show only first 4 users when no search
    
    return users.filter(user => 
      (user.name && user.name.toLowerCase().includes(query.toLowerCase())) || 
      (user.email && user.email.toLowerCase().includes(query.toLowerCase()))
    );
  };

  // Add task reordering functionality
  const handleTaskDragEnd = (event, projectId) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setProjects((projects) => {
        return projects.map(project => {
          if (project.id === projectId) {
            const oldIndex = project.tasks.findIndex(task => task.id === active.id);
            const newIndex = project.tasks.findIndex(task => task.id === over.id);
            
            return {
              ...project,
              tasks: arrayMove(project.tasks, oldIndex, newIndex)
            };
          }
          return project;
        });
      });
      
      // Update task order in database
      updateTaskOrder(projectId);
    }
  };

  // Fix the task owner display component
  const TaskOwnerDisplay = ({ task }) => {
    if (!task.assigned_to || task.assigned_to.length === 0) {
      return (
        <div className="flex items-center">
          <span className="text-gray-500 dark:text-gray-400">Unassigned</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {task.assigned_to.map((user, index) => (
          <div 
            key={index} 
            className="flex items-center"
            title={user.name || user.email || 'User'}
          >
            <UserAvatar key={user.id} user={user} size="sm" />
          </div>
        ))}
      </div>
    );
  };

  // Fix the CircularProgress component
  const CircularProgress = ({ value, size = 16 }) => {
    // Calculate percentage (handle division by zero)
    const percentage = value.actual && value.estimated 
      ? Math.min(100, Math.round((value.actual / value.estimated) * 100)) 
      : 0;
    
    // Determine color based on percentage - updated color scheme
    let color = '#10B981'; // Green for < 50%
    
    // Update color based on the requested thresholds
    if (percentage > 85) {
      color = '#EF4444'; // Red when above 85%
    } else if (percentage >= 50) {
      color = '#F59E0B'; // Yellow/Amber when between 50-85%
    }
    
    // Calculate circle properties
    const radius = size / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="flex items-center justify-center ml-1" style={{ width: size, height: size, minWidth: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="2"
          />
          {/* Progress circle */}
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  // Update the addComment function to handle editing and save to database
  const addComment = async (taskId, comment, commentId = null) => {
    if (!comment.trim() || !session?.user?.id) return;
    
    try {
      // If editing an existing comment
      if (commentId) {
        // Update comment in the database
        const updatedComment = await db.updateComment(commentId, {
          content: comment.trim()
        });
        
        console.log('Comment updated in database:', updatedComment);
        
        // Update local state
        setTaskComments(prev => {
          const taskCommentList = prev[taskId] || [];
          return {
            ...prev,
            [taskId]: taskCommentList.map(c => 
              c.id === commentId ? { 
                ...c, 
                text: comment.trim(), 
                edited: true,
                timestamp: new Date().toISOString() // Update timestamp to show it was recently edited
              } : c
            )
          };
        });
        
        // Reset editing state
        setEditingComment(null);
      } else {
        // Adding a new comment - save to database
        const newComment = await db.addTaskComment(taskId, {
          content: comment.trim(),
          user_id: session.user.id
        });
        
        console.log('Comment added to database:', newComment);
        
        // Update local state with the comment from the database
        setTaskComments(prev => {
          const taskCommentList = prev[taskId] || [];
          return {
            ...prev,
            [taskId]: [
              {
                id: newComment.id,
                text: newComment.content,
                author: session?.user?.name || 'Anonymous',
                timestamp: newComment.created_at,
                user_id: session.user.id
              },
              ...taskCommentList // Add new comment at the beginning
            ]
          };
        });
      }
    } catch (error) {
      console.error('Failed to save comment:', error);
      // Still update the UI optimistically
      setTaskComments(prev => {
        const taskCommentList = prev[taskId] || [];
        
        // If editing an existing comment
        if (commentId) {
          return {
            ...prev,
            [taskId]: taskCommentList.map(c => 
              c.id === commentId ? { ...c, text: comment.trim(), edited: true } : c
            )
          };
        }
        
        // Adding a new comment
        return {
          ...prev,
          [taskId]: [
            {
              id: Date.now(),
              text: comment.trim(),
              author: session?.user?.name || 'Anonymous',
              timestamp: new Date().toISOString(),
              user_id: session.user.id
            },
            ...taskCommentList // Add new comment at the beginning
          ]
        };
      });
      
      // Reset editing state
      setEditingComment(null);
    }
  };

  // Function to delete a comment
  const deleteComment = async (taskId, commentId) => {
    try {
      // Delete from database
      await db.deleteComment(commentId);
      
      // Update local state
      setTaskComments(prev => {
        const taskCommentList = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: taskCommentList.filter(c => c.id !== commentId)
        };
      });
      
      setCommentToDelete(null);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      
      // Still update UI optimistically
      setTaskComments(prev => {
        const taskCommentList = prev[taskId] || [];
        return {
          ...prev,
          [taskId]: taskCommentList.filter(c => c.id !== commentId)
        };
      });
      
      setCommentToDelete(null);
    }
  };

  // Function to handle comment deletion with confirmation
  const handleDeleteComment = (taskId, commentId) => {
    setCommentToDelete({ taskId, commentId });
  };

  // Function to confirm and execute comment deletion
  const confirmDeleteComment = () => {
    if (commentToDelete) {
      deleteComment(commentToDelete.taskId, commentToDelete.commentId);
      setCommentToDelete(null);
    }
  };

  // Fix the createProjectFromDialog function to use the correct approach
  const createProjectFromDialog = async (workspaceId) => {
    try {
      if (!effectiveNewProjectName.trim()) return;
      
      // Create a project object with current values
      const projectToCreate = {
        ...newProject,
        name: effectiveNewProjectName.trim(),
        workspace_id: workspace?.id || '',
        user_id: session?.user?.id
      };
      
      console.log("Creating project with:", projectToCreate);
      
      // Call createProject with the project object directly
      const projectId = await db.createProject(projectToCreate);
      console.log("Project created with ID:", projectId);
      
      // Clear the form and close the dialog
      effectiveSetNewProjectName('');
      setNewProject({ name: '', workspace_id: workspace?.id || '' });
      effectiveSetProjectDialogOpen(false); // Fixed variable name here
      
      // Reload projects
      await loadProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      alert(`Failed to create project: ${error.message}`);
    }
  };

  // Improved error handling for Supabase operations
  const handleSupabaseError = (error, operation) => {
    console.error(`Supabase error during ${operation}:`, error);
    
    // Set a more specific error message in the component state
    let errorMessage = `Error during ${operation}. Please try again later.`;
    
    // Check if it's a connection error
    if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please check your connection and try again.';
      setError(errorMessage);
      return;
    }
    
    // Check for authentication errors
    if (error.status === 401 || error.code === 'PGRST301') {
      errorMessage = 'Your session has expired. Please log in again.';
      setError(errorMessage);
      onLogout(); // Log the user out if their session is invalid
      return;
    }
    
    // Check for foreign key constraint errors
    if (error.message?.includes('foreign key constraint') || error.code === 'PGRST116') {
      errorMessage = 'Database relationship error. This might be due to missing or invalid data.';
      setError(errorMessage);
      return;
    }
    
    // Check for permission errors
    if (error.status === 403 || error.code === 'PGRST109') {
      errorMessage = 'You do not have permission to perform this action.';
      setError(errorMessage);
      return;
    }
    
    // Generic error message
    setError(errorMessage);
  };

  // Find the function that generates avatar colors based on user name
  // This should be consistent across the application
  const generateAvatarColor = (name) => {
    // Common function to generate consistent colors for the same user
    if (!name) return 'bg-gray-200';
    
    // Generate a hash code from the name
    const hashCode = name.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    
    // Convert to a color - using a predefined set of colors for consistency
    const colors = [
      'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 
      'bg-cyan-500', 'bg-teal-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-orange-500', 'bg-red-500'
    ];
    
    return colors[Math.abs(hashCode) % colors.length];
  };

  // Fix the UserAvatar component to properly display user initials
  const UserAvatar = ({ user, size = 'md' }) => {
    // If no user provided, show generic avatar
    if (!user) {
      return (
        <div className={`w-${size === 'sm' ? '6' : '8'} h-${size === 'sm' ? '6' : '8'} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-${size === 'sm' ? 'xs' : 'sm'}`}>
          <User className="w-3 h-3" />
        </div>
      );
    }
    
    // Extract user id even if it's a string or object
    const userId = typeof user === 'object' ? user.id : String(user);
    
    // Get user name or email or use id to create consistent display
    let displayName = '';
    let initials = '';
    
    if (typeof user === 'object') {
      // For object users, use name or email
      displayName = user.name || user.email || '';
      
      // If we have a valid displayName, get initials
      if (displayName) {
        // Split the name and get the first letter of each part
        const parts = displayName.split(' ').filter(part => part.length > 0);
        if (parts.length === 1) {
          initials = parts[0].charAt(0).toUpperCase();
        } else if (parts.length > 1) {
          // Get first letter of first and last name
          initials = (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
      } else {
        // Generate consistent initials from user ID
        initials = String(userId).substring(0, 1).toUpperCase();
      }
    } else {
      // For primitive user values (just ID strings), create consistent initials
      initials = String(user).substring(0, 1).toUpperCase();
      displayName = `User ${initials}`;
    }
    
    // Fallback if initials are still empty or invalid
    if (!initials) {
      // Try to get first letter of any provided fields
      if (typeof user === 'object') {
        if (user.email && user.email.includes('@')) {
          initials = user.email.charAt(0).toUpperCase();
        } else {
          // Find any string property to use for initials
          for (const key in user) {
            if (typeof user[key] === 'string' && user[key].length > 0) {
              initials = user[key].charAt(0).toUpperCase();
              break;
            }
          }
        }
      }
      
      // Final fallback - use first character of the ID
      if (!initials) {
        initials = String(userId).substring(0, 1).toUpperCase();
      }
    }
    
    // Directly use a vibrant color based on user ID
    const colors = [
      '#FF5733', // Bright Red
      '#33FF57', // Bright Green
      '#3357FF', // Bright Blue
      '#FF33F5', // Bright Pink
      '#F5FF33', // Bright Yellow
      '#33FFF5', // Bright Cyan
      '#FF8333', // Bright Orange
      '#8333FF', // Bright Purple
      '#33FF83', // Bright Mint
      '#FF3383', // Bright Rose
    ];
    
    // Generate a consistent index based on the userId to ensure same color across sessions
    let hash = 0;
    const hashInput = String(userId); // Ensure string for charCodeAt
    for (let i = 0; i < hashInput.length; i++) {
      hash = hashInput.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const bgColor = colors[colorIndex];
    
    return (
      <div 
        className={`w-${size === 'sm' ? '6' : '8'} h-${size === 'sm' ? '6' : '8'} rounded-full flex items-center justify-center text-white text-${size === 'sm' ? 'xs' : 'sm'} font-medium`}
        style={{ backgroundColor: bgColor }}
        title={displayName || String(userId)}
      >
        {initials}
      </div>
    );
  };

  // Merge the two handleTaskClick functions into one
  const handleTaskClick = async (task) => {
    try {
      console.log('Loading task details for:', task.id);
      
      // Get task details including comments from the database
      const taskDetails = await db.getTaskDetails(task.id);
      console.log('Task details loaded:', taskDetails);
      
      // Set the selected task with the details from the database
      setSelectedTask(taskDetails);
      setTaskDialogOpen(true);
      
      // Make sure assigned_to is properly processed
      if (task.assigned_to) {
        let assignedUsers = [];
        
        // Handle different formats of assigned_to
        if (typeof task.assigned_to === 'string') {
          try {
            // If it's a JSON string, parse it
            const parsed = JSON.parse(task.assigned_to);
            if (Array.isArray(parsed)) {
              // Map user IDs to user objects
              assignedUsers = parsed.map(userId => {
                return allUsers.find(u => String(u.id) === String(userId)) || null;
              }).filter(Boolean);
            }
          } catch (e) {
            console.error('Error parsing assigned_to:', e);
          }
        } else if (Array.isArray(task.assigned_to)) {
          // If it's already an array, use it directly if it contains user objects
          if (task.assigned_to.length > 0 && typeof task.assigned_to[0] === 'object') {
            assignedUsers = task.assigned_to;
          } else {
            // Otherwise, map IDs to user objects
            assignedUsers = task.assigned_to.map(userId => {
              return allUsers.find(u => String(u.id) === String(userId)) || null;
            }).filter(Boolean);
          }
        }
        
        // Update the task with processed assigned_to
        setSelectedTask(prev => ({
          ...prev,
          assigned_to: assignedUsers
        }));
      }
    } catch (error) {
      console.error('Failed to load task details:', error);
    }
  };

  const handleAddComment = async (taskId, commentText) => {
    if (!commentText.trim() || !session?.user?.id) return;
    
    try {
      console.log('Adding comment:', { taskId, commentText, userId: session.user.id });
      
      // Save comment to database
      const newComment = await db.addTaskComment(taskId, {
        content: commentText.trim(),
        user_id: session.user.id
      });
      
      console.log('Comment added successfully:', newComment);
      
      // Update local state
      setTaskComments(prev => {
        const updatedComments = [...(prev[taskId] || []), newComment];
        return { ...prev, [taskId]: updatedComments };
      });
      
      // Clear comment input
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment: ' + error.message);
    }
  };

  // Pass sidebarProjects to the parent LayoutWrapper component
  useEffect(() => {
    if (sidebarProjects.length > 0) {
      console.log('Updating sidebar projects:', sidebarProjects);
      
      // Find the sidebar element and update its projects
      const sidebarElement = document.querySelector('aside');
      if (sidebarElement) {
        // Dispatch a custom event that LayoutWrapper can listen for
        const event = new CustomEvent('sidebarProjectsUpdated', {
          detail: { projects: sidebarProjects }
        });
        window.dispatchEvent(event);
      }
    }
  }, [sidebarProjects]);

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
                <button onClick={onBackToWorkspaces} className="hover:text-blue-600 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span>Workspaces</span>
                </button>
              </li>
              <li className="text-gray-500 flex items-center text-sm">
                <ChevronRight className="h-4 w-4 mx-1" />
                <Folder className="h-4 w-4 mr-1" />
                <span className="text-blue-600">{workspace?.name || 'Workspace'}</span>
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
                  placeholder="Search projects and tasks..."
                  className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
              
            <Button 
                onClick={() => effectiveSetProjectDialogOpen(true)}
                className="button-primary"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Project
        </Button>
      </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-200">
                  No Projects Created
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a project to start managing your tasks
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Projects list */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projects.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
      <div className="space-y-4">
                    {filteredProjects.map(project => (
                      <SortableProject key={project.id} project={project}>
                        {({ dragHandleProps }) => (
                          <Card
                            id={`project-${project.id}`}
                            className="mb-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 project-card shadow-none"
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleProject(project.id)}
                                    className="p-0 h-6 w-6 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                  >
                                    {expandedProjects[project.id] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                </button>
                                  <Input
                                    value={project.name}
                                    onChange={(e) => {
                                      // Update locally for immediate feedback
                                      const updatedProjects = projects.map(p => {
                                        if (p.id === project.id) {
                                          return { ...p, name: e.target.value };
                                        }
                                        return p;
                                      });
                                      setProjects(updatedProjects);
                                    }}
                                    onBlur={(e) => updateProjectName(project.id, e.target.value)}
                                    className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 font-medium text-base px-1 py-0.5 h-6 shadow-none focus:ring-0 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded"
                                    placeholder="Project name"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 px-2 h-7"
                                    onClick={() => handleAddTask(project.id)}
                  >
                                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                                    onClick={() => setItemToDelete({ type: 'project', projectId: project.id })}
                                    className="w-8 h-8 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {expandedProjects[project.id] && (
                                <div className="mt-3">
                                  {/* Task header row */}
                                  <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-500 dark:text-gray-400 px-4">
                                    <div className="col-span-4">Task</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2">Owner</div>
                                    <div className="col-span-1">Due Date</div>
                                    <div className="col-span-1">Comments</div>
                                    <div className="col-span-1">Hours</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                  </div>
                                  
                                  {/* Tasks */}
                                  <div className="bg-white dark:bg-gray-800">
                                    {project.tasks && project.tasks.length > 0 ? (
                                      <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event) => handleTaskDragEnd(event, project.id)}
                                      >
                                        <SortableContext 
                                          items={project.tasks.map(task => task.id)}
                                          strategy={verticalListSortingStrategy}
                                        >
                                          {project.tasks.map((task, index) => (
                                            <SortableTask key={task.id} task={task}>
                                              {({ dragHandleProps }) => (
                                                <div 
                                                  className="grid grid-cols-12 gap-4 items-center py-2 px-4 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                >
                                                  {/* Task name */}
                                                  <div className="col-span-4 flex items-center gap-2">
                                                    <div {...dragHandleProps} className="cursor-grab">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`}></div>
                      <Input
                                                      id={`task-title-${task.id}`}
                                                      value={task.title}
                                                      onChange={(e) => {
                                                        // Update locally for immediate feedback
                                                        const updatedProjects = projects.map(p => {
                                                          if (p.id === project.id) {
                                                            return {
                                                              ...p,
                                                              tasks: p.tasks.map(t => {
                                                                if (t.id === task.id) {
                                                                  return { ...t, title: e.target.value };
                                                                }
                                                                return t;
                                                              })
                                                            };
                                                          }
                                                          return p;
                                                        });
                                                        setProjects(updatedProjects);
                                                        
                                                        // Save to database after a short delay (debounce)
                                                        if (updateTaskTitleTimeout.current) {
                                                          clearTimeout(updateTaskTitleTimeout.current);
                                                        }
                                                        updateTaskTitleTimeout.current = setTimeout(() => {
                                                          updateTaskTitle(task.id, e.target.value);
                                                        }, 500);
                                                      }}
                                                      onBlur={(e) => updateTaskTitle(task.id, e.target.value)}
                                                      className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 font-medium p-0 h-7 pl-2 shadow-none"
                                                      placeholder="Enter task title"
                                                    />
                                                  </div>
                                                  
                                                  {/* Status - back to original width */}
                                                  <div className="col-span-2">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          className="w-full justify-between pl-7 pr-2 py-1 h-8 text-sm font-normal shadow-none border border-gray-200 dark:border-gray-700 relative"
                                                        >
                                                          <div className="flex items-center w-full">
                                                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                              <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                                                            </div>
                                                            <span className="ml-4 truncate">
                                                              {task.status === 'not_started' ? 'Not Started' : 
                                                               task.status === 'in_progress' ? 'In Progress' : 
                                                               task.status === 'blocked' ? 'Blocked' : 
                                                               task.status === 'in_review' ? 'In Review' : 
                                                               task.status === 'completed' ? 'Completed' : 'Not Started'}
                                                            </span>
                                                          </div>
                                                          <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent className="w-48 p-0">
                                                        {[
                                                          { id: 'not_started', label: 'Not Started' },
                                                          { id: 'in_progress', label: 'In Progress' },
                                                          { id: 'blocked', label: 'Blocked' },
                                                          { id: 'in_review', label: 'In Review' },
                                                          { id: 'completed', label: 'Completed' }
                                                        ].map(status => (
                                                          <DropdownMenuItem 
                                                            key={status.id}
                                                            className="flex items-center gap-2 px-3 py-1.5"
                                                            onClick={() => updateTaskStatus(task.id, status.id)}
                                                          >
                                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(status.id)}`}></div>
                                                            <span>{status.label}</span>
                                                          </DropdownMenuItem>
                                                        ))}
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </div>
                                                  
                                                  {/* Owner - back to original width */}
                                                  <div className="col-span-2">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          className="w-full h-8 flex justify-between items-center px-2 shadow-none border border-gray-200 dark:border-gray-700"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            {task.assigned_to && task.assigned_to.length > 0 ? (
                                                              <div className="flex items-center gap-1">
                                                                {task.assigned_to.map(user => (
                                                                  <UserAvatar key={user.id} user={user} size="sm" />
                                                                ))}
                                                              </div>
                                                            ) : (
                                                              <span className="text-gray-400">Unassigned</span>
                                                            )}
                                                          </div>
                                                          <ChevronDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent className="w-56 p-0">
                                                        <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                                          Assign up to 3 people
                                                        </div>
                                                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                                          <Input
                                                            placeholder="Search users..."
                                                            value={userSearchQuery}
                                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                                            className="h-8 text-sm"
                                                          />
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                          {getFilteredUsers(allUsers, userSearchQuery).map((user, index) => {
                                                            const isAssigned = task.assigned_to?.some(u => u.id === user.id);
                                                            return (
                                                              <div
                                                                key={user.id || `user-${index}`}
                                                                className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                                onClick={() => toggleUserAssignment(task.id, user.id, isAssigned)}
                                                              >
                                                                <Checkbox
                                                                  id={`user-${user.id || index}-task-${task.id}`}
                                                                  checked={isAssigned}
                                                                  onCheckedChange={() => toggleUserAssignment(task.id, user.id, isAssigned)}
                                                                  className="mr-2"
                                                                />
                                                                <div className="flex items-center gap-2 flex-1">
                                                                  <UserAvatar user={user} size="sm" />
                                                                  <span className="text-sm">{user.name || user.email}</span>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                          {getFilteredUsers(allUsers, userSearchQuery).length === 0 && (
                                                            <div className="px-3 py-2 text-sm text-gray-500">
                                                              No users found
                                                            </div>
                                                          )}
                                                        </div>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </div>
                                                  
                                                  {/* Due Date - narrower width */}
                                                  <div className="col-span-1.5">
                                                    <input
                                                      type="date"
                                                      value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                                                      onChange={(e) => updateTaskDueDate(task.id, e.target.value ? new Date(e.target.value) : null)}
                                                      className="w-full bg-transparent border border-gray-200 dark:border-gray-700 rounded-md text-sm p-1 shadow-none"
                                                    />
                                                  </div>
                                                  
                                                  {/* Comments - reduced width */}
                                                  <div className="col-span-1 flex justify-center items-center">
                                                    <CommentPopover
                                                      trigger={
                                                        <Button variant="ghost" size="sm" className="relative p-1 h-8 w-8">
                                                          <MessageCircle className="h-4 w-4 text-gray-500" />
                                                          {(taskComments[task.id]?.length > 0) && (
                                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                                              {taskComments[task.id]?.length}
                                                            </span>
                                                          )}
                                                        </Button>
                                                      }
                                                    >
                                                      <div className="max-h-[calc(4*4.5rem)] overflow-y-auto p-2">
                                                        {taskComments[task.id]?.length > 0 ? (
                                                          taskComments[task.id].map(comment => (
                                                            <div key={comment.id} className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0" style={{minHeight: '2rem', maxHeight: '4.5rem'}}>
                                                              <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-medium">{comment.author}</span>
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                    {new Date(comment.timestamp).toLocaleString(undefined, {
                                                                      month: 'numeric',
                                                                      day: 'numeric',
                                                                      hour: 'numeric',
                                                                      minute: 'numeric'
                                                                    })}
                                                                    {comment.edited && <span className="ml-1 italic">(edited)</span>}
                                                                  </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                                                                    className="h-6 w-6 p-0 flex-shrink-0" 
                                                                    onClick={() => setEditingComment(comment.id)}
                                                                  >
                                                                    <PencilIcon className="h-3 w-3 text-gray-500" />
                                                                  </Button>
                                                                  <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-6 w-6 p-0 flex-shrink-0 text-red-600" 
                                                                    onClick={() => handleDeleteComment(task.id, comment.id)}
                                                                  >
                                                                    <Trash2 className="h-3 w-3" />
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                              
                                                              {editingComment === comment.id ? (
                                                                <form 
                                                                  onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    addComment(task.id, e.target.comment.value, comment.id);
                                                                  }}
                                                                  className="flex gap-1 mt-1"
                                                                >
                                                                  <Input 
                                                                    name="comment" 
                                                                    defaultValue={comment.text}
                                                                    className="text-xs py-1" 
                                                                    autoFocus
                                                                  />
                                                                  <Button type="submit" size="sm" className="h-7 text-xs flex-shrink-0">Save</Button>
                                                                </form>
                                                              ) : (
                                                                <p className="text-sm break-words overflow-y-auto" style={{maxHeight: '2.5rem'}}>{comment.text}</p>
                                                              )}
                                                            </div>
                                                          ))
                                                        ) : (
                                                          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                                            No comments yet. Click "Add Comment" to create one.
                                                          </div>
                                                        )}
                                                      </div>
                                                      
                                                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                                        <form 
                                                          onSubmit={(e) => {
                                                            e.preventDefault();
                                                            addComment(task.id, e.target.comment.value);
                                                            e.target.reset();
                                                          }}
                                                          className="flex gap-1"
                                                        >
                                                          <Input 
                                                            name="comment" 
                                                            placeholder="Add a comment..." 
                                                            className="text-xs py-1" 
                                                          />
                                                          <Button type="submit" size="sm" className="h-7 text-xs">Add</Button>
                                                        </form>
                                                      </div>
                                                    </CommentPopover>
                                                  </div>
                                                  
                                                  {/* Hours - reduced width */}
                                                  <div className="col-span-1 flex items-center justify-center gap-1">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*\.?[0-9]*"
                                                      value={task.actual_hours || 0}
                                                      onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Only allow numbers and decimal points
                                                        if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                                                          updateTaskHours(task.id, 'actual_hours', parseFloat(value) || 0);
                                                        }
                                                      }}
                                                      className="w-10 bg-transparent border border-gray-200 dark:border-gray-700 rounded-md text-sm p-1 text-center shadow-none"
                                                    />
                                                    <span className="text-gray-500">/</span>
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*\.?[0-9]*"
                                                      value={task.estimated_hours || 0}
                                                      onChange={(e) => {
                                                        const value = e.target.value;
                                                        // Only allow numbers and decimal points
                                                        if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                                                          updateTaskHours(task.id, 'estimated_hours', parseFloat(value) || 0);
                                                        }
                                                      }}
                                                      className="w-10 bg-transparent border border-gray-200 dark:border-gray-700 rounded-md text-sm p-1 text-center shadow-none"
                                                    />
                                                    <CircularProgress 
                                                      value={{
                                                        actual: task.actual_hours || 0,
                                                        estimated: task.estimated_hours || 0.01
                                                      }}
                                                      size={16}
                                                    />
                                                  </div>
                                                  
                                                  {/* Actions */}
                                                  <div className="col-span-1 flex justify-end gap-1">
                                                    <Button 
                                                      variant="ghost" 
                                                      size="sm"
                                                      onClick={() => setItemToDelete({ type: 'task', projectId: project.id, taskId: task.id })}
                                                      className="w-7 h-7 p-0 text-red-600"
                                                    >
                                                      <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </SortableTask>
                                          ))}
                                        </SortableContext>
                                      </DndContext>
                                    ) : (
                                      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                        No tasks yet. Click "Add Task" to create one.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </SortableProject>
        ))}
      </div>
                </SortableContext>
              </DndContext>
    </div>
          )}
          </div>
        </div>
      </div>

        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent className="AlertDialogContent shadow-none border border-gray-200 dark:border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
                Delete Project?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-600 hover:text-white transition-colors dark:bg-transparent">
                Not Now
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors dark:bg-transparent"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {commentToDelete && (
          <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this comment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCommentToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteComment} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Add the project dialog component to the main page (similar to sidebar) */}
        <Dialog 
          open={effectiveProjectDialogOpen} 
          onOpenChange={effectiveSetProjectDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Project name"
                value={effectiveNewProjectName}
                onChange={(e) => effectiveSetNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createProjectFromDialog(workspace);
                  }
                }}
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => effectiveSetProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createProjectFromDialog(workspace)} 
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

export default ProjectManagementApp;