'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { format, addHours, startOfDay, endOfDay } from 'date-fns';
import { db } from '../lib/database';
import { useSession } from 'next-auth/react';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

const CalendarEventDialog = ({ 
  open, 
  onOpenChange, 
  selectedDate, 
  event = null,
  onEventAdded,
  onEventUpdated
}) => {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('busy');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Reset form when dialog opens or event changes
  useEffect(() => {
    if (open) {
      if (event) {
        // We're in edit mode
        setIsEditMode(true);
        setTitle(event.title || '');
        setDescription(event.description || '');
        setEventType(event.type || 'busy');
        setAllDay(event.all_day || false);
        
        // Parse start and end times
        if (event.start) {
          const startDate = new Date(event.start);
          setStartTime(format(startDate, 'HH:mm'));
          
          if (event.end) {
            const endDate = new Date(event.end);
            setEndTime(format(endDate, 'HH:mm'));
          } else {
            // Default to 1 hour later if no end time
            setEndTime(format(addHours(startDate, 1), 'HH:mm'));
          }
        }
      } else {
        // We're in create mode
        setIsEditMode(false);
        setTitle('');
        setDescription('');
        setEventType('busy');
        setStartTime('09:00');
        setEndTime('10:00');
        setAllDay(false);
      }
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [open, event]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError('You must be logged in to create events');
      return;
    }
    
    if (!selectedDate) {
      setError('No date selected');
      return;
    }
    
    // Validate times
    const startDateTime = new Date(selectedDate);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(selectedDate);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);
    
    if (!allDay && endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Prepare event data - removed project_id and task_id
      const eventData = {
        user_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        start_time: allDay ? startOfDay(startDateTime).toISOString() : startDateTime.toISOString(),
        end_time: allDay ? endOfDay(endDateTime).toISOString() : endDateTime.toISOString(),
        all_day: allDay,
        type: eventType || 'busy'
      };
      
      console.log('Submitting event data:', eventData);
      
      let savedEvent;
      
      if (isEditMode && event) {
        // Update existing event
        savedEvent = await db.updateCalendarEvent(event.id, eventData);
        
        console.log('Event updated successfully:', savedEvent);
        
        // Call onEventUpdated callback
        if (onEventUpdated) {
          onEventUpdated(savedEvent);
        }
      } else {
        // Save new event to database
        savedEvent = await db.createCalendarEvent(eventData);
        
        console.log('Event saved successfully:', savedEvent);
        
        // Call onEventAdded callback
        if (onEventAdded) {
          onEventAdded(savedEvent);
        }
      }
      
      // Close dialog
      onOpenChange(false);
      
    } catch (error) {
      console.error('Failed to save event:', error);
      setError(error.message || 'Failed to save event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!event || !event.id) {
      setError('No event to delete');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Deleting event:', event.id);
      const result = await db.deleteCalendarEvent(event.id);
      
      if (!result) {
        throw new Error('Failed to delete event');
      }
      
      console.log('Event deleted successfully');
      
      // Close dialog
      onOpenChange(false);
      
      // Remove event from state via callback
      if (onEventUpdated) {
        // We can use onEventUpdated to signal deletion by passing null
        onEventUpdated(null);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      setError(error.message || 'Failed to delete event. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Calendar Event' : 'Add Calendar Event'}</DialogTitle>
          <DialogDescription>
            {selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md flex items-start mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          </div>
        )}
        
        {showDeleteConfirm ? (
          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Event'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event description"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="event-type">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger id="event-type">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="out-of-office">Out of Office</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="all-day" 
                    checked={allDay} 
                    onCheckedChange={setAllDay}
                  />
                  <Label htmlFor="all-day" className="cursor-pointer">All day event</Label>
                </div>
                
                {!allDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex justify-between pt-4">
              <div>
                {isEditMode && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Event' : 'Save Event'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CalendarEventDialog; 