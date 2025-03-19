# Calendar Feature Documentation

## Overview

The Calendar feature allows users to manage their schedule, view tasks with due dates, and coordinate with teammates. It provides day, week, and month views, and supports various status types for events.

## Features

- **Multiple Views**: Day, Week, and Month views for flexible scheduling
- **Status Events**: Create events with different statuses (Busy, Out of Office, Focus Time, Meeting, Available)
- **Task Integration**: Automatically displays tasks with due dates
- **Teammate Coordination**: View teammates' schedules when they share their calendars
- **Interactive Interface**: Click on any date to add a new event

## Components

### Calendar Component

The main Calendar component (`src/components/Calendar.jsx`) provides the calendar interface with the following features:

- Navigation controls (previous, next, today)
- View selection (day, week, month)
- Event display based on the selected view
- Teammate selection sidebar
- Status legend

### CalendarEventDialog Component

The CalendarEventDialog component (`src/components/CalendarEventDialog.jsx`) provides a form for adding new calendar events with the following fields:

- Title
- Description (optional)
- Status type (Busy, OOO, Focus Time, Meeting, Available)
- All-day toggle
- Start and end times (for non-all-day events)

## Database Structure

The calendar events are stored in the `calendar_events` table with the following structure:

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'busy', 'ooo', 'focus', 'meeting', 'available'
  start TIMESTAMP WITH TIME ZONE NOT NULL,
  end TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Database Functions

The following database functions are available in `src/lib/database.js`:

- `createCalendarEvent(eventData)`: Creates a new calendar event
- `getCalendarEvents(userId, startDate, endDate)`: Retrieves calendar events for a user within a date range
- `getTeammateEvents(teamIds, startDate, endDate)`: Retrieves calendar events for teammates within a date range
- `updateCalendarEvent(eventId, updates)`: Updates an existing calendar event
- `deleteCalendarEvent(eventId)`: Deletes a calendar event

## Usage

### Viewing the Calendar

1. Navigate to the Dashboard
2. Click on the "Calendar" tab
3. Use the tabs to switch between Day, Week, and Month views
4. Use the navigation buttons to move between dates

### Adding an Event

1. Click on a date in the calendar or click the "Add Event" button
2. Fill in the event details in the dialog
3. Click "Save Event" to create the event

### Viewing Teammate Schedules

1. In the Teammates sidebar, check the checkboxes next to teammates whose schedules you want to view
2. Their events will appear in your calendar view

## Status Types and Colors

- **Busy**: Orange - For general busy time
- **Out of Office (OOO)**: Red - For time away from work
- **Focus Time**: Purple - For deep work with minimal interruptions
- **Meeting**: Blue - For scheduled meetings
- **Available**: Green - For explicitly available time
- **Task**: Gray - For tasks with due dates

## Future Enhancements

- Event editing and deletion
- Recurring events
- Calendar sharing and permissions
- Integration with external calendars (Google, Outlook)
- Email/notification reminders
- Drag-and-drop event creation and modification

## Troubleshooting

If calendar events are not appearing:
1. Check that you have the correct date range selected
2. Verify that events have been created within that date range
3. For teammate events, ensure you have selected the teammate in the sidebar
4. Check the browser console for any error messages

## Database Migration

To create the necessary database tables, run:

```bash
npm run migrate
```

This will execute the SQL migration script in `src/lib/migrations/create_calendar_events_table.sql`. 