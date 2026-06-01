-- This script allows anyone with a valid presentation link to view the presentation.
-- It bypasses the requirement for the user to be logged in just to view a presentation.

-- Allow public read access to the presentations table
CREATE POLICY "Allow public viewing of presentations" 
ON public.presentations
FOR SELECT
USING (true);
