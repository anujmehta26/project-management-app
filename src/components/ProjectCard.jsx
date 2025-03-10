'use client'

import { Card } from './ui/card'
import { format } from 'date-fns'

export function ProjectCard({ project }) {
  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">{project.name}</h3>
        <p className="text-sm text-gray-500">{project.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Status</h4>
          <p className="text-sm">{project.status}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Priority</h4>
          <p className="text-sm">{project.priority}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Start Date</h4>
          <p className="text-sm">
            {project.start_date ? format(new Date(project.start_date), 'PP') : 'Not set'}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Due Date</h4>
          <p className="text-sm">
            {project.due_date ? format(new Date(project.due_date), 'PP') : 'Not set'}
          </p>
        </div>
      </div>
    </Card>
  )
} 