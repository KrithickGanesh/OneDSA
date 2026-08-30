'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterPanel, SearchFilters } from '@/components/FilterPanel';
import { ProblemTable } from '@/components/ProblemTable';
import { AIPromptBar } from '@/components/AIPromptBar';
import { Problem } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';
import { Compass, Sparkles, SlidersHorizontal, RefreshCw, X, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CachedSearchResult {
  problems: Problem[];
  solvedIds: string[];
  filters: any;
}

export default function ExplorePage() {
  // Single source of truth for problem data
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [lastFilters, setLastFilters] = useState<any>(null);
  const [activeQueryTitle, setActiveQueryTitle] = useState<string | null>(null);
  const [isCachedHit, setIsCachedHit] = useState(false);

  // Improvement 3: In-Memory Search Cache for instant zero-cost repeated queries
  const searchCacheRef = useRef<Map<string, CachedSearchResult>>(new Map());

  // Default initial filters
  const defaultFilters: SearchFilters = {
    platforms: PLATFORMS.map((p) => p.id),
    topics: [],
    difficulty_level: '',
    difficulty_min: null,
    difficulty_max: null,
    limit: 20,
    exclude_solved: true,
    solved_only: false,
    sort_by: 'difficulty',
  };

  // Step 8C: Manual Filter Search
  const handleFilterSearch = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    setIsCachedHit(false);
    try {
      const response = await fetch('/api/search/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch problems');
      }

      const data = await response.json();
      const list: Problem[] = data.problems || data.results || [];
      setProblems(list);

      if (data.solvedIds && Array.isArray(data.solvedIds)) {
        setSolvedIds(new Set(data.solvedIds));
      }

      setLastFilters({
        topic: filters.topics.length > 0 ? filters.topics.join(', ') : null,
        difficulty: filters.difficulty_level || null,
        platforms: filters.platforms.length < PLATFORMS.length ? filters.platforms : null,
        unsolved: filters.exclude_solved,
        limit: filters.limit,
      });
      setActiveQueryTitle(null);
    } catch (error: any) {
      console.error('Filter search error:', error);
      toast.error('Failed to load problems', { description: error.message });
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 8A: AI Prompt Search Handler with In-Memory Caching (Improvement 3)
  const handleAISearch = async (prompt: string) => {
    const normalizedKey = prompt.trim().toLowerCase();
    setActiveQueryTitle(`"${prompt.trim()}"`);

    // Check in-memory cache first
    const cached = searchCacheRef.current.get(normalizedKey);
    if (cached) {
      setProblems(cached.problems);
      setSolvedIds(new Set(cached.solvedIds));
      setLastFilters(cached.filters);
      setIsCachedHit(true);
      toast.success(`Found ${cached.problems.length} problems (Cached)`, {
        description: 'Instant response from memory cache',
      });
      return;
    }

    setLoading(true);
    setIsCachedHit(false);
    try {
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process AI query');
      }

      const data = await response.json();
      const list: Problem[] = data.results || data.problems || [];
      const solvedArr: string[] = data.solvedIds || [];

      setProblems(list);
      setSolvedIds(new Set(solvedArr));

      if (data.filters) {
        setLastFilters(data.filters);
        
        // Store in cache for future repeated prompts
        searchCacheRef.current.set(normalizedKey, {
          problems: list,
          solvedIds: solvedArr,
          filters: data.filters,
        });

        const diffText = data.filters.difficulty ? `${data.filters.difficulty} ` : '';
        const topicText = data.filters.topic ? `${data.filters.topic} ` : '';
        toast.success(`Found ${list.length} problems`, {
          description: `Applied: ${diffText}${topicText}problems${data.filters.unsolved ? ' (unsolved only)' : ''}`,
        });
      }
    } catch (error: any) {
      console.error('AI search error:', error);
      toast.error('AI Search failed', { description: error.message });
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load on mount
  useEffect(() => {
    handleFilterSearch(defaultFilters);
  }, [handleFilterSearch]);

  const handleResetToDefault = () => {
    setActiveQueryTitle(null);
    setLastFilters(null);
    setIsCachedHit(false);
    handleFilterSearch(defaultFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px] space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Compass className="w-8 h-8 text-cyan-400" /> Explore Problems
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Search with natural language AI prompts or browse with granular platform filters.
          </p>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={loading}
            className="h-9 px-3 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 gap-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reset All
          </Button>
        </div>
      </div>

      {/* Step 8A: AI Prompt Search Bar with Voice Input (Step 8E) */}
      <div className="py-2">
        <AIPromptBar onSearch={handleAISearch} isLoading={loading} />
      </div>

      {/* Improvement 2: Active Filters Ribbon */}
      {(activeQueryTitle || lastFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 border border-cyan-500/20 backdrop-blur-xl shadow-lg">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold uppercase tracking-wider">
              {activeQueryTitle ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Active Search
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  Active Filters
                </>
              )}
            </span>

            {isCachedHit && (
              <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                Cached Result
              </Badge>
            )}

            {lastFilters?.difficulty && (
              <Badge variant="outline" className="text-xs bg-white/10 border-white/15 text-white font-medium">
                {lastFilters.difficulty}
              </Badge>
            )}

            {lastFilters?.topic && (
              <Badge variant="outline" className="text-xs bg-white/10 border-white/15 text-white font-medium">
                Topic: {lastFilters.topic}
              </Badge>
            )}

            {lastFilters?.platforms && Array.isArray(lastFilters.platforms) && lastFilters.platforms.length > 0 && (
              <Badge variant="outline" className="text-xs bg-white/10 border-white/15 text-white font-medium">
                {lastFilters.platforms.join(', ')}
              </Badge>
            )}

            {lastFilters?.unsolved && (
              <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-medium">
                Unsolved Only
              </Badge>
            )}

            {lastFilters?.limit && (
              <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-400">
                Limit: {lastFilters.limit}
              </Badge>
            )}
          </div>

          <button
            onClick={handleResetToDefault}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors ml-auto cursor-pointer font-medium"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar: Manual Filter Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <FilterPanel onFilter={handleFilterSearch} isLoading={loading} />
        </div>

        {/* Main: Unified Problem Table (Step 8B & 8D) */}
        <div className="flex-1 min-w-0 w-full">
          <ProblemTable 
            problems={problems} 
            solvedIds={solvedIds}
            isLoading={loading}
            viewMode="table"
            activeFilters={lastFilters}
          />
        </div>
      </div>
    </div>
  );
}
