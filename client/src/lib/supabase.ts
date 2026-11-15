// ==============================================================================
// Z Institute Management System - Typed Supabase Client Singleton
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// In Vite, client environment variables are exposed via import.meta.env.
// Fallback directly to the production Z Institute Supabase project credentials if env vars are omitted in host dashboard.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://rununbjiqblmlttdmgxu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5JycCXBpmMTGi58sfGVwJA_aA4zyqyP';

// Fallback for Node test environments where native WebSocket is absent (e.g. Node < 22)
if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

/**
 * Singleton Supabase Client instance with generic Database typing.
 * Direct PostgREST queries, auth methods, and RPC calls will inherit complete type inference.
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'z-institute-auth-token',
    },
  }
);

