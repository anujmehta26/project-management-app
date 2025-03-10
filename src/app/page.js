'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LoginPage from '../components/LoginPage';
import WorkspacesPage from '../components/WorkspacesPage';
import ProjectManagementApp from '../components/ProjectManagementApp';
import Dashboard from '../components/Dashboard';
import LayoutWrapper from '../components/LayoutWrapper';

export default function Home() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState(null);

  // Monitor NextAuth session status
  useEffect(() => {
    console.log('Auth status changed:', status);
    if (status === 'authenticated' && session) {
      console.log('Setting isLoggedIn to true');
      setIsLoggedIn(true);
    } else if (status === 'unauthenticated') {
      console.log('Setting isLoggedIn to false');
      setIsLoggedIn(false);
    }
  }, [session, status]);

  // Add effect to log state changes for debugging
  useEffect(() => {
    console.log('Current view:', view);
    console.log('Selected workspace:', selectedWorkspace);
    console.log('Auth status:', status, 'IsLoggedIn:', isLoggedIn);
  }, [view, selectedWorkspace, status, isLoggedIn]);

  // Add global error boundary
  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setError(event.error);
      // Prevent the UI from disappearing by not propagating the error
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleLogin = () => {
    try {
      console.log('Login handler called');
      setIsLoggedIn(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err);
    }
  };

  const handleLogout = () => {
    console.log('Logout handler called');
    setIsLoggedIn(false);
    setSelectedWorkspace(null);
    setView('dashboard');
  };

  const handleSelectWorkspace = (workspace) => {
    console.log('Selecting workspace:', workspace);
    setSelectedWorkspace(workspace);
    setView('workspace');
  };

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setView('workspaces');
  };

  const handleNavigateToDashboard = () => {
    console.log('Navigating to dashboard from page.js');
    setSelectedWorkspace(null);
    setView('dashboard');
  };

  const handleNavigateToWorkspaces = () => {
    setView('workspaces');
  };

  // Handle errors with a user-friendly message
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-300">{error.message || 'Unknown error'}</p>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Show login page if user is not logged in
  if (!isLoggedIn || status === 'unauthenticated') {
    console.log('Rendering LoginPage');
    return <LoginPage onLogin={handleLogin} />;
  }

  console.log('Rendering with view:', view);

  // Render appropriate view based on state
  if (view === 'workspace' && selectedWorkspace) {
    return (
      <LayoutWrapper 
        showSidebar={true}
        onNavigateToDashboard={handleNavigateToDashboard}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceSelect={handleSelectWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        currentWorkspace={selectedWorkspace}
        onNavigateToWorkspaces={handleNavigateToWorkspaces}
        projects={[]}
      >
        <ProjectManagementApp 
          workspace={selectedWorkspace}
          onLogout={handleLogout}
          onBackToWorkspaces={handleBackToWorkspaces}
        />
      </LayoutWrapper>
    );
  }

  if (view === 'dashboard') {
    return (
      <LayoutWrapper
        showSidebar={true}
        onNavigateToDashboard={handleNavigateToDashboard}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceSelect={handleSelectWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        currentWorkspace={selectedWorkspace}
        onNavigateToWorkspaces={handleNavigateToWorkspaces}
      >
        <Dashboard 
          onSelectWorkspace={handleSelectWorkspace} 
          onLogout={handleLogout}
          onNavigateToWorkspaces={handleNavigateToWorkspaces}
        />
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper
      showSidebar={true}
      onNavigateToDashboard={handleNavigateToDashboard}
      selectedWorkspace={selectedWorkspace}
      onWorkspaceSelect={handleSelectWorkspace}
      onSelectWorkspace={handleSelectWorkspace}
      currentWorkspace={selectedWorkspace}
      onNavigateToWorkspaces={handleNavigateToWorkspaces}
    >
      <WorkspacesPage 
        onSelectWorkspace={handleSelectWorkspace} 
        onLogout={handleLogout}
      />
    </LayoutWrapper>
  );
}