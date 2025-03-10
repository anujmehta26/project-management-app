'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Calendar } from 'lucide-react'
import { Label } from './ui/label'
import { useSession } from 'next-auth/react'
import { db } from '../lib/database'
import { cn } from '../lib/utils'

const TaskForm = ({ 
  projectId, 
  task = null, 
  onTaskCreated, 
  onTaskUpdated,
  onCancel
}) => {
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('not_started')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState(null)
  const [estimatedHours, setEstimatedHours] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setStatus(task.status || 'not_started')
      setPriority(task.priority || 'medium')
      setDueDate(task.due_date ? new Date(task.due_date) : null)
      setEstimatedHours(task.estimated_hours || 0)
    }
  }, [task])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('Task title is required')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const taskData = {
        title: title.trim(),
        description,
        status,
        priority,
        due_date: dueDate,
        estimated_hours: parseFloat(estimatedHours) || 0,
        actual_hours: task?.actual_hours || 0
      }
      
      if (task) {
        // Update existing task
        await onTaskUpdated(projectId, task.id, taskData)
      } else {
        // Create new task
        await onTaskCreated(projectId, taskData)
      }
      
      // Reset form
      if (!task) {
        setTitle('')
        setDescription('')
        setStatus('not_started')
        setPriority('medium')
        setDueDate(null)
        setEstimatedHours(0)
      }
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('Failed to save task: ' + (error.message || 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <DatePickerField
            id="dueDate"
            selected={dueDate}
            onSelect={setDueDate}
            placeholderText="Select due date"
          />
        </div>
        
        <div>
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}

const DatePickerField = ({
  selected,
  onSelect,
  placeholderText = "Pick a date",
  id
}) => {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <Calendar className="h-4 w-4 text-gray-500" />
      </div>
      <input
        id={id}
        type="date"
        className="w-full pl-10 py-2 border rounded-md"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          if (e.target.value) {
            onSelect(new Date(e.target.value))
          } else {
            onSelect(null)
          }
        }}
      />
    </div>
  )
}

export default TaskForm 