import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Get all SQL files in the migrations directory
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure consistent order
    
    console.log(`Found ${migrationFiles.length} migration files:`, migrationFiles);
    
    // Create migrations table if it doesn't exist
    try {
      const { error } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      if (error) {
        console.error('Error creating migrations table:', error);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error creating migrations table:', error);
      process.exit(1);
    }
    
    // Get already applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('migrations')
      .select('name');
    
    if (fetchError) {
      console.error('Error fetching applied migrations:', fetchError);
      process.exit(1);
    }
    
    const appliedMigrationNames = appliedMigrations?.map(m => m.name) || [];
    console.log('Already applied migrations:', appliedMigrationNames);
    
    // Run each migration that hasn't been applied yet
    for (const file of migrationFiles) {
      if (appliedMigrationNames.includes(file)) {
        console.log(`Migration ${file} already applied, skipping...`);
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      
      // Read and execute the SQL file
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const { error: migrationError } = await supabase.query(sql);
      
      if (migrationError) {
        console.error(`Error applying migration ${file}:`, migrationError);
        process.exit(1);
      }
      
      // Record the migration as applied
      const { error: recordError } = await supabase
        .from('migrations')
        .insert({ name: file });
      
      if (recordError) {
        console.error(`Error recording migration ${file}:`, recordError);
        process.exit(1);
      }
      
      console.log(`Successfully applied migration: ${file}`);
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Unexpected error during migrations:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations(); 