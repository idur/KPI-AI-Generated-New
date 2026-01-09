-- Create a function to sync emails from auth.users to public.user_tokens
-- This is necessary because we cannot directly access auth.users from the client-side
-- and we want to populate the 'email' column in user_tokens for the Admin Dashboard.

CREATE OR REPLACE FUNCTION public.sync_user_emails()
RETURNS void AS $$
BEGIN
  UPDATE public.user_tokens ut
  SET email = au.email
  FROM auth.users au
  WHERE ut.user_id = au.id
  AND ut.email IS DISTINCT FROM au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expose it via an efficient query or just run it once.
-- Ideally, we just run this update statement directly.

UPDATE public.user_tokens ut
SET email = au.email
FROM auth.users au
WHERE ut.user_id = au.id
AND ut.email IS NULL;

-- Optional: Create a Trigger to keep it in sync automatically for new updates (though our app logic handles it too)
-- This is strictly optional but good for robustness.
