'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Link as LinkIcon, Calendar, Flame } from 'lucide-react';
import { PLATFORMS } from '@/lib/constants';

interface StatsOverview {
  totalSolved: number;
  platformBreakdown: { platform: string; count: number }[];
  streak?: number;
  solvedThisWeek?: number;
}

interface StatsCardsProps {
  stats: StatsOverview;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    let current = start;
    const increment = end > start ? Math.ceil((end - start) / 20) : -1;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(current);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Solved',
      value: stats.totalSolved,
      icon: <Target className="w-6 h-6 text-cyan-400" />,
      bgGradient: 'from-cyan-500/10 to-transparent',
      borderColor: 'border-cyan-500/20'
    },
    {
      title: 'Platforms',
      value: stats.platformBreakdown.length,
      icon: <LinkIcon className="w-6 h-6 text-purple-400" />,
      bgGradient: 'from-purple-500/10 to-transparent',
      borderColor: 'border-purple-500/20',
      subtitle: (
        <div className="flex gap-1 mt-2">
          {stats.platformBreakdown.slice(0, 5).map(p => {
            const cfg = PLATFORMS.find(cfg => cfg.id === p.platform);
            if (!cfg) return null;
            return (
              <div 
                key={p.platform} 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: cfg.color }}
                title={`${cfg.name}: ${p.count}`}
              />
            );
          })}
        </div>
      )
    },
    {
      title: 'This Week',
      value: stats.solvedThisWeek || 0,
      icon: <Calendar className="w-6 h-6 text-emerald-400" />,
      bgGradient: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Current Streak',
      value: stats.streak || 0,
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      bgGradient: 'from-orange-500/10 to-transparent',
      borderColor: 'border-orange-500/20',
      suffix: ' days'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card 
          key={i} 
          className={`bg-black/40 backdrop-blur-md border border-white/5 hover:${card.borderColor} transition-all duration-300 overflow-hidden relative group`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
          <CardContent className="p-5 relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-medium text-gray-400">{card.title}</span>
              <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                {card.icon}
              </div>
            </div>
            
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white tracking-tight">
                  <AnimatedNumber value={card.value} />
                </span>
                {card.suffix && (
                  <span className="text-sm text-gray-400 font-medium">{card.suffix}</span>
                )}
              </div>
              {card.subtitle}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
