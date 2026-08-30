'use client';

import React, { useState } from 'react';
import { Problem } from '@/lib/types';
import { ProblemCard } from './ProblemCard';
import { SaveToCollectionModal } from './SaveToCollectionModal';
import { CheckCircle2, Circle, ExternalLink, LayoutGrid, List, SearchX, Bookmark, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
        badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/20',
        text: 'text-slate-400',
        dot: 'bg-slate-400',
      };
  }
}

export function ProblemTable({
  problems,
  solvedIds = new Set(),
  isLoading = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  activeFilters,
}: ProblemTableProps) {
  const [internalViewMode, setInternalViewMode] = useState<'card' | 'table'>('table');
  const [sortField, setSortField] = useState<'title' | 'difficulty' | 'platform'>('difficulty');
  const [sortAsc, setSortAsc] = useState(true);

  // Bookmark Collection Modal State
  const [selectedProblemForCollection, setSelectedProblemForCollection] = useState<Problem | null>(null);

  const viewMode = controlledViewMode ?? internalViewMode;

  const handleViewModeToggle = (mode: 'card' | 'table') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const handleSort = (field: 'title' | 'difficulty' | 'platform') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleQuickScheduleRevision = async (e: React.MouseEvent, problem: Problem) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problem.id, quality: 3 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Queued for Revision`, {
          description: `"${problem.title}" scheduled in Spaced Repetition queue.`,
        });
      } else {
        toast.error(data.error || 'Failed to schedule revision');
      }
    } catch (err: any) {
      toast.error('Error queuing revision', { description: err.message });
    }
  };

  const sortedProblems = [...problems].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === 'platform') {
      comparison = a.platform.localeCompare(b.platform);
    } else if (sortField === 'difficulty') {
      const diffRank: Record<string, number> = { easy: 1, medium: 2, hard: 3, unknown: 4 };
      const rankA = diffRank[a.difficultyLevel.toLowerCase()] || 2;
      const rankB = diffRank[b.difficultyLevel.toLowerCase()] || 2;
      comparison = rankA - rankB;
    }
    return sortAsc ? comparison : -comparison;
  });

  const getPlatformConfig = (platId: string) => {
    return PLATFORMS.find((p) => p.id === platId);
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-xl">
          <div className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 gap-4 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-white/10 rounded-full" />
                <div className="h-6 w-16 bg-white/10 rounded-full" />
                <div className="h-8 w-16 bg-white/10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl my-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <SearchX className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-xl font-bold text-white">No matching problems found</h3>
          <p className="text-sm text-gray-400">
            No problems match your current criteria. Try widening your filters or asking Gemini a different prompt.
          </p>
        </div>

        {activeFilters && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-lg">
            {activeFilters.topic && (
              <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-300">
                Topic: {activeFilters.topic}
              </Badge>
            )}
            {activeFilters.difficulty && (
              <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-300">
                Difficulty: {activeFilters.difficulty}
              </Badge>
            )}
            {activeFilters.unsolved && (
              <Badge variant="outline" className="text-xs bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                Unsolved Only
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  const platformCounts: Record<string, number> = {};
  problems.forEach(p => {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      {/* Header Info & View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
              onSaveToCollection={() => setSelectedProblemForCollection(problem)}
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
                <th className="px-5 py-4 text-right">Actions</th>
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

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-right space-x-1.5">
                      {/* Save to Collection Button */}
                      <button
                        onClick={() => setSelectedProblemForCollection(problem)}
                        title="Save to Collection"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors cursor-pointer"
                      >
                        <Bookmark className="w-4 h-4 inline" />
                      </button>

                      {/* Add to Spaced Revision */}
                      <button
                        onClick={(e) => handleQuickScheduleRevision(e, problem)}
                        title="Queue in Spaced Repetition"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-colors cursor-pointer"
                      >
                        <Brain className="w-4 h-4 inline" />
                      </button>

                      {/* Solve Link */}
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

      {/* Save to Collection Modal */}
      <SaveToCollectionModal
        problem={selectedProblemForCollection}
        isOpen={Boolean(selectedProblemForCollection)}
        onClose={() => setSelectedProblemForCollection(null)}
      />
    </div>
  );
}
