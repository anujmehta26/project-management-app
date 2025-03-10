'use client'

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar, BarChart3, Clock, Star, FileText, PlusCircle, ChevronRight, Briefcase, Users, Home, Folder, User, BarChart4 } from 'lucide-react';
import { db } from '../lib/database';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { getWorkspaceColor, getUserColor } from '../lib/utils';
import LayoutWrapper from './LayoutWrapper';
import UserMenu from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import WorkBalancing from './WorkBalancing';

const Dashboard = ({ onSelectWorkspace, onLogout, onNavigateToWorkspaces }) => {
  const { data: session } = useSession();
  const [recentProjects, setRecentProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0
  });
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'workBalance'

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        
        // Load workspaces
        const userWorkspaces = await db.getWorkspaces(session.user.id);
        setWorkspaces(userWorkspaces);
        
        // Load recent projects
        let allProjects = [];
        let allTasks = [];
        
        for (const workspace of userWorkspaces) {
          const projects = await db.getProjectsForWorkspace(workspace.id);
          const projectsWithWorkspace = projects.map(p => ({...p, workspace}));
          allProjects = [...allProjects, ...projectsWithWorkspace];
          
          // Get tasks for each project
          for (const project of projects) {
            try {
              const tasks = await db.getTasksForProject(project.id);
              
              if (tasks && tasks.length) {
                console.log(`Dashboard: Project ${project.id} has ${tasks.length} tasks`);
                
                // Add project and workspace info to each task
                const tasksWithContext = tasks.map(task => ({
                  ...task,
                  project: {
                    id: project.id,
                    name: project.name
                  },
                  workspace: {
                    id: workspace.id,
                    name: workspace.name
                  }
                }));
                allTasks = [...allTasks, ...tasksWithContext];
              }
            } catch (error) {
              console.error(`Error loading tasks for project ${project.id}:`, error);
            }
          }
        }
        
        console.log(`Dashboard: Loaded ${allTasks.length} total tasks`);
        
        // Sort projects by last updated
        allProjects.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
        setRecentProjects(allProjects.slice(0, 3));
        
        // Filter active tasks (not completed and assigned to current user)
        const activeTasks = allTasks.filter(task => {
          // Not completed
          if (task.status === 'completed') return false;
          
          // Check if assigned to current user
          if (task.owners && Array.isArray(task.owners)) {
            return task.owners.some(owner => owner && owner.id === session.user.id);
          }
          
          // Check assigned_to array directly
          if (task.assigned_to && Array.isArray(task.assigned_to)) {
            return task.assigned_to.includes(session.user.id);
          }
          
          return false;
        });
        
        console.log(`Dashboard: Found ${activeTasks.length} active tasks for current user`);
        
        // Sort by due date
        activeTasks.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        
        setActiveTasks(activeTasks);
        
        // Calculate stats
        const totalTasks = allTasks.filter(task => {
          // Check if assigned to current user
          if (task.owners && Array.isArray(task.owners)) {
            return task.owners.some(owner => owner && owner.id === session.user.id);
          }
          
          // Check assigned_to array directly
          if (task.assigned_to && Array.isArray(task.assigned_to)) {
            return task.assigned_to.includes(session.user.id);
          }
          
          return false;
        }).length;
        
        const completedTasks = allTasks.filter(task => {
          if (task.status !== 'completed') return false;
          
          // Check if assigned to current user
          if (task.owners && Array.isArray(task.owners)) {
            return task.owners.some(owner => owner && owner.id === session.user.id);
          }
          
          // Check assigned_to array directly
          if (task.assigned_to && Array.isArray(task.assigned_to)) {
            return task.assigned_to.includes(session.user.id);
          }
          
          return false;
        }).length;
        
        // Calculate upcoming deadlines (due in the next 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        
        const upcomingDeadlines = allTasks.filter(task => {
          if (task.status === 'completed') return false;
          if (!task.due_date) return false;
          
          const dueDate = new Date(task.due_date);
          if (dueDate > now && dueDate <= nextWeek) {
            // Check if assigned to current user
            if (task.owners && Array.isArray(task.owners)) {
              return task.owners.some(owner => owner && owner.id === session.user.id);
            }
            
            // Check assigned_to array directly
            if (task.assigned_to && Array.isArray(task.assigned_to)) {
              return task.assigned_to.includes(session.user.id);
            }
          }
          
          return false;
        }).length;
        
        setStats({
          totalTasks,
          completedTasks,
          upcomingDeadlines
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [session]);

  const handleNavigateToWorkspaces = () => {
    if (onNavigateToWorkspaces) {
      onNavigateToWorkspaces();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="app-header flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <h1 className="text-xl font-bold mr-4">Dashboard</h1>
          <div className="text-gray-500">{today}</div>
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <UserMenu onLogout={onLogout} />
        </div>
      </div>
      
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'workBalance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('workBalance')}
        >
          Work Balance
        </button>
        </div>
        
      {activeTab === 'overview' ? (
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">Loading...</div>
                <div className="text-gray-500">Please wait while we load your dashboard</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Total Tasks</p>
                      <h3 className="text-2xl font-bold">{stats.totalTasks}</h3>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">
                        {stats.completedTasks} completed
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-blue-200 dark:bg-blue-700 rounded-full">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ 
                          width: `${stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </Card>
          
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
                      <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Completed</p>
                      <h3 className="text-2xl font-bold">{stats.completedTasks}</h3>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {stats.totalTasks ? (
                      <span>
                        No tasks yet
                      </span>
                    ) : (
                      <span>No tasks yet</span>
                    )}
                  </div>
                </Card>
          
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 mr-4">
                      <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Upcoming Deadlines</p>
                      <h3 className="text-2xl font-bold">{stats.upcomingDeadlines}</h3>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Due in the next 7 days
                  </div>
                </Card>
              </div>
        
        {/* Recent Projects */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Recent Projects</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={handleNavigateToWorkspaces}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentProjects.length > 0 ? (
                    recentProjects.map(project => {
                      const colors = getWorkspaceColor(project.workspace?.id);
                      return (
                        <Card 
                          key={project.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
                          onClick={() => handleSelectProject(project)}
                        >
                          <div className="flex items-center mb-3">
                            <div 
                              className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${colors.icon}`}
                            >
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{project.name}</h3>
                              <p className="text-xs text-gray-500">
                                {project.workspace?.name} • {project.tasks?.length || 0} tasks
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex -space-x-2">
                            {project.tasks?.slice(0, 3)
                              .filter(task => task.assigned_to && task.assigned_to.length)
                              .flatMap(task => task.assigned_to)
                              .filter((user, index, self) => 
                                index === self.findIndex(u => u.id === user.id)
                              )
                              .slice(0, 3)
                              .map((user, index) => (
                                <div key={index} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden bg-gray-200">
                                  {user.image ? (
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-xs font-bold">
                                      {user.name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-3 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-gray-500 dark:text-gray-400 mb-4">No recent projects</div>
                      <Button 
                        onClick={handleNavigateToWorkspaces}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Create a Project
                        <PlusCircle className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            
              {/* Workspaces */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Your Workspaces</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={handleNavigateToWorkspaces}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {workspaces
                    .sort((a, b) => (b.project_count || 0) - (a.project_count || 0)) // Sort by most used (most projects)
                    .slice(0, 4) // Show top 4
                    .map(workspace => {
                      const colors = getWorkspaceColor(workspace.id);
                      return (
                        <Card 
                          key={workspace.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700"
                          onClick={() => onSelectWorkspace(workspace)}
                        >
                          <div className="flex items-center mb-3">
                            <div 
                              className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${colors.icon}`}
                            >
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{workspace.name}</h3>
                              <p className="text-xs text-gray-500">
                                {workspace.project_count || 0} projects
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
              
              {/* Active Tasks */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Active Tasks</h2>
                </div>
                
                {activeTasks.length > 0 ? (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {activeTasks.map(task => {
                        const statusColor = getStatusColor(task.status);
                        return (
                          <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center mb-1">
                                  <div className={`w-2 h-2 rounded-full ${statusColor} mr-2`}></div>
                                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {task.project?.name} • {task.workspace?.name}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {task.due_date ? (
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span>No due date</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400">No active tasks</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <WorkBalancing />
        </div>
      )}
    </div>
  );
};

const UserAvatar = ({ user, size = 'md' }) => {
  if (!user) return null;
  
  // Get initials from name
  let initials = '?';
  if (user.name) {
    const nameParts = user.name.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 1) {
      initials = nameParts[0].charAt(0).toUpperCase();
    } else if (nameParts.length > 1) {
      initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
  } else if (user.email) {
    initials = user.email.charAt(0).toUpperCase();
  }
  
  // Ensure we have a valid user ID for color
  const userId = user.id || '12345';
  
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
  
  // Generate a consistent index based on the userId
  let hash = 0;
  if (userId) {
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium`}
      style={{ backgroundColor: bgColor }}
      title={user.name || user.email || 'User'}
    >
      {initials}
    </div>
  );
};

const renderTaskOwners = (task) => {
  if (!task.owners || task.owners.length === 0) {
    return (
      <div className="text-gray-500 text-xs">Unassigned</div>
    );
  }
  
  return (
    <div className="flex -space-x-1">
      {task.owners.map((owner, index) => (
        <div key={owner.id || index} className="relative">
          <UserAvatar user={owner} size="sm" />
        </div>
      ))}
    </div>
  );
};

export default Dashboard; 