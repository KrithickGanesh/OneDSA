'use client';

import React from 'react';
import { Problem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { CheckCircle, ExternalLink, Star } from 'lucide-react';
import { PLATFORMS } from '@/lib/constants';

interface ProblemCardProps {
  problem: Problem;
  isSolved?: boolean;
}

export function ProblemCard({ problem, isSolved = false }: ProblemCardProps) {
  const platformConfig = PLATFORMS.find((p) => p.id === problem.platform);
  
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'hard':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDifficultyDisplay = () => {
    if (problem.difficultyRating) {
      return `${problem.difficultyLevel} (${problem.difficultyRating})`;
    }
    return problem.difficultyLevel;
  };

  return (
    <Card 
      className="relative flex flex-col h-full bg-black/40 backdrop-blur-md border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden group cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-cyan-500/10"
      onClick={() => window.open(problem.url, '_blank')}
    >
      {isSolved && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle className="w-5 h-5 text-green-500 fill-green-500/20" />
        </div>
      )}
      
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex justify-between items-start mb-2 pr-6">
          <Badge 
            variant="outline" 
            className="text-xs font-semibold px-2 py-0.5 border-none"
            style={{ 
              backgroundColor: `${platformConfig?.color}20`,
              color: platformConfig?.color 
            }}
          >
            {platformConfig?.name || problem.platform}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={`text-xs ${getDifficultyColor(problem.difficultyLevel)}`}
          >
            {getDifficultyDisplay()}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-lg text-white leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
          {problem.title}
          {problem.isPremium && (
            <Star className="inline-block ml-2 w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
        </h3>
      </CardHeader>
      
      <CardContent className="px-5 pb-4 flex-grow">
        <div className="flex flex-wrap gap-1.5 mt-2">
          {problem.tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="secondary" className="bg-white/5 text-gray-300 hover:bg-white/10 border-none text-[10px] px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {problem.tags.length > 3 && (
            <Badge variant="secondary" className="bg-white/5 text-gray-400 border-none text-[10px] px-2 py-0.5">
              +{problem.tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="px-5 py-3 border-t border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="text-xs text-gray-400">
          {problem.acceptanceRate ? (
            <span>Acceptance: {(problem.acceptanceRate * 100).toFixed(1)}%</span>
          ) : (
            <span>Acceptance: N/A</span>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
      </CardFooter>
    </Card>
  );
}
