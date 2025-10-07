const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
// Using anon key for now - we'll need the service role key from your .env or config
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NDcyNDcsImV4cCI6MjA1MTEyMzI0N30.YOUR_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read the setup-products.sql file
    const sqlContent = fs.readFileSync('./setup-products.sql', 'utf8');
    
    console.log('Executing SQL:', sqlContent.substring(0, 100) + '...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
    } else {
      console.log('Database setup completed successfully!');
      console.log('Result:', data);
    }
    
  } catch (err) {
    console.error('Setup failed:', err.message);
  }
}

setupDatabase();