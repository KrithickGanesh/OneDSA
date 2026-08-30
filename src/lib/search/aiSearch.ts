import { SupabaseClient } from '@supabase/supabase-js';
import { parsePrompt, ParsedPromptResult } from '@/lib/gemini';
import { executeSearchQuery, SearchExecutionResult } from './buildQuery';

export interface AISearchOutput extends SearchExecutionResult {
  filters: ParsedPromptResult;
}

export async function runAISearch(
  supabase: SupabaseClient,
  userId: string | undefined,
  prompt: string,
  apiKey: string
): Promise<AISearchOutput> {
  const filters = await parsePrompt(prompt, apiKey);

  const searchResult = await executeSearchQuery(supabase, userId, {
    topic: filters.topic,
    difficulty: filters.difficulty,
    platforms: filters.platforms,
    unsolved: filters.unsolved,
    limit: filters.limit,
    similarTo: filters.similarTo,
  });

  return {
    ...searchResult,
    filters,
  };
}
