import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fetchLeetCodeProblems } from './sync/leetcode.ts';
import { fetchCodeforcesProblems } from './sync/codeforces.ts';
import { fetchHackerRankProblems } from './sync/hackerrank.ts';
import { fetchCodeChefProblems } from './sync/codechef.ts';
import { fetchGFGProblems } from './sync/gfg.ts';

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

async function seedAll() {
  console.log('--- Starting Multi-Platform Problem Catalog Seeding ---');

  const platforms = [
    { name: 'leetcode', fetcher: () => fetchLeetCodeProblems(250) },
    { name: 'codeforces', fetcher: async () => (await fetchCodeforcesProblems()).slice(0, 300) },
    { name: 'hackerrank', fetcher: fetchHackerRankProblems },
    { name: 'codechef', fetcher: fetchCodeChefProblems },
    { name: 'gfg', fetcher: fetchGFGProblems },
  ];

  let total = 0;

  for (const { name, fetcher } of platforms) {
    console.log(`\nFetching ${name} problems...`);
    try {
      const problems = await fetcher();
      console.log(`Fetched ${problems.length} problems for ${name}. Upserting to Supabase...`);

      const BATCH_SIZE = 50;
      let inserted = 0;

      for (let i = 0; i < problems.length; i += BATCH_SIZE) {
        const batch = problems.slice(i, i + BATCH_SIZE).map((p) => ({
          platform: p.platform,
          platform_problem_id: p.platformProblemId,
          title: p.title,
          slug: p.platformProblemId,
          difficulty: p.difficultyLevel || 'Medium',
          tags: p.tags || [],
          url: p.url,
          is_paid: p.isPremium || false,
        }));

        const { error } = await admin
          .from('problems')
          .upsert(batch, { onConflict: 'platform,platform_problem_id', ignoreDuplicates: false });

        if (error) {
          console.error(`Error batch upserting ${name}:`, error.message);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`✅ Successfully seeded ${inserted} problems for ${name}`);
      total += inserted;
    } catch (err) {
      console.error(`❌ Failed to seed ${name}:`, err.message);
    }
  }

  console.log(`\n🎉 Completed! Total problems seeded into Supabase: ${total}`);

  // Final count check
  const { count } = await admin.from('problems').select('*', { count: 'exact', head: true });
  console.log(`📊 Total problems currently in OneDSA DB: ${count}`);
}

seedAll().catch(console.error);
