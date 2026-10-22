-- stage-room (service role) now writes staging rows and owns the columns that
-- point at private masters. Clients may no longer set those columns, so a row
-- can't be aimed at another user's master or forge which model made it.
-- The legacy client insert keeps working (same columns as before) until every
-- deployed frontend uses the server-side save.
REVOKE INSERT, UPDATE ON public.stagings FROM authenticated, anon;
GRANT INSERT (
  id, user_id, original_image_url, staged_image_url, room_type, style,
  property_address, custom_instructions, aspect_ratio, mls_disclosure, staging_palette
) ON public.stagings TO authenticated;
GRANT UPDATE (share_token, property_address) ON public.stagings TO authenticated;
