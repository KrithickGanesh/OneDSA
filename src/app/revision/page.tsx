'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Calendar, CheckCircle, Brain, ExternalLink, Sparkles, Clock, AlertTriangle, ArrowRight, Loader2, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDifficultyColor } from '@/components/ProblemTable';
import { PLATFORMS } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatUpcomingDate(isoString: string) {
  const diffMs = new Date(isoString).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Due Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export default function RevisionPage() {
  const [dueProblems, setDueProblems] = useState<any[]>([]);
  const [upcomingProblems, setUpcomingProblems] = useState<any[]>([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchRevisionData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revision');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDueProblems(data.dueToday || []);
          setUpcomingProblems(data.upcoming || []);
          setTotalScheduled(data.totalScheduled || 0);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load revision schedule', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisionData();
  }, [fetchRevisionData]);

  // Submit Review Feedback (SM-2)
  const handleReviewFeedback = async (problemId: string, quality: number, title: string) => {
    setReviewingId(problemId);
    try {
      const res = await fetch('/api/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, quality }),
      });

      const data = await res.json();
      if (data.success) {
        const qualityText = quality === 5 ? 'Easy 🚀' : quality === 3 ? 'Good 👍' : 'Hard 🔁';
        toast.success(`Reviewed: ${title}`, {
          description: `${qualityText} — ${data.message}`,
        });
        fetchRevisionData();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (err: any) {
      toast.error('Error recording review', { description: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-cyan-400" /> Spaced Repetition Revision
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Retain algorithms permanently using the SM-2 spaced repetition algorithm. Review scheduled problems before you forget.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs font-semibold">
            {dueProblems.length} Due Today
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 bg-white/5 text-gray-300 border-white/10 text-xs font-semibold">
            {totalScheduled} In Schedule
          </Badge>
        </div>
      </div>

      {/* Due Today Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Due For Review Today ({dueProblems.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3"></div>
            ))}
          </div>
        ) : dueProblems.length === 0 ? (
          <div className="py-14 text-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">All caught up for today! 🎉</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No problems are currently overdue. As you solve new problems, they will automatically be queued for spaced review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueProblems.map((item) => {
              const p = item.problem;
              if (!p) return null;

              const platformConfig = PLATFORMS.find(cfg => cfg.id === p.platform);
              const diffStyle = getDifficultyColor(p.difficulty);
              const isProcessing = reviewingId === p.id;

              return (
                <Card
                  key={item.id}
                  className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-xl hover:shadow-cyan-500/10 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Badge 
                        variant="outline" 
                        className="text-[11px] font-semibold px-2 py-0.5"
                        style={{ 
                          backgroundColor: `${platformConfig?.color}15`,
                          color: platformConfig?.color || '#94a3b8' 
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}></span>
                        {platformConfig?.name || p.platform}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">
                          Repetition #{item.repetitions} ({item.intervalDays}d interval)
                        </span>
                        <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${diffStyle.badge}`}>
                          {p.difficulty || 'Medium'}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-white leading-snug">
                      <a 
                        href={p.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 group"
                      >
                        <span>{p.title}</span>
                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                      </a>
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      {(p.tags || []).slice(0, 4).map((tag: string, idx: number) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Review Rating Actions */}
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-400 block">How did your revision go?</span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleReviewFeedback(p.id, 1, p.title)}
                        className="h-8 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl cursor-pointer"
                      >
                        Hard (1d)
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleReviewFeedback(p.id, 3, p.title)}
                        className="h-8 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl cursor-pointer"
                      >
                        Good ({Math.max(item.intervalDays * 2, 3)}d)
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleReviewFeedback(p.id, 5, p.title)}
                        className="h-8 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl cursor-pointer"
                      >
                        Easy ({Math.max(Math.round(item.intervalDays * 2.5), 5)}d)
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Schedule Queue */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" /> Upcoming Revision Schedule ({upcomingProblems.length})
        </h2>

        {upcomingProblems.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-white/10 bg-black/20 text-gray-400 text-xs">
            No upcoming revisions scheduled.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/[0.04] border-b border-white/10">
                <tr>
                  <th className="px-5 py-4">Problem</th>
                  <th className="px-5 py-4">Platform</th>
                  <th className="px-5 py-4">Difficulty</th>
                  <th className="px-5 py-4">Repetitions</th>
                  <th className="px-5 py-4">Next Review</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {upcomingProblems.map((item) => {
                  const p = item.problem;
                  if (!p) return null;
                  const platformConfig = PLATFORMS.find(cfg => cfg.id === p.platform);
                  const diffStyle = getDifficultyColor(p.difficulty);

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 font-medium text-white">
                        <a 
                          href={p.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-cyan-400 transition-colors text-base line-clamp-1 inline-block"
                        >
                          {p.title}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs bg-white/[0.03] border-white/10 font-medium">
                          <span 
                            className="w-2 h-2 rounded-full mr-1.5" 
                            style={{ backgroundColor: platformConfig?.color || '#94a3b8' }}
                          />
                          {platformConfig?.name || p.platform}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${diffStyle.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${diffStyle.dot}`}></span>
                          {p.difficulty || 'Medium'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400">
                        {item.repetitions}x ({item.intervalDays}d)
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/20 font-medium">
                          {formatUpcomingDate(item.nextReviewAt)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
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
    </div>
  );
}
