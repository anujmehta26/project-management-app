'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/database'
import { useSession } from 'next-auth/react'
import { ProjectCard } from './ProjectCard'
import {  Button  } from '@/components/ui/button'
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {  Input  } from '@/components/ui/input'
import {  Textarea  } from '@/components/ui/textarea'
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue  } from '@/components/ui/select'
import { Pencil, Plus, Share, UserPlus, Users, Send, Info, MoreHorizontal, UserCog, UserMinus, MailIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (workspace?.id) {
      console.log('Loading projects for workspace:', workspace.id)
      loadProjects()
    }
    if (workspace && session) {
      setWorkspaceName(workspace.name)
      setIsOwner(session.user.id === workspace.user_id)
      
      // Load workspace members
      loadWorkspaceMembers()
    }
  }, [workspace?.id, workspace, session])

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

  const loadWorkspaceMembers = async () => {
    if (!workspace?.id) return
    
    try {
      const members = await db.getWorkspaceMembers(workspace.id)
      setWorkspaceMembers(members)
    } catch (error) {
      console.error("Error loading workspace members:", error)
      // If we fail to load members, at least ensure the owner is shown
      if (session?.user) {
        const ownerMember = {
          id: session.user.id,
          workspaceId: workspace.id,
          userId: session.user.id,
          name: session.user.name || 'Workspace Owner',
          email: session.user.email,
          role: 'Owner',
          avatar: session.user.image || null
        }
        setWorkspaceMembers([ownerMember])
      }
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

  const handleInviteMember = async () => {
    // This would actually send an invitation in a real implementation
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setError(null)
      // Call the database function to invite the member
      const result = await db.inviteWorkspaceMember(workspace.id, inviteEmail)
      
      // Add the invited user to our local state
      const newMember = {
        id: `temp-${Date.now()}`,
        workspaceId: workspace.id,
        userId: `pending-${Date.now()}`,
        name: inviteEmail.split('@')[0], // Use the part before @ as a mock name
        email: inviteEmail,
        role: 'Member',
        status: 'Pending',
        avatar: null
      }

      setWorkspaceMembers([...workspaceMembers, newMember])
      setInviteEmail('')
      // Keep the dialog open to potentially invite more users
    } catch (error) {
      console.error("Error inviting member:", error)
      setError(`Failed to invite member: ${error.message}`)
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      // Only proceed if this isn't the owner and the current user is the owner
      const memberToRemove = workspaceMembers.find(member => member.id === memberId)
      if (memberToRemove.role === 'Owner') {
        setError("You cannot remove the workspace owner")
        return
      }
      
      if (!isOwner) {
        setError("Only the workspace owner can remove members")
        return
      }

      // Call the database function to remove the member
      await db.removeWorkspaceMember(workspace.id, memberId)
      
      // Update the local state
      setWorkspaceMembers(workspaceMembers.filter(member => member.id !== memberId))
      setError(null)
    } catch (error) {
      console.error("Error removing member:", error)
      setError(`Failed to remove member: ${error.message}`)
    }
  }

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      // Only proceed if this isn't the owner and the current user is the owner
      const memberToUpdate = workspaceMembers.find(member => member.id === memberId)
      if (memberToUpdate.role === 'Owner') {
        setError("You cannot change the role of the workspace owner")
        return
      }
      
      if (!isOwner) {
        setError("Only the workspace owner can change member roles")
        return
      }

      // Call the database function to update the member's role
      await db.updateWorkspaceMemberRole(workspace.id, memberId, newRole)
      
      // Update the local state
      setWorkspaceMembers(workspaceMembers.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))
      setError(null)
    } catch (error) {
      console.error("Error updating member role:", error)
      setError(`Failed to update member role: ${error.message}`)
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShareDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Members</span>
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>Create Project</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''}</span>
        </Badge>
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

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
              <Share className="h-6 w-6 text-blue-600 dark:text-blue-400" /> 
              Invite Team Members
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Share your workspace with team members to collaborate on projects and tasks together.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="invite" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Invite New</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Manage Members</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invite" className="pt-4 pb-2">
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-1">
                    <Info className="h-4 w-4" /> Quick Tips
                  </h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 pl-6 list-disc">
                    <li>Team members will receive an email invitation</li>
                    <li>They'll have access to all projects in this workspace</li>
                    <li>You can manage permissions after they join</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emails" className="text-sm font-medium">Email Addresses</Label>
                    <Textarea 
                      id="emails" 
                      placeholder="Enter email addresses (separated by commas)"
                      className="resize-none h-20"
                    />
                    <p className="text-xs text-gray-500">
                      Example: john@example.com, sarah@company.co
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="role" className="text-sm font-medium">Member Role</Label>
                    <Select defaultValue="member">
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Can manage workspace settings)</SelectItem>
                        <SelectItem value="member">Member (Can edit projects and tasks)</SelectItem>
                        <SelectItem value="viewer">Viewer (Can only view content)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="message" className="text-sm font-medium">Personal Message (Optional)</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Add a personal note to your invitation..."
                      className="resize-none h-16"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
                  onClick={() => {
                    console.log('Invitation sent');
                    toast({
                      title: "Invites Sent!",
                      description: "Team members will receive an email invitation shortly.",
                      duration: 3000,
                    });
                    setShareDialogOpen(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitations
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="manage" className="pt-4">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-2">Current Members</h3>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
                    {workspaceMembers.map(member => (
                      <div key={member.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-blue-200 dark:border-blue-800">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white">{member.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {member.name} 
                              {member.status === 'Pending' && (
                                <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50 h-4 px-1">
                                  Pending
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                            <div className="text-xs text-gray-500">{member.role}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <UserCog className="h-4 w-4 mr-2" />
                              <span>Change Role</span>
                            </DropdownMenuItem>
                            {member.status === 'Pending' && (
                              <DropdownMenuItem>
                                <MailIcon className="h-4 w-4 mr-2" />
                                <span>Resend Invite</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 hover:text-red-700 focus:text-red-700">
                              <UserMinus className="h-4 w-4 mr-2" />
                              <span>Remove</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                    
                    {workspaceMembers.length === 0 && (
                      <div className="py-8 text-center text-gray-500 italic">
                        No members have been added yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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