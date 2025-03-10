'use client'

import { useState } from 'react'
import { CreateProjectDialog } from './CreateProjectDialog'
import { db } from '@/lib/database'
import { useSession } from 'next-auth/react'

export default function WorkspaceList({ workspaces, onWorkspaceClick, onDeleteWorkspace, onEditWorkspace }) {
  const { data: session } = useSession()
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  const handleCreateProject = async (workspaceId, projectData) => {
    try {
      if (!session?.user?.id) return

      const project = await db.createProject(workspaceId, {
        ...projectData,
        userId: session.user.id
      })

      console.log('Project created:', project)
      // Optionally refresh the workspace list or update the UI
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  return (
    <div>
      {/* Your existing workspace list code */}
      
      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onCreateProject={handleCreateProject}
        workspaceId={selectedWorkspace?.id}
      />
    </div>
  )
} 