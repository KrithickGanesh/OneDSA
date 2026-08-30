import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function seedAll4041() {
  console.log('Fetching all 4041 LeetCode problems from https://leetcode.com/api/problems/all/ ...');
  const res = await fetch('https://leetcode.com/api/problems/all/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch LeetCode problems: ${res.status}`);
  }

  const data = await res.json();
  const pairs = data.stat_status_pairs || [];
  console.log(`Fetched ${pairs.length} total LeetCode problems. Preparing batch upsert...`);

  const difficultyMap = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

  const allRecords = pairs.map((p) => {
    const slug = p.stat.question__title_slug;
    const title = p.stat.question__title;
    const diffLevel = difficultyMap[p.difficulty.level] || 'Medium';

    return {
      platform: 'leetcode',
      platform_problem_id: slug,
      title: title,
      slug: slug,
      difficulty: diffLevel,
      tags: [],
      url: `https://leetcode.com/problems/${slug}/`,
      is_paid: p.paid_only || false,
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const { error } = await admin
      .from('problems')
      .upsert(batch, { onConflict: 'platform,platform_problem_id', ignoreDuplicates: false });

    if (error) {
      console.error(`Error on batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
      if (inserted % 500 === 0 || inserted === allRecords.length) {
        console.log(`Upserted ${inserted}/${allRecords.length} LeetCode problems...`);
      }
    }
  }

  console.log(`\n🎉 Successfully seeded all ${inserted} LeetCode problems into Supabase!`);
  
  const { count } = await admin.from('problems').select('*', { count: 'exact', head: true });
  console.log(`📊 Total problems currently in OneDSA DB: ${count}`);
}

seedAll4041().catch(console.error);
