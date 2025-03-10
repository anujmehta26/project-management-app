'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useSession } from 'next-auth/react'
import { db } from '../lib/database'

export function ProjectForm({ workspaceId, onProjectCreated, onCancel }) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      
      if (!name.trim()) {
        throw new Error('Project name is required')
      }
      
      const projectData = {
        name: name.trim(),
        userId: session?.user?.id
      }

      console.log('Creating project with data:', projectData)
      const project = await db.createProject(workspaceId, projectData)
      console.log('Project created:', project)
      onProjectCreated(project)
    } catch (error) {
      console.error('Failed to create project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Project Name *</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter project name"
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
} 