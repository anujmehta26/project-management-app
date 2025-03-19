-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON calendar_events(start);
CREATE INDEX IF NOT EXISTS calendar_events_end_idx ON calendar_events(end);

-- Add RLS policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy for selecting events
CREATE POLICY calendar_events_select_policy ON calendar_events
  FOR SELECT
  USING (
    -- Users can see their own events
    user_id = auth.uid() OR
    -- Users can see events of teammates (users in the same workspace)
    EXISTS (
      SELECT 1 FROM workspace_users wu1
      JOIN workspace_users wu2 ON wu1.workspace_id = wu2.workspace_id
      WHERE wu1.user_id = auth.uid() AND wu2.user_id = calendar_events.user_id
    )
  );

-- Policy for inserting events
CREATE POLICY calendar_events_insert_policy ON calendar_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy for updating events
CREATE POLICY calendar_events_update_policy ON calendar_events
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy for deleting events
CREATE POLICY calendar_events_delete_policy ON calendar_events
  FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_calendar_events_updated_at(); 