'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Database, Award, Flame, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { PLATFORMS } from '@/lib/constants';
import { DashboardStatsResponse } from '@/app/api/dashboard/stats/route';

interface StatsCardsProps {
  stats: DashboardStatsResponse;
  onSyncPlatform?: (platform: string) => Promise<void>;
  onSyncAll?: () => Promise<void>;
  isSyncing?: boolean;
  syncingPlatform?: string | null;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value || 0;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    let current = start;
    const increment = end > start ? Math.max(Math.ceil((end - start) / 15), 1) : -1;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(current);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

function formatRelativeTime(isoString?: string | null) {
  if (!isoString) return 'Never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (isNaN(diffMs)) return 'Never';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function StatsCards({ 
  stats, 
  onSyncPlatform, 
  onSyncAll,
  isSyncing = false,
  syncingPlatform = null
}: StatsCardsProps) {
  const total = stats.totalSolved || 0;
  const easyPct = total > 0 ? Math.round((stats.easySolved / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((stats.mediumSolved / total) * 100) : 0;
  const hardPct = total > 0 ? Math.round((stats.hardSolved / total) * 100) : 0;

  const maxTopicCount = stats.topics?.[0]?.count || 1;

  const topMetrics = [
    {
      title: 'Total Solved',
      value: stats.totalSolved,
      icon: <Target className="w-5 h-5 text-cyan-400" />,
      bgGradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      borderColor: 'border-cyan-500/20',
      description: 'Problems solved across platforms',
    },
    {
      title: 'Unsolved in OneDSA',
      value: stats.unsolvedInDb,
      icon: <Database className="w-5 h-5 text-blue-400" />,
      bgGradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-500/20',
      description: `${stats.totalInDb} total indexed problems`,
    },
    {
      title: 'Topics Mastered',
      value: stats.topicsMastered,
      icon: <Award className="w-5 h-5 text-purple-400" />,
      bgGradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
      borderColor: 'border-purple-500/20',
      description: 'Topics with ≥ 3 solved problems',
    },
    {
      title: 'Current Streak',
      value: stats.currentStreak,
      icon: <Flame className="w-5 h-5 text-orange-400" />,
      bgGradient: 'from-orange-500/10 via-orange-500/5 to-transparent',
      borderColor: 'border-orange-500/20',
      suffix: stats.currentStreak === 1 ? ' Day' : ' Days',
      description: stats.currentStreak > 0 ? 'Keep the momentum going!' : 'Solve a problem today!',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetrics.map((card, i) => (
          <Card 
            key={i} 
            className={`bg-black/40 backdrop-blur-md border ${card.borderColor} hover:border-white/20 transition-all duration-300 overflow-hidden relative group rounded-2xl shadow-lg`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
            <CardContent className="p-5 relative z-10 flex flex-col h-full justify-between space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.title}</span>
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  {card.icon}
                </div>
              </div>
              
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    <AnimatedNumber value={card.value} />
                  </span>
                  {card.suffix && (
                    <span className="text-sm text-gray-400 font-medium">{card.suffix}</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Difficulty Distribution */}
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span>Solved by Difficulty</span>
              <span className="text-xs font-normal text-gray-400">{total} total</span>
            </CardTitle>
          </CardHeader>
          
          <div className="space-y-4">
            {/* Easy Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-400">Easy</span>
                <span className="text-gray-300">{stats.easySolved} <span className="text-gray-500">({easyPct}%)</span></span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${Math.max(easyPct, 2)}%` }}
                />
              </div>
            </div>

            {/* Medium Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-400">Medium</span>
                <span className="text-gray-300">{stats.mediumSolved} <span className="text-gray-500">({medPct}%)</span></span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(245,158,11,0.5)]" 
                  style={{ width: `${Math.max(medPct, 2)}%` }}
                />
              </div>
            </div>

            {/* Hard Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-rose-400">Hard</span>
                <span className="text-gray-300">{stats.hardSolved} <span className="text-gray-500">({hardPct}%)</span></span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(244,63,94,0.5)]" 
                  style={{ width: `${Math.max(hardPct, 2)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex justify-around text-center">
            <div>
              <div className="text-xs text-gray-500">Easy</div>
              <div className="text-sm font-bold text-emerald-400">{stats.easySolved}</div>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div>
              <div className="text-xs text-gray-500">Medium</div>
              <div className="text-sm font-bold text-amber-400">{stats.mediumSolved}</div>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div>
              <div className="text-xs text-gray-500">Hard</div>
              <div className="text-sm font-bold text-rose-400">{stats.hardSolved}</div>
            </div>
          </div>
        </Card>

        {/* Chart 2: Top Solved Topics */}
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span>Top Solved Topics</span>
              <span className="text-xs font-normal text-gray-400">{stats.topics.length} topics</span>
            </CardTitle>
          </CardHeader>

          {stats.topics.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              No topic tags solved yet. Sync your accounts to view topic distribution.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topics.slice(0, 5).map((t, idx) => {
                const pct = Math.round((t.count / maxTopicCount) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-300">{t.topic}</span>
                      <span className="text-cyan-400 font-semibold">{t.count}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-gray-400 text-center">
            {stats.topicsMastered} topics with ≥ 3 problems solved
          </div>
        </Card>

        {/* Chart 3: Platform Breakdown & Universal Sync */}
        <Card className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span>Platforms & Sync</span>
              {onSyncAll && (
                <button
                  onClick={onSyncAll}
                  disabled={isSyncing}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing && !syncingPlatform ? 'animate-spin' : ''}`} />
                  <span>Sync All</span>
                </button>
              )}
            </CardTitle>
          </CardHeader>

          <div className="space-y-2.5">
            {PLATFORMS.map((platform) => {
              const handleObj = stats.connectedHandles.find(h => h.platform === platform.id);
              const count = stats.platforms[platform.id] || 0;
              const isConnected = Boolean(handleObj?.handle);
              const isThisSyncing = isSyncing && syncingPlatform === platform.id;

              return (
                <div key={platform.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: platform.color }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {platform.name}
                        {isConnected && (
                          <span className="text-[10px] text-cyan-400 font-medium">(@{handleObj?.handle})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isConnected 
                          ? `Last sync: ${formatRelativeTime(handleObj?.lastSyncedAt)}` 
                          : 'Not connected'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-white">{count}</span>
                      <span className="text-[10px] text-gray-500 block">solved</span>
                    </div>

                    {isConnected && onSyncPlatform && (
                      <button
                        onClick={() => onSyncPlatform(platform.id)}
                        disabled={isSyncing}
                        title={`Sync ${platform.name}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isThisSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-gray-400 text-center">
            Manage handles in <a href="/settings" className="text-cyan-400 hover:underline">Settings</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
