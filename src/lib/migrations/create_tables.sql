-- First clean up everything
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user ();

drop table if exists public.calendar_events;

drop table if exists public.comments;

drop table if exists public.tasks;

drop table if exists public.projects;

drop table if exists public.workspaces;

drop table if exists public.users;

-- Create users table
create table public.users (
  id text primary key,
  email text not null,
  name text,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Create workspaces table
create table public.workspaces (
  id uuid default uuid_generate_v4 () primary key,
  name text not null,
  user_id text references public.users (id) on delete cascade,
  description text default '',
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone ('utc'::text, now()) not null,
  is_favorite boolean default false,
  member_count integer default 1
);

-- Create projects table
create table public.projects (
  id uuid default uuid_generate_v4 () primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  name text not null,
  description text default '',
  status text default 'active',
  priority text default 'medium',
  start_date timestamp with time zone,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone ('utc'::text, now()) not null,
  created_by text references public.users (id)
);

-- Create tasks table
create table public.tasks (
  id uuid default uuid_generate_v4 () primary key,
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  description text default '',
  status text default 'not_started',
  priority text default 'medium',
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone ('utc'::text, now()) not null,
  created_by text references public.users (id),
  assigned_to text[] default array[]::text[],
  labels text[] default array[]::text[],
  estimated_hours numeric(5, 2) default 0,
  actual_hours numeric(5, 2) default 0
);

-- Create comments table
create table public.comments (
  id uuid default uuid_generate_v4 () primary key,
  task_id uuid references public.tasks (id) on delete cascade,
  user_id text references public.users (id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Create calendar events table
create table public.calendar_events (
  id uuid default uuid_generate_v4 () primary key,
  user_id text references public.users (id) on delete cascade,
  title text not null,
  description text default '',
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  all_day boolean default false,
  type text default 'meeting',
  status text default 'confirmed',
  location text default '',
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  last_modified timestamp with time zone default timezone ('utc'::text, now()) not null,
  is_recurring boolean default false,
  recurrence_rule text default '',
  visibility text default 'private'
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Member', 'Viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  invitation_status TEXT NOT NULL DEFAULT 'Pending' CHECK (invitation_status IN ('Pending', 'Accepted', 'Rejected')),
  invitation_email TEXT,
  UNIQUE(workspace_id, user_id)
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members(user_id);

-- Create a function to automatically add workspace creator as Owner
CREATE OR REPLACE FUNCTION add_workspace_owner() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role, invitation_status)
  VALUES (NEW.id, NEW.user_id, 'Owner', 'Accepted');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically add workspace creator as Owner
DROP TRIGGER IF EXISTS add_workspace_owner_trigger ON workspaces;
CREATE TRIGGER add_workspace_owner_trigger
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION add_workspace_owner();

-- Create a function to update workspace member count
CREATE OR REPLACE FUNCTION update_workspace_member_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.invitation_status = 'Accepted' THEN
    UPDATE workspaces SET member_count = member_count + 1 WHERE id = NEW.workspace_id;
  ELSIF TG_OP = 'DELETE' AND OLD.invitation_status = 'Accepted' THEN
    UPDATE workspaces SET member_count = member_count - 1 WHERE id = OLD.workspace_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.invitation_status = 'Accepted' AND OLD.invitation_status != 'Accepted' THEN
    UPDATE workspaces SET member_count = member_count + 1 WHERE id = NEW.workspace_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.invitation_status != 'Accepted' AND OLD.invitation_status = 'Accepted' THEN
    UPDATE workspaces SET member_count = member_count - 1 WHERE id = NEW.workspace_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update workspace member count
DROP TRIGGER IF EXISTS update_workspace_member_count_insert ON workspace_members;
CREATE TRIGGER update_workspace_member_count_insert
AFTER INSERT ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION update_workspace_member_count();

DROP TRIGGER IF EXISTS update_workspace_member_count_delete ON workspace_members;
CREATE TRIGGER update_workspace_member_count_delete
AFTER DELETE ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION update_workspace_member_count();

DROP TRIGGER IF EXISTS update_workspace_member_count_update ON workspace_members;
CREATE TRIGGER update_workspace_member_count_update
AFTER UPDATE OF invitation_status ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION update_workspace_member_count();

-- Create function to handle new users
create or replace function public.handle_new_user () returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new users
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user ();

-- Create indexes for better performance
create index if not exists idx_workspaces_user_id on public.workspaces (user_id);

create index if not exists idx_projects_workspace_id on public.projects (workspace_id);

create index if not exists idx_tasks_project_id on public.tasks (project_id);

create index if not exists idx_comments_task_id on public.comments (task_id);

create index if not exists idx_calendar_events_user_id on public.calendar_events (user_id);

create index if not exists idx_calendar_events_start_time on public.calendar_events (start_time);

create index if not exists idx_calendar_events_end_time on public.calendar_events (end_time);

-- Disable RLS for now
alter table public.users disable row level security;

alter table public.workspaces disable row level security;

alter table public.projects disable row level security;

alter table public.tasks disable row level security;

alter table public.comments disable row level security;

alter table public.calendar_events disable row level security;

-- Grant necessary permissions
grant usage on schema public to anon,
authenticated;

grant all on all tables in schema public to anon,
authenticated;

grant all on all sequences in schema public to anon,
authenticated;

-- Verify setup
do $$
begin
  raise notice 'Database setup completed successfully!';
  
  -- Count existing records
  raise notice 'Current record counts:';
  raise notice 'Users: %', (select count(*) from public.users);
  raise notice 'Workspaces: %', (select count(*) from public.workspaces);
  raise notice 'Projects: %', (select count(*) from public.projects);
  raise notice 'Tasks: %', (select count(*) from public.tasks);
  raise notice 'Comments: %', (select count(*) from public.comments);
  raise notice 'Calendar Events: %', (select count(*) from public.calendar_events);
end $$; 