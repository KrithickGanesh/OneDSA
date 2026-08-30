'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FilterPanel, SearchFilters } from '@/components/FilterPanel';
import { ProblemTable } from '@/components/ProblemTable';
import { AIPromptBar } from '@/components/AIPromptBar';
import { Problem } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';
import { Compass, Sparkles, SlidersHorizontal, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ExplorePage() {
  // Step 8A.1: State lives in explore/page.tsx as single source of truth
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [lastFilters, setLastFilters] = useState<any>(null);
  const [activeQueryTitle, setActiveQueryTitle] = useState<string | null>(null);

  // Default initial filters
  const defaultFilters: SearchFilters = {
    platforms: PLATFORMS.map((p) => p.id),
    topics: [],
    difficulty_level: '',
    difficulty_min: null,
    difficulty_max: null,
    limit: 20,
    exclude_solved: false,
    solved_only: false,
    sort_by: 'difficulty',
  };

  // Step 8C: Manual Filter Search
  const handleFilterSearch = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
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

  // Step 8A.3: AI Prompt Search Handler
  const handleAISearch = async (prompt: string) => {
    setLoading(true);
    setActiveQueryTitle(`"${prompt}"`);
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
      setProblems(list);

      if (data.solvedIds && Array.isArray(data.solvedIds)) {
        setSolvedIds(new Set(data.solvedIds));
      }

      if (data.filters) {
        setLastFilters(data.filters);
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

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={loading}
            className="h-9 px-3 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 gap-1.5"
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

      {/* Active Filter / Search Query Banner */}
      {(activeQueryTitle || lastFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 border border-cyan-500/20 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            {activeQueryTitle ? (
              <span className="flex items-center gap-1.5 text-xs text-cyan-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI Search: <span className="text-white font-semibold">{activeQueryTitle}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                Manual Filters Active
              </span>
            )}

            {lastFilters?.topic && (
              <Badge variant="outline" className="text-[11px] bg-white/10 border-white/15 text-white">
                Topic: {lastFilters.topic}
              </Badge>
            )}
            {lastFilters?.difficulty && (
              <Badge variant="outline" className="text-[11px] bg-white/10 border-white/15 text-white">
                Difficulty: {lastFilters.difficulty}
              </Badge>
            )}
            {lastFilters?.platforms && lastFilters.platforms.length > 0 && (
              <Badge variant="outline" className="text-[11px] bg-white/10 border-white/15 text-white">
                Platforms: {lastFilters.platforms.join(', ')}
              </Badge>
            )}
            {lastFilters?.unsolved && (
              <Badge variant="outline" className="text-[11px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Unsolved Only
              </Badge>
            )}
          </div>

          <button
            onClick={handleResetToDefault}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors ml-auto cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
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
