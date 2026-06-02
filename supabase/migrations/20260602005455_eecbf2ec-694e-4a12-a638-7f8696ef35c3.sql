DROP POLICY IF EXISTS "Users post on own tickets" ON public.ticket_messages;

CREATE POLICY "Users post on own tickets"
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND is_staff_reply = false
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()
  )
);