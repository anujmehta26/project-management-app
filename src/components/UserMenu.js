'use client'

import React from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { CircleUserRound, Settings, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const UserMenu = ({ onLogout }) => {
  const { data: session } = useSession();
  
  const handleLogout = async () => {
    try {
      console.log('Logout process started');
      
      // First call the app's logout handler to update local state
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        console.warn('onLogout is not a function');
      }
      
      // Then sign out from next-auth
      const result = await signOut({ 
        redirect: false,
        callbackUrl: '/'
      });
      
      console.log('Logout successful, result:', result);
      
      // Force a refresh after a small delay to ensure session state is cleared
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // If there's an error during logout, reload the page as a fallback
      window.location.reload();
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 w-9 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center p-0"
        >
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name} 
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg" align="end">
        <DropdownMenuLabel className="px-2 py-2 text-gray-500 text-sm font-medium">
          {session?.user?.name || 'My Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuItem className="px-2 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md">
          <CircleUserRound className="mr-2 h-4 w-4 text-blue-600" />
          <span>{session?.user?.email}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md">
          <Settings className="mr-2 h-4 w-4 text-blue-600" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuItem 
          className="px-2 py-2 cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu; 