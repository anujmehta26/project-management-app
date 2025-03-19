import React from 'react';
import {  Card  } from '@/components/ui/card';

const GanttChart = ({ tasks }) => {
  // Get date range for the timeline
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // One week ago
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 14); // Two weeks ahead

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate position percentage for a task
  const getTaskPosition = (dueDate) => {
    const date = new Date(dueDate);
    const totalDays = 30;
    const daysPassed = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    const position = (daysPassed / totalDays) * 100;
    return Math.min(Math.max(position, 0), 100); // Clamp between 0 and 100
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Blocked': return 'bg-red-500';
      case 'In Review': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="p-4">
      {/* Timeline header */}
      <div className="flex justify-between mb-4 text-sm text-gray-500">
        <span>{formatDate(today)}</span>
        <span>{formatDate(endDate)}</span>
      </div>

      {/* Tasks timeline */}
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="relative">
            {/* Task info */}
            <div className="flex items-center mb-1">
              <span className="text-sm font-medium">{task.name}</span>
              <span className={`ml-2 w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
            </div>

            {/* Timeline bar */}
            <div className="h-6 bg-gray-100 rounded-full relative">
              {/* Today marker */}
              <div className="absolute top-0 bottom-0 w-px bg-blue-500 left-0" />
              
              {/* Task marker */}
              <div 
                className={`absolute top-1 bottom-1 rounded-full w-4 ${getStatusColor(task.status)}`}
                style={{ left: `calc(${getTaskPosition(task.dueDate)}% - 8px)` }}
                title={`Due: ${formatDate(task.dueDate)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GanttChart; 