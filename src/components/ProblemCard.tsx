'use client';

import React from 'react';
import { Problem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, Star, Bookmark } from 'lucide-react';
import { PLATFORMS } from '@/lib/constants';
import { getDifficultyColor } from './ProblemTable';

interface ProblemCardProps {
  problem: Problem;
  isSolved?: boolean;
  onSaveToCollection?: () => void;
}

export function ProblemCard({ problem, isSolved = false, onSaveToCollection }: ProblemCardProps) {
  const platformConfig = PLATFORMS.find((p) => p.id === problem.platform);
  const diffStyle = getDifficultyColor(problem.difficultyLevel);

  const getDifficultyDisplay = () => {
    if (problem.difficultyRating) {
      return `${problem.difficultyLevel} (${problem.difficultyRating})`;
    }
    return problem.difficultyLevel || 'Medium';
  };

  return (
    <Card 
      className="relative flex flex-col h-full bg-black/40 backdrop-blur-md border-white/10 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden group cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-cyan-500/10 rounded-2xl"
      onClick={() => window.open(problem.url, '_blank')}
    >
      <CardHeader className="pb-3 pt-5 px-5 space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-xs font-semibold px-2.5 py-0.5 border-white/10"
            style={{ 
              backgroundColor: `${platformConfig?.color}15`,
              color: platformConfig?.color || '#94a3b8'
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}></span>
            {platformConfig?.name || problem.platform}
          </Badge>
          
          <div className="flex items-center gap-1.5">
            {isSolved && (
              <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30 px-2 py-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Solved already</span>
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={`text-xs font-medium ${diffStyle.badge}`}
            >
              {getDifficultyDisplay()}
            </Badge>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2 pt-1">
          {problem.title}
          {problem.isPremium && (
            <Star className="inline-block ml-1.5 w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          )}
        </h3>
      </CardHeader>
      
      <CardContent className="px-5 pb-4 flex-grow">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {problem.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-300">
              {tag}
            </span>
          ))}
          {problem.tags.length > 3 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-400">
              +{problem.tags.length - 3}
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="px-5 py-3.5 border-t border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {onSaveToCollection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveToCollection();
              }}
              title="Save to Collection"
              className="p-1 rounded text-gray-400 hover:text-cyan-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs text-gray-500">
            {problem.acceptanceRate ? `${(problem.acceptanceRate * 100).toFixed(0)}% acc` : `ID: ${problem.platformProblemId}`}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-medium text-cyan-400 group-hover:text-cyan-300">
          <span>Open</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </CardFooter>
    </Card>
  );
}
