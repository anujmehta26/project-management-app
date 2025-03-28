'use client'

import React, { useState, useEffect } from 'react';
import {  Card  } from '@/components/ui/card';
import {  Button  } from '@/components/ui/button';
import {  Input  } from '@/components/ui/input';
import { Clock, Calendar, User, Save, AlertCircle, BarChart3, FileText, CheckCircle, Play, Pause, CheckSquare, Briefcase, Folder } from 'lucide-react';
import { db } from '../lib/database';
import { useSession } from 'next-auth/react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { getWorkspaceColor } from '../lib/utils';

const WorkBalancing = () => {
  const { data: session } = useSession();
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estimatedHours, setEstimatedHours] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    const loadMyTasks = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        
        // Load all workspaces for the user
        const userWorkspaces = await db.getWorkspaces(session.user.id);
        
        // Load all tasks assigned to the current user
        let allAssignedTasks = [];
        
        for (const workspace of userWorkspaces) {
          // Get all projects in this workspace
          const projects = await db.getProjectsForWorkspace(workspace.id);
          
          // Get tasks for each project
          for (const project of projects) {
            try {
              const tasks = await db.getTasksForProject(project.id);
              
              if (tasks && tasks.length) {
                console.log(`Project ${project.id} has ${tasks.length} tasks`);
                
                // Filter tasks assigned to the current user
                const assignedTasks = tasks.filter(task => {
                  // Check if task has owners property from the database
                  if (task.owners && Array.isArray(task.owners)) {
                    return task.owners.some(owner => owner && owner.id === session.user.id);
                  }
                  
                  // Check assigned_to array directly
                  if (task.assigned_to && Array.isArray(task.assigned_to)) {
                    return task.assigned_to.includes(session.user.id);
                  }
                  
                  return false;
                });
                
                console.log(`Found ${assignedTasks.length} tasks assigned to current user in project ${project.id}`);
                
                // Add project and workspace info to each task
                const tasksWithContext = assignedTasks.map(task => ({
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
                
                allAssignedTasks = [...allAssignedTasks, ...tasksWithContext];
              }
            } catch (error) {
              console.error(`Error loading tasks for project ${project.id}:`, error);
            }
          }
        }
        
        console.log('Loaded assigned tasks:', allAssignedTasks.length);
        
        // Sort tasks by status and due date
        allAssignedTasks.sort((a, b) => {
          // First sort by status (not completed first)
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          
          // Then sort by due date
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        
        setMyTasks(allAssignedTasks);
        
        // Initialize estimated hours from task data
        const initialEstimates = {};
        allAssignedTasks.forEach(task => {
          initialEstimates[task.id] = task.estimated_hours || 0;
        });
        setEstimatedHours(initialEstimates);
        
      } catch (error) {
        console.error('Error loading assigned tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMyTasks();
  }, [session]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const handleEstimatedHoursChange = (taskId, hours) => {
    // Validate input - only allow numbers and decimal points
    if (!/^[0-9]*\.?[0-9]*$/.test(hours) && hours !== '') return;
    
    // Update local state
    setEstimatedHours(prev => ({
      ...prev,
      [taskId]: hours === '' ? 0 : parseFloat(hours)
    }));
    
    // Update the task in the myTasks array
    setMyTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          estimated_hours: hours === '' ? 0 : parseFloat(hours)
        };
      }
      return task;
    }));
  };

  const saveEstimates = async () => {
    if (!session?.user?.id) return;
    
    try {
      setSaving(true);
      
      // Save each task's estimated hours to the database
      for (const taskId in estimatedHours) {
        await db.updateTask(taskId, {
          estimated_hours: estimatedHours[taskId],
          userId: session.user.id
        });
      }
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving estimated hours:', error);
      alert('Failed to save estimated hours. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startTimer = (taskId) => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    setActiveTaskId(taskId);
    setTimerRunning(true);
    
    // Start a new timer that updates every second
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  const pauseTimer = async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    setTimerRunning(false);
    
    // Update actual hours for the task
    if (activeTaskId && elapsedTime > 0) {
      const hoursSpent = parseFloat((elapsedTime / 3600).toFixed(2));
      
      // Get current task
      const task = myTasks.find(t => t.id === activeTaskId);
      if (task) {
        const currentHours = task.actual_hours || 0;
        const newHours = currentHours + hoursSpent;
        
        // Update in state
        setMyTasks(prev => prev.map(t => 
          t.id === activeTaskId ? {...t, actual_hours: newHours} : t
        ));
        
        // Update in database
        try {
          await db.updateTask(activeTaskId, {
            actual_hours: newHours,
            userId: session.user.id
          });
        } catch (error) {
          console.error('Error updating actual hours:', error);
        }
      }
    }
    
    setElapsedTime(0);
  };
  
  const completeTask = async (taskId) => {
    // First pause the timer if it's running
    if (timerRunning && activeTaskId === taskId) {
      await pauseTimer();
    }
    
    // Update task status to completed
    try {
      await db.updateTask(taskId, {
        status: 'completed',
        userId: session.user.id
      });
      
      // Update in state
      setMyTasks(prev => prev.map(t => 
        t.id === taskId ? {...t, status: 'completed'} : t
      ));
      
      setActiveTaskId(null);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };
  
  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'blocked': return 'Blocked';
      case 'in_review': return 'In Review';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started': return 'bg-gray-200 text-gray-800';
      case 'in_progress': return 'bg-blue-200 text-blue-800';
      case 'blocked': return 'bg-red-200 text-red-800';
      case 'in_review': return 'bg-yellow-200 text-yellow-800';
      case 'completed': return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getTotalEstimatedHours = () => {
    return Object.values(estimatedHours).reduce((sum, hours) => sum + (parseFloat(hours) || 0), 0);
  };

  // Calculate stats
  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter(task => task.status === 'completed').length;
  
  // Calculate total hours worked today
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  // Calculate total hours worked this week
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  // Sum up actual hours for all tasks
  const totalHoursWorkedToday = myTasks.reduce((sum, task) => {
    // For simplicity, we'll assume all hours were logged today
    // In a real app, you'd track when hours were logged
    return sum + (task.actual_hours || 0);
  }, 0);
  
  // Sum up actual hours for all tasks this week
  const totalHoursWorkedThisWeek = myTasks.reduce((sum, task) => {
    // For simplicity, we'll assume all hours were logged this week
    // In a real app, you'd track when hours were logged
    return sum + (task.actual_hours || 0);
  }, 0);

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-xl font-medium mb-2">Loading your tasks...</div>
            <div className="text-gray-500">Please wait while we gather your work information</div>
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Assigned Tasks</p>
                  <h3 className="text-2xl font-medium">{totalTasks}</h3>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    {completedTasks} completed
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-blue-200 dark:bg-blue-700 rounded-full">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ 
                      width: `${totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%` 
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Total Hours Worked</p>
                  <h3 className="text-2xl font-medium">{totalHoursWorkedToday.toFixed(1)}</h3>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {totalHoursWorkedToday > 0 ? (
                  <span>Hours worked today</span>
                ) : (
                  <span>No hours logged today</span>
                )}
              </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 mr-4">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Weekly Total</p>
                  <h3 className="text-2xl font-medium">{totalHoursWorkedThisWeek.toFixed(1)} hrs</h3>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Total hours worked this week
              </div>
            </Card>
          </div>
          
          {/* Active Tasks Section with Save Button */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Active Tasks</h2>
              <div className="flex items-center">
                <Button 
                  onClick={saveEstimates} 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? 'Saving...' : 'Save Estimates'}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
                
                {saveSuccess && (
                  <div className="ml-2 text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTasks.filter(task => task.status !== 'completed').length > 0 ? (
                myTasks
                  .filter(task => task.status !== 'completed')
                  .map(task => {
                    const colors = getWorkspaceColor(task.workspace?.id);
                    const isActive = activeTaskId === task.id;
                    
                    return (
                      <Card 
                        key={task.id} 
                        className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{task.title}</h3>
                            </div>
                            {isActive && timerRunning && (
                              <div className="text-sm font-medium text-blue-600">
                                {formatTime(elapsedTime)}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                            <Folder className="h-3 w-3 mr-1" />
                            {task.project?.name || 'No project'} 
                            <span className="text-gray-400 mx-1">•</span> 
                            <span className="text-gray-400">{task.workspace?.name || 'No workspace'}</span>
                          </div>
                          
                          <div className="flex justify-end items-center space-x-2 mt-2">
                            {isActive && timerRunning ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-yellow-300 text-yellow-600"
                                onClick={pauseTimer}
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-green-300 text-green-600"
                                onClick={() => startTimer(task.id)}
                                disabled={timerRunning && activeTaskId !== task.id}
                                title={isActive ? 'Resume' : 'Start'}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-blue-300 text-blue-600"
                              onClick={() => completeTask(task.id)}
                              title="Complete"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
              ) : (
                <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  No active tasks
                </div>
              )}
            </div>
          </div>
          
          {/* Tasks Table */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Task</th>
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Project</th>
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Actual Hours</th>
                    <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.length > 0 ? (
                    myTasks.map(task => (
                      <tr key={task.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)} mr-2`}></div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">
                          {task.project?.name || 'No project'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)} mr-2`}></div>
                            <span className="text-gray-500 dark:text-gray-400">
                              {task.status === 'not_started' ? 'Not Started' : 
                               task.status === 'in_progress' ? 'In Progress' : 
                               task.status === 'blocked' ? 'Blocked' : 
                               task.status === 'in_review' ? 'In Review' : 
                               task.status === 'completed' ? 'Completed' : 'Not Started'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">
                          {task.due_date ? (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span>Not set</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="w-16 text-center">{task.actual_hours || 0}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            <span className="w-16 text-center">{task.estimated_hours || 0}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkBalancing; 