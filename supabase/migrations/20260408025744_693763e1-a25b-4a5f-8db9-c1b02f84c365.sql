
ALTER TABLE public.meeting_attendees
  ADD CONSTRAINT meeting_attendees_meeting_user_unique UNIQUE (meeting_id, user_id);
