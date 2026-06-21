-- Migration: Add is_archived column to tickets table
-- Date: 2024-12-20
-- Description: Adds a soft-delete functionality to archive completed/resolved tickets

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Add index for faster queries filtering archived tickets
CREATE INDEX IF NOT EXISTS idx_tickets_is_archived ON tickets(is_archived);

-- Create index for combined status and archive filtering
CREATE INDEX IF NOT EXISTS idx_tickets_status_archived ON tickets(status, is_archived);

-- Add comment to the column
COMMENT ON COLUMN tickets.is_archived IS 'Marks the ticket as archived (soft delete). When true, ticket is hidden from normal views.';
