/**
 * seed_db.js — Capital/Enabler profile seeder for UrLife matching engine tests.
 *
 * Column mapping (profiles table → matching engine capital object):
 *   profiles.reputation  → capital.availableFunds
 *   profiles.interests[] → capital.preferredIndustries
 *   profiles.skills[]    → capital.skills
 *   profiles.role_type   = 'enabler' (all capital providers)
 *
 * Modes:
 *   FULL (SUPABASE_SERVICE_ROLE_KEY in .env.local) — creates auth users + patches profiles.
 *   VERIFY (anon key only) — confirms profiles exist and reports their state.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Config ──────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const raw = readFileSync(join(__dir, '.env.local'), 'utf8');
  return Object.fromEntries(
    raw.split('\n')
       .filter(l => l.trim() && !l.startsWith('#'))
       .map(l => l.split('=').map(s => s.trim()))
       .filter(([k]) => k)
       .map(([k, ...rest]) => [k, rest.join('=')])
  );
}

const env = loadEnv();
// Strip trailing /rest/v1/ — createClient needs the bare project URL
const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const ANON_KEY     = env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) { console.error('Missing VITE_SUPABASE_URL in .env.local'); process.exit(1); }
if (!ANON_KEY)     { console.error('Missing VITE_SUPABASE_ANON_KEY in .env.local'); process.exit(1); }

// ── Seed data ────────────────────────────────────────────────────────────────

const INVESTORS = [
  {
    id:       'a0000001-0000-0000-0000-000000000001',
    email:    'investor_a@seed.urlife.dev',
    fullName: 'Investor A (The Whale)',
    funds:    1_000_000,
    industry: 'AI',
    skills:   ['Scale', 'GoToMarket'],
  },
  {
    id:       'b0000002-0000-0000-0000-000000000002',
    email:    'investor_b@seed.urlife.dev',
    fullName: 'Investor B (The Tech VC)',
    funds:    500_000,
    industry: 'AI',
    skills:   ['Machine Learning'],
  },
  {
    id:       'c0000003-0000-0000-0000-000000000003',
    email:    'investor_c@seed.urlife.dev',
    fullName: 'Investor C (The Real Estate Guy)',
    funds:    3_000_000,
    industry: 'Real Estate',
    skills:   ['Operations'],
  },
  {
    id:       'd0000004-0000-0000-0000-000000000004',
    email:    'investor_d@seed.urlife.dev',
    fullName: 'Investor D (The Broke Noise)',
    funds:    50_000,
    industry: 'AI',
    skills:   ['Machine Learning'],
  },
  {
    id:       'e0000005-0000-0000-0000-000000000005',
    email:    'investor_e@seed.urlife.dev',
    fullName: 'Investor E (The Time Waster)',
    funds:    10_000,
    industry: 'Crypto',
    skills:   ['Community Management'],
  },
];

const SEED_IDS = INVESTORS.map(i => i.id);

// ── Full seed (service_role) ──────────────────────────────────────────────────

async function fullSeed(adminClient) {
  for (const inv of INVESTORS) {
    // Create auth user — triggers handle_new_user → auto-inserts profile
    const { error: authErr } = await adminClient.auth.admin.createUser({
      user_metadata: { full_name: inv.fullName, role: 'enabler', skills: inv.skills.join(',') },
      email:            inv.email,
      email_confirm:    true,
      id:               inv.id,
    });
    if (authErr && !authErr.message.includes('already been registered')) {
      throw new Error(`Auth create failed for ${inv.fullName}: ${authErr.message}`);
    }

    // Patch profile with industry (→ interests) and funds (→ reputation)
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ interests: [inv.industry], reputation: inv.funds })
      .eq('id', inv.id);
    if (profileErr) throw new Error(`Profile patch failed for ${inv.fullName}: ${profileErr.message}`);
  }
}

// ── Verify (anon key) ─────────────────────────────────────────────────────────

async function verify(client) {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role_type, skills, interests, reputation')
    .in('id', SEED_IDS)
    .order('reputation', { ascending: false });

  if (error) throw new Error(`Verify query failed: ${error.message}`);
  return data || [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  if (SERVICE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    await fullSeed(admin);
    const rows = await verify(admin);
    console.table(rows.map(r => ({
      Name:               r.full_name,
      Role:               r.role_type,
      availableFunds:     r.reputation,
      preferredIndustries: (r.interests || []).join(', '),
      skills:             (r.skills || []).join(', '),
    })));
  } else {
    // Verify-only mode — data already seeded via Supabase MCP / migration
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const rows = await verify(anon);
    if (rows.length !== INVESTORS.length) {
      console.error(`Expected ${INVESTORS.length} profiles, found ${rows.length}. Run with SUPABASE_SERVICE_ROLE_KEY to seed.`);
      process.exit(1);
    }
    console.table(rows.map(r => ({
      Name:                r.full_name,
      Role:                r.role_type,
      availableFunds:      r.reputation,
      preferredIndustries: (r.interests || []).join(', '),
      skills:              (r.skills || []).join(', '),
    })));
  }

  console.log('\nSEEDING COMPLETE');
})();
