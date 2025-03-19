'use client'

import {  Button  } from '@/components/ui/button';
import {  Card  } from '@/components/ui/card';
import { MoreVertical, Edit2, Trash2, Users, Calendar } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';

const WorkspaceCard = ({ workspace, onClick, onDelete, onEdit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        onClick={onClick}
        className="group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm w-[280px] cursor-pointer"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                {workspace.name}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-xs text-gray-500">
                <Users className="w-3.5 h-3.5 mr-2" />
                {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Created {new Date(workspace.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                className="h-7 w-7 p-0"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md p-1"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(workspace);
                }}
                className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-md cursor-pointer"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workspace);
                }}
                className="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </motion.div>
  );
};

export default WorkspaceCard; 