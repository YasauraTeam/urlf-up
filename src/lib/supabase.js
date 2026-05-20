import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('🚨 UrLife: Missing env vars');
}

const GLOBAL_KEY = '__urlife_supabase_client__';

export const supabase =
  globalThis[GLOBAL_KEY] ??
  (globalThis[GLOBAL_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'urlife-auth',
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 10 } },
    global: { headers: { 'x-application-name': 'urlife-web' } },
  }));

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return error ? null : data;
}

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UrLife: authentication required');
  return session;
}

export async function pingSupabase() {
  const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  return !error;
}
