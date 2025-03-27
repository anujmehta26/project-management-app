'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  MoreHorizontal,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Clock,
  User,
  Search,
  Home,
  Briefcase,
  Folder,
  Users,
  UserPlus,
  Calendar,
  List,
  Kanban,
  MessageCircle,
  CheckSquare,
  Shield,
  Edit,
  LogOut,
  Info,
  PencilIcon,
  GripVertical,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
// Fix the CircularProgress component
const CircularProgress = ({ value, size = 16 }) => {
  const { actual, estimated } = value;
  const percentage = estimated > 0 ? Math.min(actual / estimated, 1) * 100 : 0;
  
  // Calculate stroke properties
  const radius = size / 2 - 2; // Adjusted for stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on percentage
  let color = '#4CAF50'; // Green for good progress
  if (percentage > 100) {
    color = '#F44336'; // Red for over-budget
  } else if (percentage > 75) {
    color = '#FFC107'; // Yellow/amber for warning
  }
  
  return (
    <div className="ml-1 flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e6e6e6"
          strokeWidth="2"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showShareBanner, setShowShareBanner] = useState(true);
  const updateTaskTitleTimeout = useRef(null);
  const [openStatusDropdowns, setOpenStatusDropdowns] = useState({});
  const [openOwnerDropdowns, setOpenOwnerDropdowns] = useState({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

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

  // Check if current user is a workspace owner
  useEffect(() => {
    if (session?.user && workspace?.id) {
      const checkOwnership = async () => {
        try {
          const isUserOwner = await db.isWorkspaceOwner(workspace.id, session.user.id);
          setIsOwner(isUserOwner);
        } catch (error) {
          console.error("Error checking workspace ownership:", error);
          // Fallback to simple ID check
          setIsOwner(session.user.id === workspace.user_id);
        }
      };
      
      checkOwnership();
      loadWorkspaceMembers();
    }
  }, [session, workspace]);

  useEffect(() => {
    loadUsers();
  }, []);

  // Toggle the share dialog
  const toggleShareDialog = () => {
    setShareDialogOpen(prev => !prev);
  };

  // Load workspace members function
  const loadWorkspaceMembers = async () => {
    if (!session?.user || !workspace?.id) return;
    
    try {
      console.log('Loading workspace members for workspace ID:', workspace.id);
      
      const members = await db.getWorkspaceMembers(workspace.id);
      console.log('Loaded workspace members:', members);
      
      if (!Array.isArray(members) || members.length === 0) {
        console.warn('No workspace members returned, using fallback');
        setWorkspaceMembers([
          {
            id: 'fallback-1',
            userId: session?.user?.id || 'user-123',
            name: session?.user?.name || 'Current User',
            email: session?.user?.email || 'user@example.com',
            role: 'admin',
            status: 'Accepted',
            avatar: session?.user?.image,
          }
        ]);
        
        setAllUsers([
          {
            id: session?.user?.id || 'user-123',
            name: session?.user?.name || 'Current User',
            email: session?.user?.email || 'user@example.com',
            role: 'admin',
            avatar: session?.user?.image,
          }
        ]);
        
        return;
      }
      
      // Process the members to ensure workspace creator is admin
      // Includes all members regardless of status for task assignment purposes
      const processedMembers = members.map(member => ({
        ...member,
        role: member.userId === workspace.user_id ? 'admin' : member.role
      }));
      
      // Set this to be used for all users in the system, including potential ones
      setWorkspaceMembers(processedMembers);
      
      // Create a Map to store unique users by ID
      const uniqueUsersMap = new Map();
      
      // Add members to the map
      for (const member of processedMembers) {
        const userId = (member.userId || member.id || '').toString();
        if (!userId || userId === 'undefined' || userId === 'null') continue;
        
        uniqueUsersMap.set(userId, {
          id: userId,
          name: member.name || member.email?.split('@')[0] || 'User',
          email: member.email || '',
          role: member.role || 'member',
          avatar: member.avatar || null,
          status: member.status || 'Accepted',
        });
      }
      
      // Ensure current user is included
      if (session?.user?.id) {
        const currentUserId = session.user.id.toString();
        const currentUserData = {
          id: currentUserId,
          name: session.user.name || session.user.email?.split('@')[0] || 'Current User',
          email: session.user.email || '',
          role: workspace?.user_id === session.user.id ? 'admin' : 'member',
          avatar: session.user.image,
          status: 'Accepted',
        };
        
        uniqueUsersMap.set(currentUserId, currentUserData);
      }
      
      // Convert map to array for the state
      const uniqueUsers = Array.from(uniqueUsersMap.values());
      
      // Update the state with deduplicated users
      setAllUsers(uniqueUsers);
      
    } catch (error) {
      console.error("Error loading workspace members:", error);
      // Set some fallback data on error
      setWorkspaceMembers([
        {
          id: 'fallback-1',
          userId: session?.user?.id || 'user-123',
          name: session?.user?.name || 'Current User',
          email: session?.user?.email || 'user@example.com',
          role: workspace?.user_id === session?.user?.id ? 'admin' : 'member',
          status: 'Accepted',
          avatar: session?.user?.image,
        }
      ]);
      
      setAllUsers([
        {
          id: session?.user?.id || 'user-123',
          name: session?.user?.name || 'Current User',
          email: session?.user?.email || 'user@example.com',
          role: workspace?.user_id === session?.user?.id ? 'admin' : 'member',
          avatar: session?.user?.image,
        }
      ]);
    }
  };
  
  // Filter users based on search query
  const getFilteredUsers = (users, query) => {
    // First ensure we have a valid array of users
    if (!Array.isArray(users) || users.length === 0) {
      return [];
    }
    
    // Create a map to track unique users by ID
    const uniqueUsersMap = new Map();
    
    // Only add users with valid IDs, overwrite duplicates
    users.forEach(user => {
      if (!user) return;
      
      // Get a consistent user ID
      const userId = typeof user === 'object' && user !== null
        ? (user.id || user.userId || '').toString()
        : String(user);
        
      if (!userId || userId === 'undefined' || userId === 'null') return;
      
      // Check if we already have this user by ID
      if (!uniqueUsersMap.has(userId)) {
        uniqueUsersMap.set(userId, user);
      }
    });
    
    // Convert map back to array
    const uniqueUsers = Array.from(uniqueUsersMap.values());
    
    // Filter users based on search query
    const lowercaseQuery = (query || '').toLowerCase();
    const filteredUsers = lowercaseQuery
      ? uniqueUsers.filter(user => 
          (user.name && user.name.toLowerCase().includes(lowercaseQuery)) || 
          (user.email && user.email.toLowerCase().includes(lowercaseQuery))
        )
      : uniqueUsers;
    
    // Sort users: first by status (current members first), then alphabetically by name
    return filteredUsers.sort((a, b) => {
      const statusA = a.status === 'Accepted' ? 0 : 1;
      const statusB = b.status === 'Accepted' ? 0 : 1;
      
      if (statusA !== statusB) return statusA - statusB;
      
      const nameA = (a.name || a.email || '').toLowerCase();
      const nameB = (b.name || b.email || '').toLowerCase();
      
      return nameA.localeCompare(nameB);
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
                  
                  // Try to get the name from the user object inside the comment first
                  // Then try to get from the availableUsers list
                  // Finally fallback to a default name instead of showing user ID
                  const userName = comment.user?.name || 
                                  commentUser?.name || 
                                  commentUser?.email?.split('@')[0] || 
                                  'Anonymous User';
                  
                  return {
                  id: comment.id,
                  text: comment.content,
                    author: userName,
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
      // Create a map to store unique users
      const uniqueUsersMap = new Map();
      
      // Try to load users from localStorage first
      try {
        const storedUsers = localStorage.getItem('appUsers');
        if (storedUsers) {
          const cachedUsers = JSON.parse(storedUsers);
          
          // Add cached users to the map
          if (Array.isArray(cachedUsers)) {
            cachedUsers.forEach(user => {
              if (!user) return;
              const userId = (user.id || user.userId || '').toString();
              if (!userId || userId === 'undefined' || userId === 'null') return;
              
              uniqueUsersMap.set(userId, user);
            });
          }
        }
      } catch (e) {
        console.warn('Could not load cached users:', e);
      }
      
      // Add current session user
      if (session?.user?.id) {
        const currentUserId = session.user.id.toString();
        const currentUser = {
          id: currentUserId,
          name: session.user.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          image: session.user.image,
          // Set as admin if user is the creator of the workspace
          role: (workspace && workspace.user_id === session.user.id) ? 'admin' : 'member'
        };
        
        uniqueUsersMap.set(currentUserId, currentUser);
      }
      
      // Add placeholder users for testing
      const placeholderUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          image: null,
          role: 'member'
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          image: null,
          role: 'member'
        },
        {
          id: 'user-3',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          image: null,
          role: 'member'
        }
      ];
      
      // Add placeholder users to the map
      placeholderUsers.forEach(user => {
        const userId = user.id.toString();
        uniqueUsersMap.set(userId, user);
      });
      
      // Convert map to array for the state
      const uniqueUsers = Array.from(uniqueUsersMap.values());
      
      // Update the state with deduplicated users
      setAllUsers(uniqueUsers);
      
      // Cache the deduplicated user list
      try {
        localStorage.setItem('appUsers', JSON.stringify(uniqueUsers));
      } catch (e) {
        console.warn('Could not cache users:', e);
      }
      
      // If workspace is available, also load workspace members
      if (workspace?.id && typeof db.getWorkspaceMembers === 'function') {
        try {
          const workspaceUsers = await db.getWorkspaceMembers(workspace.id);
          
          if (Array.isArray(workspaceUsers) && workspaceUsers.length > 0) {
            // Create a new map with current users
            const updatedMap = new Map(uniqueUsersMap);
            
            // Add workspace users to the map
            workspaceUsers.forEach(user => {
              if (!user) return;
              const userId = (user.id || user.userId || '').toString();
              if (!userId || userId === 'undefined' || userId === 'null') return;
              
              // If user already exists, merge properties but keep existing ones
              const existingUser = updatedMap.get(userId);
              if (existingUser) {
                updatedMap.set(userId, { ...existingUser, ...user });
              } else {
                updatedMap.set(userId, user);
              }
            });
            
            // Convert updated map to array
            const updatedUsers = Array.from(updatedMap.values());
            
            // Update state with merged deduplicated users
            setAllUsers(updatedUsers);
            
            // Cache the updated user list
            try {
              localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
            } catch (e) {
              console.warn('Could not cache updated users:', e);
            }
          }
        } catch (error) {
          console.error('Failed to load workspace users:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Fix the renderTaskOwners function to properly show "Unassigned" text and prevent duplicate avatars
  const renderTaskOwners = (task) => {
    // Check if task.assigned_to exists and process it consistently
    const assigned = task.assigned_to;
    let assignedUsers = [];
    
    if (Array.isArray(assigned) && assigned.length > 0) {
      // Convert all values to string IDs
      const validIds = assigned
        .map(id => {
          // Handle both when id is a user object or a string
          if (typeof id === 'object' && id !== null) {
            return (id.id || id.userId || '').toString();
          }
          return String(id);
        })
        .filter(id => id && id !== 'undefined' && id !== 'null');
      
      // Find matching users from allUsers
      assignedUsers = validIds.map(id => 
        allUsers.find(u => (u.id || u.userId || '').toString() === id)
      ).filter(Boolean);
    }
    
    // If no valid assigned users, show unassigned
    if (assignedUsers.length === 0) {
      return (
        <div className="flex -space-x-2 justify-center" style={{ minWidth: '64px' }}>
          <span className="text-xs text-gray-500">Unassigned</span>
        </div>
      );
    }
    
    // Remove any duplicate users by ID
    const uniqueOwners = [];
    const seenIds = new Set();
    
    for (const owner of assignedUsers) {
      if (owner && owner.id && !seenIds.has(owner.id)) {
        seenIds.add(owner.id);
        uniqueOwners.push(owner);
      }
    }
    
    // If after removing duplicates we have no owners, show unassigned
    if (uniqueOwners.length === 0) {
      return (
        <div className="flex -space-x-2 justify-center" style={{ minWidth: '64px' }}>
          <span className="text-xs text-gray-500">Unassigned</span>
        </div>
      );
    }
    
    // Show up to 3 unique owners
    const displayedOwners = uniqueOwners.slice(0, 3);
    
    // Pad with empty spaces if less than 3 owners to maintain consistent layout
    const paddedOwners = [...displayedOwners];
    while (paddedOwners.length < 3) {
      paddedOwners.push(null); // Add null placeholders to maintain width
    }

    return (
      <div className="flex -space-x-2 justify-center" style={{ minWidth: '64px' }}>
        {displayedOwners.map((owner, index) => (
          <div 
            key={owner.id || index} 
            style={{ zIndex: 10 - index }}
            className="border-2 border-white dark:border-gray-800 rounded-full"
          >
            <UserAvatar user={owner} size="sm" />
          </div>
        ))}
        {uniqueOwners.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-gray-800" style={{ zIndex: 7 }}>
            +{uniqueOwners.length - 3}
          </div>
        )}
        {/* Invisible placeholder avatars to maintain consistent width when fewer than 3 owners */}
        {paddedOwners.length <= 3 && paddedOwners.filter(o => o === null).map((_, index) => (
          <div 
            key={`placeholder-${index}`}
            className="w-6 h-6 rounded-full opacity-0"
            style={{ visibility: 'hidden' }}
          />
        ))}
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

  // Fix the UserAvatar component to properly display user initials
  const UserAvatar = ({ user, size = 'md' }) => {
    const sizeClasses = {
      'xs': 'w-5 h-5 text-[10px]',
      'sm': 'w-6 h-6 text-xs',
      'md': 'w-8 h-8 text-sm',
      'lg': 'w-10 h-10 text-base'
    };
    
    // If no user provided, show generic avatar
    if (!user) {
      return (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center text-gray-600`}>
          <User className={size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        </div>
      );
    }
    
    // Get the user ID (handle different formats)
    const userId = typeof user === 'object' ? user.id || user.userId : String(user);
    
    // Find the complete user object if we have user details in allUsers
    const userDetails = typeof user === 'object' ? user : allUsers.find(u => 
      (u.id && u.id.toString() === userId.toString()) || 
      (u.userId && u.userId.toString() === userId.toString())
    );
    
    // Get user name or email or use id to create consistent display
    let displayName = '';
    let initials = '';
    
    if (userDetails) {
      // Use name or email for display
      displayName = userDetails.name || userDetails.email || '';
      
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
      }
    }
    
    // Fallback if no initials generated yet
    if (!initials) {
      // Use user ID to create consistent initials
      initials = String(userId).substring(0, 2).toUpperCase();
    }
    
    // Use initials with background color
    const bgColorClass = generateAvatarColor(displayName || String(userId));
    
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full ${bgColorClass} flex items-center justify-center text-white`}
        title={displayName || userId}
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

  // Function to add a member to a workspace
  const addMemberToWorkspace = async (email, role = 'editor', message = '') => {
    if (!workspace || !workspace.id) {
      throw new Error('No workspace selected');
    }
    
    // Check if current user is admin
    const isAdmin = session?.user?.id === workspace.user_id || 
                    workspaceMembers.some(m => m.id === session?.user?.id && (m.role === 'admin' || m.role === 'owner'));
    
    if (!isAdmin) {
      throw new Error('Only workspace admins can add members');
    }
    
    try {
      console.log(`Adding member with email ${email} to workspace ${workspace.id} with role ${role}`);
      
      // Check if the database has a dedicated method for this
      if (typeof db.inviteWorkspaceMember === 'function') {
        const result = await db.inviteWorkspaceMember(workspace.id, email, role, message);
        
        if (!result.success) {
          console.error('Error inviting workspace member:', result.error);
          throw new Error(result.error || 'Failed to invite workspace member');
        }
        
        console.log('Successfully invited member:', result);
        
        // Refresh the workspace members list
        await loadWorkspaceMembers();
        
        return { 
          success: true, 
          message: result.message,
          alreadyMember: result.alreadyMember,
          name: result.name || email.split('@')[0]
        };
      }
      
      // Use legacy approach with mock data if direct method not available
      // Create a placeholder user
      const mockUserId = `user-${Date.now()}`;
      
      // Add dummy user to allUsers
      const newUser = {
        id: mockUserId,
        name: email.split('@')[0],
        email: email,
        role: role
      };
      
      setAllUsers(prev => [...prev, newUser]);
      
      // Add to workspace members
      setWorkspaceMembers(prev => [
        ...prev,
        {
          id: `member-${Date.now()}`,
          userId: mockUserId,
          name: email.split('@')[0],
          email: email,
          role: role,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        }
      ]);
      
      return { 
        success: true, 
        message: 'Member added successfully',
        name: email.split('@')[0]
      };
    } catch (error) {
      console.error('Error adding workspace member:', error);
      throw error;
    }
  };

  const handleSendInvitation = async () => {
    try {
      if (!inviteEmail || !inviteEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }
      
      // Set loading state
      setInviteLoading(true);
      
      // Add the new member to the workspace
      const result = await addMemberToWorkspace(inviteEmail, inviteRole, inviteMessage);
      
      // Show success message
      const userName = result.name || inviteEmail.split('@')[0];
      
      if (result.alreadyMember) {
        alert(`${userName} is already a member of this workspace.`);
      } else {
        alert(`${userName} has been invited to collaborate on this workspace.`);
      }
      
      // Clear the form
      setInviteEmail('');
      setInviteRole('editor');
      setInviteMessage('');
      
      // Close the dialog
      toggleShareDialog();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
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

  // Rewrite the toggleUserAssignment function to properly handle adding/removing users
  const toggleUserAssignment = async (taskId, userId, isCurrentlyAssigned) => {
    try {
      // Get the task
      let taskFound = false;
      let projectId;
      
      for (const project of projects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
          taskFound = true;
          projectId = project.id;
          break;
        }
      }
      
      if (!taskFound) {
        console.error('Task not found for assignment');
        return;
      }
      
      // Toggle the assignment
      await db.updateTask(taskId, {
        assigned_to: isCurrentlyAssigned
          ? projects
              .flatMap(project => project.tasks)
              .find(task => task.id === taskId)
              ?.assigned_to?.filter(id => String(id) !== String(userId)) || []
          : [
              ...(projects
                .flatMap(project => project.tasks)
                .find(task => task.id === taskId)
                ?.assigned_to || []),
              userId
            ]
      });
      
      // Update local state for immediate feedback
      const updatedProjects = projects.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            tasks: project.tasks.map(task => {
              if (task.id === taskId) {
                const newAssignedTo = isCurrentlyAssigned
                  ? (task.assigned_to || []).filter(id => String(id) !== String(userId))
                  : [...(task.assigned_to || []), userId];
                
                console.log('New assigned_to:', newAssignedTo);
                
                return {
                  ...task,
                  assigned_to: newAssignedTo
                };
              }
              return task;
            })
          };
        }
        return project;
      });
      
      // Update the projects state
      setProjects(updatedProjects);
      
      // Close the dropdown
      setOpenOwnerDropdowns(prev => ({ ...prev, [taskId]: false }));
    } catch (error) {
      console.error('Error toggling user assignment:', error);
      alert(`Failed to update task assignment: ${error.message}`);
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

  // Fix the task owner display component
  const TaskOwnerDisplay = ({ task }) => {
    // Make sure we have a valid assigned_to array of user IDs
    const assignedIds = Array.isArray(task.assigned_to) 
      ? task.assigned_to.map(id => {
          // Handle both when id is a user object or a string
          if (typeof id === 'object' && id !== null) {
            return (id.id || id.userId || '').toString();
          }
          return String(id);
        }).filter(id => id && id !== 'undefined' && id !== 'null') // Remove any empty strings, undefined or nulls
      : [];
    
    // Find assigned users from allUsers based on ID
    const assignedUsers = allUsers.filter(user => {
      if (!user || !user.id) return false;
      const userId = (user.id || user.userId || '').toString();
      return assignedIds.includes(userId);
    });
    
    // If no users assigned, show the assign button
    if (!assignedUsers.length) {
      return (
        <button
          className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-xs flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            toggleOwnerDropdown(task.id);
          }}
        >
          <span className="mr-1">
            <PlusCircleIcon className="h-3.5 w-3.5" />
          </span>
          Assign
        </button>
      );
    }
    
    // Show all assigned users with their avatars
    return (
      <div className="flex -space-x-1.5 items-center cursor-pointer" onClick={(e) => {
        e.stopPropagation();
        toggleOwnerDropdown(task.id);
      }}>
        {assignedUsers.map(user => (
          <UserAvatar 
            key={(user.id || user.userId || '').toString()} 
            user={user} 
            size="xs" 
          />
        ))}
      </div>
    );
  };

  // Function to handle creating a new project from dialog
  const createProjectFromDialog = async () => {
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
      effectiveSetProjectDialogOpen(false);
      
      // Reload projects
      await loadProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      alert(`Failed to create project: ${error.message}`);
    }
  };

  // Function to confirm and execute comment deletion
  const confirmDeleteComment = () => {
    if (commentToDelete) {
      deleteComment(commentToDelete.taskId, commentToDelete.commentId);
      setCommentToDelete(null);
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

  return (
    <div className="h-full flex flex-col">
      <div className="app-header flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li className="text-gray-500 text-sm">
                <button onClick={onBackToWorkspaces} className="hover:text-blue-600 flex items-center">
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
        
        <div className="flex items-center gap-2">
                <ThemeToggle />
          <UserMenu user={session?.user} onLogout={onLogout} />
              </div>
            </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Main content */}
          <div className="flex-1 p-4 overflow-auto">
            {/* Workspace Sharing Feature Announcement */}
            {showShareBanner && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-600 to-purple-500 rounded-lg border border-blue-200 dark:border-indigo-800/30 shadow-lg text-white animate-fadeIn relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 transform -skew-y-6 z-0"></div>
                <button 
                  onClick={() => setShowShareBanner(false)} 
                  className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-white/25 p-2 rounded-full">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      🎉 NEW: Workspace Collaboration!
                    </h3>
                    <p className="text-white/90 mt-1">
                      Invite team members to collaborate on projects and boost productivity together.
                    </p>
                  </div>
                  <div className="ml-auto">
                    <button 
                      onClick={() => setShareDialogOpen(true)}
                      className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md font-medium shadow-sm hover:shadow transform transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <UserPlus className="h-5 w-5" />
                      Try It Now
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-6">
              <div className="flex-1">
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
                                        
                                        <div
                                          {...dragHandleProps}
                                          className="cursor-grab h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                </div>
                                        
                                        <div className="text-base font-medium" onDoubleClick={() => {}}>
                                          {project.name}
                                        </div>
                                      </div>
                                      
                                <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="px-2 h-7">
                                              <MoreHorizontal className="h-4 w-4" />
                  </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                              // Create a temporary input to rename the project
                                              const newName = prompt('Rename project:', project.name);
                                              if (newName && newName.trim() !== '') {
                                                updateProjectName(project.id, newName);
                                              }
                                            }}>
                                              <PencilIcon className="h-4 w-4 mr-2" />
                                              Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-red-500 dark:text-red-400"
                                              onClick={() => {
                                                setItemToDelete({
                                                  type: 'project',
                                                  projectId: project.id
                                                });
                                                setDialogOpen(true);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        
                  <Button 
                                          onClick={() => handleAddTask(project.id)}
                    size="sm"
                                          variant="ghost"
                                          className="px-2 h-7"
                  >
                                          <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                                  </div>
                                  
                                    {expandedProjects[project.id] && (
                                      <div className="mt-2">
                                    {project.tasks && project.tasks.length > 0 ? (
                                          <div className="space-y-2">
                                      <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event) => handleTaskDragEnd(event, project.id)}
                                      >
                                        <SortableContext 
                                          items={project.tasks.map(task => task.id)}
                                          strategy={verticalListSortingStrategy}
                                        >
                                                {project.tasks.map(task => (
                                            <SortableTask key={task.id} task={task}>
                                              {({ dragHandleProps }) => (
                                                <div 
                                                        className="relative flex flex-col gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <div
                                                            {...dragHandleProps}
                                                            className="cursor-grab h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                          >
                                                            <GripVertical className="h-4 w-4" />
                                                    </div>
                                                          
                                                          <div
                                                            className={`h-2 w-2 rounded-full ${getStatusColor(task.status)}`}
                                                            title={task.status.replace('_', ' ')}
                                                          />
                                                          
                                                          <div className="flex-1 flex items-center">
                                                            <div className="mr-3">
                                                              <input
                                                                id={`task-title-${task.id}`}
                                                                type="text"
                                                                className="bg-transparent border-none focus:ring-0 p-0 text-sm font-medium"
                                                      value={task.title}
                                                      onChange={(e) => {
                                                                  const newTitle = e.target.value;
                                                                  
                                                                  // Update projects immediately for UI
                                                                  setProjects(prevProjects => 
                                                                    prevProjects.map(p => {
                                                          if (p.id === project.id) {
                                                            return {
                                                              ...p,
                                                              tasks: p.tasks.map(t => {
                                                                if (t.id === task.id) {
                                                                              return {...t, title: newTitle};
                                                                }
                                                                return t;
                                                              })
                                                            };
                                                          }
                                                          return p;
                                                                    })
                                                                  );
                                                                  
                                                                  // Debounce update to database
                                                                  if (updateTaskTitleTimeout.current) {
                                                                    clearTimeout(updateTaskTitleTimeout.current);
                                                                  }
                                                                  
                                                                  updateTaskTitleTimeout.current = setTimeout(() => {
                                                                    updateTaskTitle(task.id, newTitle);
                                                                  }, 500);
                                                                }}
                                                      placeholder="Task title"
                                                    />
                                                  </div>
                                                  
                                                            {/* Task details inline */}
                                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-auto">
                                                              {/* Due date */}
                                                              <div className="flex items-center whitespace-nowrap" style={{width: '130px', justifyContent: 'flex-start'}}>
                                                                <span className="font-medium mr-2 w-10 text-right">Due:</span>
                                                                <Popover>
                                                                  <PopoverTrigger asChild>
                                                                    <button className="text-xs hover:text-blue-500 hover:underline flex items-center bg-transparent rounded px-2 py-1 transition-colors">
                                                                      {task.due_date ? (
                                                                        <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                                                                      ) : (
                                                                        <span className="italic">Not set</span>
                                                                      )}
                                                                    </button>
                                                                  </PopoverTrigger>
                                                                  <PopoverContent className="w-auto p-0 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md" align="start">
                                                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-t-md flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                                                      <span className="text-sm font-medium">Select date</span>
                                                                      <button 
                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                        onClick={() => updateTaskDueDate(task.id, null)}
                                                                      >
                                                                        <X className="h-4 w-4" />
                                                                      </button>
                                                            </div>
                                                                    <Calendar
                                                                      mode="single"
                                                                      selected={task.due_date ? new Date(task.due_date) : undefined}
                                                                      onSelect={(date) => updateTaskDueDate(task.id, date)}
                                                                      className="rounded-b-md border-0"
                                                                      initialFocus
                                                                    />
                                                                  </PopoverContent>
                                                                </Popover>
                                                          </div>
                                                              
                                                              {/* Divider */}
                                                              <div className="flex items-center justify-center w-6">
                                                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                  </div>
                                                  
                                                              {/* Status */}
                                                              <div className="flex items-center whitespace-nowrap" style={{width: '130px', justifyContent: 'flex-start'}}>
                                                                <span className="font-medium mr-2 w-14 text-right">Status:</span>
                                                                <Popover>
                                                                  <PopoverTrigger asChild>
                                                                    <button className={`capitalize inline-block px-2.5 py-1 rounded text-xs ${
                                                                      task.status === 'completed' ? 'bg-green-500 text-white' : 
                                                                      task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                                                      task.status === 'blocked' ? 'bg-red-500 text-white' :
                                                                      task.status === 'in_review' ? 'bg-yellow-500 text-white' :
                                                                      'bg-gray-400 text-white'
                                                                    }`}>
                                                                      {task.status.replace('_', ' ')}
                                                                    </button>
                                                                  </PopoverTrigger>
                                                                  <PopoverContent className="w-auto p-2" align="start">
                                                                    <div className="space-y-1">
                                                                      <button 
                                                                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2"
                                                                        onClick={() => updateTaskStatus(task.id, 'not_started')}
                                                                      >
                                                                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                                                                        <span>Not Started</span>
                                                                      </button>
                                                                      <button 
                                                                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2"
                                                                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                                                      >
                                                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                                        <span>In Progress</span>
                                                                      </button>
                                                                      <button 
                                                                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2"
                                                                        onClick={() => updateTaskStatus(task.id, 'in_review')}
                                                                      >
                                                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                                                        <span>In Review</span>
                                                                      </button>
                                                                      <button 
                                                                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2"
                                                                        onClick={() => updateTaskStatus(task.id, 'blocked')}
                                                                      >
                                                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                                                        <span>Blocked</span>
                                                                      </button>
                                                                      <button 
                                                                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-2"
                                                                        onClick={() => updateTaskStatus(task.id, 'completed')}
                                                                      >
                                                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                                                        <span>Completed</span>
                                                                      </button>
                                                              </div>
                                                                  </PopoverContent>
                                                                </Popover>
                                                          </div>
                                                              
                                                              {/* Divider */}
                                                              <div className="flex items-center justify-center w-6">
                                                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                        </div>
                                                              
                                                              {/* Hours with progress */}
                                                              <div className="flex items-center whitespace-nowrap" style={{width: '140px', justifyContent: 'flex-start'}}>
                                                                <span className="font-medium mr-2 w-12 text-right">Hours:</span>
                                                                <Popover>
                                                                  <PopoverTrigger asChild>
                                                                    <button className="flex items-center hover:text-blue-500">
                                                                      <div style={{width: '70px', textAlign: 'right', paddingRight: '8px'}}>
                                                                        <span>
                                                                          {(task.actual_hours || 0).toString().padStart(3, '\u00A0')}/
                                                                          {(task.estimated_hours || 0).toString().padStart(3, '\u00A0')}
                                                                        </span>
                                                                      </div>
                                                                      <CircularProgress 
                                                                        value={{
                                                                          actual: task.actual_hours || 0,
                                                                          estimated: task.estimated_hours || 0.01
                                                                        }} 
                                                                        size={18}
                                                                      />
                                                                    </button>
                                                                  </PopoverTrigger>
                                                                  <PopoverContent className="w-auto p-2" align="start">
                                                                    <div className="space-y-2">
                                                                      <div>
                                                                        <label className="text-xs block mb-1">Actual Hours:</label>
                                                                        <input 
                                                                          type="number"
                                                                          className="w-full h-7 text-xs rounded border"
                                                                          value={task.actual_hours || 0}
                                                                          min="0"
                                                                          step="0.5"
                                                                          onChange={(e) => updateTaskHours(task.id, 'actual_hours', parseFloat(e.target.value) || 0)}
                                                                        />
                                                                      </div>
                                                                      <div>
                                                                        <label className="text-xs block mb-1">Estimated Hours:</label>
                                                                        <input 
                                                                          type="number"
                                                                          className="w-full h-7 text-xs rounded border"
                                                                          value={task.estimated_hours || 0}
                                                                          min="0"
                                                                          step="0.5"
                                                                          onChange={(e) => updateTaskHours(task.id, 'estimated_hours', parseFloat(e.target.value) || 0)}
                                                                        />
                                                                      </div>
                                                                    </div>
                                                                  </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                              
                                                              {/* Divider */}
                                                              <div className="flex items-center justify-center w-6">
                                                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                        </div>
                                                            </div>
                                                  </div>
                                                  
                                                          <div className="flex items-center">
                                                            {/* Task owner - fixed width container */}
                                                            <div className="task-owner flex items-center justify-end" style={{width: '90px'}}>
                                                              {renderTaskOwners(task)}
                                                              
                                                              <Popover>
                                                                <PopoverTrigger asChild>
                                                                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1">
                                                                    <Users className="h-4 w-4" />
                                                                  </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-56 p-2" align="end">
                                                                  <div>
                                                                    <label className="text-xs font-medium block mb-1">Assigned to</label>
                                                                    
                                                                    <div className="mt-1 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded mb-2">
                                                                      {getFilteredUsers(allUsers, userSearchQuery).map(user => {
                                                                        // Get user ID in consistent format
                                                                        const userId = (user.id || user.userId || '').toString();
                                                                        
                                                                        // Check if user is already assigned to this task
                                                                        const assignedIds = Array.isArray(task.assigned_to) 
                                                                          ? task.assigned_to.map(id => {
                                                                              if (typeof id === 'object') return (id.id || id.userId || '').toString();
                                                                              return String(id);
                                                                            }).filter(id => id && id !== 'undefined' && id !== 'null')
                                                                          : [];
                                                                          
                                                                        const isAssigned = assignedIds.includes(userId);
                                                                        
                                                                        return (
                                                                          <div
                                                                            key={userId}
                                                                            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer"
                                                                            onClick={() => {
                                                                              console.log(`Toggling assignment for ${userId}, currently assigned: ${isAssigned}`);
                                                                              toggleUserAssignment(task.id, userId, isAssigned);
                                                                            }}
                                                                          >
                                                                            <div className="flex-shrink-0">
                                                                              <input
                                                                                type="checkbox" 
                                                                                className="w-3.5 h-3.5 rounded border-gray-300"
                                                                                checked={isAssigned}
                                                                                readOnly
                                                                              />
                                                                            </div>
                                                                            <UserAvatar user={user} size="sm" />
                                                                            <span className="text-xs">{user.name || user.email?.split('@')[0] || 'User'}</span>
                                                                          </div>
                                                                        );
                                                                      })}
                                                                    </div>
                                                                    
                                                                    <Input
                                                                      placeholder="Search users..."
                                                                      className="h-7 text-xs"
                                                                      value={userSearchQuery}
                                                                      onChange={(e) => setUserSearchQuery(e.target.value)}
                                                                    />
                                                                  </div>
                                                                </PopoverContent>
                                                              </Popover>
                                                            </div>
                                                            
                                                            {/* Divider */}
                                                            <div className="flex items-center justify-center w-6">
                                                              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                            </div>
                                                            
                                                            {/* Comments button */}
                                                            <div>
                                                              <Popover>
                                                                <PopoverTrigger asChild>
                                                                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative">
                                                                    <MessageCircle className="h-4 w-4" />
                                                                    {taskComments[task.id]?.length > 0 && (
                                                                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center">
                                                                        {taskComments[task.id].length}
                                                                      </span>
                                                                    )}
                                                                  </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-72 p-0" align="end">
                                                                  <div className="p-3">
                                                                    <h4 className="font-medium mb-2">Comments</h4>
                                                                    <div className="space-y-3 mb-3 max-h-40 overflow-y-auto">
                                                                      {(taskComments[task.id]?.length > 0) ? (
                                                                        taskComments[task.id].map(comment => (
                                                                          <div key={comment.id} className="text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                                                                            <div className="flex justify-between items-center mb-1">
                                                                              <span className="font-medium">{comment.author}</span>
                                                                              <div className="flex items-center gap-2">
                                                                                <span className="text-xs text-gray-500">
                                                                                  {new Date(comment.timestamp).toLocaleString()}
                                                                                </span>
                                                                                {session?.user?.id === comment.user_id && (
                                                                                  <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                      <button className="p-0.5 text-gray-400 hover:text-gray-600">
                                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                                      </button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end" className="w-32">
                                                                                      <DropdownMenuItem onClick={() => setEditingComment({ id: comment.id, text: comment.text, taskId: task.id })}>
                                                                                        <PencilIcon className="h-3 w-3 mr-2" />
                                                                                        Edit
                                                                                      </DropdownMenuItem>
                                                                                      <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteComment(task.id, comment.id)}>
                                                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                                                        Delete
                                                                                      </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                  </DropdownMenu>
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                            {editingComment?.id === comment.id ? (
                                                                              <div>
                                                                                <textarea
                                                                                  className="w-full text-sm rounded border p-1 mb-1"
                                                                                  value={editingComment.text}
                                                                                  onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                                                                                ></textarea>
                                                                                <div className="flex justify-end gap-1">
                                                                                  <button
                                                                                    className="px-2 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                                                                                    onClick={() => setEditingComment(null)}
                                                                                  >
                                                                                    Cancel
                                                                                  </button>
                                                                                  <button
                                                                                    className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                                                                    onClick={() => addComment(task.id, editingComment.text, comment.id)}
                                                                                  >
                                                                                    Save
                                                                                  </button>
                                                                                </div>
                                                                              </div>
                                                                            ) : (
                                                                              <p>{comment.text}</p>
                                                                            )}
                                                                          </div>
                                                                        ))
                                                                      ) : (
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400">No comments yet</div>
                                                                      )}
                                                                    </div>
                                                                    {!isAddingComment ? (
                                                                      <button
                                                                        className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                                                        onClick={() => setIsAddingComment(true)}
                                                                      >
                                                                        Add a comment...
                                                                      </button>
                                                                    ) : (
                                                                      <div>
                                                                        <textarea
                                                                          className="w-full text-sm rounded border p-1 mb-1"
                                                                          placeholder="Type your comment..."
                                                                          value={commentText}
                                                                          onChange={(e) => setCommentText(e.target.value)}
                                                                        ></textarea>
                                                                        <div className="flex justify-end gap-1">
                                                                          <button
                                                                            className="px-2 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                                                                            onClick={() => {
                                                                              setIsAddingComment(false);
                                                                              setCommentText('');
                                                                            }}
                                                                          >
                                                                            Cancel
                                                                          </button>
                                                                          <button
                                                                            className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                                                            onClick={() => {
                                                                              addComment(task.id, commentText);
                                                                              setCommentText('');
                                                                              setIsAddingComment(false);
                                                                            }}
                                                                          >
                                                                            Add
                                                                          </button>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                </PopoverContent>
                                                              </Popover>
                                                            </div>
                                                            
                                                            {/* Divider */}
                                                            <div className="flex items-center justify-center w-6">
                                                              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                            </div>
                                                            
                                                            {/* Delete Task Button */}
                                                            <div>
                                                              <button
                                                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                                                onClick={() => {
                                                                  setItemToDelete({
                                                                    type: 'task',
                                                                    taskId: task.id,
                                                                    projectId: project.id
                                                                  });
                                                                  setDialogOpen(true);
                                                                }}
                                                                title="Delete Task"
                                                              >
                                                                <Trash2 className="h-4 w-4" />
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </SortableTask>
                                                ))}
                                              </SortableContext>
                                            </DndContext>
                                            
                                            <div className="p-2 bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                              <div className="flex gap-2 items-center">
                                                <PlusCircle className="h-4 w-4 text-gray-400" />
                                                    <input
                                                      type="text"
                                                  className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm"
                                                  placeholder="Add a new task..."
                                                  value={newTaskInputs[project.id] || ''}
                                                  onChange={(e) => handleNewTaskInputChange(project.id, e.target.value)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      createTaskInline(project.id);
                                                    }
                                                  }}
                                                    />
                                                  </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-center p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                            <p className="text-gray-500 dark:text-gray-400 mb-2">No tasks yet</p>
                                                    <Button 
                                              onClick={() => handleAddTask(project.id)}
                                              variant="outline"
                                                      size="sm"
                                                    >
                                              <PlusCircle className="h-4 w-4 mr-1" />
                                              Add Task
                                                    </Button>
                                                </div>
                                              )}
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
              
              {/* Right sidebar for workspace members */}
              {workspace && (
                <div className="w-64 border-l pl-6 flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Workspace Members
                    </h3>
        </div>
                  {workspaceMembers?.length > 0 ? (
                    <div className="space-y-3">
                      {workspaceMembers.slice(0, 5).map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            <UserAvatar user={member} size="md" />
      </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.role}</p>
                          </div>
                        </div>
                      ))}
                      {workspaceMembers.length > 5 && (
                        <p className="text-xs text-gray-500 pt-2 border-t">
                          +{workspaceMembers.length - 5} more members
                        </p>
                      )}
                      {isOwner && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => setShareDialogOpen(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Invite Members
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm text-gray-500 mb-4">No members yet</p>
                      {isOwner && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setShareDialogOpen(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Invite Team Members
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Dialog */}
      {shareDialogOpen && (
        <Dialog open={shareDialogOpen} onOpenChange={toggleShareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Invite Team Members
              </DialogTitle>
              <DialogDescription>
                Add team members to collaborate on <span className="font-medium text-blue-500">{workspace?.name}</span>
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="invite" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invite">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="invite" className="p-1">
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="flex gap-2">
              <Input
                        id="email"
                        placeholder="colleague@example.com"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <Select 
                        defaultValue="editor"
                        value={inviteRole}
                        onValueChange={(value) => setInviteRole(value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message (optional)</Label>
                    <Textarea 
                      id="message"
                      placeholder="I'm inviting you to collaborate on our project..."
                      className="h-20"
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendInvitation}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="members" className="p-1">
                <div className="py-2">
                  {workspaceMembers?.length > 0 ? (
                    <div className="space-y-3">
                      {workspaceMembers.map(member => (
                        <div key={member.id || member.userId} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === 'admin' ? 'default' : member.role === 'editor' ? 'outline' : 'secondary'}>
                              {member.role}
                            </Badge>
                            <Badge variant={member.status === 'Accepted' ? 'success' : 'warning'}>
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm text-gray-500 mb-4">No members yet</p>
                      <TabsList className="w-auto">
                        <TabsTrigger value="invite">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Members
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      {dialogOpen && (
        <Dialog open={dialogOpen} onOpenChange={() => setDialogOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-500">
                {itemToDelete?.type === 'project' ? 'Delete Project' : 'Delete Task'}
              </DialogTitle>
              <DialogDescription>
                {itemToDelete?.type === 'project' 
                  ? 'Are you sure you want to delete this project? All tasks within the project will also be deleted. This action cannot be undone.'
                  : 'Are you sure you want to delete this task? This action cannot be undone.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Comment Confirmation Dialog */}
      {commentToDelete && (
        <Dialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-500">Delete Comment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this comment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCommentToDelete(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteComment}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Project Dialog */}
      <Dialog open={effectiveProjectDialogOpen} onOpenChange={effectiveSetProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-500" />
              Create New Project
            </DialogTitle>
            <DialogDescription>
              Add a new project to your workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={effectiveNewProjectName}
                onChange={(e) => effectiveSetNewProjectName(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={createProjectFromDialog}
                disabled={!effectiveNewProjectName.trim()}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagementApp;