import { supabase } from './supabase'

// Helper function to check if Supabase is connected
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('workspaces').select('count');
    if (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase connection check exception:', error);
    return false;
  }
};

export const db = {
  // Add mock data for development when Supabase is unavailable
  mockWorkspaces: [
    { 
      id: 'mock-1', 
      name: 'Marketing', 
      is_favorite: true, 
      created_at: new Date().toISOString(),
      user_id: 'current-user'
    },
    { 
      id: 'mock-2', 
      name: 'Development', 
      is_favorite: false, 
      created_at: new Date().toISOString(),
      user_id: 'current-user'
    },
    { 
      id: 'mock-3', 
      name: 'Design', 
      is_favorite: true, 
      created_at: new Date().toISOString(),
      user_id: 'current-user'
    }
  ],
  
  mockProjects: {
    'mock-1': 3,
    'mock-2': 5,
    'mock-3': 2
  },

  async createUser(userData) {
    try {
      console.log('Creating user with data:', userData);
      
      // Check connection first
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.warn('Using mock data due to Supabase connection issues');
        return { id: userData.id, name: userData.name, email: userData.email };
      }
      
      // First check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (existingUser) {
        console.log('User already exists:', existingUser);
        return existingUser;
      }
      
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            image: userData.image
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        return { id: userData.id, name: userData.name, email: userData.email };
      }
      
      console.log('User created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      return { id: userData.id, name: userData.name, email: userData.email };
    }
  },

  async getUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_preferences (*)
      `)
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateUserPreferences(userId, preferences) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        last_modified: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getWorkspaces(userId) {
    try {
      if (!userId) {
        console.error('User ID is required for getWorkspaces');
        return [];
      }
      
      // Check connection first
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.warn('Using mock workspaces due to Supabase connection issues');
        return this.mockWorkspaces.filter(w => w.user_id === 'current-user');
      }
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching workspaces:', error);
        return this.mockWorkspaces.filter(w => w.user_id === 'current-user');
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getWorkspaces:', error);
      return this.mockWorkspaces.filter(w => w.user_id === 'current-user');
    }
  },

  async createWorkspace({ name, userId }) {
    console.log("Creating workspace in database with userId:", userId);
    
    if (!userId) {
      throw new Error('User ID is required for createWorkspace');
    }
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ 
        name, 
        user_id: userId,
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (error) {
      console.error("Supabase error creating workspace:", error);
      throw error;
    }
    
    console.log("Workspace created in database:", data);
    return data[0];
  },

  async updateWorkspace(workspaceId, updates) {
    try {
      if (!workspaceId) throw new Error('Workspace ID is required')
      console.log('Updating workspace:', { workspaceId, updates })

      // Prepare update data with proper types
      const updateData = {
        last_modified: new Date().toISOString()
      }
      
      // Add name if provided
      if (updates.name) {
        updateData.name = updates.name.trim()
      }
      
      // Add description if provided
      if (updates.description !== undefined) {
        updateData.description = updates.description
      }
      
      // Add is_favorite if provided
      if (updates.is_favorite !== undefined) {
        updateData.is_favorite = updates.is_favorite
      }

      const { data, error } = await supabase
        .from('workspaces')
        .update(updateData)
        .eq('id', workspaceId)
        .select('*')
        .single()

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      console.log('Workspace updated successfully:', data)
      return data
    } catch (error) {
      console.error('Error in updateWorkspace:', error.message || error)
      throw error
    }
  },

  async deleteWorkspace(workspaceId) {
    try {
      if (!workspaceId) throw new Error('Workspace ID is required')

      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteWorkspace:', error)
      throw error
    }
  },

  async getProjects(userId, workspaceId = null) {
    try {
      if (!userId) {
        console.error('User ID is required for getProjects');
        return [];
      }
      
      // Add a delay to give Supabase time to connect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let query = supabase
        .from('projects')
        .select('*');
        
      // Add user_id filter if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      // Add workspace_id filter if provided
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query;
        
      if (error) {
        console.error('Supabase error details:', error);
        // Return empty array instead of throwing
        return [];
      }
        
      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      return [];
    }
  },

  async getTasks(projectId) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        comments:comments (
          id,
          content,
          created_at,
          user:users (
            name
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createProject(project) {
    try {
      // Check required fields
      if (!project.workspace_id) {
        throw new Error('Workspace ID is required for createProject');
      }

      // Create the insert object - omitting user_id since it doesn't exist in schema
      const projectData = {
        name: project.name,
        description: project.description || '',
        workspace_id: project.workspace_id,
        created_at: new Date().toISOString(),
        status: project.status || 'active'
        // user_id is omitted as it doesn't exist in the schema
      };

      console.log('Creating project with data:', projectData);

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select('*')
        .single();
        
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to create project: ${error.message}`);
      }
      
      return data.id;
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  },

  async createTask(projectId, taskData) {
    try {
      if (!projectId) throw new Error('Project ID is required')
      if (!taskData.userId) throw new Error('User ID is required')
      if (!taskData.title) throw new Error('Task title is required')

      const task = {
        project_id: projectId,
        title: taskData.title.trim(),
        description: taskData.description || '',
        status: taskData.status || 'not_started',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        estimated_hours: taskData.estimated_hours || 0,
        actual_hours: taskData.actual_hours || 0,
        created_by: taskData.userId.toString(),
        assigned_to: Array.isArray(taskData.assigned_to) 
          ? taskData.assigned_to.map(id => id.toString())
          : [taskData.userId.toString()],
        labels: taskData.labels || [],
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString()
      }

      console.log('Creating task:', task)

      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select(`
          *,
          comments (
            id,
            content,
            created_at,
            user_id
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  },

  async getProjectsWithTasks(workspaceId) {
    try {
      if (!workspaceId) throw new Error('Workspace ID is required')
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (
            *,
            comments (
              id,
              content,
              created_at,
              user_id
            )
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error in getProjectsWithTasks:', error)
      return []
    }
  },

  async addComment(taskId, userId, content) {
    try {
      console.log('Adding comment:', { taskId, userId, content });
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          task_id: taskId,
          user_id: userId,
          content: content
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase addComment error:', error);
        throw error;
      }

      console.log('Comment added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in addComment:', error);
      throw error;
    }
  },

  async updateProject(projectId, updates) {
    try {
      if (!projectId) throw new Error('Project ID is required')
      
      console.log('Updating project:', { projectId, updates })
      
      const updateData = {
        last_modified: new Date().toISOString()
      }
      
      if (updates.name) updateData.name = updates.name.trim()
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status) updateData.status = updates.status
      if (updates.priority) updateData.priority = updates.priority
      
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select('*')
        .single()
        
      if (error) {
        console.error('Error updating project:', error)
        throw error
      }
      
      console.log('Project updated successfully:', data)
      return data
    } catch (error) {
      console.error('Error in updateProject:', error)
      throw error
    }
  },

  async deleteProject(projectId) {
    try {
      if (!projectId) throw new Error('Project ID is required')
      
      console.log('Deleting project:', projectId)
      
      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
      
      if (error) {
        console.error('Error deleting project:', error)
        throw error
      }
      
      console.log('Project deleted successfully')
      return true
    } catch (error) {
      console.error('Error in deleteProject:', error)
      throw error
    }
  },

  async updateTask(taskId, updates) {
    try {
      if (!taskId) throw new Error('Task ID is required')
      
      const updateData = {
        last_modified: new Date().toISOString()
      }
      
      if (updates.title) updateData.title = updates.title.trim()
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status) updateData.status = updates.status
      if (updates.priority) updateData.priority = updates.priority
      if (updates.due_date) updateData.due_date = updates.due_date
      if (updates.assigned_to) {
        updateData.assigned_to = Array.isArray(updates.assigned_to) 
          ? updates.assigned_to.map(id => id.toString())
          : [updates.assigned_to.toString()]
      }
      if (updates.labels) updateData.labels = updates.labels
      if (updates.estimated_hours !== undefined) updateData.estimated_hours = updates.estimated_hours
      if (updates.actual_hours !== undefined) updateData.actual_hours = updates.actual_hours
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select('*')
        .single()
        
      if (error) {
        console.error('Error updating task:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in updateTask:', error)
      throw error
    }
  },

  async getTaskDetails(taskId) {
    try {
      if (!taskId) {
        console.error('Task ID is required for getTaskDetails');
        throw new Error('Task ID is required');
      }
      
      console.log(`Getting details for task ID: ${taskId}`);
      
      // First get the task data
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        console.error('Error fetching task details:', taskError);
        throw taskError;
      }
      
      if (!taskData) {
        console.error('Task not found');
        throw new Error('Task not found');
      }
      
      // Then get the comments for this task
      const comments = await this.getTaskComments(taskId);
      
      // Return the task with its comments
      return {
        ...taskData,
        comments: comments || []
      };
    } catch (error) {
      console.error('Error in getTaskDetails:', error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    try {
      if (!taskId) {
        console.error('Task ID is required for deleteTask');
        return { success: false, error: 'Task ID is required' };
      }
      
      // Add detailed logging
      console.log(`Attempting to delete task with ID: ${taskId}`);
      
      // First, delete any comments associated with the task
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('task_id', taskId);
        
      if (commentsError) {
        console.warn('Warning: Could not delete associated comments:', commentsError);
        // Continue with task deletion even if comment deletion fails
      }
      
      // Then, delete any task assignments
      const { error: assignmentsError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);
        
      if (assignmentsError) {
        console.warn('Warning: Could not delete associated task assignments:', assignmentsError);
        // Continue with task deletion even if assignment deletion fails
      }
      
      // Finally, delete the task itself
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        console.error('Supabase error deleting task:', error);
        return { success: false, error };
      }
      
      console.log('Task deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in deleteTask:', error);
      return { success: false, error };
    }
  },

  async getProjectCountsByWorkspace(userId) {
    try {
      if (!userId) {
        console.error('User ID is required for getProjectCountsByWorkspace');
        return {};
      }
      
      // Create a simple object to store counts
      const counts = {};
      
      // Get all workspaces first
      const workspaces = await this.getWorkspaces(userId);
      
      // For each workspace, count its projects
      for (const workspace of workspaces) {
        if (workspace.id) {
          // Get projects for this workspace
          const projects = await this.getProjectsForWorkspace(workspace.id);
          // Store the count
          counts[workspace.id] = projects.length;
        }
      }
      
      return counts;
    } catch (error) {
      console.error('Error in getProjectCountsByWorkspace:', error);
      return {};
    }
  },

  // Helper function to get projects for a specific workspace
  async getProjectsForWorkspace(workspaceId) {
    try {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId);
        
      if (error) {
        console.error('Error fetching workspace projects:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getProjectsForWorkspace:', error);
      return [];
    }
  },

  // Add a function to save a comment for a task
  async addTaskComment(taskId, commentData) {
    try {
      if (!taskId) throw new Error('Task ID is required');
      if (!commentData.content) throw new Error('Comment content is required');
      if (!commentData.user_id) throw new Error('User ID is required');
      
      console.log(`Adding comment to task ${taskId}:`, commentData);
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          content: commentData.content,
          user_id: commentData.user_id,
          created_at: new Date().toISOString()
        })
        .select('*, users:user_id (name)')
        .single();
        
      if (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addTaskComment:', error);
      throw error;
    }
  },

  // Get all comments for a task
  async getTaskComments(taskId) {
    try {
      if (!taskId) throw new Error('Task ID is required');
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (
            name,
            email,
            image
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching task comments:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getTaskComments:', error);
      return [];
    }
  },

  // Delete a comment
  async deleteComment(commentId) {
    try {
      if (!commentId) throw new Error('Comment ID is required');
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
        
      if (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteComment:', error);
      throw error;
    }
  },

  // Add this function to handle comment updates
  async updateComment(commentId, updates) {
    try {
      if (!commentId) throw new Error('Comment ID is required');
      if (!updates.content) throw new Error('Comment content is required');
      
      const { data, error } = await supabase
        .from('comments')
        .update({
          content: updates.content,
          last_modified: new Date().toISOString()
        })
        .eq('id', commentId)
        .select('*')
        .single();
        
      if (error) {
        console.error('Error updating comment:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateComment:', error);
      throw error;
    }
  },

  async getTasksForProject(projectId) {
    if (!projectId) {
      console.error('Error in getTasksForProject: No projectId provided');
      return [];
    }
    
    try {
      // Get the tasks with a simple query
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
        
      if (error) {
        console.error('Supabase error in getTasksForProject:', error);
        return [];
      }
      
      if (!data) {
        console.warn('No data returned from getTasksForProject for project:', projectId);
        return [];
      }
      
      console.log(`Retrieved ${data.length} tasks for project ${projectId}`);
      
      // Process tasks to handle assigned_to field
      const formattedTasks = await Promise.all(data.map(async (task) => {
        let owners = [];
        
        // Handle assigned_to array
        if (task.assigned_to && Array.isArray(task.assigned_to) && task.assigned_to.length > 0) {
          // Get user details for each assigned user ID
          const userIds = task.assigned_to;
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);
            
          if (userError) {
            console.error('Error fetching user data:', userError);
          } else if (userData) {
            owners = userData;
          }
        }
        
        return {
          ...task,
          owners
        };
      }));
      
      return formattedTasks;
    } catch (error) {
      console.error('Error in getTasksForProject:', error);
      return [];
    }
  }
} 