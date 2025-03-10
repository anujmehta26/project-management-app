'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/database'
import { useSession } from 'next-auth/react'
import { ProjectCard } from './ProjectCard'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Pencil } from 'lucide-react'

export default function WorkspacePage({ workspace }) {
  const { data: session } = useSession()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState(workspace.name)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    start_date: null,
    due_date: null
  })

  useEffect(() => {
    if (workspace?.id) {
      console.log('Loading projects for workspace:', workspace.id)
      loadProjects()
    }
  }, [workspace?.id])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await db.getProjectsWithTasks(workspace.id)
      console.log('Loaded projects:', data)
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.error('Expected array of projects but got:', data)
        setProjects([])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    try {
      if (!session?.user?.id) {
        console.error('No user ID found')
        return
      }

      const projectData = {
        name: newProject.name,
        description: newProject.description,
        status: newProject.status,
        priority: newProject.priority,
        userId: session.user.id
      }

      await db.createProject(workspace.id, projectData)
      
      // Reload all projects after creation
      await loadProjects()
      
      setCreateDialogOpen(false)
      setNewProject({
        name: '',
        description: '',
        status: 'active',
        priority: 'medium'
      })
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    try {
      if (!workspaceName.trim()) {
        throw new Error('Workspace name cannot be empty')
      }

      setIsUpdating(true)
      console.log('Updating workspace name:', {
        workspaceId: workspace.id,
        newName: workspaceName
      })

      const updatedWorkspace = await db.updateWorkspace(workspace.id, {
        name: workspaceName.trim()
      })

      console.log('Update successful:', updatedWorkspace)
      
      // Update local state
      workspace.name = updatedWorkspace.name
      setWorkspaceName(updatedWorkspace.name)
      setEditNameDialogOpen(false)
    } catch (error) {
      console.error('Failed to update workspace name:', error.message || error)
      // Here you might want to add some user feedback
      alert('Failed to update workspace name: ' + (error.message || 'Unknown error'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setEditNameDialogOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>Create Project</Button>
      </div>

      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace Name</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditNameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newProject.name}
                onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newProject.description}
                onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newProject.status}
                  onValueChange={value => setNewProject(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={newProject.priority}
                  onValueChange={value => setNewProject(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div>Loading projects...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
} 