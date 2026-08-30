'use client';

import React, { useState } from 'react';
import { Problem } from '@/lib/types';
import { ProblemCard } from './ProblemCard';
import { CheckCircle2, Circle, ExternalLink, LayoutGrid, List, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ProblemTableProps {
  problems: Problem[];
  solvedIds?: Set<string>;
  isLoading?: boolean;
  viewMode?: 'card' | 'table';
  onViewModeChange?: (mode: 'card' | 'table') => void;
  activeFilters?: {
    topic?: string | null;
    difficulty?: string | null;
    platforms?: string[];
    unsolved?: boolean;
  } | null;
}

export function getDifficultyColor(diff: string) {
  switch (diff?.toLowerCase()) {
    case 'easy':
      return {
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
      };
    case 'medium':
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
      };
    case 'hard':
      return {
        badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
        text: 'text-rose-400',
        dot: 'bg-rose-400',
      };
    default:
      return {
        badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/20',
        text: 'text-gray-400',
        dot: 'bg-gray-400',
      };
  }
}

export function ProblemTable({ 
  problems, 
  solvedIds = new Set(), 
  isLoading = false,
  viewMode: initialViewMode = 'table',
  onViewModeChange,
  activeFilters = null,
}: ProblemTableProps) {
  const [viewMode, setViewMode] = useState<'card' | 'table'>(initialViewMode);
  const [sortField, setSortField] = useState<'difficulty' | 'title' | 'platform'>('difficulty');
  const [sortAsc, setSortAsc] = useState(true);

  const handleViewModeToggle = (mode: 'card' | 'table') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const getPlatformConfig = (platformId: string) => 
    PLATFORMS.find((p) => p.id === platformId);

  // Sorting logic
  const sortedProblems = [...problems].sort((a, b) => {
    let comp = 0;
    if (sortField === 'title') {
      comp = a.title.localeCompare(b.title);
    } else if (sortField === 'platform') {
      comp = a.platform.localeCompare(b.platform);
    } else if (sortField === 'difficulty') {
      const diffOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      comp = (diffOrder[a.difficultyLevel] || 0) - (diffOrder[b.difficultyLevel] || 0);
      if (comp === 0 && a.difficultyRating && b.difficultyRating) {
        comp = a.difficultyRating - b.difficultyRating;
      }
    }
    return sortAsc ? comp : -comp;
  });

  const handleSort = (field: 'difficulty' | 'title' | 'platform') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Step 8D: Premium Skeleton Loading State
  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-44 bg-white/10 rounded-lg"></div>
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-white/10 rounded-lg"></div>
            <div className="h-9 w-9 bg-white/10 rounded-lg"></div>
          </div>
        </div>
        
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-20 bg-white/10 rounded-full"></div>
                  <div className="h-5 w-16 bg-white/10 rounded-full"></div>
                </div>
                <div className="h-6 w-3/4 bg-white/10 rounded"></div>
                <div className="flex gap-2 pt-4">
                  <div className="h-4 w-12 bg-white/10 rounded"></div>
                  <div className="h-4 w-16 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="h-12 bg-white/5 border-b border-white/10"></div>
            <div className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-16 px-6 flex items-center justify-between gap-4">
                  <div className="h-5 w-5 bg-white/10 rounded-full"></div>
                  <div className="h-5 w-1/3 bg-white/10 rounded"></div>
                  <div className="h-5 w-20 bg-white/10 rounded-full"></div>
                  <div className="h-5 w-16 bg-white/10 rounded-full"></div>
                  <div className="h-5 w-24 bg-white/10 rounded-full"></div>
                  <div className="h-8 w-24 bg-white/10 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 8D: Empty State with Active Filters
  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No matching problems found</h3>
        <p className="text-gray-400 max-w-md text-sm mb-6">
          We couldn't find any problems matching your current criteria. Try loosening your filters or asking a different AI prompt.
        </p>

        {activeFilters && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">Active Filters:</span>
            {activeFilters.topic && (
              <Badge variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                Topic: {activeFilters.topic}
              </Badge>
            )}
            {activeFilters.difficulty && (
              <Badge variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                Difficulty: {activeFilters.difficulty}
              </Badge>
            )}
            {activeFilters.platforms && activeFilters.platforms.length > 0 && (
              <Badge variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                Platforms: {activeFilters.platforms.join(', ')}
              </Badge>
            )}
            {activeFilters.unsolved && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Unsolved Only
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  const platformCounts = problems.reduce((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full space-y-5">
      {/* Table Header Summary & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {problems.length} {problems.length === 1 ? 'Problem Found' : 'Problems Found'}
          </span>
          <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const cfg = getPlatformConfig(platform);
              if (!cfg) return null;
              return (
                <Badge key={platform} variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-300 font-medium">
                  <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cfg.color }}></span>
                  {cfg.name}: <span className="text-white ml-1">{count}</span>
                </Badge>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 bg-black/60 border border-white/10 rounded-xl p-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => handleViewModeToggle('card')}
            aria-label="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            onClick={() => handleViewModeToggle('table')}
            aria-label="Table view"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProblems.map(problem => (
            <ProblemCard 
              key={problem.id} 
              problem={problem} 
              isSolved={solvedIds.has(problem.id)} 
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/[0.04] border-b border-white/10">
              <tr>
                <th className="px-5 py-4 w-12 text-center">Status</th>
                <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('title')}>
                  Title {sortField === 'title' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('platform')}>
                  Platform {sortField === 'platform' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('difficulty')}>
                  Difficulty {sortField === 'difficulty' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4">Tags</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedProblems.map((problem) => {
                const isSolved = solvedIds.has(problem.id);
                const platformConfig = getPlatformConfig(problem.platform);
                const diffStyle = getDifficultyColor(problem.difficultyLevel);

                return (
                  <tr key={problem.id} className="hover:bg-white/[0.03] transition-colors group">
                    {/* Status Column */}
                    <td className="px-5 py-4 text-center">
                      {isSolved ? (
                        <span title="Solved">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        </span>
                      ) : (
                        <span title="Unsolved">
                          <Circle className="w-4 h-4 text-gray-600 mx-auto group-hover:text-gray-400 transition-colors" />
                        </span>
                      )}
                    </td>

                    {/* Title Column */}
                    <td className="px-5 py-4 font-medium text-white">
                      <a 
                        href={problem.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-cyan-400 transition-colors font-medium text-base line-clamp-1 inline-block"
                      >
                        {problem.title}
                      </a>
                    </td>

                    {/* Platform Column */}
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-xs bg-white/[0.03] border-white/10 font-medium">
                        <span 
                          className="w-2 h-2 rounded-full mr-1.5 shrink-0" 
                          style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}
                        />
                        {platformConfig?.name || problem.platform}
                      </Badge>
                    </td>

                    {/* Difficulty Badge Column */}
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${diffStyle.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${diffStyle.dot}`}></span>
                        {problem.difficultyLevel || 'Medium'}
                      </Badge>
                    </td>

                    {/* Tags Pills Column */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {problem.tags.slice(0, 3).map((tag, j) => (
                          <span 
                            key={j} 
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 3 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500 font-medium">
                            +{problem.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Button Column */}
                    <td className="px-5 py-4 text-right">
                      <a 
                        href={problem.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          "h-8 px-3 text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:text-cyan-300 font-medium rounded-lg inline-flex items-center gap-1.5"
                        )}
                      >
                        <span>Solve</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
