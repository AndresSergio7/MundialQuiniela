import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

/** URL absoluta permitida en Supabase (Auth → URL configuration → Redirect URLs). */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw new AppError('AUTH_RESET_EMAIL_FAILED', error.message);
}

interface SignUpMetadata {
  username?: string;
  fullName?: string;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AppError('AUTH_SIGN_IN_FAILED', error.message);
  return data.session;
}

export async function signUp(email: string, password: string, metadata?: SignUpMetadata) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: metadata
      ? {
          data: {
            username: metadata.username,
            full_name: metadata.fullName,
          },
        }
      : undefined,
  });
  if (error) throw new AppError('AUTH_SIGN_UP_FAILED', error.message);
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError('AUTH_SIGN_OUT_FAILED', error.message);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AppError('AUTH_GET_SESSION_FAILED', error.message);
  return data.session;
}
