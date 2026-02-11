-- Create the items table for Omnispace
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('file', 'text', 'rectangle')),
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  content TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS items_created_at_idx ON items(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (no auth for now)
CREATE POLICY "Allow all operations for now" ON items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify table was created
SELECT * FROM items;
