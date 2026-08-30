import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const CC_API_BASE = 'https://www.codechef.com/api/list/problems';
const HEADERS = {
  'User-Agent': 'OneDSA-Bot/1.0',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchCodeChefProblems(): Promise<Problem[]> {
  try {
    const url = `${CC_API_BASE}?page=0&limit=100&sort_by=difficulty_rating&sort_order=asc&search=&category=all&difficultyLevel=all`;
    const response = await fetchWithTimeout(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`CodeChef API error: ${response.status}`);
    
    const data = await response.json();
    const problemsData = data.data || [];
    const problems: Problem[] = [];

    for (const p of problemsData) {
      const rating = Number(p.difficulty_rating);
      let r = 1500;
      let level: "Easy" | "Medium" | "Hard" = "Medium";
      if(!isNaN(rating)) {
          const res = normalizeDifficulty('codechef', 'Medium', rating);
          r = res.rating;
          level = res.level;
      }
      
      const rawTags = (p.tags || []).map((t: any) => typeof t === 'string' ? t : (t.name || ''));
      
      problems.push({
        id: `cc-${p.code}`,
        platform: 'codechef',
        platformProblemId: p.code,
        title: p.name,
        url: `https://www.codechef.com/problems/${p.code}`,
        difficultyLevel: level,
        difficultyRating: r,
        tags: normalizeTags(rawTags),
        rawTags,
        totalSolved: p.successful_submissions || 0,
        isPremium: false,
      });
    }

    return problems;
  } catch (error) {
    console.error('CodeChef sync error:', error);
    return [];
  }
}

export async function fetchCodeChefUserSolved(handle: string): Promise<UserSolvedProblem[]> {
  try {
    // CodeChef user profile page contains solved problem codes in the HTML
    const profileUrl = `https://www.codechef.com/users/${handle}`;
    const response = await fetchWithTimeout(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    }, 15000);

    if (!response.ok) {
      console.error(`CodeChef profile fetch failed for ${handle}: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Extract solved problem codes from the profile HTML
    // CodeChef profile pages contain problem links in the "Fully Solved" section
    // Pattern: /problems/PROBLEMCODE appearing in the solved section
    const solvedProblems: UserSolvedProblem[] = [];
    const seenCodes = new Set<string>();

    // Method 1: Look for problem codes in the fully solved section
    // The HTML typically contains links like href="/problems/PROBLEMCODE"
    const problemLinkRegex = /href="\/problems\/([A-Z0-9_]+)"/gi;
    let match;
    while ((match = problemLinkRegex.exec(html)) !== null) {
      const code = match[1];
      // Filter out navigation/category links (these are usually short generic strings)
      if (code && code.length >= 2 && !seenCodes.has(code) && !/^(all|easy|medium|hard|school|beginner|practice)$/i.test(code)) {
        seenCodes.add(code);
        solvedProblems.push({
          platform: 'codechef',
          platformProblemId: code,
        });
      }
    }

    // Method 2: Also try to extract from JSON data embedded in the page
    // Some versions of the profile page embed user data as JSON
    const jsonDataMatch = html.match(/"fully_solved"\s*:\s*\{[^}]*"count"\s*:\s*\d+[^}]*\}/);
    if (jsonDataMatch) {
      // Try to extract problem codes from the JSON structure
      const codeMatches = jsonDataMatch[0].matchAll(/"([A-Z0-9_]{2,})"/g);
      for (const m of codeMatches) {
        const code = m[1];
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          solvedProblems.push({
            platform: 'codechef',
            platformProblemId: code,
          });
        }
      }
    }

    return solvedProblems;
  } catch (error) {
    console.error(`CodeChef user solved sync error for ${handle}:`, error);
    return [];
  }
}
