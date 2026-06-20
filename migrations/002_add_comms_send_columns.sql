-- Add email send tracking columns to communications table
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;
