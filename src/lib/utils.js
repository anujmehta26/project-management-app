import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Add a utility function to get consistent workspace colors
export const getWorkspaceColor = (workspaceId) => {
  // Professional color palette
  const folderColors = [
    { folder: 'bg-blue-500', folderLight: 'bg-blue-400', icon: 'bg-blue-100 text-blue-600' },
    { folder: 'bg-indigo-500', folderLight: 'bg-indigo-400', icon: 'bg-indigo-100 text-indigo-600' },
    { folder: 'bg-purple-500', folderLight: 'bg-purple-400', icon: 'bg-purple-100 text-purple-600' },
    { folder: 'bg-green-500', folderLight: 'bg-green-400', icon: 'bg-green-100 text-green-600' },
    { folder: 'bg-yellow-500', folderLight: 'bg-yellow-400', icon: 'bg-yellow-100 text-yellow-600' },
    { folder: 'bg-orange-500', folderLight: 'bg-orange-400', icon: 'bg-orange-100 text-orange-600' },
    { folder: 'bg-red-500', folderLight: 'bg-red-400', icon: 'bg-red-100 text-red-600' },
    { folder: 'bg-teal-500', folderLight: 'bg-teal-400', icon: 'bg-teal-100 text-teal-600' }
  ];
  
  // Generate a consistent color for each workspace based on its ID
  const colorIndex = typeof workspaceId === 'string' 
    ? workspaceId.charCodeAt(0) % folderColors.length
    : 0;
    
  return folderColors[colorIndex];
};

// Add a utility function to get consistent user colors
export const getUserColor = (userId) => {
  if (!userId) return '#6366F1'; // Default indigo color
  
  // Bright color palette
  const colors = [
    '#FF5733', // Bright Red
    '#33FF57', // Bright Green
    '#3357FF', // Bright Blue
    '#FF33F5', // Bright Pink
    '#F5FF33', // Bright Yellow
    '#33FFF5', // Bright Cyan
    '#FF8333', // Bright Orange
    '#8333FF', // Bright Purple
    '#33FF83', // Bright Mint
    '#FF3383', // Bright Rose
  ];
  
  // Generate a consistent index based on the userId
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
};