'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useSession } from 'next-auth/react';
import { db } from '../lib/database';
import CalendarEventDialog from './CalendarEventDialog';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  addHours
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  X,
  AlertCircle,
  Edit,
  Trash2,
  MoreVertical,
  FolderIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Spinner } from '../components/ui/spinner';

// Memoized day view component
const DayView = React.memo(({ date, events, onEventClick, onDateClick, renderEvent }) => {
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: endOfDay(date)
  });
  
  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.start), date)
  );
  
  const allDayEvents = dayEvents.filter(event => event.all_day);
  const timedEvents = dayEvents.filter(event => !event.all_day);
  
  return (
    <div className="h-full flex flex-col">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">All day</div>
          <div className="space-y-1">
            {allDayEvents.map(event => renderEvent(event))}
          </div>
        </div>
      )}
      
      {/* Timed events */}
      <div className="flex-1 overflow-y-auto">
        {hours.map(hour => {
          const hourEvents = timedEvents.filter(event => {
            const eventStart = new Date(event.start);
            return getHours(eventStart) === getHours(hour);
          });
          
          return (
            <div 
              key={format(hour, 'HH:mm')} 
              className={`
                border-b border-gray-200 dark:border-gray-700 p-2
                ${isWithinInterval(new Date(), {
                  start: hour,
                  end: addHours(hour, 1)
                }) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
              `}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {format(hour, 'HH:mm')}
              </div>
              
              {hourEvents.length > 0 ? (
                <div className="space-y-1">
                  {hourEvents.map(event => renderEvent(event))}
                </div>
              ) : (
                <div 
                  className="h-8 w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  onClick={() => {
                    const clickedDate = new Date(date);
                    clickedDate.setHours(getHours(hour));
                    onDateClick(clickedDate);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Memoized week view component
const WeekView = React.memo(({ date, events, onEventClick, onDateClick, renderEvent }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start on Monday
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(date, { weekStartsOn: 1 })
  });
  
  return (
    <div className="h-full grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
      {weekDays.map(day => {
        const dayEvents = events.filter(event => 
          isSameDay(new Date(event.start), day)
        );
        
        const isToday = isSameDay(day, new Date());
        
        return (
          <div 
            key={format(day, 'yyyy-MM-dd')} 
            className="flex flex-col h-full overflow-hidden"
          >
            <div 
              className={`
                p-2 text-center border-b border-gray-200 dark:border-gray-700
                ${isToday ? 'bg-blue-50 dark:bg-blue-900/10 font-bold' : ''}
              `}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
            
            <div 
              className="flex-1 p-1 overflow-y-auto"
              onClick={(e) => {
                // Only trigger date click if clicking directly on the container, 
                // not on child events
                if (e.target === e.currentTarget) {
                  onDateClick(day);
                }
              }}
            >
              {dayEvents.map(event => renderEvent(event, true))}
            </div>
            </div>
          );
        })}
    </div>
  );
});

// Memoized month view component
const MonthView = React.memo(({ date, events, onEventClick, onDateClick, renderEvent }) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Group days into weeks
  const weeks = [];
  let week = [];
  
  days.forEach(day => {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 text-center py-2 border-b border-gray-200 dark:border-gray-700">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-rows-6 h-full">
          {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700 h-full">
              {week.map(day => {
                const dayEvents = events.filter(event => 
                isSameDay(new Date(event.start), day)
                );
              
              const isCurrentMonth = isSameMonth(day, date);
              const isToday = isSameDay(day, new Date());
                
                return (
                  <div 
                  key={format(day, 'yyyy-MM-dd')} 
                  className={`
                    p-1 flex flex-col h-full overflow-hidden border-b border-gray-200 dark:border-gray-700
                    ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600' : ''}
                    ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                  `}
                  onClick={(e) => {
                    // Only trigger date click if clicking directly on the container,
                    // not on child events
                    if (e.target === e.currentTarget) {
                      onDateClick(day);
                    }
                  }}
                >
                  <div className={`
                    text-xs font-medium mb-1 self-end h-5 w-5 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white' : ''}
                  `}>
                      {format(day, 'd')}
                    </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayEvents.slice(0, 3).map(event => renderEvent(event, true))}
                      
                      {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          ))}
      </div>
    </div>
  );
});

const Calendar = () => {
  const { data: session } = useSession();
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [localProjectDialogOpen, setLocalProjectDialogOpen] = useState(false);
  const [localNewProjectName, setLocalNewProjectName] = useState('');
  
  const effectiveNewProjectName = localNewProjectName;
  const effectiveSetNewProjectName = setLocalNewProjectName;
  
  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get start and end dates for the current view
      const viewStart = startOfMonth(date);
      const viewEnd = endOfMonth(date);
      
      console.log('Loading calendar data for date range:', {
        start: format(viewStart, 'yyyy-MM-dd'),
        end: format(viewEnd, 'yyyy-MM-dd')
      });
      
      // Fetch user events
      let userEvents = [];
      try {
        userEvents = await db.getUserEvents(
        session.user.id,
          format(viewStart, 'yyyy-MM-dd'), 
          format(viewEnd, 'yyyy-MM-dd')
        );
        console.log(`Loaded ${userEvents.length} user events`);
      } catch (userEventsError) {
        console.error('Error fetching user events:', userEventsError);
        setError(`Error loading events: ${userEventsError.message || 'Unknown error'}`);
        userEvents = [];
      }
      
      // Fetch tasks with due dates from all workspaces
      let tasksWithDueDates = [];
      
      try {
        // First get all workspaces
        const workspaces = await db.getWorkspaces(session.user.id);
        console.log(`Found ${workspaces.length} workspaces for calendar`);
        
        if (workspaces && workspaces.length > 0) {
          // For each workspace, get all projects
          for (const workspace of workspaces) {
            if (!workspace || !workspace.id) continue;
            
            try {
              const workspaceProjects = await db.getProjectsForWorkspace(workspace.id);
              console.log(`Found ${workspaceProjects.length} projects in workspace ${workspace.name || workspace.id}`);
              
              // For each project, get all tasks
              for (const project of workspaceProjects) {
                if (!project || !project.id) continue;
                
                try {
                  const projectTasks = await db.getTasksForProject(project.id);
                  
                  if (!projectTasks || !Array.isArray(projectTasks)) {
                    console.error(`Invalid tasks data for project ${project.id}:`, projectTasks);
                    continue;
                  }
                  
                  // Filter tasks with due dates
                  const tasksWithDue = projectTasks.filter(task => task && task.due_date);
                  console.log(`Found ${tasksWithDue.length} tasks with due dates in project ${project.name || project.id}`);
                  
                  // Add project info to each task
                  const tasksWithProject = tasksWithDue.map(task => ({
                    ...task,
                    project_name: project.name || 'Unnamed Project',
                    project_id: project.id,
                    workspace_id: workspace.id,
                    workspace_name: workspace.name || 'Unnamed Workspace'
                  }));
                  
                  tasksWithDueDates = [...tasksWithDueDates, ...tasksWithProject];
                } catch (taskError) {
                  console.error(`Error fetching tasks for project ${project.id}:`, taskError);
                }
              }
            } catch (projectError) {
              console.error(`Error fetching projects for workspace ${workspace.id}:`, projectError);
            }
          }
        }
      } catch (workspaceError) {
        console.error('Error fetching workspaces:', workspaceError);
      }
      
      console.log(`Total tasks with due dates: ${tasksWithDueDates.length}`);
      
      // Convert tasks to event-like objects
      const taskEvents = tasksWithDueDates.map(task => ({
        id: `task-${task.id}`,
        title: task.title || 'Untitled Task',
        description: task.description || '',
        start: new Date(task.due_date).toISOString(),
        end: new Date(task.due_date).toISOString(),
        all_day: true,
        type: 'task',
        task_id: task.id,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        project_name: task.project_name || 'Unknown Project',
        project_id: task.project_id,
        workspace_name: task.workspace_name || 'Unknown Workspace'
      }));
      
      console.log(`Created ${taskEvents.length} task events`);
      
      // Fetch teammate events if needed
      let teammateEvents = [];
      try {
        // Only attempt to get teammates if we haven't already encountered errors
        if (!error) {
          const teammates = await db.getTeammates(session.user.id);
          
          if (teammates && teammates.length > 0) {
            console.log(`Found ${teammates.length} teammates`);
            const teammateIds = teammates.map(teammate => teammate.id);
            
        teammateEvents = await db.getTeammateEvents(
              teammateIds, 
              format(viewStart, 'yyyy-MM-dd'), 
              format(viewEnd, 'yyyy-MM-dd')
            );
            
            console.log(`Loaded ${teammateEvents.length} teammate events`);
          } else {
            console.log('No teammates found');
          }
        }
      } catch (teammateError) {
        console.error('Error fetching teammate events:', teammateError);
        // Don't set error here, as we already have user events
      }
      
      // Combine all events
      const allEvents = [...userEvents, ...taskEvents, ...teammateEvents];
      console.log(`Setting ${allEvents.length} total events`);
      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Failed to load calendar data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [session, date]);
  
  // Load calendar data when date or view changes
  useEffect(() => {
    if (session?.user?.id) {
      loadCalendarData();
    }
  }, [date, session?.user?.id, loadCalendarData]);
  
  // Handle event click
  const handleEventClick = useCallback((event) => {
    // Check if this is a calendar event (not a task)
    // Calendar events have an ID that's not prefixed with 'task-'
    console.log('Event clicked:', event);
    console.log('Event ID type:', typeof event.id, 'Value:', event.id);
    
    const isCalendarEvent = event && event.id && !String(event.id).startsWith('task-');
    console.log('Is calendar event?', isCalendarEvent);
    
    if (!isCalendarEvent) {
      // For task events, we could navigate to the task view in the future
      console.log('Task clicked:', event);
      return;
    }
    
    // This is a regular calendar event that can be edited
    console.log('Calendar event clicked for editing:', event);
    setSelectedEvent(event);
    setSelectedDate(new Date(event.start));
    setShowEventDialog(true);
  }, []);
  
  // Handle date cell click
  const handleDateClick = useCallback((date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventDialog(true);
  }, []);
  
  // Handle event added
  const handleEventAdded = useCallback((newEvent) => {
    setEvents(prev => [...prev, newEvent]);
  }, []);

  // Handle event updated
  const handleEventUpdated = useCallback((updatedEvent) => {
    if (!updatedEvent) {
      // Event was deleted
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
    } else {
      // Event was updated
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  }, [selectedEvent]);

  // Status colors for tasks
  const statusColors = {
    'busy': '#f43f5e',
    'free': '#22c55e',
    'meeting': '#3b82f6',
    'out-of-office': '#8b5cf6',
    'personal': '#f59e0b',
    'todo': '#64748b',
    'in-progress': '#0ea5e9',
    'done': '#10b981',
    'blocked': '#ef4444'
  };

  // Event rendering
  const renderEvent = useCallback((event, isCompact = false) => {
    // Determine if this is a task or calendar event
    const isTask = event.task_id || String(event.id).startsWith('task-');
    const isEditable = !isTask;
    
    // For tasks, use task status for color
    // For calendar events, use event type
    let colorKey;
    if (isTask) {
      // Map task status to a color key
      const taskStatus = event.status || 'todo';
      // Convert status format if needed (e.g., not_started to todo, in_progress to in-progress)
      colorKey = taskStatus.replace('not_started', 'todo')
                          .replace('in_progress', 'in-progress')
                          .replace('completed', 'done');
    } else {
      colorKey = event.type || 'busy';
    }
    
    const color = statusColors[colorKey] || statusColors.busy;

    // Function to handle click on this specific event
    const onEventClick = () => {
      if (isEditable) {
        console.log('Event clicked in renderEvent, editable event:', event);
        setSelectedEvent(event);
        setSelectedDate(new Date(event.start));
        setShowEventDialog(true);
      } else {
        console.log('Task clicked in renderEvent:', event);
      }
    };
    
    return (
      <div
        key={event.id}
        className={`
          rounded-md px-2 py-1 mb-1 cursor-pointer overflow-hidden
          ${isCompact ? 'text-xs' : 'text-sm'}
          ${isTask ? 'border-l-4' : ''}
          ${isEditable ? 'hover:opacity-80 transition-opacity' : ''}
        `}
        style={{
          backgroundColor: color + '20',
          borderColor: color,
          color: color.replace('20', '')
        }}
        onClick={onEventClick}
        title={isEditable ? "Click to edit event" : "Task event"}
      >
        <div className="font-medium truncate flex items-center justify-between">
          <span>{event.title}</span>
          {!isCompact && isEditable && (
            <Edit className="h-3 w-3 opacity-70" />
          )}
        </div>
        {!isCompact && !event.all_day && (
          <div className="text-xs flex items-center mt-1">
            <Clock className="h-3 w-3 mr-1" />
            {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
          </div>
        )}
        {!isCompact && event.projects && (
          <div className="text-xs flex items-center mt-1">
            <FolderIcon className="h-3 w-3 mr-1" />
            {event.projects.name}
          </div>
        )}
        {!isCompact && event.project_name && (
          <div className="text-xs flex items-center mt-1">
            <FolderIcon className="h-3 w-3 mr-1" />
            {event.project_name}
          </div>
        )}
        {!isCompact && isTask && (
          <div className="flex items-center justify-between mt-1">
            <Badge variant="outline" className="text-xs">
              {event.status || 'Task'}
            </Badge>
          </div>
        )}
      </div>
    );
  }, [statusColors, setSelectedEvent, setSelectedDate, setShowEventDialog]);
  
  // Get color for event based on type or status
  const getEventColor = (event) => {
    if (event.task_id) {
      // For tasks, use the task status color
      return statusColors[event.status] || statusColors.task;
    }
    
    // For regular events, use the event type color
    return statusColors[event.type] || statusColors.busy;
  };
  
  // Render the appropriate view based on the current view state
  const renderView = () => {
    switch (view) {
      case 'day':
        return (
          <DayView 
            date={date} 
            events={events} 
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
          />
        );
      case 'week':
        return (
          <WeekView 
            date={date} 
            events={events} 
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
          />
        );
      case 'month':
      default:
    return (
          <MonthView 
            date={date} 
            events={events} 
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            renderEvent={renderEvent}
          />
        );
    }
  };
  
  return (
    <div className="h-full flex flex-col p-4 bg-white dark:bg-gray-900 rounded-lg">
      {/* Header with navigation and view controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate(new Date())}
          >
            Today
          </Button>
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none rounded-l-md"
              onClick={() => setDate(prevDate => {
                switch (view) {
                  case 'day':
                    return subDays(prevDate, 1);
                  case 'week':
                    return subWeeks(prevDate, 1);
                  case 'month':
                    return subMonths(prevDate, 1);
                  default:
                    return prevDate;
                }
              })}
            >
            <ChevronLeft className="h-4 w-4" />
          </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none rounded-r-md"
              onClick={() => setDate(prevDate => {
                switch (view) {
                  case 'day':
                    return addDays(prevDate, 1);
                  case 'week':
                    return addWeeks(prevDate, 1);
                  case 'month':
                    return addMonths(prevDate, 1);
                  default:
                    return prevDate;
                }
              })}
            >
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
          <h2 className="text-xl font-semibold ml-2">
            {format(date, view === 'day' ? 'MMMM d, yyyy' : view === 'week' ? "'Week of' MMMM d, yyyy" : 'MMMM yyyy')}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={() => {
              setSelectedDate(new Date());
              setSelectedEvent(null);
              setShowEventDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <Tabs value={view} onValueChange={setView} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="day" className={view === 'day' ? 'bg-primary text-primary-foreground' : ''}>Day</TabsTrigger>
              <TabsTrigger value="week" className={view === 'week' ? 'bg-primary text-primary-foreground' : ''}>Week</TabsTrigger>
              <TabsTrigger value="month" className={view === 'month' ? 'bg-primary text-primary-foreground' : ''}>Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Main calendar area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Spinner size="lg" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading calendar data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-6 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                  <h3 className="text-lg font-medium text-center mb-2">Error Loading Calendar</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center mb-4">{error}</p>
                  <Button onClick={loadCalendarData} className="w-full">
                    Try Again
                </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              {renderView()}
            </div>
          )}
        </div>
        
        {/* Event legend */}
        <div className="w-64 hidden md:block">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Event Types</h3>
              <div className="space-y-2">
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm capitalize">
                      {status.replace(/-/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
              
              <h3 className="font-medium mt-6 mb-3">Your Tasks</h3>
              <div className="space-y-2">
                {events
                  .filter(event => event.task_id)
                  .slice(0, 5)
                  .map(event => (
                    <div 
                      key={event.id} 
                      className="p-2 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {event.project_name && (
                        <div className="text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <FolderIcon className="h-3 w-3 mr-1" />
                          {event.project_name}
                        </div>
                      )}
                      <div className="text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {format(new Date(event.start), 'MMM d')}
                      </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <CalendarEventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        selectedDate={selectedDate}
        event={selectedEvent}
        onEventAdded={handleEventAdded}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
};

export default Calendar; 