
-- Enable RLS on realtime.messages (no-op if already enabled) and add a policy
-- scoping the 'staff_chat_messages' Realtime channel to staff/admin only.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff only subscribe to staff_chat_messages channel" ON realtime.messages;

CREATE POLICY "Staff only subscribe to staff_chat_messages channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() <> 'staff_chat_messages')
  OR public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
