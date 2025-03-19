'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const MentionInput = ({ value, onChange, users }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      const selected = value
        .map(name => users.find(u => u.name === name))
        .filter(Boolean);
      setSelectedUsers(selected);
    } else {
      setSelectedUsers([]);
    }
  }, [value, users]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleUser = (user) => {
    let newSelectedUsers;
    if (selectedUsers.find(u => u.id === user.id)) {
      newSelectedUsers = selectedUsers.filter(u => u.id !== user.id);
    } else {
      if (selectedUsers.length >= 3) return;
      newSelectedUsers = [...selectedUsers, user];
    }
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers.map(u => u.name));
  };

  const getInitials = (name) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-200 cursor-pointer"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {selectedUsers.length > 0 ? (
          <div className="flex items-center gap-1">
            {selectedUsers.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white",
                  index === 0 ? "bg-blue-500" :
                  index === 1 ? "bg-emerald-500" : "bg-rose-500"
                )}
                title={user.name}
              >
                <span className="text-xs font-medium">{getInitials(user.name)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Select task owner</div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg z-50">
          <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => handleToggleUser(user)}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  selectedUsers.find(u => u.id === user.id)
                    ? "bg-blue-500 border-blue-500" 
                    : "border-gray-300"
                )}>
                  {selectedUsers.find(u => u.id === user.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-900">{user.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MentionInput; 