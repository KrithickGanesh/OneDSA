import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { runAISearch } from './search/aiSearch.ts';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testAISearch() {
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users.users[0];
  const apiKey = env.SYSTEM_GEMINI_API_KEY || env.GEMINI_API_KEY;

  console.log('Testing AI Search with prompt "5 easy tree problems"...');
  try {
    const result = await runAISearch(admin, user?.id, "5 easy tree problems", apiKey);
    console.log('Result filters:', result.filters);
    console.log('Problems returned:', result.problems?.length);
    if (result.problems?.length > 0) {
      console.log('First problem:', result.problems[0]);
    }
  } catch (e) {
    console.error('AISearch execution error:', e);
  }
}

testAISearch().catch(console.error);
