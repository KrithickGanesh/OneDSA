import { fetchLeetCodeProblems } from './sync/leetcode.ts';
import { fetchCodeforcesProblems } from './sync/codeforces.ts';
import { fetchHackerRankProblems } from './sync/hackerrank.ts';
import { fetchCodeChefProblems } from './sync/codechef.ts';
import { fetchGFGProblems } from './sync/gfg.ts';

async function testAll() {
  console.log('Testing GFG...');
  const gfg = await fetchGFGProblems();
  console.log('GFG problems count:', gfg.length);

  console.log('Testing Codeforces...');
  const cf = await fetchCodeforcesProblems();
  console.log('Codeforces problems count:', cf.length);

  console.log('Testing HackerRank...');
  const hr = await fetchHackerRankProblems();
  console.log('HackerRank problems count:', hr.length);

  console.log('Testing CodeChef...');
  const cc = await fetchCodeChefProblems();
  console.log('CodeChef problems count:', cc.length);

  console.log('Testing LeetCode...');
  const lc = await fetchLeetCodeProblems(100);
  console.log('LeetCode problems count:', lc.length);
}

testAll().catch(console.error);
