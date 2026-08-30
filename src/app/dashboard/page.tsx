'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AIPromptBar } from '@/components/AIPromptBar';
import { StatsCards } from '@/components/StatsCards';
import { ProblemTable, getDifficultyColor } from '@/components/ProblemTable';
import { Problem } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Activity, Sparkles, ExternalLink, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { DashboardStatsResponse } from '@/app/api/dashboard/stats/route';
import { PLATFORMS } from '@/lib/constants';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(isoString: string) {
  if (!isoString) return 'Recently';
  const diffMs = Date.now() - new Date(isoString).getTime();
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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchResults, setSearchResults] = useState<Problem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  const [statsData, setStatsData] = useState<DashboardStatsResponse>({
    totalSolved: 0,
    totalInDb: 0,
    unsolvedInDb: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    topicsMastered: 0,
    currentStreak: 0,
    platforms: { leetcode: 0, codeforces: 0, codechef: 0, hackerrank: 0, gfg: 0 },
    topics: [],
    recentActivity: [],
    connectedHandles: [],
  });

  const router = useRouter();
  const supabase = createClient();

  // 1. Fetch user authentication
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase.auth]);

  // 2. Fetch live dashboard analytics from API
  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setStatsData(json.data);
          const solvedSet = new Set<string>(json.data.recentActivity?.map((a: any) => a.id) || []);
          setSolvedIds(solvedSet);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user, fetchDashboardStats]);

  // 3. AI Search trigger from Dashboard
  const handleAiSearch = async (query: string) => {
    setAiLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, excludeSolved: true }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to fetch AI recommendations');
      }

      const list = data.results || data.problems || [];
      setSearchResults(list);
      
      if (data.solvedIds && Array.isArray(data.solvedIds)) {
        setSolvedIds(new Set(data.solvedIds));
      }

      if (data.filters) {
        const platformsStr = Array.isArray(data.filters.platforms) ? data.filters.platforms.join(', ') : 'all platforms';
        toast.success(`Found ${list.length} problems`, {
          description: `Filters: ${data.filters.difficulty || 'Any'} difficulty${data.filters.topic ? `, ${data.filters.topic}` : ''} on ${platformsStr}`,
        });
      }
    } catch (error: any) {
      console.error('AI search error:', error);
      toast.error('Search failed', { description: error.message });
      setSearchResults([]);
    } finally {
      setAiLoading(false);
    }
  };

  // 4. Live Platform Sync Trigger
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const supportedSyncPlatforms = ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'gfg'];

  const handleSyncPlatform = async (platform: string) => {
    if (!supportedSyncPlatforms.includes(platform)) {
      toast.info(`${platform} sync coming in future release!`);
      return;
    }

    setSyncing(true);
    setSyncingPlatform(platform);
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const toastId = toast.loading(`Syncing ${platformName} solved problems...`);
    try {
      const res = await fetch(`/api/sync/${platform}`, { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || `${platformName} sync completed!`, { id: toastId });
        await fetchDashboardStats();
      } else {
        toast.error(json.message || `Failed to sync ${platformName} problems`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync request failed', { id: toastId });
    } finally {
      setSyncing(false);
      setSyncingPlatform(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncingPlatform(null);
    const toastId = toast.loading('Running Universal Sync across all connected platforms...');
    try {
      const res = await fetch('/api/sync/all', { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || `Universal sync completed! Synced ${json.totalSynced} problems.`, { id: toastId });
        await fetchDashboardStats();
      } else {
        toast.error(json.message || 'Universal sync failed', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Universal sync request failed', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Coder';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-10">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {getTimeGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{displayName}</span>!
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track your competitive programming mastery and discover AI-recommended problems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardStats}
            disabled={statsLoading}
            className="h-9 px-3 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 gap-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>

          <Link
            href="/explore"
            className={cn(
              buttonVariants({ size: 'sm' }),
              "h-9 px-4 text-xs bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg cursor-pointer inline-flex items-center gap-1"
            )}
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Step 9: Live Dashboard Stats & Charts */}
      <StatsCards 
        stats={statsData} 
        onSyncPlatform={handleSyncPlatform}
        onSyncAll={handleSyncAll}
        isSyncing={syncing}
        syncingPlatform={syncingPlatform}
      />

      {/* AI Search Banner Section */}
      <div className="flex flex-col items-center justify-center py-10 px-6 bg-gradient-to-b from-cyan-950/20 via-black/40 to-black/60 rounded-3xl border border-cyan-500/20 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="text-center space-y-2 max-w-xl">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" /> Ask AI for Targeted Problems
          </h2>
          <p className="text-sm text-gray-400">
            Tell Gemini what you need in plain English (e.g. &quot;5 medium tree problems I haven&apos;t solved&quot;).
          </p>
        </div>
        
        <AIPromptBar onSearch={handleAiSearch} isLoading={aiLoading} />
        
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl pt-2">
          <span className="text-xs text-gray-500 w-full text-center mb-1">Popular Quick Prompts:</span>
          {[
            '5 easy tree problems from LeetCode',
            'Medium graph problems I haven\'t solved',
            'Dynamic programming problems',
            'Binary search practice',
            'Two pointers easy questions'
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => handleAiSearch(preset)}
              disabled={aiLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Content: Search Results or Recent Activity Feed */}
      {hasSearched ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" /> Recommended Problems
            </h2>
            <button 
              onClick={() => { setHasSearched(false); setSearchResults([]); }}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              Back to Recent Activity
            </button>
          </div>
          
          <ProblemTable 
            problems={searchResults} 
            solvedIds={solvedIds}
            isLoading={aiLoading}
            viewMode="table" 
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> Recent Solved Activity
            </h2>
            {statsData.recentActivity.length > 0 && (
              <span className="text-xs text-gray-400">
                Showing latest {statsData.recentActivity.length} solved problems
              </span>
            )}
          </div>

          {statsData.recentActivity.length === 0 ? (
            <div className="bg-black/30 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                <Activity className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-semibold text-white">No solved activity recorded yet</h3>
                <p className="text-xs text-gray-400">
                  Connect your LeetCode handle in Settings and sync your solved problems to unlock personal analytics and activity history.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button
                  onClick={() => router.push('/settings')}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-4 rounded-xl cursor-pointer"
                >
                  Configure Handles
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSyncPlatform('leetcode')}
                  disabled={syncing}
                  className="border-white/10 text-xs px-4 rounded-xl cursor-pointer"
                >
                  Sync LeetCode Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/[0.04] border-b border-white/10">
                  <tr>
                    <th className="px-5 py-4 w-12 text-center">Status</th>
                    <th className="px-5 py-4">Title</th>
                    <th className="px-5 py-4">Platform</th>
                    <th className="px-5 py-4">Difficulty</th>
                    <th className="px-5 py-4">Solved At</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {statsData.recentActivity.map((activity) => {
                    const platformConfig = PLATFORMS.find(p => p.id === activity.platform);
                    const diffStyle = getDifficultyColor(activity.difficulty);

                    return (
                      <tr key={activity.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 text-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        </td>
                        <td className="px-5 py-4 font-medium text-white">
                          <a 
                            href={activity.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-cyan-400 transition-colors text-base line-clamp-1"
                          >
                            {activity.title}
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs bg-white/[0.03] border-white/10 font-medium">
                            <span 
                              className="w-2 h-2 rounded-full mr-1.5" 
                              style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}
                            />
                            {platformConfig?.name || activity.platform}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${diffStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${diffStyle.dot}`}></span>
                            {activity.difficulty}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-400">
                          {formatRelativeTime(activity.solvedAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            <span>View</span>
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
      )}
    </div>
  );
}
