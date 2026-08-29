'use client';

import React, { useState } from 'react';
import { Problem } from '@/lib/types';
import { ProblemCard } from './ProblemCard';
import { CheckCircle, ExternalLink, LayoutGrid, List, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PLATFORMS } from '@/lib/constants';

interface ProblemTableProps {
  problems: Problem[];
  solvedIds?: Set<string>;
  isLoading?: boolean;
  viewMode?: 'card' | 'table';
  onViewModeChange?: (mode: 'card' | 'table') => void;
}

export function ProblemTable({ 
  problems, 
  solvedIds = new Set(), 
  isLoading = false,
  viewMode: initialViewMode = 'card',
  onViewModeChange
}: ProblemTableProps) {
  const [viewMode, setViewMode] = useState<'card' | 'table'>(initialViewMode);
  const [sortField, setSortField] = useState<'difficulty' | 'title' | 'platform'>('difficulty');
  const [sortAsc, setSortAsc] = useState(true);

  const handleViewModeToggle = (mode: 'card' | 'table') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-400';
    }
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

  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-32 bg-white/10 rounded-md"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-white/10 rounded-md"></div>
            <div className="h-8 w-8 bg-white/10 rounded-md"></div>
          </div>
        </div>
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 rounded-xl bg-white/5 border border-white/10"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 rounded-lg bg-white/5 border border-white/10"></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/10">
          <SearchX className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No problems found</h3>
        <p className="text-gray-400 max-w-md">
          Try adjusting your filters or search query to find what you're looking for.
        </p>
      </div>
    );
  }

  const platformCounts = problems.reduce((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-300 font-medium">
            {problems.length} {problems.length === 1 ? 'problem' : 'problems'}
          </span>
          <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const cfg = getPlatformConfig(platform);
              if (!cfg) return null;
              return (
                <Badge key={platform} variant="outline" className="text-[10px] bg-white/5 border-white/10">
                  <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cfg.color }}></span>
                  {cfg.name}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 bg-black/40 border border-white/10 rounded-lg p-1">
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 rounded-md ${viewMode === 'card' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => handleViewModeToggle('card')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 rounded-md ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => handleViewModeToggle('table')}
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
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium w-10 text-center">Status</th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('title')}>
                  Title {sortField === 'title' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('platform')}>
                  Platform {sortField === 'platform' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('difficulty')}>
                  Difficulty {sortField === 'difficulty' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium text-right">Link</th>
              </tr>
            </thead>
            <tbody>
              {sortedProblems.map((problem, i) => {
                const isSolved = solvedIds.has(problem.id);
                const platformConfig = getPlatformConfig(problem.platform);
                return (
                  <tr key={problem.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-center">
                      {isSolved && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      <a href={problem.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors line-clamp-1">
                        {problem.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center text-xs" style={{ color: platformConfig?.color }}>
                        {platformConfig?.name || problem.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${getDifficultyColor(problem.difficultyLevel)}`}>
                        {problem.difficultyLevel} {problem.difficultyRating ? `(${problem.difficultyRating})` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 2).map((tag, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={problem.url} target="_blank" rel="noopener noreferrer" className="inline-flex text-gray-400 hover:text-white p-1">
                        <ExternalLink className="w-4 h-4" />
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
