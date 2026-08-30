import { SupabaseClient } from '@supabase/supabase-js';
import { executeSearchQuery, SearchFilterParams, SearchExecutionResult } from './buildQuery';

export async function runFilterSearch(
  supabase: SupabaseClient,
  userId: string | undefined,
  params: SearchFilterParams
): Promise<SearchExecutionResult> {
  return executeSearchQuery(supabase, userId, params);
}
