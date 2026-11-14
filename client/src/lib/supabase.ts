// ==============================================================================
// Z Institute Management System - Typed Supabase Client Singleton
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// In Vite, client environment variables are exposed via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful development warning if variables have not been configured yet
  console.warn(
    '[SupabaseClient] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
    'Please verify that your client/.env.local file is configured.'
  );
}

/**
 * Singleton Supabase Client instance with generic Database typing.
 * Direct PostgREST queries, auth methods, and RPC calls will inherit complete type inference.
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'z-institute-auth-token',
    },
  }
);

