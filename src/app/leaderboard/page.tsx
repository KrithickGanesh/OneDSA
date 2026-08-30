'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Flame, Users, Globe, UserPlus, Medal, Sparkles, ExternalLink, Check, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PLATFORMS } from '@/lib/constants';
import { LeaderboardEntry } from '@/app/api/leaderboard/route';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  // Add Friend Modal State
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  const fetchLeaderboard = useCallback(async (selectedScope: 'global' | 'friends') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?scope=${selectedScope}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEntries(data.leaderboard || []);
          setCurrentUserRank(data.currentUserRank || null);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load leaderboard', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(scope);
  }, [fetchLeaderboard, scope]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendIdInput.trim()) return;

    setAddingFriend(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: friendIdInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Friend connected!');
        setShowAddFriendModal(false);
        setFriendIdInput('');
        fetchLeaderboard(scope);
      } else {
        toast.error(data.error || 'Failed to add friend');
      }
    } catch (err: any) {
      toast.error('Error adding friend', { description: err.message });
    } finally {
      setAddingFriend(false);
    }
  };

  const topThree = entries.slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" /> Leaderboard & Rankings
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Compare competitive programming progress with friends and coders worldwide across all platforms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Toggle */}
          <div className="flex items-center p-1 bg-black/60 border border-white/10 rounded-2xl">
            <button
              onClick={() => setScope('global')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                scope === 'global' ? "bg-cyan-500 text-black shadow-md" : "text-gray-400 hover:text-white"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global</span>
            </button>
            <button
              onClick={() => setScope('friends')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                scope === 'friends' ? "bg-cyan-500 text-black shadow-md" : "text-gray-400 hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends</span>
            </button>
          </div>

          <Button
            onClick={() => setShowAddFriendModal(true)}
            size="sm"
            className="h-9 px-3.5 text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connect Friend</span>
          </Button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* 2nd Place */}
          {topThree[1] && (
            <Card className="bg-black/40 backdrop-blur-md border border-slate-400/20 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between order-2 md:order-1 shadow-xl">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-3xl">🥈</span>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-[11px] bg-slate-400/10 text-slate-300 border-slate-400/30">
                  Rank #2
                </Badge>
                <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                  {topThree[1].name}
                  {topThree[1].isCurrentUser && <span className="text-[10px] text-cyan-400 font-semibold">(You)</span>}
                </h3>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-between items-baseline">
                <div>
                  <div className="text-2xl font-extrabold text-white">{topThree[1].totalSolved}</div>
                  <div className="text-[11px] text-gray-400">Total Solved</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-400 flex items-center gap-1 justify-end">
                    <Flame className="w-4 h-4" /> {topThree[1].streak}d
                  </div>
                  <div className="text-[11px] text-gray-400">Streak</div>
                </div>
              </div>
            </Card>
          )}

          {/* 1st Place (Highlighted) */}
          {topThree[0] && (
            <Card className="bg-gradient-to-b from-yellow-500/10 via-black/50 to-black/60 border border-yellow-500/30 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between order-1 md:order-2 shadow-2xl scale-105">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-4xl">👑</span>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-[11px] bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-bold">
                  Champion #1
                </Badge>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  {topThree[0].name}
                  {topThree[0].isCurrentUser && <span className="text-[10px] text-cyan-400 font-semibold">(You)</span>}
                </h3>
              </div>
              <div className="pt-6 border-t border-white/10 flex justify-between items-baseline">
                <div>
                  <div className="text-3xl font-black text-yellow-400">{topThree[0].totalSolved}</div>
                  <div className="text-[11px] text-gray-400 font-medium">Total Solved</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-orange-400 flex items-center gap-1 justify-end">
                    <Flame className="w-4 h-4" /> {topThree[0].streak}d
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium">Streak</div>
                </div>
              </div>
            </Card>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <Card className="bg-black/40 backdrop-blur-md border border-amber-700/20 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between order-3 shadow-xl">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-3xl">🥉</span>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-[11px] bg-amber-700/10 text-amber-400 border-amber-700/30">
                  Rank #3
                </Badge>
                <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                  {topThree[2].name}
                  {topThree[2].isCurrentUser && <span className="text-[10px] text-cyan-400 font-semibold">(You)</span>}
                </h3>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-between items-baseline">
                <div>
                  <div className="text-2xl font-extrabold text-white">{topThree[2].totalSolved}</div>
                  <div className="text-[11px] text-gray-400">Total Solved</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-400 flex items-center gap-1 justify-end">
                    <Flame className="w-4 h-4" /> {topThree[2].streak}d
                  </div>
                  <div className="text-[11px] text-gray-400">Streak</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Medal className="w-5 h-5 text-cyan-400" /> Full Rankings
        </h2>

        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-white/10 bg-black/40 text-gray-400">
            No coders found in this view. Connect friends to start competing!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/[0.04] border-b border-white/10">
                <tr>
                  <th className="px-5 py-4 w-16 text-center">Rank</th>
                  <th className="px-5 py-4">Coder</th>
                  <th className="px-5 py-4">Total Solved</th>
                  <th className="px-5 py-4">Difficulty Breakdown</th>
                  <th className="px-5 py-4">Current Streak</th>
                  <th className="px-5 py-4">Platforms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={cn(
                      "transition-colors",
                      entry.isCurrentUser
                        ? "bg-cyan-500/10 hover:bg-cyan-500/15 border-l-2 border-l-cyan-400"
                        : "hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Rank */}
                    <td className="px-5 py-4 text-center font-bold">
                      {entry.rank === 1 ? (
                        <span className="text-lg">🥇</span>
                      ) : entry.rank === 2 ? (
                        <span className="text-lg">🥈</span>
                      ) : entry.rank === 3 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="text-gray-400">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Coder Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-base">
                          {entry.name}
                        </span>
                        {entry.isCurrentUser && (
                          <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold px-1.5 py-0">
                            YOU
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Total Solved */}
                    <td className="px-5 py-4">
                      <span className="text-base font-extrabold text-white">
                        {entry.totalSolved}
                      </span>
                    </td>

                    {/* Difficulty Breakdown */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-semibold">{entry.easySolved}E</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-xs text-amber-400 font-semibold">{entry.mediumSolved}M</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-xs text-rose-400 font-semibold">{entry.hardSolved}H</span>
                      </div>
                    </td>

                    {/* Streak */}
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        {entry.streak} {entry.streak === 1 ? 'day' : 'days'}
                      </span>
                    </td>

                    {/* Platforms */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {PLATFORMS.map((plat) => {
                          const count = entry.platforms[plat.id] || 0;
                          if (count === 0) return null;
                          return (
                            <Badge
                              key={plat.id}
                              variant="outline"
                              className="text-[10px] bg-white/5 border-white/10 px-1.5 py-0.5"
                              title={`${plat.name}: ${count} solved`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: plat.color }} />
                              {count}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connect Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAddFriendModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" /> Connect with a Friend
              </h3>
              <p className="text-xs text-gray-400">
                Enter your friend&apos;s User ID or Platform Handle to add them to your private Friends Leaderboard.
              </p>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="friendId" className="text-xs font-semibold text-gray-300">Friend User ID or Handle *</Label>
                <Input
                  id="friendId"
                  value={friendIdInput}
                  onChange={(e) => setFriendIdInput(e.target.value)}
                  placeholder="e.g. ad26f49d-bc52-4319-9b21-8554dadb05ba"
                  required
                  className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddFriendModal(false)}
                  className="text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingFriend || !friendIdInput.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-5 rounded-xl shadow-lg cursor-pointer"
                >
                  {addingFriend ? 'Connecting...' : 'Add Friend'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
