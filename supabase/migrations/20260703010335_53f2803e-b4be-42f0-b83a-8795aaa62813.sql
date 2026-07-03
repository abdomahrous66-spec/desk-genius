
-- Add super_admin role for the primary owner (you). super_admins can manage other admins.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
