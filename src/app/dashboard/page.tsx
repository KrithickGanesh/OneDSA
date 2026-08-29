'use client';

import React, { useState, useEffect } from 'react';
import { AIPromptBar } from '@/components/AIPromptBar';
import { StatsCards } from '@/components/StatsCards';
import { ProblemTable } from '@/components/ProblemTable';
import { Problem } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Problem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  const handleAiSearch = async (query: string) => {
    setAiLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId: user?.id, excludeSolved: true })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI recommendations');
      }

      const data = await response.json();
      setSearchResults(data.problems || []);
      
      if (data.filters) {
        toast.success(`Found ${data.problems?.length || 0} problems`, {
          description: `Filters applied: ${data.filters.difficulty_level || 'Any'} difficulty, ${data.filters.platforms.join(', ')}`
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

  const handleQuickFilter = (query: string) => {
    handleAiSearch(query);
  };

  // Mock stats for now - in a real app, fetch this from API/Supabase based on user's linked platforms
  const mockStats = {
    totalSolved: 142,
    platformBreakdown: [
      { platform: 'leetcode', count: 85 },
      { platform: 'codeforces', count: 42 },
      { platform: 'codechef', count: 15 }
    ],
    streak: 12,
    solvedThisWeek: 8
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const username = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Good morning, {username}!</h1>
        <p className="text-gray-400">Here's your competitive programming overview.</p>
      </div>

      {/* Stats Section */}
      <StatsCards stats={mockStats} />

      {/* AI Search Section */}
      <div className="flex flex-col items-center justify-center py-10 px-4 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent rounded-3xl border border-white/5">
        <h2 className="text-2xl font-semibold text-white mb-8 text-center flex items-center gap-2">
          Ask AI for Problems
        </h2>
        
        <AIPromptBar onSearch={handleAiSearch} isLoading={aiLoading} />
        
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-3xl">
          <span className="text-sm text-gray-500 w-full text-center mb-2">Quick Presets:</span>
          {['Easy DP', 'Medium Graphs', 'Hard Trees', 'Arrays', 'Binary Search'].map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickFilter(`${preset} problems`)}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results or Activity */}
      {hasSearched ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recommended Problems</h2>
            <button 
              onClick={() => { setHasSearched(false); setSearchResults([]); }}
              className="text-sm text-gray-400 hover:text-white"
            >
              Clear Results
            </button>
          </div>
          <ProblemTable 
            problems={searchResults} 
            isLoading={aiLoading}
            viewMode="table" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Recent Activity
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">Sync your platforms to see activity here.</p>
            <button 
              onClick={() => router.push('/settings')}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              Connect Platforms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
