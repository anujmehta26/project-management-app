'use client'

import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { signIn, useSession } from 'next-auth/react';

const LoginPage = ({ onLogin }) => {
  const { data: session, status } = useSession();

  // This effect runs when session or status changes
  useEffect(() => {
    console.log('Session status changed:', status);
    // Only proceed if we have a session and the status is "authenticated"
    if (session?.user && status === "authenticated") {
      console.log('Session authenticated, calling onLogin');
      onLogin({
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        id: session.user.id
      });
    }
  }, [session, onLogin, status]);

  const handleSignIn = async () => {
    try {
      console.log('Sign in button clicked');
      const result = await signIn('google', { 
        callbackUrl: window.location.origin,
        redirect: false // Don't redirect, let the useEffect handle it
      });
      
      console.log('Sign-in result:', result);
      
      // If there was an error during sign-in
      if (result?.error) {
        console.error('Sign in error from result:', result.error);
      }
    } catch (error) {
      console.error('Sign in exception:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Logo and title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600 mb-2">
            ProManage
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Your projects, perfectly organized
          </p>
        </div>

        {/* Sign in button */}
        <div className="pt-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 flex items-center justify-center gap-3"
            onClick={handleSignIn}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-base font-medium">Sign in with Google</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 