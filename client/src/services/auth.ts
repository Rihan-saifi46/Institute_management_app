// ==============================================================================
// Z Institute Management System - Authentication Service Layer
// ==============================================================================

import { supabase } from '../lib/supabase';
import type { Database, AdminRole } from '../types/database';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export type AdminProfile = Database['public']['Tables']['admins']['Row'];

export interface AuthState {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  role: AdminRole | null;
  isLoading: boolean;
}

/**
 * Sign in using email and password against Supabase Auth.
 */
export async function signIn(email: string, password: string):Promise<{ session: Session | null; user: User | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { session: data.session, user: data.user };
}

/**
 * Sign out the current session and clear stored tokens.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Retrieve active session from client storage.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[AuthService] Error fetching session:', error.message);
    return null;
  }
  return data.session;
}

/**
 * Retrieve the current authenticated Supabase user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

/**
 * Fetch the public admin profile and authorization role for the authenticated user.
 */
export async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[AuthService] Error fetching admin profile:', error.message);
    return null;
  }

  return data;
}

/**
 * Subscribe to Supabase Auth state changes (sign in, sign out, token refresh).
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

