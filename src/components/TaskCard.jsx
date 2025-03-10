'use client'

import React from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Trash2, Edit, ChevronDown, ChevronRight, Clock, Calendar, User } from 'lucide-react'
import { Badge } from './ui/badge'

const statusColors = {
  'not_started': 'bg-gray-200',
  'in_progress': 'bg-blue-200',
  'blocked': 'bg-red-200',
  'completed': 'bg-green-200',
  'in_review': 'bg-yellow-200'
};

const priorityColors = {
  'low': 'bg-blue-100 text-blue-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-red-100 text-red-800'
};

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete,
  expanded = false,
  onToggleExpand
}) {
  const statusColor = statusColors[task.status] || 'bg-gray-200';
  const priorityColor = priorityColors[task.priority] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={onToggleExpand}
              className="project-toggle-button"
            >
              {expanded ? 
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : 
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              }
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
              <span className="font-medium">{task.title}</span>
              <Badge className={priorityColor}>{task.priority}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(task)}
              className="w-8 h-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDelete(task.id)}
              className="w-8 h-8 p-0 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {task.description && (
              <div className="mb-3">{task.description}</div>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{task.estimated_hours || 0} hrs estimated</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span>{task.assigned_to?.length ? `${task.assigned_to.length} assigned` : 'Unassigned'}</span>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              Created {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'recently'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 